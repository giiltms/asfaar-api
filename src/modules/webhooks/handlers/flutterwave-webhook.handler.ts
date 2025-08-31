import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseWebhookHandler } from './base-webhook.handler';
import { WebhookEvent } from '../interfaces/webhook-handler.interface';
import { PaymentStatus } from '@prisma/client';
import { PrismaService } from '@providers/prisma/prisma.service';
import { PaymentsService } from '@modules/payments/payments.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FlutterwaveWebhookHandler extends BaseWebhookHandler {
  private readonly webhookSecret: string;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly paymentsService: PaymentsService,
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

  /**
   * Log webhook data to file for debugging - save exact payload structure
   */
  private logWebhookToFile(payload: any, source: string): void {
    try {
      const timestamp = new Date().toISOString();
      const logDir = path.join(process.cwd(), 'logs');
      const logFile = path.join(logDir, 'flutterwave-webhooks.log');

      // Create logs directory if it doesn't exist
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      // Simple log entry with exact payload
      const logEntry = {
        timestamp,
        source,
        // The exact payload as received from Flutterwave
        exactPayload: payload,
        // Raw JSON string for easy copying
        rawJson: JSON.stringify(payload, null, 2),
      };

      const logLine = `\n=== FLUTTERWAVE WEBHOOK EXACT PAYLOAD ===\n${JSON.stringify(
        logEntry,
        null,
        2,
      )}\n`;

      fs.appendFileSync(logFile, logLine);
      this.logger.log(`Exact webhook payload saved to: ${logFile}`);

      // Quick console summary
      this.logger.log(
        `📝 Webhook logged - ${Object.keys(payload || {}).length
        } top-level keys`,
      );
    } catch (error) {
      this.logger.error('Failed to log webhook payload to file:', error);
    }
  }

  async verifySignature(payload: string, signature: string): Promise<boolean> {
    try {
      if (!this.webhookSecret) {
        this.logger.error('Flutterwave webhook secret not configured');
        return false;
      }

      // Flutterwave uses simple string comparison for verif-hash
      // The verif-hash header should match your configured secret hash
      const isValid = signature === this.webhookSecret;

      if (!isValid) {
        this.logger.warn('Flutterwave webhook signature verification failed');
        this.logger.debug(
          `Expected: ${this.webhookSecret}, Received: ${signature}`,
        );
      }

      return isValid;
    } catch (error) {
      this.logger.error('Flutterwave signature verification error', error);
      return false;
    }
  }

  async parseEvent(payload: any): Promise<WebhookEvent> {
    try {
      // Log the entire payload for debugging
      this.logger.log('=== FLUTTERWAVE WEBHOOK PAYLOAD RECEIVED ===');
      this.logger.log(`Raw payload: ${JSON.stringify(payload, null, 2)}`);
      this.logger.log(`Payload type: ${typeof payload}`);
      this.logger.log(`Payload keys: ${Object.keys(payload || {}).join(', ')}`);

      // Log to file for persistent debugging
      this.logWebhookToFile(payload, 'parseEvent');

      // Extract fields from the Flutterwave webhook format
      const eventType = payload.type;
      const webhookData = payload.data;
      const webhookId = payload.id;
      const webhookTimestamp = payload.timestamp;

      this.logger.log(`Event type: ${eventType}`);
      this.logger.log(`Webhook ID: ${webhookId}`);
      this.logger.log(`Webhook timestamp: ${webhookTimestamp}`);
      this.logger.log(
        `Data field keys: ${Object.keys(webhookData || {}).join(', ')}`,
      );

      // Extract transaction details from the data object
      const transactionId = webhookData?.id;
      const transactionStatus = webhookData?.status;
      const reference = webhookData?.reference;
      const amount = webhookData?.amount
        ? parseFloat(webhookData.amount)
        : undefined;
      const currency = webhookData?.currency || 'NGN';
      const customer = webhookData?.customer;

      this.logger.log(`Transaction ID: ${transactionId}`);
      this.logger.log(`Transaction status: ${transactionStatus}`);
      this.logger.log(`Reference: ${reference}`);
      this.logger.log(`Amount: ${amount}`);
      this.logger.log(`Currency: ${currency}`);

      // Map Flutterwave status to our PaymentStatus
      const status = this.mapFlutterwaveStatus(transactionStatus, eventType);
      this.logger.log(`Mapped status: ${status}`);

      const result = {
        event: eventType,
        data: webhookData,
        reference,
        status,
        amount: amount ? this.normalizeAmount(amount, currency) : undefined,
        currency,
        customerId: customer?.id,
        metadata: {
          charge_id: transactionId,
          transaction_status: transactionStatus,
          payment_method: webhookData?.payment_method,
          customer: customer,
          created_datetime: webhookData?.created_datetime,
          redirect_url: webhookData?.redirect_url,
          webhook_id: webhookId,
          webhook_timestamp: webhookTimestamp,
          // Include additional fields that might be useful
          processor_response: webhookData?.processor_response,
          metadata: webhookData?.metadata,
        },
      };

      this.logger.log('=== PARSED WEBHOOK EVENT ===');
      this.logger.log(`Final event: ${result.event}`);
      this.logger.log(`Final reference: ${result.reference}`);
      this.logger.log(`Final status: ${result.status}`);
      this.logger.log(`Final amount: ${result.amount}`);
      this.logger.log(`Final currency: ${result.currency}`);

      return result;
    } catch (error) {
      this.logger.error('Failed to parse Flutterwave webhook payload', error);
      this.logger.error(
        'Payload that caused error:',
        JSON.stringify(payload, null, 2),
      );
      throw new Error('Invalid Flutterwave webhook payload');
    }
  }

  /**
   * Map Flutterwave status to our PaymentStatus enum
   */
  private mapFlutterwaveStatus(
    flutterwaveStatus: string,
    eventType: string,
  ): PaymentStatus {
    const status = flutterwaveStatus?.toLowerCase();
    const type = eventType?.toLowerCase();

    // Check event type first (new Flutterwave format)
    if (type === 'charge.completed') {
      return PaymentStatus.COMPLETED;
    }

    if (type === 'charge.failed') {
      return PaymentStatus.FAILED;
    }

    if (type === 'charge.pending') {
      return PaymentStatus.PENDING;
    }

    // Check status field as fallback
    switch (status) {
      case 'succeeded':
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
          `Unknown Flutterwave status: ${flutterwaveStatus}, event type: ${eventType}`,
        );
        return PaymentStatus.PENDING;
    }
  }

  /**
   * Handle Flutterwave-specific events
   */
  async processEvent(event: WebhookEvent): Promise<void> {
    this.logger.log(`Processing Flutterwave event: ${event.event}`);

    // Handle Flutterwave-specific events (new format)
    switch (event.event) {
      case 'charge.completed':
        await this.handleChargeCompleted(event);
        break;
      case 'charge.failed':
        await this.handleChargeFailed(event);
        break;
      case 'charge.pending':
        await this.handleChargePending(event);
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
      const receivedReference = event.data.reference;

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
   * Handle charge pending event
   */
  private async handleChargePending(event: WebhookEvent): Promise<void> {
    this.logger.log(
      `Handling Flutterwave charge pending for reference: ${event.reference}`,
    );
    await this.handlePaymentPending(event);
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
