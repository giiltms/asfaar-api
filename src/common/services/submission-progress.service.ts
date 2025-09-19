import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { SubmissionStatus, PaymentStatus } from '@prisma/client';

export interface SubmissionProgress {
  progressPercentage: number;
  nextAction?: string;
  completedSteps: number;
  totalSteps: number;
  sectionDetails: {
    sectionId: string;
    sectionTitle: string;
    isCompleted: boolean;
    completedFields: number;
    totalFields: number;
  }[];
  stepDetails: {
    stepName: string;
    isCompleted: boolean;
    stepType: 'section' | 'biometric' | 'payment';
  }[];
}

@Injectable()
export class SubmissionProgressService {
  private readonly logger = new Logger(SubmissionProgressService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate submission progress based on completed sections
   * @param submissionId - Submission ID
   * @returns Progress information
   */
  async calculateProgress(submissionId: string): Promise<SubmissionProgress> {
    try {
      // Get submission with form and responses
      const submission = await this.prisma.formSubmission.findUnique({
        where: { id: submissionId },
        include: {
          form: {
            include: {
              sections: {
                include: {
                  groups: {
                    include: {
                      fields: {
                        select: {
                          id: true,
                          name: true,
                          required: true,
                          type: true,
                        },
                      },
                    },
                  },
                },
                orderBy: { order: 'asc' },
              },
            },
          },
          responses: {
            select: {
              fieldId: true,
              value: true,
              fileUrls: true,
            },
          },
          appointment: true,
          payment: true,
        },
      });

      if (!submission) {
        throw new Error(`Submission ${submissionId} not found`);
      }

      const sections = submission.form.sections;
      const responses = submission.responses;
      const responseFieldIds = new Set(responses.map((r) => r.fieldId));

      // Calculate section completion
      const sectionDetails = sections.map((section) => {
        const allFields = section.groups.flatMap((group) => group.fields);
        const completedFields = allFields.filter(
          (field) =>
            responseFieldIds.has(field.id) &&
            this.isFieldCompleted(field, responses),
        );

        return {
          sectionId: section.id,
          sectionTitle: section.title,
          isCompleted: this.isSectionCompleted(
            section,
            responses,
            responseFieldIds,
          ),
          completedFields: completedFields.length,
          totalFields: allFields.length,
        };
      });

      // Calculate section completion
      const completedSections = sectionDetails.filter(
        (s) => s.isCompleted,
      ).length;
      const totalSections = sections.length;

      // Debug section details
      this.logger.debug(
        `Section completion details for submission ${submissionId}:`,
        {
          sectionDetails: sectionDetails.map((s) => ({
            sectionTitle: s.sectionTitle,
            isCompleted: s.isCompleted,
            completedFields: s.completedFields,
            totalFields: s.totalFields,
          })),
          completedSections,
          totalSections,
        },
      );

      // Calculate additional steps (biometric appointment and payment)
      const biometricCompleted = !!submission.appointment; // Appointment is scheduled
      const paymentCompleted =
        submission.payment?.status === PaymentStatus.COMPLETED || false;

      // Debug logging
      this.logger.debug(`Submission ${submissionId} progress calculation:`, {
        totalSections,
        completedSections,
        hasAppointment: !!submission.appointment,
        appointmentId: submission.appointment?.id,
        hasPayment: !!submission.payment,
        paymentStatus: submission.payment?.status,
        paymentCompleted,
        biometricCompleted,
      });

      // Create step details
      const stepDetails = [
        ...sectionDetails.map((section) => ({
          stepName: section.sectionTitle,
          isCompleted: section.isCompleted,
          stepType: 'section' as const,
        })),
        {
          stepName: 'Schedule Biometric Appointment',
          isCompleted: biometricCompleted,
          stepType: 'biometric' as const,
        },
        {
          stepName: 'Application Payment',
          isCompleted: paymentCompleted,
          stepType: 'payment' as const,
        },
      ];

      // Calculate total progress
      const totalSteps = totalSections + 2; // sections + biometric + payment
      const completedSteps =
        completedSections +
        (biometricCompleted ? 1 : 0) +
        (paymentCompleted ? 1 : 0);
      const progressPercentage = Math.round(
        (completedSteps / totalSteps) * 100,
      );

      // Determine next action based on status and progress
      const nextAction = this.getNextAction(
        submission.status,
        progressPercentage,
        sectionDetails,
        stepDetails,
      );

      return {
        progressPercentage,
        nextAction,
        completedSteps,
        totalSteps,
        sectionDetails,
        stepDetails,
      };
    } catch (error) {
      this.logger.error(
        `Failed to calculate progress for submission ${submissionId}`,
        error.stack,
      );
      return {
        progressPercentage: 0,
        nextAction: 'Complete form sections',
        completedSteps: 0,
        totalSteps: 0,
        sectionDetails: [],
        stepDetails: [],
      };
    }
  }

  /**
   * Check if a section is completed
   * A section is completed if all required fields have valid responses
   */
  private isSectionCompleted(
    section: any,
    responses: any[],
    responseFieldIds: Set<string>,
  ): boolean {
    const allFields = section.groups.flatMap((group: any) => group.fields);
    const requiredFields = allFields.filter((field: any) => field.required);

    // If no required fields, section is completed if any field has a response
    if (requiredFields.length === 0) {
      return allFields.some((field: any) => responseFieldIds.has(field.id));
    }

    // Check if all required fields are completed
    return requiredFields.every(
      (field: any) =>
        responseFieldIds.has(field.id) &&
        this.isFieldCompleted(field, responses),
    );
  }

  /**
   * Check if a field is completed (has a valid response)
   */
  private isFieldCompleted(field: any, responses: any[]): boolean {
    const response = responses.find((r) => r.fieldId === field.id);
    if (!response) return false;

    // Check if field has a valid value
    if (field.type === 'FILE') {
      return response.fileUrls && response.fileUrls.length > 0;
    }

    if (field.type === 'BOOLEAN') {
      return response.value !== null && response.value !== undefined;
    }

    if (field.type === 'MULTISELECT') {
      return Array.isArray(response.value) && response.value.length > 0;
    }

    // For other field types, check if value is not null/undefined/empty
    return (
      response.value !== null &&
      response.value !== undefined &&
      response.value !== '' &&
      response.value !== '[]' &&
      response.value !== '{}'
    );
  }

  /**
   * Determine the next action based on submission status and progress
   */
  private getNextAction(
    status: SubmissionStatus,
    progressPercentage: number,
    sectionDetails: any[],
    stepDetails: any[],
  ): string {
    // If submission is already submitted or beyond, no further action needed
    if (status === 'SUBMITTED' || status === 'APPROVED') {
      return 'Application submitted - awaiting review';
    }

    if (status === 'CANCELLED') {
      return 'Application cancelled';
    }

    // If not all steps are completed, guide user to complete them
    if (progressPercentage < 100) {
      const incompleteSteps = stepDetails.filter((s) => !s.isCompleted);
      if (incompleteSteps.length > 0) {
        const nextStep = incompleteSteps[0];
        if (nextStep.stepType === 'section') {
          return `Complete section: ${nextStep.stepName}`;
        } else if (nextStep.stepType === 'biometric') {
          return 'Schedule biometric appointment';
        } else if (nextStep.stepType === 'payment') {
          return 'Complete payment to proceed';
        }
      }
    }

    // All steps completed but not submitted
    if (progressPercentage === 100 && status === 'DRAFT') {
      return 'Review and submit application';
    }

    // Payment required
    if (status === 'PENDING_PAYMENT') {
      return 'Complete payment to proceed';
    }

    // Biometric appointment required
    if (status === 'PENDING_BIOMETRICS') {
      return 'Schedule biometric appointment';
    }

    // Under review - check if status is in review states
    if (status === 'FLAGGED' || status === 'QUERIED') {
      return 'Application under review';
    }

    // Default action
    return 'Continue with application';
  }

  /**
   * Get progress for multiple submissions (for list views)
   * @param submissionIds - Array of submission IDs
   * @returns Map of submission ID to progress
   */
  async getBulkProgress(
    submissionIds: string[],
  ): Promise<Map<string, SubmissionProgress>> {
    const progressMap = new Map<string, SubmissionProgress>();

    // Process submissions in parallel
    const progressPromises = submissionIds.map(async (submissionId) => {
      try {
        const progress = await this.calculateProgress(submissionId);
        progressMap.set(submissionId, progress);
      } catch (error) {
        this.logger.error(
          `Failed to calculate progress for submission ${submissionId}`,
          error.stack,
        );
        // Set default progress for failed calculations
        progressMap.set(submissionId, {
          progressPercentage: 0,
          nextAction: 'Complete form sections',
          completedSteps: 0,
          totalSteps: 0,
          sectionDetails: [],
          stepDetails: [],
        });
      }
    });

    await Promise.all(progressPromises);
    return progressMap;
  }
}
