import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { BaseWebhookHandler } from './base-webhook.handler';
import { WebhookEvent } from '../interfaces/webhook-handler.interface';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '@providers/prisma/prisma.service';
import { PaymentsService } from '@modules/payments/payments.service';

@Injectable()
export class FlutterwaveWebhookHandler extends BaseWebhookHandler {
  private readonly webhookSecret: string;

  constructor(
    prisma: PrismaService,
    paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {
    super(prisma, paymentsService);
    const paymentConfig = this.configService.get('payment');
    this.webhookSecret = paymentConfig?.FLUTTERWAVE_WEBHOOK_SECRET;

    if (!this.webhookSecret) {
      this.logger.warn('Flutterwave webhook secret not configured');
    }
  }

  getProviderName(): string {
    return 'FLUTTERWAVE';
  }

  async verifySignature(payload: string, signature: string): Promise<boolean> {
    try {
      if (!this.webhookSecret) {
        this.logger.error('Flutterwave webhook secret not configured');
        return false;
      }

      // Flutterwave uses HMAC-SHA256 with base64 encoding
      const hash = createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('base64');

      const isValid = hash === signature;

      if (!isValid) {
        this.logger.warn('Flutterwave webhook signature verification failed');
        this.logger.debug(`Expected: ${hash}, Received: ${signature}`);
      }

      return isValid;
    } catch (error) {
      this.logger.error('Flutterwave signature verification error', error);
      return false;
    }
  }

  async parseEvent(payload: any): Promise<WebhookEvent> {
    try {
      const { event, data } = payload;

      // Extract common fields from Flutterwave webhook
      const reference = data.tx_ref || data.reference || data.flw_ref;
      const amount = data.amount ? parseFloat(data.amount) : undefined;
      const currency = data.currency || 'NGN';

      // Map Flutterwave status to our PaymentStatus
      const status = this.mapFlutterwaveStatus(data.status, event);

      return {
        event,
        data,
        reference,
        status,
        amount: amount ? this.normalizeAmount(amount, currency) : undefined,
        currency,
        customerId: data.customer?.id || data.customer_id,
        metadata: {
          flw_ref: data.flw_ref,
          processor_response: data.processor_response,
          gateway_response: data.gateway_response,
          card: data.card,
          customer: data.customer,
        },
      };
    } catch (error) {
      this.logger.error('Failed to parse Flutterwave webhook payload', error);
      throw new Error('Invalid Flutterwave webhook payload');
    }
  }

  /**
   * Map Flutterwave status to our PaymentStatus enum
   */
  private mapFlutterwaveStatus(
    flutterwaveStatus: string,
    event: string,
  ): PaymentStatus {
    const status = flutterwaveStatus?.toLowerCase();
    const eventType = event?.toLowerCase();

    // Check event type first
    if (eventType?.includes('completed') || eventType?.includes('success')) {
      return PaymentStatus.COMPLETED;
    }

    if (eventType?.includes('failed') || eventType?.includes('cancelled')) {
      return PaymentStatus.FAILED;
    }

    // Check status field
    switch (status) {
      case 'successful':
      case 'success':
      case 'completed':
        return PaymentStatus.COMPLETED;

      case 'failed':
      case 'cancelled':
      case 'declined':
        return PaymentStatus.FAILED;

      case 'pending':
      case 'processing':
        return PaymentStatus.PENDING;

      default:
        this.logger.warn(
          `Unknown Flutterwave status: ${flutterwaveStatus}, event: ${event}`,
        );
        return PaymentStatus.PENDING;
    }
  }

  /**
   * Handle Flutterwave-specific events
   */
  async processEvent(event: WebhookEvent): Promise<void> {
    this.logger.log(`Processing Flutterwave event: ${event.event}`);

    // Handle Flutterwave-specific events
    switch (event.event) {
      case 'charge.completed':
        await this.handleChargeCompleted(event);
        break;
      case 'charge.failed':
        await this.handleChargeFailed(event);
        break;
      case 'transfer.completed':
        await this.handleTransferCompleted(event);
        break;
      case 'transfer.failed':
        await this.handleTransferFailed(event);
        break;
      default:
        // Fall back to base handler for common events
        await super.processEvent(event);
    }
  }

  /**
   * Handle charge completed event with transaction verification
   */
  private async handleChargeCompleted(event: WebhookEvent): Promise<void> {
    this.logger.log(
      `Handling Flutterwave charge completed for reference: ${event.reference}`,
    );

    // First verify the transaction data with Flutterwave API
    const isVerified = await this.verifyTransactionWithFlutterwave(event);
    if (!isVerified) {
      this.logger.error(
        `Transaction verification failed for reference: ${event.reference}`,
      );
      return;
    }

    // Verify the charge was actually successful
    if (
      event.data.status === 'succeeded' ||
      event.data.status === 'successful'
    ) {
      await this.handlePaymentSuccess(event);
    } else {
      this.logger.warn(
        `Charge completed event but status is: ${event.data.status}`,
      );
    }
  }

  /**
   * Verify transaction with Flutterwave API as recommended in their docs
   */
  private async verifyTransactionWithFlutterwave(
    event: WebhookEvent,
  ): Promise<boolean> {
    try {
      // Find our local payment record first
      const payment = await this.findPaymentByReference(event.reference);
      if (!payment) {
        this.logger.warn(`Payment not found for reference: ${event.reference}`);
        return false;
      }

      // In a real implementation, you would make an API call to Flutterwave's
      // transaction verification endpoint here to confirm the data
      // For now, we'll do basic validation of the webhook data

      const expectedAmount = payment.amount;
      const receivedAmount = event.data.amount;
      const expectedCurrency = payment.currency || 'NGN';
      const receivedCurrency = event.data.currency;
      const expectedReference = payment.reference || payment.processorId;
      const receivedReference = event.data.reference || event.data.tx_ref;

      // Verify critical transaction data matches our records
      if (receivedAmount !== expectedAmount) {
        this.logger.error(
          `Amount mismatch: expected ${expectedAmount}, received ${receivedAmount}`,
        );
        return false;
      }

      if (receivedCurrency !== expectedCurrency) {
        this.logger.error(
          `Currency mismatch: expected ${expectedCurrency}, received ${receivedCurrency}`,
        );
        return false;
      }

      if (receivedReference !== expectedReference) {
        this.logger.error(
          `Reference mismatch: expected ${expectedReference}, received ${receivedReference}`,
        );
        return false;
      }

      // Verify the status is successful
      if (!['succeeded', 'successful'].includes(event.data.status)) {
        this.logger.error(
          `Transaction not successful: status is ${event.data.status}`,
        );
        return false;
      }

      this.logger.log(
        `Transaction verification passed for reference: ${event.reference}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Error verifying transaction with Flutterwave: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Handle charge failed event
   */
  private async handleChargeFailed(event: WebhookEvent): Promise<void> {
    this.logger.log(
      `Handling Flutterwave charge failed for reference: ${event.reference}`,
    );
    await this.handlePaymentFailed(event);
  }

  /**
   * Handle transfer completed event (for refunds/payouts)
   */
  private async handleTransferCompleted(event: WebhookEvent): Promise<void> {
    this.logger.log(
      `Handling Flutterwave transfer completed for reference: ${event.reference}`,
    );

    // Check if this is a refund transfer
    if (
      event.data.narration?.includes('refund') ||
      event.data.purpose === 'refund'
    ) {
      await this.handleRefund(event);
    } else {
      this.logger.log('Transfer completed - not a refund, skipping');
    }
  }

  /**
   * Handle transfer failed event
   */
  private async handleTransferFailed(event: WebhookEvent): Promise<void> {
    this.logger.log(
      `Handling Flutterwave transfer failed for reference: ${event.reference}`,
    );

    // Log failed transfer but don't update payment status
    // as this might be a failed refund attempt
    this.logger.warn(
      `Transfer failed for reference ${event.reference}: ${event.data.complete_message}`,
    );
  }
}
