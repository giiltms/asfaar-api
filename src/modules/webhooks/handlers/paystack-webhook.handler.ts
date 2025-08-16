import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { BaseWebhookHandler } from './base-webhook.handler';
import { WebhookEvent } from '../interfaces/webhook-handler.interface';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '@providers/prisma/prisma.service';
import { PaymentsService } from '@modules/payments/payments.service';

@Injectable()
export class PaystackWebhookHandler extends BaseWebhookHandler {
  private readonly webhookSecret: string;

  constructor(
    prisma: PrismaService,
    paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {
    super(prisma, paymentsService);
    const paymentConfig = this.configService.get('payment');
    this.webhookSecret = paymentConfig?.PAYSTACK_WEBHOOK_SECRET;

    if (!this.webhookSecret) {
      this.logger.warn('Paystack webhook secret not configured');
    }
  }

  getProviderName(): string {
    return 'PAYSTACK';
  }

  async verifySignature(payload: string, signature: string): Promise<boolean> {
    try {
      if (!this.webhookSecret) {
        this.logger.error('Paystack webhook secret not configured');
        return false;
      }

      // Paystack uses HMAC SHA512
      const hash = createHmac('sha512', this.webhookSecret)
        .update(payload)
        .digest('hex');

      const isValid = hash === signature;

      if (!isValid) {
        this.logger.warn('Paystack webhook signature verification failed');
      }

      return isValid;
    } catch (error) {
      this.logger.error('Paystack signature verification error', error);
      return false;
    }
  }

  async parseEvent(payload: any): Promise<WebhookEvent> {
    try {
      const { event, data } = payload;

      // Extract common fields from Paystack webhook
      const reference = data.reference || data.metadata?.reference;
      const amount = data.amount ? data.amount / 100 : undefined; // Paystack uses kobo
      const currency = data.currency || 'NGN';

      // Map Paystack status to our PaymentStatus
      const status = this.mapPaystackStatus(data.status, event);

      return {
        event,
        data,
        reference,
        status,
        amount: amount ? this.normalizeAmount(amount, currency) : undefined,
        currency,
        customerId: data.customer?.id || data.customer_id,
        metadata: {
          gateway_response: data.gateway_response,
          channel: data.channel,
          card: data.authorization,
          customer: data.customer,
          fees: data.fees,
          log: data.log,
        },
      };
    } catch (error) {
      this.logger.error('Failed to parse Paystack webhook payload', error);
      throw new Error('Invalid Paystack webhook payload');
    }
  }

  /**
   * Map Paystack status to our PaymentStatus enum
   */
  private mapPaystackStatus(
    paystackStatus: string,
    event: string,
  ): PaymentStatus {
    const status = paystackStatus?.toLowerCase();
    const eventType = event?.toLowerCase();

    // Check event type first
    if (eventType?.includes('success') || eventType?.includes('successful')) {
      return PaymentStatus.COMPLETED;
    }

    if (eventType?.includes('failed') || eventType?.includes('abandoned')) {
      return PaymentStatus.FAILED;
    }

    // Check status field
    switch (status) {
      case 'success':
      case 'successful':
        return PaymentStatus.COMPLETED;

      case 'failed':
      case 'abandoned':
      case 'cancelled':
        return PaymentStatus.FAILED;

      case 'pending':
      case 'ongoing':
        return PaymentStatus.PENDING;

      default:
        this.logger.warn(
          `Unknown Paystack status: ${paystackStatus}, event: ${event}`,
        );
        return PaymentStatus.PENDING;
    }
  }

  /**
   * Handle Paystack-specific events
   */
  async processEvent(event: WebhookEvent): Promise<void> {
    this.logger.log(`Processing Paystack event: ${event.event}`);

    // Handle Paystack-specific events
    switch (event.event) {
      case 'charge.success':
        await this.handleChargeSuccess(event);
        break;
      case 'charge.failed':
        await this.handleChargeFailed(event);
        break;
      case 'transfer.success':
        await this.handleTransferSuccess(event);
        break;
      case 'transfer.failed':
        await this.handleTransferFailed(event);
        break;
      case 'transfer.reversed':
        await this.handleTransferReversed(event);
        break;
      case 'invoice.create':
      case 'invoice.update':
        await this.handleInvoiceEvent(event);
        break;
      case 'subscription.create':
      case 'subscription.disable':
        await this.handleSubscriptionEvent(event);
        break;
      default:
        // Fall back to base handler for common events
        await super.processEvent(event);
    }
  }

  /**
   * Handle charge success event
   */
  private async handleChargeSuccess(event: WebhookEvent): Promise<void> {
    this.logger.log(
      `Handling Paystack charge success for reference: ${event.reference}`,
    );

    // Verify the charge was actually successful
    if (event.data.status === 'success') {
      await this.handlePaymentSuccess(event);
    } else {
      this.logger.warn(
        `Charge success event but status is: ${event.data.status}`,
      );
    }
  }

  /**
   * Handle charge failed event
   */
  private async handleChargeFailed(event: WebhookEvent): Promise<void> {
    this.logger.log(
      `Handling Paystack charge failed for reference: ${event.reference}`,
    );
    await this.handlePaymentFailed(event);
  }

  /**
   * Handle transfer success event (for refunds/payouts)
   */
  private async handleTransferSuccess(event: WebhookEvent): Promise<void> {
    this.logger.log(
      `Handling Paystack transfer success for reference: ${event.reference}`,
    );

    // Check if this is a refund transfer
    if (
      event.data.reason?.includes('refund') ||
      event.data.source === 'refund'
    ) {
      await this.handleRefund(event);
    } else {
      this.logger.log('Transfer success - not a refund, skipping');
    }
  }

  /**
   * Handle transfer failed event
   */
  private async handleTransferFailed(event: WebhookEvent): Promise<void> {
    this.logger.log(
      `Handling Paystack transfer failed for reference: ${event.reference}`,
    );

    // Log failed transfer but don't update payment status
    this.logger.warn(
      `Transfer failed for reference ${event.reference}: ${event.data.failure_reason}`,
    );
  }

  /**
   * Handle transfer reversed event
   */
  private async handleTransferReversed(event: WebhookEvent): Promise<void> {
    this.logger.log(
      `Handling Paystack transfer reversed for reference: ${event.reference}`,
    );

    // A transfer reversal might mean a refund was cancelled
    this.logger.log(
      `Transfer reversed for reference ${event.reference}. Manual review may be needed.`,
    );
  }

  /**
   * Handle invoice events
   */
  private async handleInvoiceEvent(event: WebhookEvent): Promise<void> {
    this.logger.log(`Handling Paystack invoice event: ${event.event}`);

    // For now, just log invoice events
    // You might want to implement invoice-specific logic here
    this.logger.log(
      `Invoice ${event.event} for code: ${event.data.invoice_code}`,
    );
  }

  /**
   * Handle subscription events
   */
  private async handleSubscriptionEvent(event: WebhookEvent): Promise<void> {
    this.logger.log(`Handling Paystack subscription event: ${event.event}`);

    // For now, just log subscription events
    // You might want to implement subscription-specific logic here
    this.logger.log(
      `Subscription ${event.event} for code: ${event.data.subscription_code}`,
    );
  }
}
