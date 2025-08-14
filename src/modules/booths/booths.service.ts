import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { Booth, AppointmentClass, Roles } from '@prisma/client';
import {
  CreateBoothDto,
  UpdateBoothDto,
  AssignAgentDto,
  BoothFiltersDto,
  BoothStatsDto,
} from './dto/booth.dto';
import { PaginationQueryDto } from '@common/dtos/pagination.dto';
import { PaginationUtils } from '@common/utils/pagination.utils';

@Injectable()
export class BoothsService {
  private readonly logger = new Logger(BoothsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new booth
   */
  async createBooth(
    createDto: CreateBoothDto,
    createdBy?: string,
  ): Promise<Booth> {
    try {
      // Check if center exists and is active
      const center = await this.prisma.biometricCenter.findUnique({
        where: { id: createDto.centerId },
      });

      if (!center) {
        throw new NotFoundException(
          `Biometric center with ID "${createDto.centerId}" not found`,
        );
      }

      if (!center.isActive) {
        throw new BadRequestException(
          `Cannot create booth in inactive center "${center.name}"`,
        );
      }

      // Check for duplicate booth number in the same center
      const existingBooth = await this.prisma.booth.findFirst({
        where: {
          centerId: createDto.centerId,
          boothNumber: createDto.boothNumber,
        },
      });

      if (existingBooth) {
        throw new ConflictException(
          `Booth "${createDto.boothNumber}" already exists in center "${center.name}"`,
        );
      }

      // Validate agent if provided
      if (createDto.agentId) {
        await this.validateAgent(createDto.agentId);
      }

      const booth = await this.prisma.booth.create({
        data: {
          ...createDto,
          createdBy,
        },
        include: {
          center: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          agent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(
        `Created booth: ${booth.boothNumber} at center ${center.name}`,
      );

      return booth;
    } catch (error) {
      this.logger.error(
        `Failed to create booth: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Find all booths with pagination and filtering
   */
  async findAllBooths(
    filters: BoothFiltersDto = {},
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

      if (filters.isActive !== undefined) {
        where.isActive = filters.isActive;
      }

      if (filters.isOccupied !== undefined) {
        where.isOccupied = filters.isOccupied;
      }

      if (filters.available !== undefined) {
        // Available means active and not occupied
        where.isActive = true;
        where.isOccupied = false;
      }

      const include = {
        center: {
          select: {
            id: true,
            name: true,
            code: true,
            city: true,
            state: true,
          },
        },
        agent: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        _count: {
          select: {
            queueEntries: true,
            biometricSessions: true,
          },
        },
      };

      const orderBy = [
        { isActive: 'desc' as const },
        { isOccupied: 'asc' as const },
        { appointmentClass: 'asc' as const },
        { boothNumber: 'asc' as const },
      ];

      // Calculate pagination
      const skip = (pagination.page - 1) * pagination.limit;

      // Execute queries
      const [booths, totalCount] = await Promise.all([
        this.prisma.booth.findMany({
          where,
          skip,
          take: pagination.limit,
          orderBy,
          include,
        }),
        this.prisma.booth.count({ where }),
      ]);

      const meta = PaginationUtils.createPaginationMeta(
        pagination.page,
        pagination.limit,
        totalCount,
        'createdAt',
        'desc',
      );

      return {
        data: booths,
        meta,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch booths: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Find booth by ID
   */
  async findBoothById(id: string): Promise<Booth> {
    try {
      const booth = await this.prisma.booth.findUnique({
        where: { id },
        include: {
          center: {
            select: {
              id: true,
              name: true,
              code: true,
              city: true,
              state: true,
            },
          },
          agent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              roles: true,
            },
          },
          _count: {
            select: {
              queueEntries: true,
              biometricSessions: true,
            },
          },
        },
      });

      if (!booth) {
        throw new NotFoundException(`Booth with ID "${id}" not found`);
      }

      return booth;
    } catch (error) {
      this.logger.error(
        `Failed to find booth ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update booth
   */
  async updateBooth(
    id: string,
    updateDto: UpdateBoothDto,
    lastModifiedBy?: string,
  ): Promise<Booth> {
    try {
      const existingBooth = await this.findBoothById(id);

      // Check for booth number conflicts if updating booth number
      if (
        updateDto.boothNumber &&
        updateDto.boothNumber !== existingBooth.boothNumber
      ) {
        const conflictingBooth = await this.prisma.booth.findFirst({
          where: {
            centerId: existingBooth.centerId,
            boothNumber: updateDto.boothNumber,
            id: { not: id },
          },
        });

        if (conflictingBooth) {
          throw new ConflictException(
            `Booth "${updateDto.boothNumber}" already exists in this center`,
          );
        }
      }

      // Don't allow making booth inactive if it has active queue entries
      if (updateDto.isActive === false) {
        const activeQueueEntries = await this.prisma.queueEntry.count({
          where: {
            boothId: id,
            status: {
              in: ['WAITING', 'CALLED', 'IN_PROGRESS'],
            },
          },
        });

        if (activeQueueEntries > 0) {
          throw new BadRequestException(
            'Cannot deactivate booth with active queue entries',
          );
        }
      }

      const booth = await this.prisma.booth.update({
        where: { id },
        data: {
          ...updateDto,
          lastModifiedBy,
        },
        include: {
          center: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          agent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(`Updated booth: ${booth.boothNumber}`);

      return booth;
    } catch (error) {
      this.logger.error(
        `Failed to update booth ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete booth (soft delete by deactivating)
   */
  async deleteBooth(id: string, lastModifiedBy?: string): Promise<Booth> {
    try {
      const booth = await this.findBoothById(id);

      // Check if booth has any queue entries or sessions
      const hasData = await this.prisma.booth.findFirst({
        where: { id },
        include: {
          _count: {
            select: {
              queueEntries: true,
              biometricSessions: true,
            },
          },
        },
      });

      if (
        hasData._count.queueEntries > 0 ||
        hasData._count.biometricSessions > 0
      ) {
        // Soft delete by deactivating
        return this.updateBooth(id, { isActive: false }, lastModifiedBy);
      }

      // Hard delete if no data
      await this.prisma.booth.delete({
        where: { id },
      });

      this.logger.log(`Deleted booth: ${booth.boothNumber}`);

      return booth;
    } catch (error) {
      this.logger.error(
        `Failed to delete booth ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Assign agent to booth
   */
  async assignAgent(
    boothId: string,
    assignDto: AssignAgentDto,
    assignedBy?: string,
  ): Promise<Booth> {
    try {
      const booth = await this.findBoothById(boothId);

      if (!booth.isActive) {
        throw new BadRequestException('Cannot assign agent to inactive booth');
      }

      // Validate agent
      await this.validateAgent(assignDto.agentId);

      // Check if agent is already assigned to another booth
      const existingAssignment = await this.prisma.booth.findFirst({
        where: {
          agentId: assignDto.agentId,
          isActive: true,
          id: { not: boothId },
        },
        include: {
          center: {
            select: { name: true },
          },
        },
      });

      if (existingAssignment) {
        throw new ConflictException(
          `Agent is already assigned to booth ${existingAssignment.boothNumber} at ${existingAssignment.center.name}`,
        );
      }

      const updatedBooth = await this.prisma.booth.update({
        where: { id: boothId },
        data: {
          agentId: assignDto.agentId,
          lastModifiedBy: assignedBy,
        },
        include: {
          center: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          agent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      });

      this.logger.log(
        `Assigned agent ${updatedBooth.agent.firstName} ${updatedBooth.agent.lastName} to booth ${updatedBooth.boothNumber}`,
      );

      return updatedBooth;
    } catch (error) {
      this.logger.error(
        `Failed to assign agent to booth ${boothId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Unassign agent from booth
   */
  async unassignAgent(
    boothId: string,
    reason?: string,
    unassignedBy?: string,
  ): Promise<Booth> {
    try {
      const booth = await this.findBoothById(boothId);

      if (!booth.agentId) {
        throw new BadRequestException('No agent assigned to this booth');
      }

      // Check if booth has active sessions
      const activeSessions = await this.prisma.biometricSession.count({
        where: {
          boothId,
          completedAt: null,
        },
      });

      if (activeSessions > 0) {
        throw new BadRequestException(
          'Cannot unassign agent with active biometric sessions',
        );
      }

      const updatedBooth = await this.prisma.booth.update({
        where: { id: boothId },
        data: {
          agentId: null,
          lastModifiedBy: unassignedBy,
        },
        include: {
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
        `Unassigned agent from booth ${updatedBooth.boothNumber}${
          reason ? `: ${reason}` : ''
        }`,
      );

      return updatedBooth;
    } catch (error) {
      this.logger.error(
        `Failed to unassign agent from booth ${boothId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get available booths by appointment class
   */
  async getAvailableBooths(
    centerId: string,
    appointmentClass: AppointmentClass,
  ): Promise<Booth[]> {
    try {
      const booths = await this.prisma.booth.findMany({
        where: {
          centerId,
          appointmentClass,
          isActive: true,
          isOccupied: false,
          agentId: { not: null }, // Must have an agent assigned
        },
        include: {
          agent: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          boothNumber: 'asc',
        },
      });

      return booths;
    } catch (error) {
      this.logger.error(
        `Failed to get available booths: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get booth statistics
   */
  async getBoothStats(centerId?: string): Promise<BoothStatsDto> {
    try {
      const where = centerId ? { centerId } : {};

      const [total, active, occupied, withAgent] = await Promise.all([
        this.prisma.booth.count({ where }),
        this.prisma.booth.count({ where: { ...where, isActive: true } }),
        this.prisma.booth.count({ where: { ...where, isOccupied: true } }),
        this.prisma.booth.count({
          where: { ...where, agentId: { not: null } },
        }),
      ]);

      const available = await this.prisma.booth.count({
        where: { ...where, isActive: true, isOccupied: false },
      });

      const withoutAgent = total - withAgent;

      // Get stats by appointment class
      const byClass = {
        [AppointmentClass.REGULAR]: await this.getClassStats(
          AppointmentClass.REGULAR,
          where,
        ),
        [AppointmentClass.VIP]: await this.getClassStats(
          AppointmentClass.VIP,
          where,
        ),
        [AppointmentClass.PREMIUM]: await this.getClassStats(
          AppointmentClass.PREMIUM,
          where,
        ),
      };

      return {
        total,
        active,
        occupied,
        available,
        byClass,
        withAgent,
        withoutAgent,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get booth stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Private helper to validate agent
   */
  private async validateAgent(agentId: string): Promise<void> {
    const agent = await this.prisma.user.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID "${agentId}" not found`);
    }

    if (!agent.roles.includes(Roles.BIOMETRIC_AGENT)) {
      throw new BadRequestException(
        'User must have BIOMETRIC_AGENT role to be assigned to a booth',
      );
    }

    if (!agent.isActive) {
      throw new BadRequestException(
        'Agent must be active to be assigned to a booth',
      );
    }
  }

  /**
   * Private helper to get stats by appointment class
   */
  private async getClassStats(
    appointmentClass: AppointmentClass,
    where: any,
  ): Promise<{ total: number; available: number; occupied: number }> {
    const classWhere = { ...where, appointmentClass };

    const [total, occupied] = await Promise.all([
      this.prisma.booth.count({ where: classWhere }),
      this.prisma.booth.count({ where: { ...classWhere, isOccupied: true } }),
    ]);

    const available = await this.prisma.booth.count({
      where: { ...classWhere, isActive: true, isOccupied: false },
    });

    return { total, available, occupied };
  }
}
