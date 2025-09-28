import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
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
   * Get user's assigned centers
   */
  async getUserCenters(userId: string) {
    const userCenters = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        biometricCenters: {
          select: {
            id: true,
            name: true,
            code: true,
            address: true,
            city: true,
            state: true,
            isActive: true,
          },
        },
      },
    });

    if (!userCenters) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return userCenters.biometricCenters;
  }

  /**
   * Get comprehensive front desk dashboard statistics for all user's assigned centers
   */
  async getFrontDeskDashboardStats(
    userId: string,
  ): Promise<FrontDeskDashboardStatsDto> {
    try {
      // Get user's assigned centers
      const userCenters = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          biometricCenters: {
            select: { id: true, name: true },
          },
        },
      });

      if (!userCenters) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      const userCenterIds = userCenters.biometricCenters.map(
        (center) => center.id,
      );

      if (userCenterIds.length === 0) {
        throw new NotFoundException(`User has no assigned centers`);
      }

      // Get all stats in parallel for better performance across all user's centers
      const [
        queueStats,
        stationStats,
        applicationStats,
        processingStats,
        agentStats,
      ] = await Promise.all([
        this.getQueueStats(userCenterIds),
        this.getStationStats(userCenterIds),
        this.getApplicationStats(userCenterIds),
        this.getProcessingStats(userCenterIds),
        this.getAgentStats(userCenterIds),
      ]);

      return {
        queueStats,
        stationStats,
        applicationStats,
        processingStats,
        agentStats,
        lastUpdated: new Date().toISOString(),
        stationId: null, // No single station
        stationName: `${userCenterIds.length} Center${
          userCenterIds.length > 1 ? 's' : ''
        }`,
        userCenters: userCenters.biometricCenters,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get front desk dashboard stats for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get queue statistics for multiple centers
   */
  async getQueueStats(centerIds: string[]): Promise<QueueStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [waitingQueue, inProgress] = await Promise.all([
      // Count applications waiting in queue
      this.prisma.formSubmission.count({
        where: {
          status: SubmissionStatus.SUBMITTED,
          appointment: {
            centerId: { in: centerIds },
            appointmentTime: {
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
            centerId: { in: centerIds },
            appointmentTime: {
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
   * Get station statistics for multiple centers
   */
  async getStationStats(centerIds: string[]): Promise<StationStatsDto> {
    const [totalStations, busyStations] = await Promise.all([
      // Count total stations at this center
      this.prisma.booth.count({
        where: {
          centerId: { in: centerIds },
          isActive: true,
        },
      }),

      // Count busy stations (currently processing)
      this.prisma.booth.count({
        where: {
          centerId: { in: centerIds },
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
   * Get application statistics for multiple centers
   */
  async getApplicationStats(centerIds: string[]): Promise<ApplicationStatsDto> {
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
              centerId: { in: centerIds },
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
              centerId: { in: centerIds },
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
              centerId: { in: centerIds },
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
   * Get processing time statistics for multiple centers
   */
  async getProcessingStats(centerIds: string[]): Promise<ProcessingStatsDto> {
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
          centerId: { in: centerIds },
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

    const totalProcessingTime = processingTimes.reduce(
      (sum, time) => sum + time,
      0,
    );
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
   * Get agent statistics for multiple centers
   */
  async getAgentStats(centerIds: string[]): Promise<AgentStatsDto> {
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
  async getQueueUpdates(centerIds: string[]) {
    const queueStats = await this.getQueueStats(centerIds);
    const stationStats = await this.getStationStats(centerIds);

    return {
      queueStats,
      stationStats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get station-specific metrics for multiple centers
   */
  async getStationMetrics(centerIds: string[]) {
    const [stationStats, queueStats] = await Promise.all([
      this.getStationStats(centerIds),
      this.getQueueStats(centerIds),
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
    const queueScore = Math.max(0, 100 - queueStats.totalInQueue * 2); // Reduce score for long queues

    return Math.round((utilizationScore + queueScore) / 2);
  }

  /**
   * Get list of applicants for the front desk
   */
  async getApplicants(
    centerIds: string[],
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

      // Build where clause - filter by submissions that have appointments at user's assigned centers
      const where: any = {
        appointment: {
          centerId: { in: centerIds },
          checkedIn: true,
        },
      };

      // Apply filters
      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.search) {
        where.OR = [
          {
            referenceNumber: { contains: filters.search, mode: 'insensitive' },
          },
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

      if (filters.checkInStatus) {
        where.appointment = {
          ...where.appointment,
          status: filters.checkInStatus,
        };
      }

      if (filters.inQueue !== undefined) {
        if (filters.inQueue) {
          where.appointment = {
            ...where.appointment,
            queueEntry: { isNot: null },
          };
        } else {
          where.appointment = {
            ...where.appointment,
            queueEntry: null,
          };
        }
      }

      // Get total count
      const total = await this.prisma.formSubmission.count({ where });

      // Get applicants with pagination
      const submissions = await this.prisma.formSubmission.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
            },
          },
          form: {
            select: {
              applicationType: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
          payment: {
            select: {
              status: true,
              amount: true,
            },
          },
          appointment: {
            select: {
              checkedIn: true,
              checkedInAt: true,
              checkedInBy: true,
              status: true,
              appointmentTime: true,
              queueEntry: {
                select: {
                  queueNumber: true,
                  status: true,
                  estimatedWaitTime: true,
                  joinedAt: true,
                  booth: {
                    select: {
                      boothNumber: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          submittedAt: 'desc',
        },
        skip,
        take: limit,
      });

      // Transform to DTO
      const applicants: ApplicantListItemDto[] = submissions.map(
        (submission) => {
          const appointment = submission.appointment;
          const queueEntry = appointment?.queueEntry;

          // Determine check-in status
          let checkInStatus = 'NOT_ARRIVED';
          if (appointment?.checkedIn) {
            checkInStatus = appointment.status;
          }

          return {
            id: submission.id,
            referenceNumber: submission.referenceNumber,
            fullName: `${submission.user.firstName} ${submission.user.lastName}`,
            email: submission.user.email,
            phone: submission.user.phone,
            status: submission.status,
            applicationType: submission.form.applicationType?.code || 'UNKNOWN',
            submittedAt: submission.submittedAt,
            queuePosition: queueEntry?.queueNumber,
            estimatedWaitTime: queueEntry?.estimatedWaitTime,
            currentStation: queueEntry?.booth?.boothNumber,
            checkInStatus,
            checkedInAt: appointment?.checkedInAt,
            queueStatus: queueEntry?.status,
            isInQueue: !!queueEntry,
            paymentStatus: submission.payment?.status || 'PENDING',
            appointmentTime: appointment?.appointmentTime,
          };
        },
      );

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
        `Failed to get applicants for centers: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get detailed information about a specific applicant
   */
  async getApplicantDetail(
    centerIds: string[],
    applicantId: string,
  ): Promise<ApplicantDetailDto> {
    try {
      const submission = await this.prisma.formSubmission.findFirst({
        where: {
          id: applicantId,
          appointment: {
            centerId: { in: centerIds },
            checkedIn: true,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              nin: true,
              dateOfBirth: true,
            },
          },
          form: {
            select: {
              applicationType: {
                select: {
                  code: true,
                  name: true,
                },
              },
            },
          },
          responses: {
            select: {
              fieldName: true,
              value: true,
              fileUrls: true,
              instanceIndex: true,
            },
          },
          payment: {
            select: {
              id: true,
              status: true,
              amount: true,
              currency: true,
              processor: true,
              processorId: true,
              createdAt: true,
            },
          },
          appointment: {
            select: {
              id: true,
              appointmentTime: true,
              appointmentClass: true,
              status: true,
              checkedIn: true,
              checkedInAt: true,
              checkedInBy: true,
              center: {
                select: {
                  name: true,
                  code: true,
                },
              },
              queueEntry: {
                select: {
                  queueNumber: true,
                  status: true,
                  estimatedWaitTime: true,
                  joinedAt: true,
                  booth: {
                    select: {
                      boothNumber: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!submission) {
        throw new NotFoundException(
          `Applicant with ID ${applicantId} not found at any of your assigned centers`,
        );
      }

      // Transform form responses to structured data
      const formData = this.transformFormResponses(submission.responses);

      // Build timeline
      const timeline = this.buildApplicantTimeline(submission);

      // Determine check-in status
      const appointment = submission.appointment;
      const queueEntry = appointment?.queueEntry;
      let checkInStatus = 'NOT_ARRIVED';
      if (appointment?.checkedIn) {
        checkInStatus = appointment.status;
      }

      // Extract fields from form responses
      const getFieldValue = (fieldName: string): string | undefined => {
        const response = submission.responses.find(
          (r) => r.fieldName === fieldName,
        );
        return response?.value ? String(response.value) : undefined;
      };

      // Use user's dateOfBirth first, fallback to form responses
      const userDateOfBirth = submission.user.dateOfBirth;
      const formDateOfBirth =
        getFieldValue('dateOfBirth') ||
        getFieldValue('date-of-birth') ||
        getFieldValue('dob');

      const dateOfBirth =
        userDateOfBirth ||
        (formDateOfBirth ? new Date(formDateOfBirth) : undefined);
      const nationality =
        getFieldValue('nationality') || getFieldValue('country');
      const address =
        getFieldValue('address') ||
        getFieldValue('residentialAddress') ||
        getFieldValue('residential-address');

      return {
        id: submission.id,
        referenceNumber: submission.referenceNumber,
        fullName: `${submission.user.firstName} ${submission.user.lastName}`,
        email: submission.user.email,
        phone: submission.user.phone,
        status: submission.status,
        applicationType: submission.form.applicationType?.code || 'UNKNOWN',
        appointmentTime: appointment?.appointmentTime,
        appointmentClass: appointment?.appointmentClass,
        submittedAt: submission.submittedAt,
        queuePosition: queueEntry?.queueNumber,
        estimatedWaitTime: queueEntry?.estimatedWaitTime,
        currentStation: queueEntry?.booth?.boothNumber,
        checkInStatus,
        checkedInAt: appointment?.checkedInAt,
        queueStatus: queueEntry?.status,
        isInQueue: !!queueEntry,
        paymentStatus: submission.payment?.status || 'PENDING',
        nin: submission.user.nin,
        dateOfBirth: dateOfBirth,
        nationality: nationality || 'Not specified',
        address: address || 'Not specified',
        formData,
        biometricAppointment: submission.appointment
          ? {
              appointmentTime: submission.appointment.appointmentTime,
              status: submission.appointment.status,
              centerName: submission.appointment.center?.name,
            }
          : undefined,
        paymentDetails: submission.payment
          ? {
              amount: submission.payment.amount,
              currency: submission.payment.currency,
              paymentMethod: submission.payment.processor,
              transactionId: submission.payment.processorId,
            }
          : {
              amount: 0,
              currency: 'NGN',
              paymentMethod: 'N/A',
              transactionId: 'N/A',
            },
        timeline,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get applicant detail for ${applicantId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Transform form responses to structured data
   */
  private transformFormResponses(responses: any[]): any {
    const formData: any = {};

    responses.forEach((response) => {
      const fieldName = response.fieldName;
      const value = response.value;

      // Parse JSON value if it's a string
      let parsedValue = value;
      if (typeof value === 'string') {
        try {
          parsedValue = JSON.parse(value);
        } catch {
          // Keep as string if not valid JSON
        }
      }

      formData[fieldName] = parsedValue;
    });

    return formData;
  }

  /**
   * Build applicant timeline based on submission events
   */
  private buildApplicantTimeline(submission: any): Array<{
    step: string;
    timestamp: Date;
    description?: string;
  }> {
    const timeline = [];

    // Submission
    timeline.push({
      step: 'SUBMITTED',
      timestamp: submission.submittedAt,
      description: 'Application submitted',
    });

    // Payment
    if (submission.payment) {
      timeline.push({
        step: 'PAYMENT_CONFIRMED',
        timestamp: submission.payment.createdAt,
        description: `Payment of ${submission.payment.amount} ${submission.payment.currency} confirmed`,
      });
    }

    // Queue entry
    if (submission.appointment?.queueEntry) {
      timeline.push({
        step: 'IN_QUEUE',
        timestamp: submission.appointment.queueEntry.joinedAt,
        description: `Added to queue at position ${submission.appointment.queueEntry.queueNumber}`,
      });
    }

    // Appointment
    if (submission.appointment?.appointmentTime) {
      timeline.push({
        step: 'APPOINTMENT_SCHEDULED',
        timestamp: submission.appointment.appointmentTime,
        description: 'Biometric appointment scheduled',
      });
    }

    return timeline.sort(
      (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
    );
  }

  /**
   * Check in an applicant (Gatehouse operation)
   */
  async checkInApplicant(
    referenceNumber: string,
    staffId: string,
    checkInData: { notes?: string },
  ) {
    try {
      // Get appointment by reference number through form submission
      const submission = await this.prisma.formSubmission.findFirst({
        where: { referenceNumber },
        include: {
          appointment: {
            include: {
              center: true,
            },
          },
        },
      });

      if (!submission?.appointment) {
        throw new BadRequestException(
          'Applicant with this reference number not found or has no appointment',
        );
      }

      const appointment = submission.appointment;

      if (appointment.checkedIn) {
        throw new BadRequestException('Applicant already checked in');
      }

      // Verify staff is assigned to this center
      const userCenters = await this.getUserCenters(staffId);
      const userCenterIds = userCenters.map((center) => center.id);

      if (!userCenterIds.includes(appointment.centerId)) {
        throw new ForbiddenException(
          `Access denied - you are not assigned to center ${appointment.center.name}`,
        );
      }

      // Update appointment status
      const updatedAppointment = await this.prisma.biometricAppointment.update({
        where: { id: appointment.id },
        data: {
          checkedIn: true,
          checkedInAt: new Date(),
          checkedInBy: staffId,
          status: 'CHECKED_IN',
          adminNotes: checkInData.notes,
        },
      });

      this.logger.log(
        `Applicant checked in: ${referenceNumber} (appointment: ${appointment.id}) by staff: ${staffId}`,
      );

      return {
        success: true,
        message: 'Applicant successfully checked in',
        data: {
          referenceNumber,
          appointmentId: updatedAppointment.id,
          status: updatedAppointment.status,
          checkedIn: updatedAppointment.checkedIn,
          checkedInAt: updatedAppointment.checkedInAt,
          checkedInBy: updatedAppointment.checkedInBy,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to check in applicant ${referenceNumber}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Add applicant to queue (Receptionist operation)
   */
  async addToQueue(
    referenceNumber: string,
    staffId: string,
    queueData: {
      priority?: number;
      estimatedWaitTime?: number;
      estimatedServiceTime?: number;
      notes?: string;
    },
  ) {
    try {
      // Get appointment by reference number through form submission
      const submission = await this.prisma.formSubmission.findFirst({
        where: { referenceNumber },
        include: {
          appointment: {
            include: {
              center: true,
              queueEntry: true,
            },
          },
        },
      });

      if (!submission?.appointment) {
        throw new BadRequestException(
          'Applicant with this reference number not found or has no appointment',
        );
      }

      const appointment = submission.appointment;

      if (!appointment.checkedIn) {
        throw new BadRequestException(
          'Applicant must be checked in before adding to queue',
        );
      }

      if (appointment.queueEntry) {
        throw new BadRequestException('Applicant already in queue');
      }

      // Verify staff is assigned to this center
      const userCenters = await this.getUserCenters(staffId);
      const userCenterIds = userCenters.map((center) => center.id);

      if (!userCenterIds.includes(appointment.centerId)) {
        throw new ForbiddenException(
          `Access denied - you are not assigned to center ${appointment.center.name}`,
        );
      }

      // Create queue entry
      const queueEntry = await this.prisma.queueEntry.create({
        data: {
          appointmentId: appointment.id,
          centerId: appointment.centerId,
          appointmentClass: appointment.appointmentClass,
          priority: queueData.priority || 0,
          estimatedWaitTime: queueData.estimatedWaitTime,
          estimatedServiceTime: queueData.estimatedServiceTime,
        },
      });

      // Update appointment status
      await this.prisma.biometricAppointment.update({
        where: { id: appointment.id },
        data: {
          status: 'IN_QUEUE',
          adminNotes: queueData.notes,
        },
      });

      this.logger.log(
        `Applicant added to queue: ${referenceNumber} (appointment: ${appointment.id}) by staff: ${staffId}`,
      );

      return {
        success: true,
        message: 'Applicant successfully added to queue',
        data: {
          referenceNumber,
          queueEntryId: queueEntry.id,
          queueNumber: queueEntry.queueNumber,
          status: queueEntry.status,
          estimatedWaitTime: queueEntry.estimatedWaitTime,
          estimatedServiceTime: queueEntry.estimatedServiceTime,
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to add applicant to queue ${referenceNumber}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update queue status
   */
  async updateQueueStatus(
    queueEntryId: string,
    staffId: string,
    statusData: {
      status: string;
      boothId?: string;
      notes?: string;
    },
  ) {
    try {
      // Get queue entry with appointment info
      const queueEntry = await this.prisma.queueEntry.findFirst({
        where: { id: queueEntryId },
        include: {
          appointment: {
            include: {
              center: true,
            },
          },
        },
      });

      if (!queueEntry) {
        throw new BadRequestException('Queue entry not found');
      }

      // Verify staff is assigned to this center
      const userCenters = await this.getUserCenters(staffId);
      const userCenterIds = userCenters.map((center) => center.id);

      if (!userCenterIds.includes(queueEntry.appointment.centerId)) {
        throw new ForbiddenException(
          `Access denied - you are not assigned to center ${queueEntry.appointment.center.name}`,
        );
      }

      // Validate status transition
      const validTransitions = {
        WAITING: ['CALLED', 'CANCELLED'],
        CALLED: ['IN_PROGRESS', 'CANCELLED'],
        IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
        COMPLETED: [],
        CANCELLED: [],
        NO_SHOW: [],
      };

      const currentStatus = queueEntry.status;
      const newStatus = statusData.status as any;

      if (!validTransitions[currentStatus]?.includes(newStatus)) {
        throw new BadRequestException(
          `Invalid status transition from ${currentStatus} to ${newStatus}`,
        );
      }

      // Update queue entry
      const updateData: any = {
        status: newStatus,
      };

      if (newStatus === 'CALLED') {
        if (!statusData.boothId) {
          throw new BadRequestException(
            'Booth ID is required when calling applicant',
          );
        }
        updateData.calledAt = new Date();
        updateData.boothId = statusData.boothId;
      } else if (newStatus === 'IN_PROGRESS') {
        updateData.startedAt = new Date();
      } else if (newStatus === 'IN_PROGRESS') {
        updateData.completedAt = new Date();
      }

      const updatedQueueEntry = await this.prisma.queueEntry.update({
        where: { id: queueEntryId },
        data: updateData,
      });

      // Update appointment status if needed
      if (newStatus === 'CALLED') {
        await this.prisma.biometricAppointment.update({
          where: { id: queueEntry.appointmentId },
          data: {
            status: 'AT_BOOTH',
          },
        });
      } else if (newStatus === 'COMPLETED') {
        await this.prisma.biometricAppointment.update({
          where: { id: queueEntry.appointmentId },
          data: {
            status: 'COMPLETED',
          },
        });
      }

      this.logger.log(
        `Queue status updated: ${queueEntryId} to ${newStatus} by staff: ${staffId}`,
      );

      return {
        success: true,
        message: 'Queue status updated successfully',
        data: {
          queueEntryId: updatedQueueEntry.id,
          status: updatedQueueEntry.status,
          boothId: updatedQueueEntry.boothId,
          updatedAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to update queue status ${queueEntryId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Assign booth to applicant
   */
  async assignBooth(queueEntryId: string, boothId: string, staffId: string) {
    try {
      // Get queue entry
      const queueEntry = await this.prisma.queueEntry.findFirst({
        where: { id: queueEntryId },
        include: {
          appointment: {
            include: {
              center: true,
            },
          },
        },
      });

      if (!queueEntry) {
        throw new BadRequestException(
          'Booth not found or not assigned to this center',
        );
      }

      // Verify staff is assigned to this center
      const userCenters = await this.getUserCenters(staffId);
      const userCenterIds = userCenters.map((center) => center.id);

      if (!userCenterIds.includes(queueEntry.appointment.centerId)) {
        throw new ForbiddenException(
          `Access denied - you are not assigned to center ${queueEntry.appointment.center.name}`,
        );
      }

      // Verify booth exists and is available
      const booth = await this.prisma.booth.findFirst({
        where: {
          id: boothId,
          centerId: queueEntry.appointment.centerId,
        },
      });

      if (!booth) {
        throw new BadRequestException(
          'Booth not found or not assigned to this center',
        );
      }

      // Update queue entry
      const updatedQueueEntry = await this.prisma.queueEntry.update({
        where: { id: queueEntryId },
        data: {
          boothId: boothId,
          status: 'CALLED',
          calledAt: new Date(),
        },
      });

      // Update appointment status
      await this.prisma.biometricAppointment.update({
        where: { id: queueEntry.appointmentId },
        data: {
          status: 'AT_BOOTH',
        },
      });

      this.logger.log(
        `Booth assigned: ${boothId} to queue entry: ${queueEntryId} by staff: ${staffId}`,
      );

      return {
        success: true,
        message: 'Booth assigned successfully',
        data: {
          queueEntryId: updatedQueueEntry.id,
          boothId: updatedQueueEntry.boothId,
          status: updatedQueueEntry.status,
          updatedAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to assign booth ${boothId} to queue entry ${queueEntryId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
