import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { AgentAnalyticsDto, ClientAnalyticsDto } from './dto/travel-agent.dto';
import { SubmissionStatus, PaymentStatus } from '@prisma/client';

/**
 * Service for travel agent analytics and reporting
 * Handles analytics calculations and reporting
 */
@Injectable()
export class TravelAgentAnalyticsService {
  private readonly logger = new Logger(TravelAgentAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get comprehensive agent analytics
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
      // Only check submittedAt since updatedAt is always set (@updatedAt field)
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
   * Get client analytics for a specific client
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

  /**
   * Get top performing clients
   */
  async getTopPerformingClients(
    agentId: string,
    limit = 10,
  ): Promise<ClientAnalyticsDto[]> {
    try {
      // Get all clients with their submission data
      const clientSubmissions = await this.prisma.formSubmission.findMany({
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
          payment: {
            select: {
              amount: true,
              status: true,
            },
          },
        },
      });

      // Group by client and calculate metrics
      const clientMetrics = new Map<
        string,
        {
          clientId: string;
          clientName: string;
          totalApplications: number;
          successfulApplications: number;
          totalRevenue: number;
          lastApplicationDate?: Date;
        }
      >();

      clientSubmissions.forEach((submission) => {
        const clientId = submission.userId;
        const clientName =
          `${submission.user.firstName || ''} ${
            submission.user.lastName || ''
          }`.trim() || submission.user.email;

        if (!clientMetrics.has(clientId)) {
          clientMetrics.set(clientId, {
            clientId,
            clientName,
            totalApplications: 0,
            successfulApplications: 0,
            totalRevenue: 0,
          });
        }

        const metrics = clientMetrics.get(clientId);
        if (!metrics) return;
        metrics.totalApplications++;

        if (submission.status === SubmissionStatus.APPROVED) {
          metrics.successfulApplications++;
        }

        if (submission.payment?.status === PaymentStatus.COMPLETED) {
          metrics.totalRevenue += submission.payment.amount || 0;
        }

        if (
          !metrics.lastApplicationDate ||
          submission.createdAt > metrics.lastApplicationDate
        ) {
          metrics.lastApplicationDate = submission.createdAt;
        }
      });

      // Convert to array and sort by success rate and revenue
      const topClients = Array.from(clientMetrics.values())
        .map((metrics) => ({
          clientId: metrics.clientId,
          clientName: metrics.clientName,
          totalApplications: metrics.totalApplications,
          successfulApplications: metrics.successfulApplications,
          successRate:
            metrics.totalApplications > 0
              ? Math.round(
                  (metrics.successfulApplications / metrics.totalApplications) *
                    100 *
                    100,
                ) / 100
              : 0,
          totalRevenue: metrics.totalRevenue,
          lastApplicationDate: metrics.lastApplicationDate,
          averageProcessingTime: 0, // Will be calculated separately if needed
        }))
        .sort((a, b) => {
          // Sort by success rate first, then by revenue
          if (a.successRate !== b.successRate) {
            return b.successRate - a.successRate;
          }
          return b.totalRevenue - a.totalRevenue;
        })
        .slice(0, limit);

      return topClients;
    } catch (error) {
      this.logger.error(
        `Failed to get top performing clients: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get application trends over time
   */
  async getApplicationTrends(
    agentId: string,
    months = 12,
  ): Promise<
    {
      month: string;
      applications: number;
      successful: number;
      revenue: number;
    }[]
  > {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const submissions = await this.prisma.formSubmission.findMany({
        where: {
          travelAgentId: agentId,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          payment: {
            select: {
              amount: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      // Group by month
      const monthlyData = new Map<
        string,
        {
          applications: number;
          successful: number;
          revenue: number;
        }
      >();

      submissions.forEach((submission) => {
        const month = submission.createdAt.toISOString().substring(0, 7); // YYYY-MM

        if (!monthlyData.has(month)) {
          monthlyData.set(month, {
            applications: 0,
            successful: 0,
            revenue: 0,
          });
        }

        const data = monthlyData.get(month)!;
        data.applications++;

        if (submission.status === SubmissionStatus.APPROVED) {
          data.successful++;
        }

        if (submission.payment?.status === PaymentStatus.COMPLETED) {
          data.revenue += submission.payment.amount || 0;
        }
      });

      // Convert to array and fill missing months
      const trends = [];
      for (let i = 0; i < months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() - (months - 1 - i));
        const month = date.toISOString().substring(0, 7);

        const data = monthlyData.get(month);
        if (!data) {
          monthlyData.set(month, {
            applications: 0,
            successful: 0,
            revenue: 0,
          });
        }
        const monthData = monthlyData.get(month) || {
          applications: 0,
          successful: 0,
          revenue: 0,
        };

        trends.push({
          month,
          applications: monthData.applications,
          successful: monthData.successful,
          revenue: monthData.revenue,
        });
      }

      return trends;
    } catch (error) {
      this.logger.error(
        `Failed to get application trends: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get revenue analytics
   */
  async getRevenueAnalytics(agentId: string): Promise<{
    totalRevenue: number;
    monthlyRevenue: number;
    averageRevenuePerClient: number;
    revenueGrowth: number;
  }> {
    try {
      // Get all completed payments
      const payments = await this.prisma.payment.findMany({
        where: {
          submission: {
            travelAgentId: agentId,
          },
          status: PaymentStatus.COMPLETED,
        },
        select: {
          amount: true,
          createdAt: true,
        },
      });

      const totalRevenue = payments.reduce(
        (sum, payment) => sum + payment.amount,
        0,
      );

      // Get monthly revenue
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyRevenue = payments
        .filter((payment) => payment.createdAt >= startOfMonth)
        .reduce((sum, payment) => sum + payment.amount, 0);

      // Get unique clients
      const uniqueClientsResult = await this.prisma.formSubmission.findMany({
        where: { travelAgentId: agentId },
        select: { userId: true },
        distinct: ['userId'],
      });
      const uniqueClients = uniqueClientsResult.length;

      const averageRevenuePerClient =
        uniqueClients > 0 ? totalRevenue / uniqueClients : 0;

      // Calculate revenue growth (compare this month to last month)
      const lastMonthStart = new Date();
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      lastMonthStart.setDate(1);
      lastMonthStart.setHours(0, 0, 0, 0);

      const lastMonthEnd = new Date();
      lastMonthEnd.setDate(0);
      lastMonthEnd.setHours(23, 59, 59, 999);

      const lastMonthRevenue = payments
        .filter(
          (payment) =>
            payment.createdAt >= lastMonthStart &&
            payment.createdAt <= lastMonthEnd,
        )
        .reduce((sum, payment) => sum + payment.amount, 0);

      const revenueGrowth =
        lastMonthRevenue > 0
          ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
          : 0;

      return {
        totalRevenue,
        monthlyRevenue,
        averageRevenuePerClient:
          Math.round(averageRevenuePerClient * 100) / 100,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get revenue analytics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
