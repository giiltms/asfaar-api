import { Logger } from '@nestjs/common';
import { Prisma, PrismaClient, PaymentStatus } from '@prisma/client';
import { MailService } from '@modules/mail/services/mail.service';

const prismaInternal = new PrismaClient();
const logger = new Logger('PaymentEmailMiddleware');

// We'll inject the mail service externally to avoid circular dependencies
let mailService: MailService | null = null;

export function setMailServiceForPaymentMiddleware(service: MailService) {
  mailService = service;
}

export async function sendPaymentConfirmationEmail(
  paymentId: string,
): Promise<void> {
  if (!mailService) {
    logger.warn('MailService not available for payment confirmation email');
    return;
  }

  try {
    // Get payment with all related data
    const payment = await prismaInternal.payment.findUnique({
      where: { id: paymentId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        submission: {
          select: {
            id: true,
            referenceNumber: true,
          },
        },
        serviceFees: {
          select: {
            serviceFee: {
              select: {
                feeType: true,
              },
            },
          },
        },
      },
    });

    if (!payment?.user) {
      logger.warn(
        `Cannot send payment confirmation email: missing user data for payment ${paymentId}`,
      );
      return;
    }

    const user = payment.user;
    const submission = payment.submission;

    // Format user name
    const userName =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.email.split('@')[0];

    // Format payment date
    const paymentDate = payment.paidAt
      ? payment.paidAt.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : new Date().toLocaleDateString();

    // Determine payment type from service fees
    const paymentTypes = payment.serviceFees
      .map((sf) => sf.serviceFee.feeType)
      .filter(Boolean);
    const primaryPaymentType =
      paymentTypes.length > 0 ? paymentTypes[0] : 'UNKNOWN';

    // Prepare email data
    const emailData = {
      userName,
      userEmail: user.email,
      referenceNumber: submission?.referenceNumber || 'N/A',
      paymentReference: payment.reference || payment.id,
      transactionId: payment.processorId || payment.id,
      amount: payment.amount,
      currency: payment.currency,
      paymentDate,
      applicationId: submission?.id || payment.id,
      paymentType: primaryPaymentType,
    };

    await mailService.sendPaymentConfirmation(emailData);

    logger.log(
      `Payment confirmation email sent for payment ${paymentId} to ${user.email}`,
    );
  } catch (error) {
    logger.error(
      `Failed to send payment confirmation email for payment ${paymentId}: ${
        (error as Error).message
      }`,
    );
    // Don't throw - this is a non-critical side effect
  }
}

export function paymentEmailMiddleware(): Prisma.Middleware {
  return async (params: Prisma.MiddlewareParams, next): Promise<any> => {
    if (params.model !== 'Payment') {
      return next(params);
    }

    if (params.action === 'update') {
      const data = params.args?.data || {};
      const where = params.args?.where || {};
      const newStatus: PaymentStatus | string | undefined = data.status;

      // Check if status is being updated to COMPLETED
      if (newStatus === PaymentStatus.COMPLETED || newStatus === 'COMPLETED') {
        try {
          // Get the current payment to check if status is actually changing
          const currentPayment = await prismaInternal.payment.findUnique({
            where,
            select: { id: true, status: true },
          });

          if (
            currentPayment &&
            currentPayment.status !== PaymentStatus.COMPLETED
          ) {
            // Status is changing to COMPLETED, proceed with update first
            const result = await next(params);

            // Note: Payment confirmation email is now sent by the reference number middleware
            // after the reference number is generated to ensure it's included in the email
            logger.log(
              `Payment ${currentPayment.id} marked as completed. Email will be sent after reference number generation.`,
            );

            return result;
          }
        } catch (error) {
          logger.error(
            `Error in payment email middleware: ${(error as Error).message}`,
          );
          // Continue with normal flow even if email logic fails
        }
      }
    }

    return next(params);
  };
}
