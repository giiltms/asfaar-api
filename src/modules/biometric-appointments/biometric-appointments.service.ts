import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { PaymentsService } from '@modules/payments/payments.service';
import { BiometricCentersService } from '@modules/biometric-centers/biometric-centers.service';
import { ReferenceNumberService } from '@shared/services/reference-number/reference-number.service';
import {
  Prisma,
  BiometricAppointment,
  AppointmentStatus,
  PaymentStatus,
} from '@prisma/client';
import {
  CreateBiometricAppointmentDto,
  UpdateAppointmentStatusDto,
  RescheduleAppointmentDto,
  CompleteBiometricCaptureDto,
  AppointmentFiltersDto,
  UpdateAppointmentDto,
} from './dto/biometric-appointment.dto';
import { PaginationQueryDto } from '@common/dtos';
import { PaginationUtils } from '@common/utils/pagination.utils';

/**
 * Service for managing biometric appointments
 * Handles appointment lifecycle, payment validation, and business logic
 */
@Injectable()
export class BiometricAppointmentsService {
  private readonly logger = new Logger(BiometricAppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly biometricCentersService: BiometricCentersService,
    private readonly referenceNumberService: ReferenceNumberService,
  ) {}

  /**
   * Create a new biometric appointment
   * Requires payment validation before booking
   */
  async createAppointment(
    createDto: CreateBiometricAppointmentDto,
    userId: string,
    createdBy?: string,
  ): Promise<BiometricAppointment> {
    try {
      // 1. Validate form submission exists and belongs to user
      const submission = await this.prisma.formSubmission.findUnique({
        where: { id: createDto.submissionId },
        include: { payment: true },
      });

      if (!submission) {
        throw new NotFoundException(
          `Form submission with ID "${createDto.submissionId}" not found`,
        );
      }

      if (submission.userId !== userId) {
        throw new BadRequestException(
          'You can only book appointments for your own submissions',
        );
      }

      // 2. Check if appointment already exists for this submission
      const existingAppointment =
        await this.prisma.biometricAppointment.findUnique({
          where: { submissionId: createDto.submissionId },
        });

      if (existingAppointment) {
        throw new ConflictException(
          `Appointment already exists for submission "${createDto.submissionId}"`,
        );
      }

      // 3. Validate payment exists and is completed
      if (!submission.payment) {
        throw new BadRequestException(
          'Payment must be created before booking an appointment',
        );
      }

      if (submission.payment.status !== PaymentStatus.COMPLETED) {
        throw new BadRequestException(
          `Payment must be completed before booking an appointment. Current status: ${submission.payment.status}`,
        );
      }

      // 4. Validate biometric center exists and is active
      const center = await this.biometricCentersService.findCenterById(
        createDto.centerId,
      );
      if (!center.isActive) {
        throw new BadRequestException(
          `Biometric center "${center.name}" is not active`,
        );
      }

      // 5. Generate reference number using the specific center
      let referenceNumber: string | undefined;
      if (!submission.referenceNumber) {
        try {
          referenceNumber =
            await this.referenceNumberService.generateReferenceNumberForSubmission(
              createDto.submissionId,
              center.centerNumber,
            );
        } catch (error) {
          this.logger.warn(
            `Failed to generate reference number for submission ${createDto.submissionId}: ${error.message}`,
          );
          // Continue without reference number - it can be generated later
        }
      }

      // 6. Check center availability for the requested date/time
      const isAvailable =
        await this.biometricCentersService.checkCenterAvailability(
          createDto.centerId,
          new Date(createDto.appointmentDate),
        );

      if (!isAvailable) {
        throw new BadRequestException(
          `Center is not available for the requested date/time`,
        );
      }

      // 7. Validate appointment date/time
      await this.validateAppointmentDateTime(
        createDto.centerId,
        new Date(createDto.appointmentDate),
        new Date(createDto.appointmentTime),
      );

      // 8. Validate acknowledgments
      if (
        !createDto.confirmationAcknowledged ||
        !createDto.consentAcknowledged ||
        !createDto.termsAcknowledged
      ) {
        throw new BadRequestException(
          'All acknowledgments must be confirmed to book an appointment',
        );
      }

      // 9. Create appointment with ACTIVE status (since payment is completed)
      const appointmentData: Prisma.BiometricAppointmentCreateInput = {
        user: { connect: { id: userId } },
        submission: { connect: { id: createDto.submissionId } },
        center: { connect: { id: createDto.centerId } },
        appointmentClass: createDto.appointmentClass || 'REGULAR',
        appointmentDate: new Date(createDto.appointmentDate),
        appointmentTime: new Date(createDto.appointmentTime),
        specialRequirements: createDto.specialRequirements,
        confirmationAcknowledged: createDto.confirmationAcknowledged,
        consentAcknowledged: createDto.consentAcknowledged,
        termsAcknowledged: createDto.termsAcknowledged,
        status: AppointmentStatus.ACTIVE, // Active since payment is completed
        createdBy,
        lastModifiedBy: createdBy,
      };

      // Use transaction to create appointment and update form submission with reference number
      const result = await this.prisma.$transaction(async (tx) => {
        // Create the appointment
        const appointment = await tx.biometricAppointment.create({
          data: appointmentData,
          include: {
            submission: {
              include: {
                form: {
                  include: {
                    country: true,
                  },
                },
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
                centerNumber: true,
                address: true,
                city: true,
                state: true,
              },
            },
          },
        });

        // Update form submission with reference number if generated
        if (referenceNumber) {
          await tx.formSubmission.update({
            where: { id: createDto.submissionId },
            data: { referenceNumber },
          });
        }

        return appointment;
      });

      this.logger.log(
        `Created biometric appointment: ${result.id} for submission: ${
          createDto.submissionId
        }${referenceNumber ? ` with reference: ${referenceNumber}` : ''}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Failed to create appointment: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get all appointments with optional filtering and pagination
   */
  async findAllAppointments(
    filters: AppointmentFiltersDto = {},
    pagination: PaginationQueryDto = {},
    userId?: string, // Optional: filter by user (for regular users)
  ) {
    const { page = 1, limit = 10 } = pagination;
    const {
      status,
      appointmentClass,
      centerId,
      submissionId,
      referenceNumber,
      fromDate,
      toDate,
      biometricsCaptured,
    } = filters;

    // Build where clause
    const where: Prisma.BiometricAppointmentWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (status) {
      where.status = status;
    }

    if (appointmentClass) {
      where.appointmentClass = appointmentClass;
    }

    if (centerId) {
      where.centerId = centerId;
    }

    if (submissionId) {
      where.submissionId = submissionId;
    }

    if (referenceNumber) {
      where.submission = {
        referenceNumber: referenceNumber,
      };
    }

    if (fromDate || toDate) {
      where.appointmentDate = {};
      if (fromDate) {
        where.appointmentDate.gte = new Date(fromDate);
      }
      if (toDate) {
        where.appointmentDate.lte = new Date(toDate);
      }
    }

    if (biometricsCaptured !== undefined) {
      where.biometricsCaptured = biometricsCaptured;
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries
    const [appointments, totalCount] = await Promise.all([
      this.prisma.biometricAppointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ appointmentDate: 'asc' }, { appointmentTime: 'asc' }],
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              nin: true,
            },
          },
          submission: {
            select: {
              id: true,
              status: true,
              referenceNumber: true,
              payment: {
                select: {
                  id: true,
                  status: true,
                  amount: true,
                },
              },
              responses: {
                where: {
                  fieldName: {
                    in: ['passport-photo', 'passport-number'],
                  },
                },
                select: {
                  id: true,
                  fieldName: true,
                  fileUrls: true,
                  value: true,
                },
              },
            },
          },
          center: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              state: true,
            },
          },
        },
      }),
      this.prisma.biometricAppointment.count({ where }),
    ]);

    const meta = PaginationUtils.createPaginationMeta(
      page,
      limit,
      totalCount,
      'appointmentDate',
      'asc',
    );

    return {
      data: appointments,
      meta,
    };
  }

  /**
   * Get a single appointment by ID
   */
  async findAppointmentById(
    id: string,
    userId?: string,
  ): Promise<BiometricAppointment> {
    const where: Prisma.BiometricAppointmentWhereInput = { id };

    if (userId) {
      where.userId = userId;
    }

    const appointment = await this.prisma.biometricAppointment.findFirst({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            nin: true,
          },
        },
        submission: {
          select: {
            id: true,
            status: true,
            referenceNumber: true,
            payment: {
              select: {
                id: true,
                status: true,
                amount: true,
              },
            },
            responses: {
              where: {
                fieldName: {
                  in: ['passport-photo', 'passport-number'],
                },
              },
              select: {
                id: true,
                fieldName: true,
                fileUrls: true,
                value: true,
              },
            },
          },
        },
        center: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID "${id}" not found`);
    }

    return appointment;
  }

