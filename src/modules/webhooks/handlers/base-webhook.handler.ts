import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { PaymentsService } from '@modules/payments/payments.service';
import {
  PaymentStatus,
  PaymentProvider,
  SubmissionStatus,
  UpgradeApplicationStatus,
} from '@prisma/client';
import {
  WebhookEvent,
  WebhookHandlerInterface,
  WebhookProcessingResult,
} from '../interfaces/webhook-handler.interface';

@Injectable()
export abstract class BaseWebhookHandler implements WebhookHandlerInterface {
  protected readonly logger = new Logger(BaseWebhookHandler.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Abstract methods to be implemented by provider handlers
   */
  abstract verifySignature(
    payload: string,
    signature: string,
  ): Promise<boolean>;
  abstract parseEvent(payload: any): Promise<WebhookEvent>;
  abstract getProviderName(): string;

  /**
   * Process webhook event - common logic for all providers
   */
  async processEvent(event: WebhookEvent): Promise<void> {
    this.logger.log(
      `Processing ${this.getProviderName()} webhook event: ${event.event}`,
    );

    try {
      // Check for idempotency - prevent duplicate processing
      const isDuplicate = await this.checkForDuplicateEvent(event);
      if (isDuplicate) {
        this.logger.log(
          `Duplicate event detected for ${event.event} - ${event.reference}, skipping processing`,
        );
        return;
      }

      // Handle different event types
      switch (this.getEventType(event.event)) {
        case 'payment_success':
          await this.handlePaymentSuccess(event);
          break;
        case 'payment_failed':
          await this.handlePaymentFailed(event);
          break;
        case 'payment_pending':
          await this.handlePaymentPending(event);
          break;
        case 'refund':
          await this.handleRefund(event);
          break;
        default:
          this.logger.warn(
            `Unhandled event type: ${
              event.event
            } for ${this.getProviderName()}`,
          );
      }

      // Record this event for idempotency
      await this.recordProcessedEvent(event);

      this.logger.log(
        `Successfully processed ${this.getProviderName()} webhook event: ${
          event.event
        }`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process ${this.getProviderName()} webhook event: ${
          event.event
        }`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle successful payment webhook
   */
  protected async handlePaymentSuccess(event: WebhookEvent): Promise<void> {
    if (!event.reference) {
      this.logger.warn('Payment success event missing reference');
      return;
    }

    this.logger.log(
      `🚀 Processing payment success webhook for reference: ${event.reference}`,
    );

    try {
      // Find payment by reference
      const payment = await this.findPaymentByReference(event.reference);
      if (!payment) {
        this.logger.warn(`Payment not found for reference: ${event.reference}`);
        return;
      }

      // Get upgradeApplicationId - it's a scalar field, so we need to access it directly
      const upgradeApplicationId = payment.upgradeApplicationId;

      this.logger.log(
        `Found payment ${payment.id} with status: ${
          payment.status
        }, submissionId: ${
          payment.submissionId || 'None'
        }, upgradeApplicationId: ${upgradeApplicationId || 'None'}`,
      );

      // Update payment status to completed
      await this.paymentsService.updatePaymentStatus(payment.id, {
        status: PaymentStatus.COMPLETED,
        processorId:
          event.data.id?.toString?.() || event.data.payment_id?.toString?.(),
        processorResponse: event.data,
        processor: this.getPaymentProvider(),
      });

      this.logger.log(
        `Payment ${payment.id} marked as completed for reference: ${event.reference}`,
      );

      // If payment is linked to a submission currently pending payment,
      // flip it to SUBMITTED so reference number middleware can run
      if (payment.submissionId) {
        this.logger.log(
          `Processing submission update for payment ${payment.id}, submissionId: ${payment.submissionId}`,
        );

        try {
          // First, check current submission status
          const currentSubmission = await this.prisma.formSubmission.findUnique(
            {
              where: { id: payment.submissionId },
              select: { id: true, status: true, referenceNumber: true },
            },
          );

          if (!currentSubmission) {
            this.logger.error(`Submission ${payment.submissionId} not found`);
            return;
          }

          this.logger.log(
            `Current submission status: ${
              currentSubmission.status
            }, referenceNumber: ${currentSubmission.referenceNumber || 'None'}`,
          );

          const updated = await this.prisma.formSubmission.update({
            where: { id: payment.submissionId },
            data: {
              status: SubmissionStatus.SUBMITTED,
              submittedAt: new Date(),
            },
          });

          this.logger.log(
            `✅ Submission ${updated.id} successfully updated from ${currentSubmission.status} to ${updated.status} after successful payment ${payment.id}`,
          );

          // Activate the biometric appointment if it exists
          await this.activateBiometricAppointment(payment.submissionId);
        } catch (e) {
          this.logger.error(
            `❌ Failed to update submission to SUBMITTED for payment ${payment.id}: ${e.message}`,
            e.stack,
          );
          // do not throw; payment status already updated
        }
      } else if (upgradeApplicationId) {
        // If payment is linked to a travel agent upgrade application,
        // update the application status to PENDING_REVIEW
        this.logger.log(
          `Processing travel agent upgrade application update for payment ${payment.id}, upgradeApplicationId: ${upgradeApplicationId}`,
        );

        try {
          const currentApplication =
            await this.prisma.travelAgentUpgradeApplication.findUnique({
              where: { id: upgradeApplicationId },
              select: {
                id: true,
                status: true,
              },
            });

          if (!currentApplication) {
            this.logger.error(
              `Travel agent upgrade application ${upgradeApplicationId} not found`,
            );
            return;
          }

          this.logger.log(
            `Current application status: ${currentApplication.status}`,
          );

          // Update application status
          // Note: Payment is already linked via Payment.upgradeApplicationId during payment creation
          const updated =
            await this.prisma.travelAgentUpgradeApplication.update({
              where: { id: upgradeApplicationId },
              data: {
                status: UpgradeApplicationStatus.PENDING_REVIEW, // Status: PENDING_REVIEW after payment
              },
            });

          this.logger.log(
            `✅ Travel agent upgrade application ${updated.id} successfully updated from ${currentApplication.status} to ${updated.status} after successful payment ${payment.id}`,
          );
        } catch (e) {
          this.logger.error(
            `❌ Failed to update travel agent upgrade application for payment ${payment.id}: ${e.message}`,
            e.stack,
          );
          // do not throw; payment status already updated
        }
      } else {
        this.logger.warn(
          `Payment ${payment.id} has no associated submissionId or upgradeApplicationId`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle payment success for reference: ${event.reference}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle failed payment webhook
   */
  protected async handlePaymentFailed(event: WebhookEvent): Promise<void> {
    if (!event.reference) {
      this.logger.warn('Payment failed event missing reference');
      return;
    }

    try {
      const payment = await this.findPaymentByReference(event.reference);
      if (!payment) {
        this.logger.warn(`Payment not found for reference: ${event.reference}`);
        return;
      }

      await this.paymentsService.updatePaymentStatus(payment.id, {
        status: PaymentStatus.FAILED,
        processorId:
          event.data.id.toString() || event.data.payment_id.toString(),
        processorResponse: event.data,
        processor: this.getPaymentProvider(),
      });

      this.logger.log(
        `Payment ${payment.id} marked as failed for reference: ${event.reference}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle payment failure for reference: ${event.reference}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle pending payment webhook
   */
  protected async handlePaymentPending(event: WebhookEvent): Promise<void> {
    if (!event.reference) {
      this.logger.warn('Payment pending event missing reference');
      return;
    }

    try {
      const payment = await this.findPaymentByReference(event.reference);
      if (!payment) {
        this.logger.warn(`Payment not found for reference: ${event.reference}`);
        return;
      }

      await this.paymentsService.updatePaymentStatus(payment.id, {
        status: PaymentStatus.PENDING,
        processorId:
          event.data.id.toString() || event.data.payment_id.toString(),
        processorResponse: event.data,
      });

      this.logger.log(
        `Payment ${payment.id} marked as pending for reference: ${event.reference}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle payment pending for reference: ${event.reference}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Handle refund webhook
   */
  protected async handleRefund(event: WebhookEvent): Promise<void> {
    if (!event.reference) {
      this.logger.warn('Refund event missing reference');
      return;
    }

    try {
      const payment = await this.findPaymentByReference(event.reference);
      if (!payment) {
        this.logger.warn(`Payment not found for reference: ${event.reference}`);
        return;
      }

      // Update payment with refund information
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          refundAmount: event.amount,
          refundReason: event.data.reason || 'Webhook refund',
          refundedAt: new Date(),
          processorResponse: event.data,
        },
      });

      this.logger.log(
        `Refund processed for payment ${payment.id}, reference: ${event.reference}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to handle refund for reference: ${event.reference}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Find payment by reference
   */
  protected async findPaymentByReference(reference: string) {
    // First, let's check how many payments match this reference
    const paymentCount = await this.prisma.payment.count({
      where: {
        OR: [
          { reference },
          { processorId: reference },
          { invoiceNumber: reference },
        ],
      },
    });

    this.logger.log(
      `Found ${paymentCount} payments matching reference: ${reference}`,
    );

    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          { reference },
          { processorId: reference },
          { invoiceNumber: reference },
        ],
      },
      select: {
        id: true,
        submissionId: true,
        upgradeApplicationId: true,
        status: true,
        reference: true,
        processorId: true,
        invoiceNumber: true,
        userId: true,
        amount: true,
        currency: true,
        submission: {
          select: {
            id: true,
            status: true,
            referenceNumber: true,
          },
        },
      },
    });

    if (payment) {
      this.logger.log(
        `Found payment ${payment.id} with submissionId: ${
          payment.submissionId || 'NULL'
        }, submission: ${payment.submission ? 'EXISTS' : 'NULL'}`,
      );
    } else {
      this.logger.warn(`No payment found for reference: ${reference}`);
    }

    return payment;
  }

  /**
   * Normalize event type across providers
   */
  protected getEventType(event: string): string {
    const lowerEvent = event.toLowerCase();

    if (
      lowerEvent.includes('success') ||
      lowerEvent.includes('completed') ||
      lowerEvent.includes('succeeded')
    ) {
      return 'payment_success';
    }

    if (
      lowerEvent.includes('failed') ||
      lowerEvent.includes('decline') ||
      lowerEvent.includes('error')
    ) {
      return 'payment_failed';
    }

    if (lowerEvent.includes('pending') || lowerEvent.includes('processing')) {
      return 'payment_pending';
    }

    if (lowerEvent.includes('refund')) {
      return 'refund';
    }

    return 'unknown';
  }

  /**
   * Get the payment provider enum value for this handler
   */
  protected getPaymentProvider(): PaymentProvider {
    const providerName = this.getProviderName();
    switch (providerName) {
      case 'FLUTTERWAVE':
        return PaymentProvider.FLUTTERWAVE;
      case 'PAYSTACK':
        return PaymentProvider.PAYSTACK;
      case 'FINCRA':
        return PaymentProvider.FINCRA;
      case 'STRIPE':
        return PaymentProvider.STRIPE;
      default:
        throw new Error(`Unknown payment provider: ${providerName}`);
    }
  }

  /**
   * Convert amount to smallest currency unit (e.g., kobo for NGN)
   */
  protected normalizeAmount(amount: number | string, currency: string): number {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

    // Most African currencies use kobo/cents (100 units)
    if (['NGN', 'GHS', 'KES', 'UGX'].includes(currency.toUpperCase())) {
      return Math.round(numAmount * 100);
    }

    // USD, EUR use cents
    if (['USD', 'EUR', 'GBP'].includes(currency.toUpperCase())) {
      return Math.round(numAmount * 100);
    }

    return Math.round(numAmount);
  }

  /**
   * Check for duplicate events to ensure idempotency
   */
  private async checkForDuplicateEvent(event: WebhookEvent): Promise<boolean> {
    if (!event.reference) {
      return false;
    }

    try {
      // Find payment and check if it's already in the target status
      const payment = await this.findPaymentByReference(event.reference);
      if (!payment) {
        return false;
      }

      // If payment is already in the status this event would set it to, it's a duplicate
      const targetStatus = this.getTargetStatusForEvent(event.event);
      if (targetStatus && payment.status === targetStatus) {
        this.logger.log(
          `Payment ${payment.id} is already in status ${targetStatus}, treating as duplicate`,
        );
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(
        `Error checking for duplicate event: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }

  /**
   * Record processed event for audit trail
   */
  private async recordProcessedEvent(event: WebhookEvent): Promise<void> {
    try {
      // In a full implementation, you might want to store processed webhook events
      // in a separate table for audit purposes
      this.logger.log(
        `Recorded processed event: ${event.event} for reference: ${event.reference}`,
      );
    } catch (error) {
      this.logger.error(
        `Error recording processed event: ${error.message}`,
        error.stack,
      );
      // Don't throw - this shouldn't fail the webhook processing
    }
  }

  /**
   * Get the target payment status for a given event type
   */
  private getTargetStatusForEvent(eventType: string): PaymentStatus | null {
    const normalizedEvent = this.getEventType(eventType);

    switch (normalizedEvent) {
      case 'payment_success':
        return PaymentStatus.COMPLETED;
      case 'payment_failed':
        return PaymentStatus.FAILED;
      case 'payment_pending':
        return PaymentStatus.PENDING;
      default:
        return null;
    }
  }

  /**
   * Activate biometric appointment after successful payment
   */
  private async activateBiometricAppointment(
    submissionId: string,
  ): Promise<void> {
    this.logger.log(
      `🔍 Looking for biometric appointment for submission ${submissionId}`,
    );

    try {
      const appointment = await this.prisma.biometricAppointment.findUnique({
        where: { submissionId },
        select: { id: true, status: true },
      });

      if (!appointment) {
        this.logger.warn(
          `⚠️ No biometric appointment found for submission ${submissionId}`,
        );
        return;
      }

      this.logger.log(
        `Found biometric appointment ${appointment.id} with status: ${appointment.status}`,
      );

      if (appointment.status === 'PENDING') {
        const updated = await this.prisma.biometricAppointment.update({
          where: { id: appointment.id },
          data: { status: 'ACTIVE' },
        });
        this.logger.log(
          `✅ Biometric appointment ${appointment.id} successfully activated (${appointment.status} → ${updated.status}) for submission ${submissionId}`,
        );
      } else {
        this.logger.log(
          `ℹ️ Biometric appointment ${appointment.id} already has status ${appointment.status}, skipping activation`,
        );
      }
    } catch (error) {
      this.logger.error(
        `❌ Failed to activate biometric appointment for submission ${submissionId}: ${error.message}`,
        error.stack,
      );
      // Don't throw - this shouldn't fail the webhook processing
    }
  }
}
