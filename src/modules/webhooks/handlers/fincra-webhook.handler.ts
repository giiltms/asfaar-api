import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { PrismaService } from '../../../providers/prisma/prisma.service';
import { PaymentsService } from '@modules/payments/payments.service';
import { BaseWebhookHandler } from './base-webhook.handler';
import {
  WebhookEvent,
  WebhookHandlerInterface,
} from '../interfaces/webhook-handler.interface';
import { PaymentStatus } from '@prisma/client';

/**
 * Fincra Webhook Handler
 *
 * Implements Fincra's webhook requirements:
 * - HMAC SHA512 signature verification using webhook secret key
 * - Support for charge, payout, conversion, and virtual account events
 * - Transaction verification and idempotency handling
 *
 * Documentation: https://docs.fincra.com/docs/validating-webhook
 */
@Injectable()
export class FincraWebhookHandler
  extends BaseWebhookHandler
  implements WebhookHandlerInterface {
  protected readonly logger = new Logger(FincraWebhookHandler.name);
  private readonly webhookSecret: string;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
  ) {
    super(prisma, paymentsService);
    this.webhookSecret = this.configService.get<string>(
      'FINCRA_WEBHOOK_SECRET',
    );
  }

  getProviderName(): string {
    return 'FINCRA';
  }

  async verifySignature(payload: string, signature: string): Promise<boolean> {
    try {
      if (!this.webhookSecret) {
        this.logger.error('Fincra webhook secret not configured');
        return false;
      }

      // Fincra uses HMAC SHA512 as per their documentation
      // https://docs.fincra.com/docs/validating-webhook
      const hash = createHmac('sha512', this.webhookSecret)
        .update(payload)
        .digest('hex');

      const isValid = hash === signature;

      if (!isValid) {
        this.logger.warn('Fincra webhook signature verification failed');
      }

      return isValid;
    } catch (error) {
      this.logger.error('Fincra signature verification error', error);
      return false;
    }
  }

  async parseEvent(payload: any): Promise<WebhookEvent> {
    try {
      // Fincra webhook payload is the data itself, not wrapped in event/data structure
      const data = payload;

      // Determine event type based on status and message
      const event = this.determineEventType(data.status, data.message);

      // Extract common fields from Fincra webhook
      const reference =
        data.reference ||
        data.customerReference ||
        data.transactionReference ||
        data.id?.toString();

      // Use amountReceived for the actual amount received (after fees)
      const amount = data.amountReceived || data.amount;
      const currency = data.currency || 'NGN';

      // Map Fincra status to our PaymentStatus
      const status = this.mapFincraStatus(data.status, event);

      this.logger.log(
        `Parsed Fincra webhook: event=${event}, status=${status}, reference=${reference}, amount=${amount}`,
      );

      return {
        event,
        data,
        reference,
        status,
        amount: amount ? this.normalizeAmount(amount, currency) : undefined,
        currency,
        customerId: data.customer?.id || data.customerId,
        metadata: {
          fee: data.fee,
          vat: data.vat,
          type: data.type,
          message: data.message,
          actionRequired: data.actionRequired,
          amountToSettle: data.amountToSettle,
          virtualAccount: data.virtualAccount,
          chargeReference: data.chargeReference,
          customer: data.customer,
          authorization: data.authorization,
          description: data.description,
        },
      };
    } catch (error) {
      this.logger.error('Failed to parse Fincra webhook payload', error);
      throw new Error('Invalid Fincra webhook payload');
    }
  }

  /**
   * Map Fincra status to our PaymentStatus enum
   */
  private mapFincraStatus(status: string, event: string): PaymentStatus {
    // Normalize status string
    const normalizedStatus = status?.toLowerCase();
    const eventType = event?.toLowerCase();

    // Map based on Fincra status values
    switch (normalizedStatus) {
      case 'successful':
      case 'completed':
      case 'credited':
      case 'success':
        if (eventType?.includes('payout') && this.isRefundEvent(event)) {
          return PaymentStatus.REFUNDED;
        }
        return PaymentStatus.COMPLETED;

      case 'failed':
      case 'declined':
      case 'error':
        return PaymentStatus.FAILED;

      case 'pending':
      case 'processing':
      case 'initiated':
        return PaymentStatus.PENDING;

      case 'cancelled':
      case 'canceled':
        return PaymentStatus.CANCELLED;

      default:
        this.logger.warn(
          `Unknown Fincra status: ${status} for event: ${event}`,
        );
        return PaymentStatus.PENDING;
    }
  }

  /**
   * Determine event type based on status
   */
  private determineEventType(status: string, message: string): string {
    const lowerStatus = status?.toLowerCase();

    // Use standard Fincra event types
    switch (lowerStatus) {
      case 'success':
        return 'charge.successful';
      case 'failed':
        return 'charge.failed';
      case 'pending':
        return 'charge.pending';
      default:
        return 'charge.unknown';
    }
  }

  /**
   * Check if event indicates a refund transaction
   */
  private isRefundEvent(event: string): boolean {
    const lowerEvent = event.toLowerCase();
    return (
      lowerEvent.includes('refund') ||
      lowerEvent.includes('reversal') ||
      lowerEvent.includes('chargeback')
    );
  }
}
