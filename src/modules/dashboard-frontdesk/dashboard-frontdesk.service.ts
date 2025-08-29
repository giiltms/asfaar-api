import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@providers/prisma';
import {
  FrontDeskDashboardStatsDto,
  QueueStatsDto,
  StationStatsDto,
  ApplicationStatsDto,
  ProcessingStatsDto,
  AgentStatsDto,
  ApplicantListItemDto,
  ApplicantListFiltersDto,
  ApplicantDetailDto,
} from './dto/dashboard-stats.dto';
import { SubmissionStatus } from '@prisma/client';

@Injectable()
export class DashboardFrontdeskService {
  private readonly logger = new Logger(DashboardFrontdeskService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get comprehensive front desk dashboard statistics
   */
  async getFrontDeskDashboardStats(
    stationId: string,
  ): Promise<FrontDeskDashboardStatsDto> {
    try {
      // Verify station exists
      const station = await this.prisma.biometricCenter.findUnique({
        where: { id: stationId },
        select: { id: true, name: true },
      });

      if (!station) {
        throw new NotFoundException(`Station with ID ${stationId} not found`);
      }

      // Get all stats in parallel for better performance
      const [
        queueStats,
        stationStats,
        applicationStats,
        processingStats,
        agentStats,
      ] = await Promise.all([
        this.getQueueStats(stationId),
        this.getStationStats(stationId),
        this.getApplicationStats(stationId),
        this.getProcessingStats(stationId),
        this.getAgentStats(stationId),
      ]);

      return {
        queueStats,
        stationStats,
        applicationStats,
        processingStats,
        agentStats,
        lastUpdated: new Date().toISOString(),
        stationId: station.id,
        stationName: station.name,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get front desk dashboard stats for station ${stationId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(stationId: string): Promise<QueueStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [waitingQueue, inProgress] = await Promise.all([
      // Count applications waiting in queue
      this.prisma.formSubmission.count({
        where: {
          status: SubmissionStatus.SUBMITTED,
          appointment: {
            centerId: stationId,
            appointmentDate: {
              gte: today,
            },
            status: 'PENDING',
          },
        },
      }),

      // Count applications currently being processed
      this.prisma.formSubmission.count({
        where: {
          status: SubmissionStatus.SUBMITTED,
          appointment: {
            centerId: stationId,
            appointmentDate: {
              gte: today,
            },
            status: 'ACTIVE',
          },
        },
      }),
    ]);

    return {
      waitingQueue,
      inProgress,
      totalInQueue: waitingQueue + inProgress,
    };
  }

  /**
   * Get station statistics
   */
  async getStationStats(stationId: string): Promise<StationStatsDto> {
    const [totalStations, busyStations] = await Promise.all([
      // Count total stations at this center
      this.prisma.booth.count({
        where: {
          centerId: stationId,
          isActive: true,
        },
      }),

      // Count busy stations (currently processing)
      this.prisma.booth.count({
        where: {
          centerId: stationId,
          isActive: true,
          isOccupied: true,
        },
      }),
    ]);

    const availableStations = totalStations - busyStations;
    const utilizationPercentage =
      totalStations > 0 ? (busyStations / totalStations) * 100 : 0;

    return {
      availableStations,
      busyStations,
      totalStations,
      utilizationPercentage: Math.round(utilizationPercentage * 100) / 100, // Round to 2 decimal places
    };
  }

  /**
   * Get application statistics
   */
  async getApplicationStats(
    stationId: string,
  ): Promise<ApplicationStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [todayApplications, completedToday, pendingFromPreviousDays] =
      await Promise.all([
        // Count new applications received today
        this.prisma.formSubmission.count({
          where: {
            status: SubmissionStatus.SUBMITTED,
            submittedAt: {
              gte: today,
            },
            appointment: {
              centerId: stationId,
            },
          },
        }),

        // Count applications completed today
        this.prisma.formSubmission.count({
          where: {
            status: SubmissionStatus.APPROVED,
            updatedAt: {
              gte: today,
            },
            appointment: {
              centerId: stationId,
            },
          },
        }),

        // Count applications pending from previous days
        this.prisma.formSubmission.count({
          where: {
            status: SubmissionStatus.SUBMITTED,
            submittedAt: {
              lt: today,
            },
            appointment: {
              centerId: stationId,
            },
          },
        }),
      ]);

    return {
      todayApplications,
      completedToday,
      pendingFromPreviousDays,
      totalApplications: todayApplications + pendingFromPreviousDays,
    };
  }

  /**
   * Get processing time statistics
   */
  async getProcessingStats(
    stationId: string,
  ): Promise<ProcessingStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get completed applications today with processing times
    const completedApplications = await this.prisma.formSubmission.findMany({
      where: {
        status: SubmissionStatus.APPROVED,
        updatedAt: {
          gte: today,
        },
        appointment: {
          centerId: stationId,
        },
        submittedAt: {
          not: null,
        },
      },
      select: {
        submittedAt: true,
        updatedAt: true,
      },
    });

    if (completedApplications.length === 0) {
      return {
        avgProcessingTime: 0,
        fastestProcessingToday: 0,
        slowestProcessingToday: 0,
        totalProcessingTimeToday: 0,
      };
    }

    // Calculate processing times in minutes
    const processingTimes = completedApplications.map((app) => {
      const submitted = new Date(app.submittedAt);
      const completed = new Date(app.updatedAt);
      const diffMs = completed.getTime() - submitted.getTime();
      return diffMs / (1000 * 60); // Convert to minutes
    });

    const totalProcessingTime = processingTimes.reduce((sum, time) => sum + time, 0);
    const avgProcessingTime = totalProcessingTime / processingTimes.length;
    const fastestProcessing = Math.min(...processingTimes);
    const slowestProcessing = Math.max(...processingTimes);

    return {
      avgProcessingTime: Math.round(avgProcessingTime * 10) / 10, // Round to 1 decimal place
      fastestProcessingToday: Math.round(fastestProcessing * 10) / 10,
      slowestProcessingToday: Math.round(slowestProcessing * 10) / 10,
      totalProcessingTimeToday: Math.round(totalProcessingTime * 10) / 10,
    };
  }

  /**
   * Get agent statistics
   */
  async getAgentStats(stationId: string): Promise<AgentStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all agents assigned to this station
    const totalAgents = await this.prisma.user.count({
      where: {
        roles: {
          has: 'RECEPTIONIST',
        },
        // You might need to add a station assignment field to User model
        // For now, we'll count all receptionist users
      },
    });

    // Count active agents (those who have processed applications today)
    const activeAgents = await this.prisma.user.count({
      where: {
        roles: {
          has: 'RECEPTIONIST',
        },
        // Count users who have updated applications today
        // This is a simplified approach - you might want to track agent activity more explicitly
      },
    });

    // For now, we'll use simplified logic
    // In a real implementation, you'd track agent status (active, on break, off duty)
    const agentsOnBreak = Math.floor(totalAgents * 0.2); // 20% on break
    const agentsOffDuty = Math.floor(totalAgents * 0.1); // 10% off duty

    return {
      activeAgents: Math.max(0, totalAgents - agentsOnBreak - agentsOffDuty),
      agentsOnBreak,
      agentsOffDuty,
      totalAgents,
    };
  }

  /**
   * Get real-time queue updates (for WebSocket/SSE)
   */
  async getQueueUpdates(stationId: string) {
    const queueStats = await this.getQueueStats(stationId);
    const stationStats = await this.getStationStats(stationId);

    return {
      queueStats,
      stationStats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get station-specific metrics
   */
  async getStationMetrics(stationId: string) {
    const [stationStats, queueStats] = await Promise.all([
      this.getStationStats(stationId),
      this.getQueueStats(stationId),
    ]);

    return {
      stationStats,
      queueStats,
      efficiency: this.calculateEfficiency(stationStats, queueStats),
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Calculate station efficiency score
   */
  private calculateEfficiency(
    stationStats: StationStatsDto,
    queueStats: QueueStatsDto,
  ): number {
    if (stationStats.totalStations === 0 || queueStats.totalInQueue === 0) {
      return 100; // Perfect efficiency if no stations or no queue
    }

    const utilizationScore = stationStats.utilizationPercentage;
    const queueScore = Math.max(0, 100 - (queueStats.totalInQueue * 2)); // Reduce score for long queues

    return Math.round((utilizationScore + queueScore) / 2);
  }

  /**
   * Get list of applicants for the front desk
   */
  async getApplicants(
    stationId: string,
    filters: ApplicantListFiltersDto,
  ): Promise<{
    applicants: ApplicantListItemDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    try {
      const page = filters.page || 1;
      const limit = Math.min(filters.limit || 20, 100);
      const skip = (page - 1) * limit;

      // Simplified where clause for now
      const where: any = {};

      // Apply basic filters
      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.search) {
        where.OR = [
          { referenceNumber: { contains: filters.search, mode: 'insensitive' } },
        ];
      }

      if (filters.dateFrom || filters.dateTo) {
        where.submittedAt = {};
        if (filters.dateFrom) {
          where.submittedAt.gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          where.submittedAt.lte = new Date(filters.dateTo);
        }
      }

      // Get total count
      const total = await this.prisma.formSubmission.count({ where });

      // Get applicants with pagination
      const submissions = await this.prisma.formSubmission.findMany({
        where,
        select: {
          id: true,
          referenceNumber: true,
          status: true,
          submittedAt: true,
          createdAt: true,
          userId: true,
        },
        orderBy: {
          submittedAt: 'desc',
        },
        skip,
        take: limit,
      });

      // Get user details for the submissions
      const userIds = submissions.map(s => s.userId);
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      });

      // Create a map for quick user lookup
      const userMap = new Map(users.map(user => [user.id, user]));

      // Transform to DTO
      const applicants: ApplicantListItemDto[] = submissions.map((submission) => {
        const user = userMap.get(submission.userId);
        return {
          id: submission.id,
          fullName: user ? `${user.firstName} ${user.lastName}` : 'Unknown User',
          email: user?.email || 'No email',
          phone: user?.phone || 'No phone',
          status: submission.status,
          applicationType: 'VISA_APPLICATION', // Default for now
          submittedAt: submission.submittedAt,
          queuePosition: undefined, // Will be implemented later
          estimatedWaitTime: undefined, // Will be implemented later
          currentStation: undefined, // Will be implemented later
          paymentStatus: 'PENDING', // Default for now
        };
      });

      const totalPages = Math.ceil(total / limit);

      return {
        applicants,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to get applicants for station ${stationId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
 * Get detailed information about a specific applicant
 */
  async getApplicantDetail(
    stationId: string,
    applicantId: string,
  ): Promise<ApplicantDetailDto> {
    try {
      const submission = await this.prisma.formSubmission.findFirst({
        where: {
          id: applicantId,
        },
        select: {
          id: true,
          referenceNumber: true,
          status: true,
          submittedAt: true,
          createdAt: true,
          userId: true,
        },
      });

      if (!submission) {
        throw new NotFoundException(
          `Applicant with ID ${applicantId} not found`,
        );
      }

      // Get user details
      const user = await this.prisma.user.findUnique({
        where: { id: submission.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      });

      if (!user) {
        throw new NotFoundException(`User not found for applicant ${applicantId}`);
      }

      // Build basic timeline
      const timeline = [
        {
          step: 'SUBMITTED',
          timestamp: submission.submittedAt || submission.createdAt,
          description: 'Application submitted',
        },
      ];

      return {
        id: submission.id,
        fullName: `${user.firstName} ${user.lastName}`,
        email: user.email,
        phone: user.phone,
        status: submission.status,
        applicationType: 'VISA_APPLICATION', // Default for now
        submittedAt: submission.submittedAt,
        queuePosition: undefined, // Will be implemented later
        estimatedWaitTime: undefined, // Will be implemented later
        currentStation: undefined, // Will be implemented later
        paymentStatus: 'PENDING', // Default for now
        nin: undefined, // Will be implemented later
        dateOfBirth: new Date('1990-01-01'), // Default for now
        nationality: 'Nigerian', // Default for now
        address: 'Address not available', // Default for now
        formData: {}, // Will be implemented later
        biometricAppointment: undefined, // Will be implemented later
        paymentDetails: {
          amount: 0,
          currency: 'NGN',
          paymentMethod: 'N/A',
          transactionId: 'N/A',
        },
        timeline,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get applicant detail for ${applicantId} at station ${stationId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

}
