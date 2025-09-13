import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { Roles } from '@common/constants/roles.constants';
import { SubmissionStatus } from '@prisma/client';
import {
  AnalyticsDataDto,
  ApplicationDataDto,
  UserStatisticsDto,
  RoleDistributionDto,
  AnalyticsMetadataDto,
  AnalyticsFiltersDto,
} from './dto/analytics.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get system overview analytics for super admin
   * @param filters - Optional filters for analytics data
   * @returns System overview analytics data
   */
  async getSystemOverview(filters?: {
    dateRange?: { start: string; end: string };
    country?: string;
    serviceType?: string;
  }): Promise<{
    data: AnalyticsDataDto;
    metadata: AnalyticsMetadataDto;
  }> {
    this.logger.log('Generating system overview analytics');

    try {
      // Build date filter
      const dateFilter = this.buildDateFilter(filters?.dateRange);

      // Build country filter
      const countryFilter = filters?.country
        ? { country: filters.country }
        : {};

      // Get application data
      const applicationData = await this.getApplicationData(
        dateFilter,
        countryFilter,
      );

      // Get user statistics
      const userStatistics = await this.getUserStatistics(dateFilter);

      // Get role distribution
      const roleDistribution = await this.getRoleDistribution();

      // Build metadata
      const metadata: AnalyticsMetadataDto = {
        filters: {
          dateRange: {
            start:
              filters?.dateRange?.start ||
              new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                .toISOString()
                .split('T')[0],
            end:
              filters?.dateRange?.end || new Date().toISOString().split('T')[0],
          },
          country: filters?.country || 'All',
          serviceType: filters?.serviceType || null,
        },
        generatedAt: new Date().toISOString(),
      };

      return {
        data: {
          applicationData,
          userStatistics,
          roleDistribution,
        },
        metadata,
      };
    } catch (error) {
      this.logger.error(
        'Failed to generate system overview analytics',
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get application statistics
   */
  private async getApplicationData(
    dateFilter: any,
    countryFilter: any,
  ): Promise<ApplicationDataDto> {
    const whereClause = {
      ...dateFilter,
      ...countryFilter,
    };

    const [
      total,
      draft,
      pendingPayment,
      submitted,
      underReview,
      flagged,
      queried,
      processing,
      pendingBiometrics,
      approved,
      rejected,
      cancelled,
    ] = await Promise.all([
      this.prisma.formSubmission.count({ where: whereClause }),
      this.prisma.formSubmission.count({
        where: { ...whereClause, status: SubmissionStatus.DRAFT },
      }),
      this.prisma.formSubmission.count({
        where: { ...whereClause, status: SubmissionStatus.PENDING_PAYMENT },
      }),
      this.prisma.formSubmission.count({
        where: { ...whereClause, status: SubmissionStatus.SUBMITTED },
      }),
      this.prisma.formSubmission.count({
        where: { ...whereClause, status: SubmissionStatus.UNDER_REVIEW },
      }),
      this.prisma.formSubmission.count({
        where: { ...whereClause, status: SubmissionStatus.FLAGGED },
      }),
      this.prisma.formSubmission.count({
        where: { ...whereClause, status: SubmissionStatus.QUERIED },
      }),
      this.prisma.formSubmission.count({
        where: { ...whereClause, status: SubmissionStatus.PROCESSING },
      }),
      this.prisma.formSubmission.count({
        where: { ...whereClause, status: SubmissionStatus.PENDING_BIOMETRICS },
      }),
      this.prisma.formSubmission.count({
        where: { ...whereClause, status: SubmissionStatus.APPROVED },
      }),
      this.prisma.formSubmission.count({
        where: { ...whereClause, status: SubmissionStatus.REJECTED },
      }),
      this.prisma.formSubmission.count({
        where: { ...whereClause, status: SubmissionStatus.CANCELLED },
      }),
    ]);

    return {
      total,
      draft,
      pendingPayment,
      submitted,
      underReview,
      flagged,
      queried,
      processing,
      pendingBiometrics,
      approved,
      rejected,
      cancelled,
    };
  }

  /**
   * Get user statistics
   */
  private async getUserStatistics(dateFilter: any): Promise<UserStatisticsDto> {
    const [totalUsers, topAgents, completedToday] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          roles: {
            has: Roles.BIOMETRIC_AGENT,
          },
        },
      }),
      this.prisma.formSubmission.count({
        where: {
          ...dateFilter,
          status: SubmissionStatus.APPROVED,
          updatedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
      }),
    ]);

    return {
      totalUsers,
      topAgents,
      completedToday,
    };
  }

  /**
   * Get role distribution statistics
   */
  private async getRoleDistribution(): Promise<RoleDistributionDto[]> {
    // Get all users with their roles
    const users = await this.prisma.user.findMany({
      select: {
        roles: true,
      },
    });

    // Count roles
    const roleCounts = new Map<string, number>();
    const totalUsers = users.length;

    users.forEach((user) => {
      user.roles.forEach((role) => {
        const roleName = this.getRoleDisplayName(role);
        roleCounts.set(roleName, (roleCounts.get(roleName) || 0) + 1);
      });
    });

    // Convert to array and calculate percentages
    const roleDistribution = Array.from(roleCounts.entries())
      .map(([role, count]) => ({
        role,
        count,
        percentage:
          totalUsers > 0 ? Number(((count / totalUsers) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    return roleDistribution;
  }

  /**
   * Get display name for role
   */
  private getRoleDisplayName(role: string): string {
    const roleNames = {
      [Roles.APPLICANT]: 'Individual Users',
      [Roles.EMBASSY_OFFICER]: 'Embassy Officers',
      [Roles.LIAISON_OFFICER]: 'Security Officers',
      [Roles.BIOMETRIC_AGENT]: 'Biometric Agents',
      [Roles.VERIFICATION_OFFICER]: 'Verification Officers',
      [Roles.RECEPTIONIST]: 'Receptionists',
      [Roles.ADMIN]: 'Administrators',
      [Roles.SUPER_ADMIN]: 'Administrators',
      [Roles.CENTER_MANAGER]: 'Center Managers',
      [Roles.FINANCE]: 'Finance Officers',
      [Roles.GATEHOUSE]: 'Gatehouse Officers',
      [Roles.AUTHORITY]: 'Authority Officers',
      [Roles.AGENCY]: 'Agency Users',
    };

    return roleNames[role] || role;
  }

  /**
   * Build date filter for queries
   */
  private buildDateFilter(dateRange?: { start: string; end: string }): any {
    if (!dateRange) {
      // Default to last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return {
        createdAt: {
          gte: thirtyDaysAgo,
        },
      };
    }

    return {
      createdAt: {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end),
      },
    };
  }
}
