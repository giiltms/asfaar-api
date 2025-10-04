import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import {
  StationStatsDto,
  CenterManagerStatsResponseDto,
  CalendarFiltersDto,
  CalendarSlotDto,
  CalendarSlotsResponseDto,
} from './dto/center-manager-stats.dto';

@Injectable()
export class DashboardCenterManagerService {
  private readonly logger = new Logger(DashboardCenterManagerService.name);

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
   * Get center manager dashboard statistics for all assigned centers
   */
  async getCenterManagerStats(
    userId: string,
  ): Promise<CenterManagerStatsResponseDto> {
    try {
      // Get user's assigned centers
      const centers = await this.getUserCenters(userId);
      const centerIds = centers.map((center) => center.id);

      if (centerIds.length === 0) {
        throw new NotFoundException('No centers assigned to this user');
      }

      this.logger.log(
        `Getting center manager stats for user ${userId} with centers: ${centerIds.join(
          ', ',
        )}`,
      );

      // Get current date boundaries
      const today = new Date();
      const startOfToday = new Date(today);
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(today);
      endOfToday.setHours(23, 59, 59, 999);

      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const startOfYesterday = new Date(yesterday);
      startOfYesterday.setHours(0, 0, 0, 0);
      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);

      // Get start of week (Monday)
      const startOfWeek = new Date(today);
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startOfWeek.setDate(today.getDate() - daysToMonday);
      startOfWeek.setHours(0, 0, 0, 0);

      // Get start of month
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Get tomorrow
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const startOfTomorrow = new Date(tomorrow);
      startOfTomorrow.setHours(0, 0, 0, 0);
      const endOfTomorrow = new Date(tomorrow);
      endOfTomorrow.setHours(23, 59, 59, 999);

      // Execute all queries in parallel
      const [
        totalStations,
        activeStations,
        completedToday,
        completedYesterday,
        completedThisWeek,
        completedThisMonth,
        inProgressCount,
        noShowsToday,
        rescheduledToday,
        availableSlots,
        tomorrowBookings,
        queueLength,
        availableAgents,
        agentsOffline,
      ] = await Promise.all([
        // Total stations in assigned centers
        this.prisma.booth.count({
          where: {
            centerId: { in: centerIds },
          },
        }),

        // Active stations
        this.prisma.booth.count({
          where: {
            centerId: { in: centerIds },
            isActive: true,
          },
        }),

        // Completed today
        this.prisma.biometricSession.count({
          where: {
            booth: {
              centerId: { in: centerIds },
            },
            completedAt: {
              gte: startOfToday,
              lte: endOfToday,
            },
          },
        }),

        // Completed yesterday
        this.prisma.biometricSession.count({
          where: {
            booth: {
              centerId: { in: centerIds },
            },
            completedAt: {
              gte: startOfYesterday,
              lte: endOfYesterday,
            },
          },
        }),

        // Completed this week
        this.prisma.biometricSession.count({
          where: {
            booth: {
              centerId: { in: centerIds },
            },
            completedAt: {
              gte: startOfWeek,
            },
          },
        }),

        // Completed this month
        this.prisma.biometricSession.count({
          where: {
            booth: {
              centerId: { in: centerIds },
            },
            completedAt: {
              gte: startOfMonth,
            },
          },
        }),

        // In progress count (sessions that are started but not completed)
        this.prisma.biometricSession.count({
          where: {
            booth: {
              centerId: { in: centerIds },
            },
            completedAt: null,
            NOT: {
              startedAt: null,
            },
          },
        }),

        // No shows today
        this.prisma.biometricAppointment.count({
          where: {
            centerId: { in: centerIds },
            status: 'NO_SHOW',
            appointmentTime: {
              gte: startOfToday,
              lte: endOfToday,
            },
          },
        }),

        // Rescheduled today
        this.prisma.biometricAppointment.count({
          where: {
            centerId: { in: centerIds },
            status: 'RESCHEDULED',
            appointmentTime: {
              gte: startOfToday,
              lte: endOfToday,
            },
          },
        }),

        // Available slots today
        this.prisma.biometricAppointment.count({
          where: {
            centerId: { in: centerIds },
            status: 'PENDING',
            appointmentTime: {
              gte: startOfToday,
              lte: endOfToday,
            },
          },
        }),

        // Tomorrow bookings
        this.prisma.biometricAppointment.count({
          where: {
            centerId: { in: centerIds },
            appointmentTime: {
              gte: startOfTomorrow,
              lte: endOfTomorrow,
            },
            status: {
              in: ['PENDING', 'ACTIVE', 'SCHEDULED'],
            },
          },
        }),

        // Queue length (people waiting or called but not yet in progress)
        this.prisma.queueEntry.count({
          where: {
            centerId: { in: centerIds },
            status: {
              in: ['WAITING', 'CALLED'],
            },
          },
        }),

        // Available agents (BIOMETRIC_AGENT role, not in active session)
        this.prisma.user.count({
          where: {
            roles: {
              has: 'BIOMETRIC_AGENT',
            },
            biometricCenters: {
              some: {
                id: { in: centerIds },
              },
            },
            biometricSessions: {
              none: {
                completedAt: null,
                NOT: {
                  startedAt: null,
                },
              },
            },
          },
        }),

        // Agents offline (BIOMETRIC_AGENT role, not in any active session)
        // Note: This is the same as available agents for now - could be enhanced with last activity tracking
        this.prisma.user.count({
          where: {
            roles: {
              has: 'BIOMETRIC_AGENT',
            },
            biometricCenters: {
              some: {
                id: { in: centerIds },
              },
            },
            biometricSessions: {
              none: {
                completedAt: null,
                NOT: {
                  startedAt: null,
                },
              },
            },
          },
        }),
      ]);

      // Calculate average wait time (simplified - would need more sophisticated tracking)
      const averageWaitTime =
        queueLength > 0 ? Math.round((queueLength * 15) / 2) : 0; // Rough estimate
      const longestWaitTime = queueLength > 0 ? queueLength * 20 : 0; // Rough estimate

      const stats: StationStatsDto = {
        activeStations,
        totalStations,
        completedToday,
        inProgressCount,
        availableAgents,
        queueLength,
        completedYesterday,
        completedThisWeek,
        completedThisMonth,
        noShowsToday,
        rescheduledToday,
        availableSlots,
        tomorrowBookings,
        agentsOffline,
        averageWaitTime,
        longestWaitTime,
      };

      this.logger.log(
        `Center manager stats calculated: ${JSON.stringify(stats)}`,
      );

      return {
        stats,
        centers,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get center manager stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get calendar slots for a date range
   */
  async getCalendarSlots(
    userId: string,
    filters: CalendarFiltersDto,
  ): Promise<CalendarSlotsResponseDto> {
    try {
      // Get user's assigned centers
      const centers = await this.getUserCenters(userId);
      const centerIds = filters.centerId
        ? [filters.centerId]
        : centers.map(center => center.id);

      if (centerIds.length === 0) {
        throw new NotFoundException('No centers assigned to this user');
      }

      // Parse date range
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);

      // Set proper time boundaries
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      this.logger.log(
        `Getting calendar slots for user ${userId} from ${filters.startDate} to ${filters.endDate}`,
      );

      // Get center configurations for slot generation
      const centerConfigs = await this.prisma.biometricCenter.findMany({
        where: { id: { in: centerIds } },
        select: {
          id: true,
          name: true,
          openingTime: true,
          closingTime: true,
          appointmentDuration: true,
          bufferTime: true,
          workingDays: true,
        },
      });

      // Get existing appointments in the date range
      const appointments = await this.prisma.biometricAppointment.findMany({
        where: {
          centerId: { in: centerIds },
          appointmentTime: {
            gte: startDate,
            lte: endDate,
          },
          ...(filters.appointmentClass && { appointmentClass: filters.appointmentClass as any }),
          ...(filters.status && { status: filters.status as any }),
        },
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
          queueEntry: {
            select: {
              id: true,
              booth: {
                select: {
                  id: true,
                  boothNumber: true,
                  appointmentClass: true,
                  agent: {
                    select: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Generate time slots for each center and date
      const slots: CalendarSlotDto[] = [];
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        const dateStr = currentDate.toISOString().split('T')[0];

        for (const center of centerConfigs) {
          const centerSlots = this.generateTimeSlotsForDate(
            currentDate,
            center,
            appointments.filter(apt =>
              apt.centerId === center.id &&
              apt.appointmentTime?.toISOString().split('T')[0] === dateStr
            ),
          );
          slots.push(...centerSlots);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Calculate statistics
      const totalSlots = slots.length;
      const availableSlots = slots.filter(slot => slot.status === 'AVAILABLE').length;
      const bookedSlots = slots.filter(slot => slot.status === 'BOOKED').length;

      return {
        slots,
        totalSlots,
        availableSlots,
        bookedSlots,
        dateRange: `${filters.startDate} to ${filters.endDate}`,
        viewType: filters.viewType,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get calendar slots: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate time slots for a specific date and center
   */
  private generateTimeSlotsForDate(
    date: Date,
    center: any,
    appointments: any[],
  ): CalendarSlotDto[] {
    const slots: CalendarSlotDto[] = [];

    if (!center.openingTime || !center.closingTime) {
      return slots;
    }

    // Parse opening and closing times
    const [openHour, openMinute] = center.openingTime.split(':').map(Number);
    const [closeHour, closeMinute] = center.closingTime.split(':').map(Number);

    const slotDuration = center.appointmentDuration || 30; // minutes
    const bufferTime = center.bufferTime || 15; // minutes
    const totalSlotTime = slotDuration + bufferTime;

    // Generate slots from opening to closing time
    const startTime = new Date(date);
    startTime.setHours(openHour, openMinute, 0, 0);

    const endTime = new Date(date);
    endTime.setHours(closeHour, closeMinute, 0, 0);

    let currentTime = new Date(startTime);

    while (currentTime < endTime) {
      const slotEndTime = new Date(currentTime);
      slotEndTime.setMinutes(slotEndTime.getMinutes() + slotDuration);

      if (slotEndTime <= endTime) {
        const timeStr = currentTime.toTimeString().slice(0, 5);
        const endTimeStr = slotEndTime.toTimeString().slice(0, 5);
        const dateStr = date.toISOString().split('T')[0];

        // Check if this slot is booked
        const bookedAppointment = appointments.find(apt => {
          const aptTime = new Date(apt.appointmentTime);
          return aptTime.getTime() === currentTime.getTime();
        });

        const slot: CalendarSlotDto = {
          id: `slot-${center.id}-${dateStr}-${timeStr}`,
          startTime: timeStr,
          endTime: endTimeStr,
          date: dateStr,
          status: bookedAppointment ? 'BOOKED' : 'AVAILABLE',
          appointment: bookedAppointment ? {
            id: bookedAppointment.id,
            referenceNumber: bookedAppointment.submission.referenceNumber || bookedAppointment.id,
            applicantName: `${bookedAppointment.user.firstName || ''} ${bookedAppointment.user.lastName || ''}`.trim(),
            country: bookedAppointment.submission.form.country.name,
            formType: bookedAppointment.submission.form.name,
            appointmentClass: bookedAppointment.appointmentClass,
            boothNumber: bookedAppointment.queueEntry?.booth?.boothNumber || 'TBD',
            agentName: bookedAppointment.queueEntry?.booth?.agent
              ? `${bookedAppointment.queueEntry.booth.agent.firstName} ${bookedAppointment.queueEntry.booth.agent.lastName}`.trim()
              : 'Unassigned',
            status: bookedAppointment.status,
            appointmentId: bookedAppointment.id,
            submissionId: bookedAppointment.submission.id,
          } : undefined,
        };

        slots.push(slot);
      }

      // Move to next slot
      currentTime.setMinutes(currentTime.getMinutes() + totalSlotTime);
    }

    return slots;
  }
}