  /**
   * Get a single appointment by reference number
   */
  async findAppointmentByReferenceNumber(
    referenceNumber: string,
    userId?: string,
  ): Promise<BiometricAppointment> {
    const where: Prisma.BiometricAppointmentWhereInput = {
      submission: {
        referenceNumber: referenceNumber,
      },
    };

    if (userId) {
      where.userId = userId;
    }

    const appointment = await this.prisma.biometricAppointment.findFirst({
      where,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            nin: true,
          },
        },
        submission: {
          select: {
            id: true,
            status: true,
            referenceNumber: true,
            payment: {
              select: {
                id: true,
                status: true,
                amount: true,
              },
            },
            responses: {
              where: {
                fieldName: {
                  in: ['passport-photo', 'passport-number'],
                },
              },
              select: {
                id: true,
                fieldName: true,
                fileUrls: true,
                value: true,
              },
            },
          },
        },
        center: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException(
        `Appointment with reference number "${referenceNumber}" not found`,
      );
    }

    return appointment;
  }

  /**
   * Update appointment status (admin use)
   */
  async updateAppointmentStatus(
    id: string,
    updateDto: UpdateAppointmentStatusDto,
    lastModifiedBy?: string,
  ): Promise<BiometricAppointment> {
    try {
      const appointment = await this.findAppointmentById(id);

      // Validate status transition
      this.validateStatusTransition(appointment.status, updateDto.status);

      const updatedAppointment = await this.prisma.biometricAppointment.update({
        where: { id },
        data: {
          status: updateDto.status,
          adminNotes: updateDto.adminNotes,
          lastModifiedBy,
        },
        include: {
          user: true,
          submission: true,
          center: true,
        },
      });

      this.logger.log(
        `Updated appointment ${id} status to ${updateDto.status}`,
      );

      return updatedAppointment;
    } catch (error) {
      this.logger.error(
        `Failed to update appointment status ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Reschedule an appointment
   */
  async rescheduleAppointment(
    id: string,
    rescheduleDto: RescheduleAppointmentDto,
    userId?: string,
    lastModifiedBy?: string,
  ): Promise<BiometricAppointment> {
    try {
      const appointment = await this.findAppointmentById(id, userId);

      if (!this.canReschedule(appointment.status)) {
        throw new BadRequestException(
          `Cannot reschedule appointment with status: ${appointment.status}`,
        );
      }

      // Validate new center if provided
      const centerId = rescheduleDto.centerId || appointment.centerId;
      if (rescheduleDto.centerId) {
        const center = await this.biometricCentersService.findCenterById(
          centerId,
        );
        if (!center.isActive) {
          throw new BadRequestException(
            `Biometric center "${center.name}" is not currently active`,
          );
        }
      }

      // Validate new appointment date/time
      await this.validateAppointmentDateTime(
        centerId,
        new Date(rescheduleDto.appointmentDate),
        new Date(rescheduleDto.appointmentTime),
        id, // Exclude current appointment from conflict check
      );

      const updatedAppointment = await this.prisma.biometricAppointment.update({
        where: { id },
        data: {
          originalAppointmentDate:
            appointment.originalAppointmentDate || appointment.appointmentDate,
          appointmentDate: new Date(rescheduleDto.appointmentDate),
          appointmentTime: new Date(rescheduleDto.appointmentTime),
          centerId,
          rescheduleReason: rescheduleDto.rescheduleReason,
          rescheduleCount: { increment: 1 },
          status: AppointmentStatus.RESCHEDULED,
          lastModifiedBy,
        },
        include: {
          user: true,
          submission: true,
          center: true,
        },
      });

      this.logger.log(
        `Rescheduled appointment ${id} to ${rescheduleDto.appointmentDate} ${rescheduleDto.appointmentTime}`,
      );

      return updatedAppointment;
    } catch (error) {
      this.logger.error(
        `Failed to reschedule appointment ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Complete biometric capture
   */
  async completeBiometricCapture(
    id: string,
    captureDto: CompleteBiometricCaptureDto,
    capturedBy: string,
  ): Promise<BiometricAppointment> {
    try {
      const appointment = await this.findAppointmentById(id);

      if (appointment.status !== AppointmentStatus.ACTIVE) {
        throw new BadRequestException(
          `Can only complete biometric capture for active appointments. Current status: ${appointment.status}`,
        );
      }

      const updatedAppointment = await this.prisma.biometricAppointment.update({
        where: { id },
        data: {
          status: AppointmentStatus.COMPLETED,
          biometricsCaptured: true,
          capturedAt: new Date(),
          capturedBy,
          captureQuality: captureDto.captureQuality,
          adminNotes: captureDto.adminNotes,
          lastModifiedBy: capturedBy,
        },
        include: {
          user: true,
          submission: true,
          center: true,
        },
      });

      this.logger.log(
        `Completed biometric capture for appointment ${id} by ${capturedBy}`,
      );

      return updatedAppointment;
    } catch (error) {
      this.logger.error(
        `Failed to complete biometric capture ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cancel an appointment
   */
  async cancelAppointment(
    id: string,
    reason: string,
    userId?: string,
    lastModifiedBy?: string,
  ): Promise<BiometricAppointment> {
    try {
      const appointment = await this.findAppointmentById(id, userId);

      if (!this.canCancel(appointment.status)) {
        throw new BadRequestException(
          `Cannot cancel appointment with status: ${appointment.status}`,
        );
      }

      const updatedAppointment = await this.prisma.biometricAppointment.update({
        where: { id },
        data: {
          status: AppointmentStatus.CANCELLED,
          adminNotes: reason,
          lastModifiedBy,
        },
        include: {
          user: true,
          submission: true,
          center: true,
        },
      });

      this.logger.log(`Cancelled appointment ${id}: ${reason}`);

      return updatedAppointment;
    } catch (error) {
      this.logger.error(
        `Failed to cancel appointment ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get appointment statistics
   */
  async getAppointmentStatistics(centerId?: string) {
    const where = centerId ? { centerId } : {};

    const [
      totalAppointments,
      activeAppointments,
      completedAppointments,
      pendingAppointments,
      cancelledAppointments,
      statusBreakdown,
    ] = await Promise.all([
      this.prisma.biometricAppointment.count({ where }),
      this.prisma.biometricAppointment.count({
        where: { ...where, status: AppointmentStatus.ACTIVE },
      }),
      this.prisma.biometricAppointment.count({
        where: { ...where, status: AppointmentStatus.COMPLETED },
      }),
      this.prisma.biometricAppointment.count({
        where: { ...where, status: AppointmentStatus.PENDING },
      }),
      this.prisma.biometricAppointment.count({
        where: { ...where, status: AppointmentStatus.CANCELLED },
      }),
      this.prisma.biometricAppointment.groupBy({
        by: ['status'],
        where,
        _count: { _all: true },
      }),
    ]);

    return {
      totalAppointments,
      activeAppointments,
      completedAppointments,
      pendingAppointments,
      cancelledAppointments,
      statusBreakdown,
      completionRate:
        totalAppointments > 0
          ? (completedAppointments / totalAppointments) * 100
          : 0,
    };
  }

  /**
   * Validate appointment date and time
   */
  private async validateAppointmentDateTime(
    centerId: string,
    appointmentDate: Date,
    appointmentTime: Date,
    excludeAppointmentId?: string,
  ): Promise<void> {
    // Check if date is in the future
    const now = new Date();
    if (appointmentDate < now) {
      throw new BadRequestException('Appointment date must be in the future');
    }

    // Check center availability for the date
    const isAvailable =
      await this.biometricCentersService.checkCenterAvailability(
        centerId,
        appointmentDate,
      );

    if (!isAvailable) {
      throw new BadRequestException(
        'Biometric center is not available on the selected date',
      );
    }

    // Check for conflicting appointments at the same time slot
    const conflictingAppointment =
      await this.prisma.biometricAppointment.findFirst({
        where: {
          centerId,
          appointmentTime,
          status: {
            in: [AppointmentStatus.ACTIVE, AppointmentStatus.SCHEDULED],
          },
          ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
        },
      });

    if (conflictingAppointment) {
      throw new BadRequestException('The selected time slot is already booked');
    }
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(
    currentStatus: AppointmentStatus,
    newStatus: AppointmentStatus,
  ): void {
    const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
      [AppointmentStatus.PENDING]: [
        AppointmentStatus.ACTIVE,
        AppointmentStatus.CANCELLED,
      ],
      [AppointmentStatus.SCHEDULED]: [
        AppointmentStatus.ACTIVE,
        AppointmentStatus.RESCHEDULED,
        AppointmentStatus.CANCELLED,
      ],
      [AppointmentStatus.ACTIVE]: [
        AppointmentStatus.CHECKED_IN,
        AppointmentStatus.COMPLETED,
        AppointmentStatus.RESCHEDULED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ],
      [AppointmentStatus.CHECKED_IN]: [
        AppointmentStatus.IN_QUEUE,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ],
      [AppointmentStatus.IN_QUEUE]: [
        AppointmentStatus.AT_BOOTH,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
      ],
      [AppointmentStatus.AT_BOOTH]: [
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
      ],
      [AppointmentStatus.COMPLETED]: [], // Final state
      [AppointmentStatus.CANCELLED]: [AppointmentStatus.PENDING], // Can restart
      [AppointmentStatus.RESCHEDULED]: [
        AppointmentStatus.ACTIVE,
        AppointmentStatus.CANCELLED,
      ],
      [AppointmentStatus.NO_SHOW]: [], // Final state
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Check if appointment can be rescheduled
   */
  private canReschedule(status: AppointmentStatus): boolean {
    const allowedStatuses = [
      AppointmentStatus.PENDING,
      AppointmentStatus.SCHEDULED,
      AppointmentStatus.ACTIVE,
      AppointmentStatus.RESCHEDULED,
    ] as AppointmentStatus[];
    return allowedStatuses.includes(status);
  }

  /**
   * Check if appointment can be cancelled
   */
  private canCancel(status: AppointmentStatus): boolean {
    const allowedStatuses = [
      AppointmentStatus.PENDING,
      AppointmentStatus.SCHEDULED,
      AppointmentStatus.ACTIVE,
      AppointmentStatus.RESCHEDULED,
    ] as AppointmentStatus[];
    return allowedStatuses.includes(status);
  }
}
