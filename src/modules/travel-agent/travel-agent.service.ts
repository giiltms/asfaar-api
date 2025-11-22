import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { FormSubmissionsService } from '@modules/form-submissions/services/form-submissions.service';
import { PaymentsService } from '@modules/payments/payments.service';
import { BiometricAppointmentsService } from '@modules/biometric-appointments/biometric-appointments.service';
import {
  ApplicationDto,
  AgentAnalyticsDto,
  ApplicationFiltersDto,
  AgentCalendarFiltersDto,
  AgentCalendarResponseDto,
  AgentCalendarAppointmentDto,
} from './dto/travel-agent.dto';
import { SubmissionStatus, PaymentStatus, Prisma } from '@prisma/client';

/**
 * Service for managing travel agent operations
 * Handles client management, application processing, and business logic
 */
@Injectable()
export class TravelAgentService {
  private readonly logger = new Logger(TravelAgentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly formSubmissionsService: FormSubmissionsService,
    private readonly paymentsService: PaymentsService,
    private readonly biometricAppointmentsService: BiometricAppointmentsService,
  ) {}

  /**
   * Get travel agent dashboard overview
   */
  async getAgentDashboard(agentId: string): Promise<{
    analytics: AgentAnalyticsDto;
    recentApplications: ApplicationDto[];
    recentCommunications: any[]; // TODO: Replace with CommunicationDto when model is added
  }> {
    try {
      // Get analytics
      const analytics = await this.getAgentAnalytics(agentId);

      // Get recent applications
      const recentApplications = await this.getRecentApplications(agentId, 5);

      // Get recent communications (placeholder - will be implemented when ClientCommunication model is added)
      const recentCommunications: any[] = []; // TODO: Replace with CommunicationDto when model is added

      return {
        analytics,
        recentApplications,
        recentCommunications,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get agent dashboard: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get agent analytics
   */
  async getAgentAnalytics(agentId: string): Promise<AgentAnalyticsDto> {
    try {
      // Get total clients (unique users with submissions by this agent)
      const totalClientsResult = await this.prisma.formSubmission.findMany({
        where: { travelAgentId: agentId },
        select: { userId: true },
        distinct: ['userId'],
      });
      const totalClients = totalClientsResult.length;

      // Get active clients (clients with submissions in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const activeClientsResult = await this.prisma.formSubmission.findMany({
        where: {
          travelAgentId: agentId,
          createdAt: { gte: thirtyDaysAgo },
        },
        select: { userId: true },
        distinct: ['userId'],
      });
      const activeClients = activeClientsResult.length;

      // Get total applications
      const totalApplications = await this.prisma.formSubmission.count({
        where: { travelAgentId: agentId },
      });

      // Get successful applications (approved)
      const successfulApplications = await this.prisma.formSubmission.count({
        where: {
          travelAgentId: agentId,
          status: SubmissionStatus.APPROVED,
        },
      });

      // Calculate success rate
      const successRate =
        totalApplications > 0
          ? (successfulApplications / totalApplications) * 100
          : 0;

      // Get total revenue from payments
      const revenueData = await this.prisma.payment.aggregate({
        where: {
          submission: {
            travelAgentId: agentId,
            status: { not: SubmissionStatus.DRAFT },
          },
          status: PaymentStatus.COMPLETED,
        },
        _sum: { amount: true },
      });

      const totalRevenue = revenueData._sum.amount || 0;

      // Get applications this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const applicationsThisMonth = await this.prisma.formSubmission.count({
        where: {
          travelAgentId: agentId,
          createdAt: { gte: startOfMonth },
        },
      });

      // Get revenue this month
      const revenueThisMonthData = await this.prisma.payment.aggregate({
        where: {
          submission: {
            travelAgentId: agentId,
            createdAt: { gte: startOfMonth },
          },
          status: PaymentStatus.COMPLETED,
        },
        _sum: { amount: true },
      });

      const revenueThisMonth = revenueThisMonthData._sum.amount || 0;

      // Calculate average processing time
      const processingTimeData = await this.prisma.formSubmission.findMany({
        where: {
          travelAgentId: agentId,
          status: SubmissionStatus.APPROVED,
          submittedAt: { not: null },
        },
        select: {
          submittedAt: true,
          updatedAt: true,
        },
      });

      const averageProcessingTime =
        processingTimeData.length > 0
          ? processingTimeData.reduce((sum, submission) => {
            const days = Math.ceil(
              (submission.updatedAt.getTime() -
                submission.submittedAt.getTime()) /
              (1000 * 60 * 60 * 24),
            );
            return sum + days;
          }, 0) / processingTimeData.length
          : 0;

      return {
        totalClients,
        activeClients,
        totalApplications,
        successfulApplications,
        successRate: Math.round(successRate * 100) / 100,
        totalRevenue,
        averageProcessingTime: Math.round(averageProcessingTime),
        applicationsThisMonth,
        revenueThisMonth,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get agent analytics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get recent applications for agent
   */
  async getRecentApplications(
    agentId: string,
    limit = 10,
  ): Promise<ApplicationDto[]> {
    try {
      // Use the existing FormSubmissionsService method
      const result =
        await this.formSubmissionsService.getTravelAgentSubmissions(agentId, {
          page: 1,
          limit,
          sortBy: 'createdAt',
          sortOrder: 'desc',
        });

      // Map FormSubmissionDto to ApplicationDto
      return result.submissions.map((submission) => ({
        id: submission.id,
        referenceNumber: submission.referenceNumber,
        formId: submission.formId,
        formName: submission.form?.name || 'Unknown Form',
        clientId: submission.userId,
        clientName: submission.user
          ? `${submission.user.firstName || ''} ${submission.user.lastName || ''
            }`.trim() || submission.user.email
          : 'Unknown User',
        status: submission.status,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
        paymentStatus: undefined, // TODO: Add payment status when available
        biometricStatus: submission.biometricAppointment?.status,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get recent applications: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Communication methods - TODO: Implement when ClientCommunication model is added to schema

  // Note: Creating applications for clients is now handled via POST /submissions with optional clientId

  /**
   * Update application
   */
  async updateApplication(
    agentId: string,
    applicationId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    updateDto: any,
  ): Promise<ApplicationDto> {
    try {
      // Verify application belongs to agent
      const existingSubmission = await this.prisma.formSubmission.findFirst({
        where: {
          id: applicationId,
          travelAgentId: agentId,
        },
      });

      if (!existingSubmission) {
        throw new NotFoundException(
          `Application with ID ${applicationId} not found or not accessible`,
        );
      }

      // Update submission
      const updatedSubmission = await this.prisma.formSubmission.update({
        where: { id: applicationId },
        data: {
          // TODO: Add agentNotes and priority fields to schema
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          form: {
            select: {
              id: true,
              name: true,
            },
          },
          payment: {
            select: {
              status: true,
            },
          },
        },
      });

      return {
        id: updatedSubmission.id,
        referenceNumber: updatedSubmission.referenceNumber,
        formId: updatedSubmission.formId,
        formName: updatedSubmission.form.name,
        clientId: updatedSubmission.userId,
        clientName:
          `${updatedSubmission.user.firstName || ''} ${updatedSubmission.user.lastName || ''
            }`.trim() || updatedSubmission.user.email,
        status: updatedSubmission.status,
        createdAt: updatedSubmission.createdAt,
        updatedAt: updatedSubmission.updatedAt,
        paymentStatus: updatedSubmission.payment?.status,
        biometricStatus: undefined, // TODO: Add biometric appointment relation
      };
    } catch (error) {
      this.logger.error(
        `Failed to update application: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get applications with filters
   */
  async getApplications(
    agentId: string,
    filters: ApplicationFiltersDto,
  ): Promise<{
    data: ApplicationDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      // Convert ApplicationFiltersDto to SubmissionQueryDto format
      const queryDto = {
        page: filters.page || 1,
        limit: filters.limit || 10,
        userId: filters.clientId,
        status: filters.status as any,
        formId: filters.formId,
        search: filters.search,
        dateFrom: filters.startDate,
        dateTo: filters.endDate,
        sortBy: 'createdAt',
        sortOrder: 'desc' as const,
      };

      // Use the existing FormSubmissionsService method
      const result =
        await this.formSubmissionsService.getTravelAgentSubmissions(
          agentId,
          queryDto,
        );

      // Map FormSubmissionDto to ApplicationDto
      const data = result.submissions.map((submission) => ({
        id: submission.id,
        referenceNumber: submission.referenceNumber,
        formId: submission.formId,
        formName: submission.form?.name || 'Unknown Form',
        clientId: submission.userId,
        clientName: submission.user
          ? `${submission.user.firstName || ''} ${submission.user.lastName || ''
            }`.trim() || submission.user.email
          : 'Unknown User',
        status: submission.status,
        createdAt: submission.createdAt,
        updatedAt: submission.updatedAt,
        paymentStatus: undefined, // TODO: Add payment status when available
        biometricStatus: submission.biometricAppointment?.status,
      }));

      return {
        data,
        total: result.total,
        page: result.page,
        limit: result.limit,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get applications: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get calendar appointments for travel agent's clients
   */
  async getClientAppointments(
    agentId: string,
    filters: AgentCalendarFiltersDto,
  ): Promise<AgentCalendarResponseDto> {
    try {
      // Parse date range
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);

      // Set proper time boundaries
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      this.logger.log(
        `Getting calendar appointments for agent ${agentId} from ${filters.startDate} to ${filters.endDate}`,
      );

      // Get agent's client IDs
      const clientRelationships = await this.prisma.travelAgentClient.findMany({
        where: {
          agentId,
          ...(filters.clientId && { clientId: filters.clientId }),
        },
        select: {
          clientId: true,
        },
      });

      const clientIds = clientRelationships.map((rel) => rel.clientId);

      if (clientIds.length === 0) {
        return {
          appointments: [],
          totalAppointments: 0,
          dateRange: `${filters.startDate} to ${filters.endDate}`,
        };
      }

      // Build where clause for appointments (type-safe with Prisma)
      const where: Prisma.BiometricAppointmentWhereInput = {
        userId: { in: clientIds },
        appointmentTime: {
          gte: startDate,
          lte: endDate,
        },
        ...(filters.appointmentClass && {
          appointmentClass: filters.appointmentClass as any,
        }),
        ...(filters.status && { status: filters.status as any }),
        ...(filters.centerId && { centerId: filters.centerId }),
      };

      // Get appointments
      const appointments = await this.prisma.biometricAppointment.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true,
            },
          },
          submission: {
            select: {
              id: true,
              referenceNumber: true,
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
            },
          },
          center: {
            select: {
              id: true,
              name: true,
            },
          },
          queueEntry: {
            select: {
              booth: {
                select: {
                  id: true,
                  boothNumber: true,
                },
              },
            },
          },
        },
        orderBy: {
          appointmentTime: 'asc',
        },
      });

      // Map to DTO format
      const appointmentDtos: AgentCalendarAppointmentDto[] = appointments.map(
        (apt) => ({
          id: apt.id,
          appointmentTime: apt.appointmentTime,
          status: apt.status,
          appointmentClass: apt.appointmentClass,
          client: {
            id: apt.user.id,
            firstName: apt.user.firstName,
            lastName: apt.user.lastName,
            email: apt.user.email,
            phone: apt.user.phone || undefined,
            avatar: apt.user.avatar || undefined,
          },
          submission: {
            id: apt.submission.id,
            referenceNumber: apt.submission.referenceNumber || '',
            formName: apt.submission.form.name,
            country: apt.submission.form.country?.name || 'N/A',
          },
          center: apt.center
            ? {
              id: apt.center.id,
              name: apt.center.name,
            }
            : undefined,
          booth: apt.queueEntry?.booth
            ? {
              id: apt.queueEntry.booth.id,
              boothNumber: apt.queueEntry.booth.boothNumber,
            }
            : undefined,
        }),
      );

      return {
        appointments: appointmentDtos,
        totalAppointments: appointmentDtos.length,
        dateRange: `${filters.startDate} to ${filters.endDate}`,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to get client appointments: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
