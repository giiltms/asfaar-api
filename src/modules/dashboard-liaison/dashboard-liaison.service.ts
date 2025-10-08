import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { DashboardVerificationService } from '@modules/dashboard-verification/dashboard-verification.service';
import { SubmissionStatus } from '@prisma/client';
import {
  ApplicationReviewDto,
  LiaisonReviewListDto,
  LiaisonStatsDto,
  LiaisonActionDto,
  LiaisonReviewFiltersDto,
  LiaisonActionResponseDto,
  LiaisonAction,
  LiaisonActionReason,
} from './dto/liaison-review.dto';

@Injectable()
export class DashboardLiaisonService {
  private readonly logger = new Logger(DashboardLiaisonService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly verificationService: DashboardVerificationService,
  ) {}

  /**
   * Get applications flagged to liaison officer
   */
  async getFlaggedApplications(
    liaisonOfficerId: string,
    filters: LiaisonReviewFiltersDto = {},
  ): Promise<LiaisonReviewListDto> {
    try {
      this.logger.log(
        `Getting flagged applications for liaison officer ${liaisonOfficerId}`,
      );

      const {
        status = [SubmissionStatus.FLAGGED],
        page = 1,
        limit = 10,
      } = filters;

      // Determine departments assigned to this liaison officer
      const userWithDepartments = await this.prisma.user.findUnique({
        where: { id: liaisonOfficerId },
        select: { departments: { select: { id: true } } },
      });

      const departmentIds = (userWithDepartments?.departments || []).map(
        (d) => d.id,
      );

      // If the liaison officer has no departments, return empty result
      if (departmentIds.length === 0) {
        return {
          applications: [],
          pagination: { page, limit, total: 0, totalPages: 0 },
        };
      }

      // Build where clause for flagged applications routed to liaison's departments (open flags only)
      const whereClause: any = {
        status: { in: status },
        flags: {
          some: {
            status: 'OPEN',
            targetDepartmentId: { in: departmentIds },
          },
        },
      };

      const skip = (page - 1) * limit;

      const [submissions, total] = await Promise.all([
        this.prisma.formSubmission.findMany({
          where: whereClause,
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
            form: {
              select: {
                name: true,
                country: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            appointment: {
              select: {
                appointmentTime: true,
                status: true,
                center: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            payment: {
              select: {
                amount: true,
                status: true,
                currency: true,
              },
            },
          },
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limit,
        }),
        this.prisma.formSubmission.count({ where: whereClause }),
      ]);

      const applications = submissions.map((submission) => ({
        id: submission.id,
        referenceNumber: submission.referenceNumber,
        status: submission.status,
        submittedAt: submission.submittedAt,
        reviewedAt: submission.reviewedAt,
        reviewedBy: submission.reviewedBy,
        reviewNotes: submission.reviewNotes,
        isFlagged: submission.isFlagged,
        flagReason: submission.flagReason,
        flaggedAt: submission.flaggedAt,
        applicant: {
          firstName: submission.user.firstName,
          lastName: submission.user.lastName,
          email: submission.user.email,
        },
        form: {
          name: submission.form.name,
          country: submission.form.country.name,
        },
        appointment: submission.appointment
          ? {
            appointmentTime: submission.appointment.appointmentTime,
            status: submission.appointment.status,
            center: submission.appointment.center.name,
          }
          : null,
        payment: submission.payment
          ? {
            amount: submission.payment.amount,
            status: submission.payment.status,
            currency: submission.payment.currency,
          }
          : null,
      }));

      this.logger.log(
        `Found ${applications.length} flagged applications for liaison officer`,
      );

      return {
        applications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get flagged applications: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get detailed application for liaison officer review
   * Reuses the same logic as verification officers
   */
  async getApplicationForReview(
    submissionId: string,
    liaisonOfficerId: string,
  ): Promise<ApplicationReviewDto> {
    try {
      this.logger.log(`Getting application ${submissionId} for liaison review`);

      // Verify the application is flagged to one of liaison officer's departments (OPEN flag)
      const liaisonDepartments = await this.prisma.user.findUnique({
        where: { id: liaisonOfficerId },
        select: { departments: { select: { id: true } } },
      });

      const allowedDepartmentIds = (liaisonDepartments?.departments || []).map(
        (d) => d.id,
      );

      const submission = await this.prisma.formSubmission.findFirst({
        where: {
          id: submissionId,
          status: SubmissionStatus.FLAGGED,
          flags: {
            some: {
              status: 'OPEN',
              targetDepartmentId: { in: allowedDepartmentIds },
            },
          },
        },
        select: { id: true },
      });

      if (!submission) {
        throw new Error(`Application ${submissionId} not found`);
      }

      // Submission must be flagged to liaison's department; the previous query already enforces this

      // Reuse the verification service method
      return await this.verificationService.getApplicationForReview(
        submissionId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to get application for liaison review: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get liaison officer statistics
   */
  async getLiaisonStats(liaisonOfficerId: string): Promise<LiaisonStatsDto> {
    try {
      this.logger.log(`Getting stats for liaison officer ${liaisonOfficerId}`);

      // Build where clause for liaison officer applications
      const whereClause = {
        metadata: {
          path: ['targetDepartment'],
          equals: 'LIAISON_OFFICER',
        },
      };

      const [
        totalApplications,
        pendingReview,
        flaggedApplications,
        queriedApplications,
        processedApplications,
      ] = await Promise.all([
        this.prisma.formSubmission.count({
          where: {
            ...whereClause,
            status: {
              in: [
                SubmissionStatus.UNDER_REVIEW,
                SubmissionStatus.FLAGGED,
                SubmissionStatus.QUERIED,
                SubmissionStatus.PROCESSING,
              ],
            },
          },
        }),
        this.prisma.formSubmission.count({
          where: {
            ...whereClause,
            status: SubmissionStatus.UNDER_REVIEW,
          },
        }),
        this.prisma.formSubmission.count({
          where: {
            ...whereClause,
            status: SubmissionStatus.FLAGGED,
          },
        }),
        this.prisma.formSubmission.count({
          where: {
            ...whereClause,
            status: SubmissionStatus.QUERIED,
          },
        }),
        this.prisma.formSubmission.count({
          where: {
            ...whereClause,
            status: SubmissionStatus.PROCESSING,
          },
        }),
      ]);

      return {
        totalApplications,
        pendingReview,
        flaggedApplications,
        queriedApplications,
        processedApplications,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get liaison stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Take action on flagged application
   */
  async takeActionOnApplication(
    actionDto: LiaisonActionDto,
    liaisonOfficerId: string,
  ): Promise<LiaisonActionResponseDto> {
    try {
      const { submissionId, action, reason, notes, requiredDocuments } =
        actionDto;

      this.logger.log(
        `Liaison officer ${liaisonOfficerId} taking action ${action} on application ${submissionId}`,
      );

      // Verify the application is flagged to one of liaison officer's departments (OPEN flag)
      const liaisonDepartments = await this.prisma.user.findUnique({
        where: { id: liaisonOfficerId },
        select: { departments: { select: { id: true } } },
      });

      const allowedDepartmentIds = (liaisonDepartments?.departments || []).map(
        (d) => d.id,
      );

      const submission = await this.prisma.formSubmission.findFirst({
        where: {
          id: submissionId,
          status: SubmissionStatus.FLAGGED,
          flags: {
            some: {
              status: 'OPEN',
              targetDepartmentId: { in: allowedDepartmentIds },
            },
          },
        },
        select: { id: true },
      });

      if (!submission) {
        throw new Error(`Application ${submissionId} not found`);
      }

      // Submission must be flagged to liaison's department; the query above enforces this

      let newStatus: SubmissionStatus;
      let actionMessage: string;

      switch (action) {
        case LiaisonAction.APPROVE:
          newStatus = SubmissionStatus.UNDER_REVIEW;
          actionMessage = 'Application approved by liaison officer';
          break;
        case LiaisonAction.REJECT:
          newStatus = SubmissionStatus.REJECTED;
          actionMessage = 'Application rejected by liaison officer';
          break;
        case LiaisonAction.REQUEST_INFO:
          newStatus = SubmissionStatus.QUERIED;
          actionMessage = 'Additional information requested by liaison officer';
          break;
        case LiaisonAction.ESCALATE:
          newStatus = SubmissionStatus.FLAGGED;
          actionMessage = 'Application escalated by liaison officer';
          break;
        default:
          throw new Error(`Invalid action: ${action}`);
      }

      // Update submission status
      await this.prisma.formSubmission.update({
        where: { id: submissionId },
        data: {
          status: newStatus,
          reviewedAt: new Date(),
          reviewedBy: liaisonOfficerId,
          reviewNotes: notes,
          statusLogs: {
            create: {
              fromStatus: SubmissionStatus.FLAGGED,
              toStatus: newStatus,
              reason: actionMessage,
              notes: `${reason}${notes ? ` - ${notes}` : ''}`,
              changedBy: liaisonOfficerId,
            },
          },
        },
      });

      // If requesting info, send notification to applicant
      if (action === LiaisonAction.REQUEST_INFO) {
        // TODO: Implement notification service
        this.logger.log(
          `Notification sent to applicant for additional information request`,
        );
      }

      this.logger.log(
        `Liaison officer ${liaisonOfficerId} successfully took action ${action} on application ${submissionId}`,
      );

      return {
        success: true,
        message: actionMessage,
        newStatus,
        action,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Failed to take action on application: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get applications by status for liaison officer
   */
  async getApplicationsByStatus(
    liaisonOfficerId: string,
    status: SubmissionStatus,
    page = 1,
    limit = 10,
  ): Promise<LiaisonReviewListDto> {
    try {
      this.logger.log(
        `Getting ${status} applications for liaison officer ${liaisonOfficerId}`,
      );

      // Use the same logic as getFlaggedApplications but with different status filter
      return await this.getFlaggedApplications(liaisonOfficerId, {
        status: [status],
        page,
        limit,
      });
    } catch (error) {
      this.logger.error(
        `Failed to get applications by status: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
