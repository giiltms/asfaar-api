import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import {
  CreateClientDto,
  UpdateClientDto,
  ClientProfileDto,
  ClientAnalyticsDto,
  ClientFiltersDto,
} from './dto/travel-agent.dto';
import { PaginationUtils } from '@common/utils/pagination.utils';
import { SubmissionStatus, PaymentStatus } from '@prisma/client';

/**
 * Service for managing travel agent client operations
 * Handles client management, profiles, and communications
 */
@Injectable()
export class TravelAgentClientsService {
  private readonly logger = new Logger(TravelAgentClientsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all clients for a travel agent
   */
  async getClients(
    agentId: string,
    filters: ClientFiltersDto,
  ): Promise<{
    data: ClientProfileDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      // Build where clause for submissions by this agent
      const submissionWhere: any = {
        travelAgentId: agentId,
      };

      // Get unique client IDs from submissions
      const clientSubmissions = await this.prisma.formSubmission.findMany({
        where: submissionWhere,
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              email: true,
              phone: true,
              firstName: true,
              lastName: true,
              avatar: true,
              isVerified: true,
              createdAt: true,
            },
          },
        },
        distinct: ['userId'],
      });

      // Apply additional filters
      let clientIds = clientSubmissions.map((cs) => cs.userId);

      if (filters.search) {
        const searchClients = await this.prisma.user.findMany({
          where: {
            id: { in: clientIds },
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        });
        clientIds = searchClients.map((c) => c.id);
      }

      const paginationOptions =
        PaginationUtils.normalizePaginationOptions(filters);
      const { skip, take } = PaginationUtils.getPrismaQuery(filters);

      // Get paginated clients
      const clients = await this.prisma.user.findMany({
        where: { id: { in: clientIds } },
        include: {
          formSubmissions: {
            where: { travelAgentId: agentId },
            select: {
              id: true,
              status: true,
              createdAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });

      // Get total count
      const total = await this.prisma.user.count({
        where: { id: { in: clientIds } },
      });

      // Build client profiles
      const data = await Promise.all(
        clients.map(async (client) => {
          // Get client statistics
          const totalApplications = client.formSubmissions.length;
          const successfulApplications = client.formSubmissions.filter(
            (app) => app.status === SubmissionStatus.APPROVED,
          ).length;

          // Get last application date
          const lastApplication = client.formSubmissions.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          )[0];

          return {
            id: client.id,
            email: client.email,
            phone: client.phone,
            fullName:
              `${client.firstName || ''} ${client.lastName || ''}`.trim() ||
              client.email,
            avatar: client.avatar,
            isVerified: client.isVerified,
            createdAt: client.createdAt,
            totalApplications,
            successfulApplications,
            lastApplicationDate: lastApplication?.createdAt,
          };
        }),
      );

      return {
        data,
        total,
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      };
    } catch (error) {
      this.logger.error(`Failed to get clients: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get client by ID
   */
  async getClient(
    agentId: string,
    clientId: string,
  ): Promise<ClientProfileDto> {
    try {
      // Verify client has submissions with this agent
      const clientSubmission = await this.prisma.formSubmission.findFirst({
        where: {
          userId: clientId,
          travelAgentId: agentId,
        },
        include: {
          user: true,
        },
      });

      if (!clientSubmission) {
        throw new NotFoundException(
          `Client with ID ${clientId} not found or not accessible`,
        );
      }

      const client = clientSubmission.user;

      // Get client statistics
      const clientSubmissions = await this.prisma.formSubmission.findMany({
        where: {
          userId: clientId,
          travelAgentId: agentId,
        },
      });

      const totalApplications = clientSubmissions.length;
      const successfulApplications = clientSubmissions.filter(
        (app) => app.status === SubmissionStatus.APPROVED,
      ).length;

      // Get last application date
      const lastApplication = clientSubmissions.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0];

      return {
        id: client.id,
        email: client.email,
        phone: client.phone,
        fullName:
          `${client.firstName || ''} ${client.lastName || ''}`.trim() ||
          client.email,
        avatar: client.avatar,
        isVerified: client.isVerified,
        createdAt: client.createdAt,
        totalApplications,
        successfulApplications,
        lastApplicationDate: lastApplication?.createdAt,
      };
    } catch (error) {
      this.logger.error(`Failed to get client: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create or update client profile
   * TODO: Implement when ClientProfile model is added to schema
   */
  async createOrUpdateClientProfile(
    agentId: string,
    clientId: string,
    createDto: CreateClientDto,
  ): Promise<ClientProfileDto> {
    // Placeholder implementation - will be implemented when ClientProfile model is added
    return this.getClient(agentId, clientId);
  }

  /**
   * Get client analytics
   */
  async getClientAnalytics(
    agentId: string,
    clientId: string,
  ): Promise<ClientAnalyticsDto> {
    try {
      // Get client submissions
      const submissions = await this.prisma.formSubmission.findMany({
        where: {
          userId: clientId,
          travelAgentId: agentId,
        },
        include: {
          payment: {
            select: {
              amount: true,
              status: true,
            },
          },
        },
      });

      const totalApplications = submissions.length;
      const successfulApplications = submissions.filter(
        (app) => app.status === SubmissionStatus.APPROVED,
      ).length;

      const successRate =
        totalApplications > 0
          ? (successfulApplications / totalApplications) * 100
          : 0;

      // Calculate total revenue
      const totalRevenue = submissions
        .filter((app) => app.payment?.status === PaymentStatus.COMPLETED)
        .reduce((sum, app) => sum + (app.payment?.amount || 0), 0);

      // Get last application date
      const lastApplication = submissions.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0];

      // Calculate average processing time
      const approvedSubmissions = submissions.filter(
        (app) => app.status === SubmissionStatus.APPROVED,
      );
      const averageProcessingTime =
        approvedSubmissions.length > 0
          ? approvedSubmissions.reduce((sum, submission) => {
              const days = Math.ceil(
                (submission.updatedAt.getTime() -
                  submission.submittedAt.getTime()) /
                  (1000 * 60 * 60 * 24),
              );
              return sum + days;
            }, 0) / approvedSubmissions.length
          : 0;

      return {
        clientId,
        clientName: '', // Will be filled by caller
        totalApplications,
        successfulApplications,
        successRate: Math.round(successRate * 100) / 100,
        totalRevenue,
        lastApplicationDate: lastApplication?.createdAt,
        averageProcessingTime: Math.round(averageProcessingTime),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get client analytics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Communication methods - TODO: Implement when ClientCommunication model is added to schema
}
