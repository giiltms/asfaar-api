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

async function sendPaymentConfirmationEmail(paymentId: string): Promise<void> {
  if (!mailService) {
    logger.warn('MailService not available for payment confirmation email');
    return;
  }

  try {
    // Get payment with all related data
    const payment = await prismaInternal.payment.findUnique({
      where: { id: paymentId },
      include: {
        submission: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            form: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!payment?.submission?.user) {
      logger.warn(
        `Cannot send payment confirmation email: missing user data for payment ${paymentId}`,
      );
      return;
    }

    const user = payment.submission.user;
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

    // Prepare email data
    const emailData = {
      userName,
      userEmail: user.email,
      referenceNumber: submission.referenceNumber || 'N/A',
      paymentReference: payment.reference || payment.id,
      transactionId: payment.processorId || payment.id,
      amount: payment.amount,
      currency: payment.currency,
      paymentDate,
      applicationId: submission.id,
    };

    await mailService.sendPaymentConfirmation(emailData);

    logger.log(`Payment confirmation email sent for payment ${paymentId} to ${user.email}`);
  } catch (error) {
    logger.error(
      `Failed to send payment confirmation email for payment ${paymentId}: ${(error as Error).message}`,
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

          if (currentPayment && currentPayment.status !== PaymentStatus.COMPLETED) {
            // Status is changing to COMPLETED, proceed with update first
            const result = await next(params);

            // Then send email asynchronously (don't block the response)
            setImmediate(() => {
              sendPaymentConfirmationEmail(currentPayment.id).catch((error) => {
                logger.error(
                  `Async email send failed for payment ${currentPayment.id}: ${error.message}`,
                );
              });
            });

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