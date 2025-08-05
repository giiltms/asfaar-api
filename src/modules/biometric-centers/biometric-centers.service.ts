import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { Prisma, BiometricCenter } from '@prisma/client';
import {
  CreateBiometricCenterDto,
  UpdateBiometricCenterDto,
  BiometricCenterFiltersDto,
} from './dto/biometric-center.dto';
import { PaginationQueryDto } from '@common/dtos';
import { PaginationUtils } from '@common/utils/pagination.utils';

/**
 * Service for managing biometric centers
 * Handles CRUD operations, filtering, and business logic
 */
@Injectable()
export class BiometricCentersService {
  private readonly logger = new Logger(BiometricCentersService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new biometric center
   */
  async createCenter(
    createDto: CreateBiometricCenterDto,
    createdBy?: string,
  ): Promise<BiometricCenter> {
    try {
      // Check for duplicate name or code
      const existingCenter = await this.prisma.biometricCenter.findFirst({
        where: {
          OR: [{ name: createDto.name }, { code: createDto.code }],
        },
      });

      if (existingCenter) {
        if (existingCenter.name === createDto.name) {
          throw new ConflictException(
            `A biometric center with the name "${createDto.name}" already exists`,
          );
        }
        if (existingCenter.code === createDto.code) {
          throw new ConflictException(
            `A biometric center with the code "${createDto.code}" already exists`,
          );
        }
      }

      // Validate manager if provided
      if (createDto.managerId) {
        const manager = await this.prisma.user.findUnique({
          where: { id: createDto.managerId },
        });
        if (!manager) {
          throw new BadRequestException(
            `Manager with ID "${createDto.managerId}" not found`,
          );
        }
      }

      // Set default values
      const centerData: Prisma.BiometricCenterCreateInput = {
        ...createDto,
        country: createDto.country || 'Nigeria',
        workingDays: createDto.workingDays || [
          'MONDAY',
          'TUESDAY',
          'WEDNESDAY',
          'THURSDAY',
          'FRIDAY',
        ],
        appointmentDuration: createDto.appointmentDuration || 30,
        bufferTime: createDto.bufferTime || 15,
        servicesOffered: createDto.servicesOffered || [
          'BIOMETRIC_CAPTURE',
          'DOCUMENT_VERIFICATION',
        ],
        specialFacilities: createDto.specialFacilities || [],
        createdBy,
        manager: createDto.managerId
          ? { connect: { id: createDto.managerId } }
          : undefined,
      };

      const center = await this.prisma.biometricCenter.create({
        data: centerData,
      });

      this.logger.log(
        `Created biometric center: ${center.name} (${center.code})`,
      );

      return center;
    } catch (error) {
      this.logger.error(
        `Failed to create biometric center: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get all biometric centers with optional filtering and pagination
   */
  async findAllCenters(
    filters: BiometricCenterFiltersDto = {},
    pagination: PaginationQueryDto = {},
  ) {
    const { page = 1, limit = 10 } = pagination;
    const { city, state, isActive, search } = filters;

    // Build where clause
    const where: Prisma.BiometricCenterWhereInput = {};

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (state) {
      where.state = { contains: state, mode: 'insensitive' };
    }

    if (typeof isActive === 'boolean') {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries
    const [centers, totalCount] = await Promise.all([
      this.prisma.biometricCenter.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        include: {
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: { appointments: true },
          },
        },
      }),
      this.prisma.biometricCenter.count({ where }),
    ]);

    const meta = PaginationUtils.createPaginationMeta(
      page,
      limit,
      totalCount,
      'name', // default sort field
      'asc', // default sort order
    );

    return {
      data: centers,
      meta,
    };
  }

  /**
   * Get a single biometric center by ID
   */
  async findCenterById(id: string): Promise<BiometricCenter> {
    const center = await this.prisma.biometricCenter.findUnique({
      where: { id },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: { appointments: true },
        },
      },
    });

    if (!center) {
      throw new NotFoundException(`Biometric center with ID "${id}" not found`);
    }

    return center;
  }

  /**
   * Get a biometric center by code
   */
  async findCenterByCode(code: string): Promise<BiometricCenter> {
    const center = await this.prisma.biometricCenter.findUnique({
      where: { code },
      include: {
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (!center) {
      throw new NotFoundException(
        `Biometric center with code "${code}" not found`,
      );
    }

    return center;
  }

  /**
   * Update a biometric center
   */
  async updateCenter(
    id: string,
    updateDto: UpdateBiometricCenterDto,
    lastModifiedBy?: string,
  ): Promise<BiometricCenter> {
    try {
      // Check if center exists
      await this.findCenterById(id);

      // Check for duplicate name or code if they're being updated
      if (updateDto.name || updateDto.code) {
        const duplicateConditions = [];
        if (updateDto.name) {
          duplicateConditions.push({ name: updateDto.name });
        }
        if (updateDto.code) {
          duplicateConditions.push({ code: updateDto.code });
        }

        const existingCenter = await this.prisma.biometricCenter.findFirst({
          where: {
            AND: [{ NOT: { id } }, { OR: duplicateConditions }],
          },
        });

        if (existingCenter) {
          if (existingCenter.name === updateDto.name) {
            throw new ConflictException(
              `A biometric center with the name "${updateDto.name}" already exists`,
            );
          }
          if (existingCenter.code === updateDto.code) {
            throw new ConflictException(
              `A biometric center with the code "${updateDto.code}" already exists`,
            );
          }
        }
      }

      // Validate manager if provided
      if (updateDto.managerId) {
        const manager = await this.prisma.user.findUnique({
          where: { id: updateDto.managerId },
        });
        if (!manager) {
          throw new BadRequestException(
            `Manager with ID "${updateDto.managerId}" not found`,
          );
        }
      }

      const updateData: Prisma.BiometricCenterUpdateInput = {
        ...updateDto,
        lastModifiedBy,
        manager: updateDto.managerId
          ? { connect: { id: updateDto.managerId } }
          : undefined,
      };

      const updatedCenter = await this.prisma.biometricCenter.update({
        where: { id },
        data: updateData,
      });

      this.logger.log(
        `Updated biometric center: ${updatedCenter.name} (${updatedCenter.code})`,
      );

      return updatedCenter;
    } catch (error) {
      this.logger.error(
        `Failed to update biometric center ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete a biometric center (soft delete by setting isActive to false)
   */
  async deleteCenterSoft(
    id: string,
    lastModifiedBy?: string,
  ): Promise<BiometricCenter> {
    const center = await this.findCenterById(id);

    if (!center.isActive) {
      throw new BadRequestException('Biometric center is already deactivated');
    }

    // Check if center has active appointments
    const activeAppointments = await this.prisma.biometricAppointment.count({
      where: {
        centerId: id,
        status: {
          in: ['PENDING', 'SCHEDULED', 'ACTIVE'],
        },
      },
    });

    if (activeAppointments > 0) {
      throw new BadRequestException(
        `Cannot deactivate center with ${activeAppointments} active appointments`,
      );
    }

    const updatedCenter = await this.prisma.biometricCenter.update({
      where: { id },
      data: {
        isActive: false,
        lastModifiedBy,
      },
    });

    this.logger.log(
      `Deactivated biometric center: ${updatedCenter.name} (${updatedCenter.code})`,
    );

    return updatedCenter;
  }

  /**
   * Permanently delete a biometric center
   */
  async deleteCenterPermanent(id: string): Promise<void> {
    const center = await this.findCenterById(id);

    // Check if center has any appointments
    const appointmentCount = await this.prisma.biometricAppointment.count({
      where: { centerId: id },
    });

    if (appointmentCount > 0) {
      throw new BadRequestException(
        `Cannot permanently delete center with ${appointmentCount} appointments. Consider soft deletion instead.`,
      );
    }

    await this.prisma.biometricCenter.delete({
      where: { id },
    });

    this.logger.log(`Permanently deleted biometric center: ${center.name}`);
  }

  /**
   * Get active centers by city
   */
  async findActiveCentersByCity(city: string): Promise<BiometricCenter[]> {
    return this.prisma.biometricCenter.findMany({
      where: {
        city: { contains: city, mode: 'insensitive' },
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Get active centers by state
   */
  async findActiveCentersByState(state: string): Promise<BiometricCenter[]> {
    return this.prisma.biometricCenter.findMany({
      where: {
        state: { contains: state, mode: 'insensitive' },
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Check center availability for appointments
   */
  async checkCenterAvailability(
    centerId: string,
    date: Date,
  ): Promise<{
    isAvailable: boolean;
    capacity: number;
    bookedSlots: number;
    availableSlots: number;
  }> {
    const center = await this.findCenterById(centerId);

    if (!center.isActive) {
      return {
        isAvailable: false,
        capacity: 0,
        bookedSlots: 0,
        availableSlots: 0,
      };
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedSlots = await this.prisma.biometricAppointment.count({
      where: {
        centerId,
        appointmentDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ['SCHEDULED', 'ACTIVE'],
        },
      },
    });

    const capacity = center.capacity || 50; // Default capacity
    const availableSlots = Math.max(0, capacity - bookedSlots);

    return {
      isAvailable: availableSlots > 0,
      capacity,
      bookedSlots,
      availableSlots,
    };
  }
}
