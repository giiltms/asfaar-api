import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { FormSubmissionsService } from '@modules/form-submissions/services/form-submissions.service';
import { PaymentsService } from '@modules/payments/payments.service';
import { BiometricAppointmentsService } from '@modules/biometric-appointments/biometric-appointments.service';
import {
  CreateClientDto,
  UpdateClientDto,
  ClientProfileDto,
  CreateApplicationForClientDto,
  UpdateApplicationDto,
  ApplicationDto,
  AgentAnalyticsDto,
  ClientAnalyticsDto,
  ClientFiltersDto,
  ApplicationFiltersDto,
} from './dto/travel-agent.dto';
import { PaginationUtils } from '@common/utils/pagination.utils';
import {
  SubmissionStatus,
  PaymentStatus,
  AppointmentStatus,
} from '@prisma/client';

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
          updatedAt: { not: null },
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
      const applications = await this.prisma.formSubmission.findMany({
        where: { travelAgentId: agentId },
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
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return applications.map((app) => ({
        id: app.id,
        referenceNumber: app.referenceNumber,
        formId: app.formId,
        formName: app.form.name,
        clientId: app.userId,
        clientName:
          `${app.user.firstName || ''} ${app.user.lastName || ''}`.trim() ||
          app.user.email,
        status: app.status,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        paymentStatus: app.payment?.status,
        biometricStatus: undefined, // TODO: Add biometric appointment relation
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

  /**
   * Create application for client
   */
  async createApplicationForClient(
    agentId: string,
    createDto: CreateApplicationForClientDto,
  ): Promise<ApplicationDto> {
    try {
      // Verify client exists
      const client = await this.prisma.user.findUnique({
        where: { id: createDto.clientId },
      });

      if (!client) {
        throw new NotFoundException(
          `Client with ID ${createDto.clientId} not found`,
        );
      }

      // Create form submission
      const submission = await this.formSubmissionsService.createSubmission(
        createDto.clientId,
        {
          formId: createDto.formId,
          responses: createDto.responses,
        },
      );

      // Update submission with agent information
      const updatedSubmission = await this.prisma.formSubmission.update({
        where: { id: submission.id },
        data: {
          travelAgentId: agentId,
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
        },
      });

      return {
        id: updatedSubmission.id,
        referenceNumber: updatedSubmission.referenceNumber,
        formId: updatedSubmission.formId,
        formName: updatedSubmission.form.name,
        clientId: updatedSubmission.userId,
        clientName:
          `${updatedSubmission.user.firstName || ''} ${
            updatedSubmission.user.lastName || ''
          }`.trim() || updatedSubmission.user.email,
        status: updatedSubmission.status,
        createdAt: updatedSubmission.createdAt,
        updatedAt: updatedSubmission.updatedAt,
      };
    } catch (error) {
      this.logger.error(
        `Failed to create application for client: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update application
   */
  async updateApplication(
    agentId: string,
    applicationId: string,
    updateDto: UpdateApplicationDto,
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
          `${updatedSubmission.user.firstName || ''} ${
            updatedSubmission.user.lastName || ''
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
      const where: any = {
        travelAgentId: agentId,
      };

      if (filters.clientId) {
        where.userId = filters.clientId;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.formId) {
        where.formId = filters.formId;
      }

      if (filters.startDate || filters.endDate) {
        where.createdAt = {};
        if (filters.startDate) {
          where.createdAt.gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          where.createdAt.lte = new Date(filters.endDate);
        }
      }

      const paginationOptions =
        PaginationUtils.normalizePaginationOptions(filters);
      const { skip, take } = PaginationUtils.getPrismaQuery(filters);

      const [applications, total] = await Promise.all([
        this.prisma.formSubmission.findMany({
          where,
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
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        }),
        this.prisma.formSubmission.count({ where }),
      ]);

      const data = applications.map((app) => ({
        id: app.id,
        referenceNumber: app.referenceNumber,
        formId: app.formId,
        formName: app.form.name,
        clientId: app.userId,
        clientName:
          `${app.user.firstName || ''} ${app.user.lastName || ''}`.trim() ||
          app.user.email,
        status: app.status,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        paymentStatus: app.payment?.status,
        biometricStatus: undefined, // TODO: Add biometric appointment relation
      }));

      return {
        data,
        total,
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get applications: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
