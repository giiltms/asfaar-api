import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { DashboardVerificationService } from '@modules/dashboard-verification/dashboard-verification.service';
import { MailService } from '@modules/mail/services/mail.service';
import { SubmissionStatus } from '@prisma/client';
import {
  ApplicationReviewDto,
  EmbassyReviewListDto,
  EmbassyStatsDto,
  EmbassyActionDto,
  EmbassyReviewFiltersDto,
  EmbassyActionResponseDto,
} from './dto/embassy-review.dto';

@Injectable()
export class DashboardEmbassyService {
  private readonly logger = new Logger(DashboardEmbassyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly verificationService: DashboardVerificationService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Get applications for embassy officer's country
   */
  async getApplicationsForCountry(
    embassyOfficerId: string,
    countryCode: string,
    filters: EmbassyReviewFiltersDto = {},
  ): Promise<EmbassyReviewListDto> {
    try {
      this.logger.log(
        `Getting applications for country ${countryCode} for embassy officer ${embassyOfficerId}`,
      );

      const {
        status = [SubmissionStatus.PROCESSING],
        priority,
        search,
        dateFrom,
        dateTo,
        page = 1,
        limit = 10,
      } = filters;

      // First get the country ID
      const country = await this.prisma.country.findUnique({
        where: { isoCode2: countryCode },
        select: { id: true },
      });

      if (!country) {
        throw new Error(`Country with code ${countryCode} not found`);
      }

      // Build where clause for embassy applications
      const whereClause: any = {
        form: {
          countryId: country.id,
        },
        status: { in: status },
      };

      // Add priority filter
      if (priority) {
        whereClause.metadata = {
          path: ['priority'],
          equals: priority,
        };
      }

      // Add search filter
      if (search) {
        whereClause.OR = [
          { referenceNumber: { contains: search, mode: 'insensitive' } },
          {
            user: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        ];
      }

      // Add date range filter
      if (dateFrom || dateTo) {
        whereClause.submittedAt = {};
        if (dateFrom) {
          whereClause.submittedAt.gte = new Date(dateFrom);
        }
        if (dateTo) {
          whereClause.submittedAt.lte = new Date(dateTo);
        }
      }

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
                    isoCode2: true,
                  },
                },
              },
            },
            appointment: {
              select: {
                appointmentDate: true,
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

      const applications = submissions.map((submission) => {
        const metadata = submission.metadata as any;
        return {
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
          priority: metadata?.priority || 'NORMAL',
          processingNotes: metadata?.processingNotes || '',
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
              appointmentDate: submission.appointment.appointmentDate,
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
        };
      });

      this.logger.log(
        `Found ${applications.length} applications for country ${countryCode}`,
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
        `Failed to get applications for country: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get detailed application for embassy officer review
   * Reuses the same logic as verification officers
   */
  async getApplicationForReview(
    submissionId: string,
    countryCode: string,
  ): Promise<ApplicationReviewDto> {
    try {
      this.logger.log(
        `Getting application ${submissionId} for embassy review in country ${countryCode}`,
      );

      // Verify the application is for the embassy officer's country
      const submission = await this.prisma.formSubmission.findUnique({
        where: { id: submissionId },
        include: {
          form: {
            select: {
              country: {
                select: {
                  isoCode2: true,
                },
              },
            },
          },
        },
      });

      if (!submission) {
        throw new Error(`Application ${submissionId} not found`);
      }

      if (submission.form.country.isoCode2 !== countryCode) {
        throw new Error(
          `Application ${submissionId} is not for country ${countryCode}`,
        );
      }

      // Reuse the verification service method
      return await this.verificationService.getApplicationForReview(
        submissionId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to get application for embassy review: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get embassy officer statistics for their country
   */
  async getEmbassyStats(
    embassyOfficerId: string,
    countryCode: string,
  ): Promise<EmbassyStatsDto> {
    try {
      this.logger.log(
        `Getting stats for country ${countryCode} for embassy officer ${embassyOfficerId}`,
      );

      // First get the country ID
      const country = await this.prisma.country.findUnique({
        where: { isoCode2: countryCode },
        select: { id: true },
      });

      if (!country) {
        throw new Error(`Country with code ${countryCode} not found`);
      }

      // Build where clause for embassy applications
      const whereClause = {
        form: {
          countryId: country.id,
        },
      };

      const [
        totalApplications,
        pendingReview,
        processingApplications,
        approvedApplications,
        rejectedApplications,
        queriedApplications,
      ] = await Promise.all([
        this.prisma.formSubmission.count({
          where: {
            ...whereClause,
            status: {
              in: [
                SubmissionStatus.UNDER_REVIEW,
                SubmissionStatus.PROCESSING,
                SubmissionStatus.APPROVED,
                SubmissionStatus.REJECTED,
                SubmissionStatus.QUERIED,
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
            status: SubmissionStatus.PROCESSING,
          },
        }),
        this.prisma.formSubmission.count({
          where: {
            ...whereClause,
            status: SubmissionStatus.APPROVED,
          },
        }),
        this.prisma.formSubmission.count({
          where: {
            ...whereClause,
            status: SubmissionStatus.REJECTED,
          },
        }),
        this.prisma.formSubmission.count({
          where: {
            ...whereClause,
            status: SubmissionStatus.QUERIED,
          },
        }),
      ]);

      // Calculate average processing time
      const processingTimeData = await this.prisma.formSubmission.findMany({
        where: {
          ...whereClause,
          status: {
            in: [SubmissionStatus.APPROVED, SubmissionStatus.REJECTED],
          },
          submittedAt: { not: null },
          reviewedAt: { not: null },
        },
        select: {
          submittedAt: true,
          reviewedAt: true,
        },
      });

      const averageProcessingTime = processingTimeData.length > 0
        ? processingTimeData.reduce((sum, app) => {
          const processingTime = app.reviewedAt.getTime() - app.submittedAt.getTime();
          return sum + processingTime;
        }, 0) / processingTimeData.length / (1000 * 60 * 60 * 24) // Convert to days
        : 0;

      return {
        totalApplications,
        pendingReview,
        processingApplications,
        approvedApplications,
        rejectedApplications,
        queriedApplications,
        averageProcessingTime: Math.round(averageProcessingTime * 10) / 10, // Round to 1 decimal
      };
    } catch (error) {
      this.logger.error(
        `Failed to get embassy stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Take final action on application
   */
  async takeFinalActionOnApplication(
    actionDto: EmbassyActionDto,
    embassyOfficerId: string,
    countryCode: string,
  ): Promise<EmbassyActionResponseDto> {
    try {
      const { submissionId, action, reason, notes, requiredDocuments } =
        actionDto;

      this.logger.log(
        `Embassy officer ${embassyOfficerId} taking final action ${action} on application ${submissionId}`,
      );

      // Verify the application is for the embassy officer's country
      const submission = await this.prisma.formSubmission.findUnique({
        where: { id: submissionId },
        include: {
          form: {
            select: {
              country: {
                select: {
                  isoCode2: true,
                  name: true,
                },
              },
            },
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      if (!submission) {
        throw new Error(`Application ${submissionId} not found`);
      }

      if (submission.form.country.isoCode2 !== countryCode) {
        throw new Error(
          `Application ${submissionId} is not for country ${countryCode}`,
        );
      }

      let newStatus: SubmissionStatus;
      let actionMessage: string;
      let emailSent = false;

      switch (action) {
        case 'APPROVE':
          newStatus = SubmissionStatus.APPROVED;
          actionMessage = 'Application approved by embassy';
          break;
        case 'REJECT':
          newStatus = SubmissionStatus.REJECTED;
          actionMessage = 'Application rejected by embassy';
          break;
        case 'REQUEST_INFO':
          newStatus = SubmissionStatus.QUERIED;
          actionMessage = 'Additional information requested by embassy';
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
          reviewedBy: embassyOfficerId,
          reviewNotes: notes,
          metadata: {
            ...(submission.metadata as any || {}),
            embassyAction: action,
            embassyReason: reason,
            embassyNotes: notes,
            embassyOfficerId,
            embassyActionAt: new Date().toISOString(),
            ...(requiredDocuments && { requiredDocuments }),
          },
          statusLogs: {
            create: {
              fromStatus: SubmissionStatus.PROCESSING,
              toStatus: newStatus,
              reason: actionMessage,
              notes: `${reason}${notes ? ` - ${notes}` : ''}`,
              changedBy: embassyOfficerId,
            },
          },
        },
      });

      // Send email notification to applicant
      try {
        if (action === 'APPROVE' || action === 'REJECT') {
          // Use existing embassy submission notification for now
          await this.mailService.sendEmbassySubmissionNotification({
            userName: `${submission.user.firstName} ${submission.user.lastName}`,
            userEmail: submission.user.email,
            referenceNumber: submission.referenceNumber,
            embassyName: `Embassy of ${submission.form.country.name}`,
            submissionDate: new Date().toISOString(),
          });
          emailSent = true;
        } else if (action === 'REQUEST_INFO') {
          await this.mailService.sendApplicationQueryNotification({
            userName: `${submission.user.firstName} ${submission.user.lastName}`,
            userEmail: submission.user.email,
            referenceNumber: submission.referenceNumber,
            queryMessage: reason,
            requiredDocuments: requiredDocuments || [],
            queryDate: new Date().toISOString(),
            applicationUrl: `${process.env.FRONTEND_URL}/applications/${submissionId}`,
          });
          emailSent = true;
        }
      } catch (emailError) {
        this.logger.warn(
          `Failed to send email notification for action ${action}: ${emailError.message}`,
        );
        // Don't fail the entire operation if email fails
      }

      this.logger.log(
        `Embassy officer ${embassyOfficerId} successfully took final action ${action} on application ${submissionId}`,
      );

      return {
        success: true,
        message: actionMessage,
        newStatus,
        action,
        timestamp: new Date().toISOString(),
        emailSent,
      };
    } catch (error) {
      this.logger.error(
        `Failed to take final action on application: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get applications by status for embassy officer's country
   */
  async getApplicationsByStatus(
    embassyOfficerId: string,
    countryCode: string,
    status: SubmissionStatus,
    page = 1,
    limit = 10,
  ): Promise<EmbassyReviewListDto> {
    try {
      this.logger.log(
        `Getting ${status} applications for country ${countryCode} for embassy officer ${embassyOfficerId}`,
      );

      // Use the same logic as getApplicationsForCountry but with specific status
      return await this.getApplicationsForCountry(embassyOfficerId, countryCode, {
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