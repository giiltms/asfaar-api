import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { BoothsService } from '@modules/booths/booths.service';
import { QueueEntry, QueueStatus, AppointmentClass, AppointmentStatus } from '@prisma/client';
import {
  CheckInDto,
  UpdateQueueStatusDto,
  CallNextDto,
  QueueFiltersDto,
  QueueStatsDto,
  BulkUpdateQueueDto,
  QueuePositionResponseDto,
} from './dto/queue.dto';
import { PaginationQueryDto } from '@common/dtos/pagination.dto';
import { PaginationUtils } from '@common/utils/pagination.utils';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly boothsService: BoothsService,
  ) {}

  /**
   * Check in applicant to queue (FIFO entry point)
   */
  async checkIn(checkInDto: CheckInDto): Promise<QueueEntry> {
    try {
      // Validate appointment exists and is eligible for queue
      const appointment = await this.prisma.biometricAppointment.findUnique({
        where: { id: checkInDto.appointmentId },
        include: {
          submission: {
            include: {
              payment: true,
            },
          },
          center: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
      });

      if (!appointment) {
        throw new NotFoundException(
          `Appointment with ID "${checkInDto.appointmentId}" not found`,
        );
      }

      // Validate appointment is ready for queue
      await this.validateAppointmentForQueue(appointment);

      // Check if already in queue
      const existingQueueEntry = await this.prisma.queueEntry.findUnique({
        where: { appointmentId: checkInDto.appointmentId },
      });

      if (existingQueueEntry) {
        throw new ConflictException(
          'Appointment is already in queue',
        );
      }

      // Calculate estimated wait time based on current queue
      const estimatedWaitTime = await this.calculateEstimatedWaitTime(
        appointment.centerId,
        appointment.appointmentClass,
      );

      // Create queue entry
      const queueEntry = await this.prisma.queueEntry.create({
        data: {
          appointmentId: checkInDto.appointmentId,
          centerId: appointment.centerId,
          appointmentClass: appointment.appointmentClass,
          priority: checkInDto.priority || 0,
          estimatedWaitTime,
          estimatedServiceTime: await this.getAverageServiceTime(appointment.appointmentClass),
        },
        include: {
          appointment: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          center: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      this.logger.log(
        `Checked in appointment ${appointment.id} to queue. Queue number: ${queueEntry.queueNumber}`,
      );

      return queueEntry;
    } catch (error) {
      this.logger.error(
        `Failed to check in appointment: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get queue position and status for appointment
   */
  async getQueuePosition(appointmentId: string): Promise<QueuePositionResponseDto> {
    try {
      const queueEntry = await this.prisma.queueEntry.findUnique({
        where: { appointmentId },
        include: {
          center: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!queueEntry) {
        throw new NotFoundException('Appointment not found in queue');
      }

      // Calculate current position in queue
      const position = await this.calculateCurrentPosition(queueEntry);

      // Count people ahead
      const peopleAhead = await this.prisma.queueEntry.count({
        where: {
          centerId: queueEntry.centerId,
          appointmentClass: queueEntry.appointmentClass,
          status: QueueStatus.WAITING,
          queueNumber: { lt: queueEntry.queueNumber },
        },
      });

      // Recalculate estimated wait time
      const estimatedWaitTime = await this.calculateEstimatedWaitTime(
        queueEntry.centerId,
        queueEntry.appointmentClass,
      );

      return {
        queueId: queueEntry.id,
        appointmentId: queueEntry.appointmentId,
        queueNumber: queueEntry.queueNumber,
        status: queueEntry.status,
        position,
        estimatedWaitTime,
        peopleAhead,
        joinedAt: queueEntry.joinedAt,
        calledAt: queueEntry.calledAt,
        centerName: queueEntry.center.name,
        appointmentClass: queueEntry.appointmentClass,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get queue position: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Call next person in queue (FIFO algorithm)
   */
  async callNext(callNextDto: CallNextDto): Promise<QueueEntry> {
    try {
      // Get next person in queue (FIFO with priority)
      const nextInQueue = await this.getNextInQueue(
        callNextDto.centerId,
        callNextDto.appointmentClass,
      );

      if (!nextInQueue) {
        throw new NotFoundException(
          `No one waiting in ${callNextDto.appointmentClass} queue`,
        );
      }

      // Get available booth
      let booth;
      if (callNextDto.boothId) {
        // Specific booth requested
        booth = await this.boothsService.findBoothById(callNextDto.boothId);
        if (booth.isOccupied || !booth.isActive) {
          throw new BadRequestException('Requested booth is not available');
        }
      } else {
        // Auto-assign next available booth
        const availableBooths = await this.boothsService.getAvailableBooths(
          callNextDto.centerId,
          callNextDto.appointmentClass,
        );

        if (availableBooths.length === 0) {
          throw new BadRequestException(
            `No available booths for ${callNextDto.appointmentClass} appointments`,
          );
        }

        booth = availableBooths[0]; // First available booth (FIFO for booths too)
      }

      // Update queue entry and booth status in transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Mark booth as occupied
        await tx.booth.update({
          where: { id: booth.id },
          data: { isOccupied: true },
        });

        // Update queue entry status
        const updatedQueueEntry = await tx.queueEntry.update({
          where: { id: nextInQueue.id },
          data: {
            status: QueueStatus.CALLED,
            boothId: booth.id,
            calledAt: new Date(),
          },
          include: {
            appointment: {
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
            booth: {
              include: {
                agent: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            center: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        });

        return updatedQueueEntry;
      });

      this.logger.log(
        `Called next in queue: ${nextInQueue.appointment.user.firstName} ${nextInQueue.appointment.user.lastName} to booth ${booth.boothNumber}`,
      );

      // TODO: Send notification to applicant about booth assignment

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to call next in queue: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update queue entry status
   */
  async updateQueueStatus(
    queueId: string,
    updateDto: UpdateQueueStatusDto,
  ): Promise<QueueEntry> {
    try {
      const queueEntry = await this.prisma.queueEntry.findUnique({
        where: { id: queueId },
        include: {
          booth: true,
        },
      });

      if (!queueEntry) {
        throw new NotFoundException(`Queue entry with ID "${queueId}" not found`);
      }

      // Validate status transition
      this.validateStatusTransition(queueEntry.status, updateDto.status);

      const updateData: any = {
        status: updateDto.status,
      };

      // Handle status-specific updates
      switch (updateDto.status) {
        case QueueStatus.IN_PROGRESS:
          updateData.startedAt = new Date();
          break;
        case QueueStatus.COMPLETED:
          updateData.completedAt = new Date();
          break;
        case QueueStatus.CANCELLED:
        case QueueStatus.NO_SHOW:
          // Release booth if assigned
          if (queueEntry.boothId) {
            await this.prisma.booth.update({
              where: { id: queueEntry.boothId },
              data: { isOccupied: false },
            });
          }
          break;
      }

      // Handle booth assignment
      if (updateDto.boothId && updateDto.boothId !== queueEntry.boothId) {
        updateData.boothId = updateDto.boothId;

        // Release old booth if exists
        if (queueEntry.boothId) {
          await this.prisma.booth.update({
            where: { id: queueEntry.boothId },
            data: { isOccupied: false },
          });
        }

        // Occupy new booth
        await this.prisma.booth.update({
          where: { id: updateDto.boothId },
          data: { isOccupied: true },
        });
      }

      const updatedQueueEntry = await this.prisma.queueEntry.update({
        where: { id: queueId },
        data: updateData,
        include: {
          appointment: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
          booth: {
            include: {
              agent: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          center: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      this.logger.log(
        `Updated queue entry ${queueId} status to ${updateDto.status}`,
      );

      return updatedQueueEntry;
    } catch (error) {
      this.logger.error(
        `Failed to update queue status: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cancel queue entry
   */
  async cancelQueueEntry(queueId: string, reason?: string): Promise<QueueEntry> {
    return this.updateQueueStatus(queueId, {
      status: QueueStatus.CANCELLED,
      reason,
    });
  }

  /**
   * Get all queue entries with filtering and pagination
   */
  async findAllQueueEntries(
    filters: QueueFiltersDto = {},
    pagination: PaginationQueryDto = { page: 1, limit: 10 },
  ) {
    try {
      const where: any = {};

      // Apply filters
      if (filters.centerId) {
        where.centerId = filters.centerId;
      }

      if (filters.appointmentClass) {
        where.appointmentClass = filters.appointmentClass;
      }

      if (filters.status) {
        where.status = filters.status;
      }

      if (filters.boothId) {
        where.boothId = filters.boothId;
      }

      if (filters.fromDate || filters.toDate) {
        where.joinedAt = {};
        if (filters.fromDate) {
          where.joinedAt.gte = new Date(filters.fromDate);
        }
        if (filters.toDate) {
          where.joinedAt.lte = new Date(filters.toDate);
        }
      }

      if (filters.activeOnly) {
        where.status = {
          in: [QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.IN_PROGRESS],
        };
      }

      const include = {
        appointment: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        booth: {
          include: {
            agent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        center: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      };

      const orderBy = [
        { status: 'asc' as const }, // Active statuses first
        { priority: 'desc' as const }, // Higher priority first
        { queueNumber: 'asc' as const }, // FIFO order
      ];

      // Calculate pagination
      const skip = (pagination.page - 1) * pagination.limit;

      // Execute queries
      const [queueEntries, totalCount] = await Promise.all([
        this.prisma.queueEntry.findMany({
          where,
          skip,
          take: pagination.limit,
          orderBy,
          include,
        }),
        this.prisma.queueEntry.count({ where }),
      ]);

      const meta = PaginationUtils.createPaginationMeta(
        pagination.page,
        pagination.limit,
        totalCount,
        'queueNumber',
        'asc',
      );

      return {
        data: queueEntries,
        meta,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch queue entries: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(centerId?: string): Promise<QueueStatsDto> {
    try {
      const where = centerId ? { centerId } : {};
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        total,
        waiting,
        called,
        inProgress,
        completed,
        cancelled,
        noShow,
      ] = await Promise.all([
        this.prisma.queueEntry.count({ where }),
        this.prisma.queueEntry.count({ where: { ...where, status: QueueStatus.WAITING } }),
        this.prisma.queueEntry.count({ where: { ...where, status: QueueStatus.CALLED } }),
        this.prisma.queueEntry.count({ where: { ...where, status: QueueStatus.IN_PROGRESS } }),
        this.prisma.queueEntry.count({ where: { ...where, status: QueueStatus.COMPLETED } }),
        this.prisma.queueEntry.count({ where: { ...where, status: QueueStatus.CANCELLED } }),
        this.prisma.queueEntry.count({ where: { ...where, status: QueueStatus.NO_SHOW } }),
      ]);

      // Get stats by appointment class
      const byClass = {
        [AppointmentClass.REGULAR]: await this.getClassQueueStats(AppointmentClass.REGULAR, where, today),
        [AppointmentClass.VIP]: await this.getClassQueueStats(AppointmentClass.VIP, where, today),
        [AppointmentClass.PREMIUM]: await this.getClassQueueStats(AppointmentClass.PREMIUM, where, today),
      };

      // Calculate average times
      const [avgProcessingTime, avgWaitTime] = await Promise.all([
        this.calculateAverageProcessingTime(where),
        this.calculateAverageWaitTime(where),
      ]);

      // Calculate efficiency
      const scheduled = await this.prisma.biometricAppointment.count({
        where: {
          ...(centerId ? { centerId } : {}),
          appointmentDate: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });

      const efficiency = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;

      // Find peak hour (simplified - could be more sophisticated)
      const peakHour = await this.findPeakHour(where, today);

      return {
        total,
        waiting,
        called,
        inProgress,
        completed,
        cancelled,
        noShow,
        byClass,
        avgProcessingTime,
        avgWaitTime,
        peakHour,
        efficiency,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get queue stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Private helper: Validate appointment for queue
   */
  private async validateAppointmentForQueue(appointment: any): Promise<void> {
    if (appointment.status !== AppointmentStatus.ACTIVE) {
      throw new BadRequestException(
        'Only ACTIVE appointments can join the queue',
      );
    }

    if (!appointment.center.isActive) {
      throw new BadRequestException(
        'Cannot join queue at inactive center',
      );
    }

    if (!appointment.submission?.payment || appointment.submission.payment.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Payment must be completed before joining queue',
      );
    }

    // Check if appointment date is today
    const today = new Date();
    const appointmentDate = new Date(appointment.appointmentDate);

    if (
      appointmentDate.getFullYear() !== today.getFullYear() ||
      appointmentDate.getMonth() !== today.getMonth() ||
      appointmentDate.getDate() !== today.getDate()
    ) {
      throw new BadRequestException(
        'Can only join queue on the appointment date',
      );
    }
  }

  /**
   * Private helper: Get next person in queue (FIFO with priority)
   */
  private async getNextInQueue(
    centerId: string,
    appointmentClass: AppointmentClass,
  ): Promise<any> {
    return this.prisma.queueEntry.findFirst({
      where: {
        centerId,
        appointmentClass,
        status: QueueStatus.WAITING,
      },
      orderBy: [
        { priority: 'desc' }, // Higher priority first
        { queueNumber: 'asc' }, // Then FIFO order
      ],
      include: {
        appointment: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Private helper: Calculate estimated wait time
   */
  private async calculateEstimatedWaitTime(
    centerId: string,
    appointmentClass: AppointmentClass,
  ): Promise<number> {
    const peopleAhead = await this.prisma.queueEntry.count({
      where: {
        centerId,
        appointmentClass,
        status: QueueStatus.WAITING,
      },
    });

    const availableBooths = await this.boothsService.getAvailableBooths(
      centerId,
      appointmentClass,
    );

    const avgServiceTime = await this.getAverageServiceTime(appointmentClass);

    if (availableBooths.length === 0) {
      return peopleAhead * avgServiceTime; // All sequential
    }

    // Parallel processing calculation
    return Math.ceil(peopleAhead / availableBooths.length) * avgServiceTime;
  }

  /**
   * Private helper: Get average service time by class
   */
  private async getAverageServiceTime(appointmentClass: AppointmentClass): Promise<number> {
    // Base service times (could be configurable)
    const baseTimes = {
      [AppointmentClass.REGULAR]: 15,
      [AppointmentClass.PREMIUM]: 20,
      [AppointmentClass.VIP]: 25,
    };

    // TODO: Calculate actual average from historical data
    return baseTimes[appointmentClass] || 15;
  }

  /**
   * Private helper: Calculate current position in queue
   */
  private async calculateCurrentPosition(queueEntry: QueueEntry): Promise<number> {
    if (queueEntry.status !== QueueStatus.WAITING) {
      return 0; // Not waiting anymore
    }

    const position = await this.prisma.queueEntry.count({
      where: {
        centerId: queueEntry.centerId,
        appointmentClass: queueEntry.appointmentClass,
        status: QueueStatus.WAITING,
        OR: [
          { priority: { gt: queueEntry.priority } },
          {
            priority: queueEntry.priority,
            queueNumber: { lt: queueEntry.queueNumber },
          },
        ],
      },
    });

    return position + 1; // 1-based position
  }

  /**
   * Private helper: Validate status transition
   */
  private validateStatusTransition(current: QueueStatus, next: QueueStatus): void {
    const validTransitions: Record<QueueStatus, QueueStatus[]> = {
      [QueueStatus.WAITING]: [QueueStatus.CALLED, QueueStatus.CANCELLED],
      [QueueStatus.CALLED]: [QueueStatus.IN_PROGRESS, QueueStatus.NO_SHOW, QueueStatus.CANCELLED],
      [QueueStatus.IN_PROGRESS]: [QueueStatus.COMPLETED, QueueStatus.CANCELLED],
      [QueueStatus.COMPLETED]: [], // Terminal state
      [QueueStatus.NO_SHOW]: [], // Terminal state
      [QueueStatus.CANCELLED]: [], // Terminal state
    };

    if (!validTransitions[current]?.includes(next)) {
      throw new BadRequestException(
        `Invalid status transition from ${current} to ${next}`,
      );
    }
  }

  /**
   * Private helper: Get class-specific queue stats
   */
  private async getClassQueueStats(
    appointmentClass: AppointmentClass,
    where: any,
    today: Date,
  ) {
    const classWhere = { ...where, appointmentClass };

    const [waiting, totalToday] = await Promise.all([
      this.prisma.queueEntry.count({
        where: { ...classWhere, status: QueueStatus.WAITING },
      }),
      this.prisma.queueEntry.count({
        where: {
          ...classWhere,
          joinedAt: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    const avgWaitTime = await this.calculateAverageWaitTime(classWhere);

    return { waiting, avgWaitTime, totalToday };
  }

  /**
   * Private helper: Calculate average processing time
   */
  private async calculateAverageProcessingTime(where: any): Promise<number> {
    // Simplified calculation - in production, use raw SQL for better performance
    const completedEntries = await this.prisma.queueEntry.findMany({
      where: {
        ...where,
        status: QueueStatus.COMPLETED,
        startedAt: { not: null },
        completedAt: { not: null },
      },
      select: {
        startedAt: true,
        completedAt: true,
      },
      take: 100, // Last 100 entries for average
    });

    if (completedEntries.length === 0) return 15; // Default

    const totalTime = completedEntries.reduce((sum, entry) => {
      const start = new Date(entry.startedAt).getTime();
      const end = new Date(entry.completedAt).getTime();
      return sum + (end - start);
    }, 0);

    return Math.round(totalTime / completedEntries.length / (1000 * 60)); // Minutes
  }

  /**
   * Private helper: Calculate average wait time
   */
  private async calculateAverageWaitTime(where: any): Promise<number> {
    // Similar to processing time but for wait time
    const calledEntries = await this.prisma.queueEntry.findMany({
      where: {
        ...where,
        joinedAt: { not: null },
        calledAt: { not: null },
      },
      select: {
        joinedAt: true,
        calledAt: true,
      },
      take: 100,
    });

    if (calledEntries.length === 0) return 10; // Default

    const totalWaitTime = calledEntries.reduce((sum, entry) => {
      const joined = new Date(entry.joinedAt).getTime();
      const called = new Date(entry.calledAt).getTime();
      return sum + (called - joined);
    }, 0);

    return Math.round(totalWaitTime / calledEntries.length / (1000 * 60)); // Minutes
  }

  /**
   * Private helper: Find peak hour
   */
  private async findPeakHour(where: any, today: Date): Promise<string> {
    // Simplified - in production use more sophisticated analysis
    return '14:00'; // Default peak hour
  }
} 