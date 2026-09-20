import { Prisma } from '@prisma/client';
import { Logger } from '@nestjs/common';
import {
  PaymentLookupClient,
  sendPaymentConfirmationEmail,
} from './payment-email.middleware';

/**
 * Reads through the live PrismaService rather than its own client, so it
 * shares the application's connection pool.
 */
export interface ReferenceNumberClient extends PaymentLookupClient {
  formSubmission: {
    findUnique(args: any): Promise<any>;
    update(args: any): Promise<any>;
  };
  payment: {
    findUnique(args: any): Promise<any>;
    findFirst(args: any): Promise<any>;
  };
  biometricAppointment: {
    findFirst(args: any): Promise<any>;
  };
  $transaction<T>(fn: (tx: any) => Promise<T>): Promise<T>;
}

const logger = new Logger('ReferenceNumberMiddleware');

export function referenceNumberMiddleware(
  client: ReferenceNumberClient,
): Prisma.Middleware {
  return async function middleware(params: Prisma.MiddlewareParams, next) {
    // Only process FormSubmission updates
    if (params.model === 'FormSubmission' && params.action === 'update') {
      const { data, where } = params.args;

      // Check if status is being changed to SUBMITTED
      if (data.status === 'SUBMITTED') {
        try {
          // Get the submission to check if it already has a reference number
          const submission = await client.formSubmission.findUnique({
            where,
            select: {
              id: true,
              referenceNumber: true,
              form: {
                include: {
                  country: {
                    select: { id: true, isoCode2: true },
                  },
                },
              },
            },
          });

          // If no reference number exists, generate one
          if (
            submission &&
            !submission.referenceNumber &&
            submission.form.country
          ) {
            logger.log(
              `Generating reference number for submitted application: ${submission.id}`,
            );

            // Use the original middleware logic for now since the service import is problematic
            // This ensures the middleware works exactly as it did before
            try {
              // Get the biometric appointment to find the center
              const appointment =
                await client.biometricAppointment.findFirst({
                  where: { submissionId: submission.id },
                  include: {
                    center: {
                      select: { centerNumber: true, name: true },
                    },
                  },
                });

              if (appointment && appointment.center) {
                const centerNumber = appointment.center.centerNumber;
                const centerName = appointment.center.name;

                logger.log(
                  `Found biometric appointment with center: ${centerName} (${centerNumber}) for submission: ${submission.id}`,
                );

                // Get or create application counter for this country/year
                const counter = await client.$transaction(
                  async (tx) => {
                    // Try to find existing counter
                    let applicationCounter =
                      await tx.applicationCounter.findUnique({
                        where: {
                          countryId_year: {
                            countryId: submission.form.country.id,
                            year: new Date().getFullYear(),
                          },
                        },
                      });

                    // Create counter if it doesn't exist
                    if (!applicationCounter) {
                      applicationCounter = await tx.applicationCounter.create({
                        data: {
                          countryId: submission.form.country.id,
                          year: new Date().getFullYear(),
                          counter: 1,
                        },
                      });
                    } else {
                      // Increment the counter
                      applicationCounter = await tx.applicationCounter.update({
                        where: {
                          countryId_year: {
                            countryId: submission.form.country.id,
                            year: new Date().getFullYear(),
                          },
                        },
                        data: {
                          counter: {
                            increment: 1,
                          },
                        },
                      });
                    }

                    return applicationCounter;
                  },
                );

                // Format the reference number: SA00125000004
                const yearSuffix = new Date()
                  .getFullYear()
                  .toString()
                  .slice(-2);
                const sequenceNumber = counter.counter
                  .toString()
                  .padStart(6, '0');
                const referenceNumber = `${submission.form.country.isoCode2.toUpperCase()}${centerNumber}${yearSuffix}${sequenceNumber}`;

                logger.log(
                  `Generated reference number ${referenceNumber} for submission: ${submission.id}`,
                );

                // Update the submission with the generated reference number
                await client.formSubmission.update({
                  where,
                  data: { referenceNumber },
                });

                // Now send payment confirmation email with the reference number
                try {
                  // Find the payment associated with this submission
                  const payment = await client.payment.findFirst({
                    where: { submissionId: submission.id },
                    select: { id: true },
                  });

                  if (payment) {
                    logger.log(
                      `Sending payment confirmation email for payment ${payment.id} with reference number ${referenceNumber}`,
                    );

                    // Send email asynchronously (don't block the response)
                    setImmediate(() => {
                      sendPaymentConfirmationEmail(client, payment.id).catch(
                        (error) => {
                          logger.error(
                            `Failed to send payment confirmation email for payment ${payment.id}: ${error.message}`,
                            error.stack,
                          );
                        },
                      );
                    });
                  } else {
                    logger.warn(
                      `No payment found for submission ${submission.id} to send confirmation email`,
                    );
                  }
                } catch (emailError) {
                  logger.error(
                    `Error sending payment confirmation email for submission ${submission.id}: ${emailError.message}`,
                    emailError.stack,
                  );
                }
              } else {
                logger.warn(
                  `No biometric appointment found for submission: ${submission.id}. Reference number will be generated when appointment is created.`,
                );
              }
            } catch (error) {
              logger.error(
                `Failed to generate reference number for submission ${submission.id}: ${error.message}`,
                error.stack,
              );
            }
          }
        } catch (error) {
          logger.error(
            `Failed to generate reference number for submission ${where.id}: ${error.message}`,
            error.stack,
          );
          // Don't fail the transaction, just log the error
        }
      }
    }

    // Continue with the original operation
    return next(params);
  };
}
