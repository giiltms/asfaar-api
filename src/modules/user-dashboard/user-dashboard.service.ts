import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import {
  SubmissionStatus,
  AppointmentStatus,
  PaymentStatus,
  QueueStatus,
} from '@prisma/client';
import {
  ApplicationStatsDto,
  ApplicationTimelineDto,
  ApplicationStageDto,
  QuickApplicationDto,
  UserDashboardDto,
  DashboardFiltersDto,
} from './dto/user-dashboard.dto';

@Injectable()
export class UserDashboardService {
  private readonly logger = new Logger(UserDashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get comprehensive user dashboard data
   */
  async getUserDashboard(userId: string): Promise<UserDashboardDto> {
    try {
      const [stats, recentApplications, actionRequired, upcomingAppointments] =
        await Promise.all([
          this.getApplicationStats(userId),
          this.getRecentApplications(userId, 5),
          this.getApplicationsRequiringAction(userId),
          this.getUpcomingAppointments(userId),
        ]);

      return {
        stats,
        recentApplications,
        actionRequired,
        upcomingAppointments,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get user dashboard: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get application statistics for user
   */
  async getApplicationStats(
    userId: string,
    filters?: DashboardFiltersDto,
  ): Promise<ApplicationStatsDto> {
    try {
      const where: any = { userId };

      // Apply filters
      if (filters?.fromDate || filters?.toDate) {
        where.createdAt = {};
        if (filters.fromDate) {
          where.createdAt.gte = new Date(filters.fromDate);
        }
        if (filters.toDate) {
          where.createdAt.lte = new Date(filters.toDate);
        }
      }

      if (filters?.status) {
        where.status = filters.status;
      }

      if (filters?.formId) {
        where.formId = filters.formId;
      }

      // Get counts by status
      const [
        totalApplications,
        draftApplications,
        submittedApplications,
        inReviewApplications,
        approvedApplications,
        rejectedApplications,
        withAppointments,
        withPayments,
        inQueue,
        biometricCompleted,
      ] = await Promise.all([
        this.prisma.formSubmission.count({ where }),
        this.prisma.formSubmission.count({
          where: { ...where, status: SubmissionStatus.DRAFT },
        }),
        this.prisma.formSubmission.count({
          where: { ...where, status: SubmissionStatus.SUBMITTED },
        }),
        this.prisma.formSubmission.count({
          where: { ...where, status: SubmissionStatus.REVIEWED },
        }),
        this.prisma.formSubmission.count({
          where: { ...where, status: SubmissionStatus.APPROVED },
        }),
        this.prisma.formSubmission.count({
          where: { ...where, status: SubmissionStatus.REJECTED },
        }),
        this.prisma.formSubmission.count({
          where: {
            ...where,
            appointment: { isNot: null },
          },
        }),
        this.prisma.formSubmission.count({
          where: {
            ...where,
            payment: { status: PaymentStatus.COMPLETED },
          },
        }),
        this.prisma.formSubmission.count({
          where: {
            ...where,
            appointment: {
              queueEntry: {
                status: {
                  in: [
                    QueueStatus.WAITING,
                    QueueStatus.CALLED,
                    QueueStatus.IN_PROGRESS,
                  ],
                },
              },
            },
          },
        }),
        this.prisma.formSubmission.count({
          where: {
            ...where,
            appointment: {
              queueEntry: { status: QueueStatus.COMPLETED },
            },
          },
        }),
      ]);

      // Calculate completion rate (approved / total non-draft)
      const nonDraftApplications = totalApplications - draftApplications;
      const completionRate =
        nonDraftApplications > 0
          ? (approvedApplications / nonDraftApplications) * 100
          : 0;

      return {
        totalApplications,
        draftApplications,
        submittedApplications,
        inReviewApplications,
        approvedApplications,
        rejectedApplications,
        withAppointments,
        withPayments,
        inQueue,
        biometricCompleted,
        completionRate: Math.round(completionRate * 100) / 100,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get application stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get detailed application timeline with stages
   */
  async getApplicationTimeline(
    userId: string,
    submissionId: string,
  ): Promise<ApplicationTimelineDto> {
    try {
      const submission = await this.prisma.formSubmission.findFirst({
        where: { id: submissionId, userId },
        include: {
          form: { select: { id: true, name: true } },
          appointment: {
            include: {
              center: { select: { name: true } },
              queueEntry: true,
              biometricSession: true,
            },
          },
          payment: true,
        },
      });

      if (!submission) {
        throw new NotFoundException('Application not found');
      }

      // Build stages timeline
      const stages = this.buildApplicationStages(submission);

      // Calculate progress percentage and next action
      const { progressPercentage, nextAction } =
        this.calculateProgress(submission);

      // Calculate days since submission
      const daysSinceSubmission = submission.submittedAt
        ? Math.floor(
            (Date.now() - submission.submittedAt.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : Math.floor(
            (Date.now() - submission.createdAt.getTime()) /
              (1000 * 60 * 60 * 24),
          );

      // Estimate completion date
      const estimatedCompletion = this.estimateCompletionDate(submission);

      return {
        submissionId: submission.id,
        formName: submission.form.name,
        currentStatus: submission.status,
        stages,
        estimatedCompletion,
        daysSinceSubmission,
        nextAction,
        progressPercentage,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get application timeline: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get recent applications
   */
  async getRecentApplications(
    userId: string,
    limit = 5,
  ): Promise<QuickApplicationDto[]> {
    try {
      const submissions = await this.prisma.formSubmission.findMany({
        where: { userId },
        include: {
          form: { select: { id: true, name: true } },
          appointment: {
            include: {
              center: { select: { name: true } },
              queueEntry: true,
            },
          },
          payment: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });

      return submissions.map((submission) =>
        this.mapToQuickApplicationDto(submission),
      );
    } catch (error) {
      this.logger.error(
        `Failed to get recent applications: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get applications requiring user action
   */
  async getApplicationsRequiringAction(
    userId: string,
  ): Promise<QuickApplicationDto[]> {
    try {
      const submissions = await this.prisma.formSubmission.findMany({
        where: {
          userId,
          OR: [
            // Draft applications (need completion)
            { status: SubmissionStatus.DRAFT },
            // Approved applications without payment
            {
              status: SubmissionStatus.APPROVED,
              payment: { is: null },
            },
            // Approved applications with failed payment
            {
              status: SubmissionStatus.APPROVED,
              payment: {
                status: { in: [PaymentStatus.FAILED, PaymentStatus.CANCELLED] },
              },
            },
            // Applications with appointments but not in queue
            {
              status: SubmissionStatus.APPROVED,
              appointment: {
                status: AppointmentStatus.ACTIVE,
                queueEntry: null,
              },
            },
            // Applications called to booth
            {
              appointment: {
                queueEntry: { status: QueueStatus.CALLED },
              },
            },
          ],
        },
        include: {
          form: { select: { id: true, name: true } },
          appointment: {
            include: {
              center: { select: { name: true } },
              queueEntry: true,
            },
          },
          payment: true,
        },
        orderBy: { updatedAt: 'desc' },
      });

      return submissions.map((submission) =>
        this.mapToQuickApplicationDto(submission),
      );
    } catch (error) {
      this.logger.error(
        `Failed to get applications requiring action: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get upcoming appointments
   */
  async getUpcomingAppointments(
    userId: string,
  ): Promise<QuickApplicationDto[]> {
    try {
      const submissions = await this.prisma.formSubmission.findMany({
        where: {
          userId,
          appointment: {
            appointmentDate: { gte: new Date() },
            status: {
              in: [AppointmentStatus.PENDING, AppointmentStatus.ACTIVE],
            },
          },
        },
        include: {
          form: { select: { id: true, name: true } },
          appointment: {
            include: {
              center: { select: { name: true } },
              queueEntry: true,
            },
          },
          payment: true,
        },
        orderBy: {
          appointment: { appointmentDate: 'asc' },
        },
      });

      return submissions.map((submission) =>
        this.mapToQuickApplicationDto(submission),
      );
    } catch (error) {
      this.logger.error(
        `Failed to get upcoming appointments: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Private helper: Build application stages with timestamps
   */
  private buildApplicationStages(submission: any): ApplicationStageDto[] {
    const stages: ApplicationStageDto[] = [];

    // Stage 1: Application Created
    stages.push({
      stageName: 'Application Created',
      status: 'COMPLETED',
      timestamp: submission.createdAt,
      notes: 'Application draft created',
    });

    // Stage 2: Application Submitted
    if (submission.submittedAt) {
      stages.push({
        stageName: 'Application Submitted',
        status: 'COMPLETED',
        timestamp: submission.submittedAt,
        notes: 'Application submitted for review',
      });
    } else if (submission.status !== SubmissionStatus.DRAFT) {
      stages.push({
        stageName: 'Application Submitted',
        status: 'PENDING',
        timestamp: new Date(),
        notes: 'Waiting for submission',
      });
    }

    // Stage 3: Under Review
    if (
      submission.status === SubmissionStatus.REVIEWED &&
      submission.reviewedAt
    ) {
      stages.push({
        stageName: 'Under Review',
        status: 'COMPLETED',
        timestamp: submission.reviewedAt,
        notes: submission.reviewNotes || 'Application reviewed by staff',
        processedBy: submission.reviewedBy,
      });
    } else if (
      [
        SubmissionStatus.REVIEWED,
        SubmissionStatus.APPROVED,
        SubmissionStatus.REJECTED,
      ].includes(submission.status)
    ) {
      stages.push({
        stageName: 'Under Review',
        status:
          submission.status === SubmissionStatus.REVIEWED
            ? 'IN_PROGRESS'
            : 'COMPLETED',
        timestamp: submission.reviewedAt || new Date(),
        notes: 'Application being reviewed',
      });
    }

    // Stage 4: Decision
    if (submission.status === SubmissionStatus.APPROVED) {
      stages.push({
        stageName: 'Application Approved',
        status: 'COMPLETED',
        timestamp: submission.reviewedAt || submission.updatedAt,
        notes: submission.reviewNotes || 'Application approved for processing',
        processedBy: submission.reviewedBy,
      });
    } else if (submission.status === SubmissionStatus.REJECTED) {
      stages.push({
        stageName: 'Application Rejected',
        status: 'FAILED',
        timestamp: submission.reviewedAt || submission.updatedAt,
        notes: submission.reviewNotes || 'Application rejected',
        processedBy: submission.reviewedBy,
      });
      return stages; // Stop here for rejected applications
    }

    // Stage 5: Payment
    if (submission.payment) {
      if (submission.payment.status === PaymentStatus.COMPLETED) {
        stages.push({
          stageName: 'Payment Completed',
          status: 'COMPLETED',
          timestamp: submission.payment.paidAt || submission.payment.createdAt,
          notes: `Payment of ${submission.payment.amount} ${submission.payment.currency} completed`,
        });
      } else if (submission.payment.status === PaymentStatus.FAILED) {
        stages.push({
          stageName: 'Payment Failed',
          status: 'FAILED',
          timestamp:
            submission.payment.failedAt || submission.payment.updatedAt,
          notes: 'Payment failed - please retry',
        });
      } else {
        stages.push({
          stageName: 'Payment Pending',
          status: 'IN_PROGRESS',
          timestamp: submission.payment.createdAt,
          notes: 'Waiting for payment completion',
        });
      }
    } else if (submission.status === SubmissionStatus.APPROVED) {
      stages.push({
        stageName: 'Payment Required',
        status: 'PENDING',
        timestamp: new Date(),
        notes: 'Payment required to proceed',
      });
    }

    // Stage 6: Appointment Scheduled
    if (submission.appointment) {
      stages.push({
        stageName: 'Biometric Appointment Scheduled',
        status:
          submission.appointment.status === AppointmentStatus.ACTIVE
            ? 'COMPLETED'
            : 'IN_PROGRESS',
        timestamp: submission.appointment.createdAt,
        notes: `Appointment scheduled at ${
          submission.appointment.center?.name
        } on ${submission.appointment.appointmentDate.toDateString()}`,
      });

      // Stage 7: Queue Status
      if (submission.appointment.queueEntry) {
        const queue = submission.appointment.queueEntry;
        if (queue.status === QueueStatus.COMPLETED) {
          stages.push({
            stageName: 'Biometric Capture Completed',
            status: 'COMPLETED',
            timestamp: queue.completedAt || queue.updatedAt,
            notes: 'Biometric data captured successfully',
          });
        } else if (queue.status === QueueStatus.IN_PROGRESS) {
          stages.push({
            stageName: 'Biometric Capture in Progress',
            status: 'IN_PROGRESS',
            timestamp: queue.startedAt || queue.calledAt || queue.joinedAt,
            notes: 'Currently capturing biometric data',
          });
        } else if (queue.status === QueueStatus.CALLED) {
          stages.push({
            stageName: 'Called to Booth',
            status: 'IN_PROGRESS',
            timestamp: queue.calledAt || queue.joinedAt,
            notes: `Called to booth - Queue #${queue.queueNumber}`,
          });
        } else if (queue.status === QueueStatus.WAITING) {
          stages.push({
            stageName: 'In Queue',
            status: 'IN_PROGRESS',
            timestamp: queue.joinedAt,
            notes: `In queue - Position #${queue.queueNumber}`,
          });
        }
      }
    }

    return stages;
  }

  /**
   * Private helper: Calculate progress percentage and next action
   */
  private calculateProgress(submission: any): {
    progressPercentage: number;
    nextAction?: string;
  } {
    let progressPercentage = 10; // Base for creation
    let nextAction = 'Complete application';

    if (submission.submittedAt) {
      progressPercentage = 25;
      nextAction = 'Wait for review';
    }

    if (submission.status === SubmissionStatus.REVIEWED) {
      progressPercentage = 50;
      nextAction = 'Wait for decision';
    }

    if (submission.status === SubmissionStatus.APPROVED) {
      progressPercentage = 60;
      nextAction = 'Complete payment';
    }

    if (submission.payment?.status === PaymentStatus.COMPLETED) {
      progressPercentage = 75;
      nextAction = 'Attend biometric appointment';
    }

    if (submission.appointment?.queueEntry) {
      const queue = submission.appointment.queueEntry;
      if (queue.status === QueueStatus.WAITING) {
        progressPercentage = 85;
        nextAction = 'Wait in queue';
      } else if (queue.status === QueueStatus.CALLED) {
        progressPercentage = 90;
        nextAction = 'Go to assigned booth';
      } else if (queue.status === QueueStatus.IN_PROGRESS) {
        progressPercentage = 95;
        nextAction = 'Complete biometric capture';
      } else if (queue.status === QueueStatus.COMPLETED) {
        progressPercentage = 100;
        nextAction = undefined;
      }
    }

    if (submission.status === SubmissionStatus.REJECTED) {
      progressPercentage = 0;
      nextAction = 'Application rejected';
    }

    return { progressPercentage, nextAction };
  }

  /**
   * Private helper: Estimate completion date
   */
  private estimateCompletionDate(submission: any): Date | undefined {
    if (submission.status === SubmissionStatus.REJECTED) return undefined;
    if (submission.appointment?.queueEntry?.status === QueueStatus.COMPLETED)
      return undefined;

    // Base estimates (these could be configurable)
    const now = new Date();
    let daysToAdd = 0;

    if (submission.status === SubmissionStatus.DRAFT) {
      daysToAdd = 14; // 2 weeks for completion
    } else if (submission.status === SubmissionStatus.SUBMITTED) {
      daysToAdd = 7; // 1 week for review
    } else if (submission.status === SubmissionStatus.REVIEWED) {
      daysToAdd = 3; // 3 days for decision
    } else if (
      submission.status === SubmissionStatus.APPROVED &&
      !submission.payment
    ) {
      daysToAdd = 30; // 30 days to complete payment
    } else if (
      submission.payment?.status === PaymentStatus.COMPLETED &&
      !submission.appointment
    ) {
      daysToAdd = 14; // 2 weeks to schedule appointment
    } else if (submission.appointment && !submission.appointment.queueEntry) {
      const appointmentDate = new Date(submission.appointment.appointmentDate);
      return appointmentDate > now ? appointmentDate : undefined;
    }

    if (daysToAdd > 0) {
      const estimated = new Date(now);
      estimated.setDate(estimated.getDate() + daysToAdd);
      return estimated;
    }

    return undefined;
  }

  /**
   * Private helper: Map to QuickApplicationDto
   */
  private mapToQuickApplicationDto(submission: any): QuickApplicationDto {
    const { progressPercentage, nextAction } =
      this.calculateProgress(submission);

    const result: QuickApplicationDto = {
      id: submission.id,
      formName: submission.form.name,
      status: submission.status,
      submittedAt: submission.submittedAt,
      updatedAt: submission.updatedAt,
      progressPercentage,
      nextAction,
    };

    // Add appointment details if exists
    if (submission.appointment) {
      result.appointment = {
        id: submission.appointment.id,
        appointmentDate: submission.appointment.appointmentDate,
        appointmentTime: submission.appointment.appointmentTime,
        status: submission.appointment.status,
        centerName: submission.appointment.center?.name || 'Unknown Center',
      };

      // Add queue details if in queue
      if (submission.appointment.queueEntry) {
        const queue = submission.appointment.queueEntry;
        result.queue = {
          id: queue.id,
          queueNumber: queue.queueNumber,
          status: queue.status,
          position: 0, // Would need to calculate actual position
          estimatedWaitTime: queue.estimatedWaitTime || 0,
        };
      }
    }

    // Add payment details if exists
    if (submission.payment) {
      result.payment = {
        id: submission.payment.id,
        amount: submission.payment.amount,
        currency: submission.payment.currency,
        status: submission.payment.status,
        paidAt: submission.payment.paidAt,
      };
    }

    return result;
  }
}
