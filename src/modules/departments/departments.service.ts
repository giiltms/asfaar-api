import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { LocalStorageService } from '@providers/localstorage/localstorage.service';
import {
  CreateDepartmentDto,
  UpdateDepartmentDto,
  DepartmentQueryDto,
} from './dto/department.dto';
import { DepartmentEntity } from './entities/department.entity';
import { Prisma } from '@prisma/client';

@Injectable()
export class DepartmentsService {
  private readonly logger = new Logger(DepartmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly localStorageService: LocalStorageService,
  ) {}

  /**
   * Create a new department with logo upload
   */
  async createDepartmentWithLogo(
    createDto: CreateDepartmentDto,
    logoFile: Express.Multer.File,
    createdBy: string,
  ): Promise<DepartmentEntity> {
    try {
      // Validate logo file
      this.validateLogoFile(logoFile);

      // Upload logo file
      const logoUrl = await this.localStorageService.upload(
        logoFile,
        'departments/logos',
      );

      // Create department with uploaded logo URL
      const departmentData = {
        ...createDto,
        logoUrl,
      };

      return this.createDepartment(departmentData, createdBy);
    } catch (error) {
      this.logger.error(
        `Failed to create department with logo: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Create a new department
   */
  async createDepartment(
    createDto: CreateDepartmentDto,
    createdBy: string,
  ): Promise<DepartmentEntity> {
    try {
      // Check if department with same name already exists
      const existingDepartment = await this.prisma.department.findFirst({
        where: {
          name: {
            equals: createDto.name,
            mode: 'insensitive',
          },
        },
      });

      if (existingDepartment) {
        throw new ConflictException(
          `A department with the name "${createDto.name}" already exists`,
        );
      }

      const department = await this.prisma.department.create({
        data: {
          name: createDto.name,
          agency: createDto.agency,
          description: createDto.description,
          logoUrl: createDto.logoUrl || '', // Provide default empty string if not provided
        },
        include: {
          _count: {
            select: {
              staffs: true,
              flaggings: {
                where: {
                  status: 'OPEN',
                },
              },
            },
          },
        },
      });

      this.logger.log(`Department created: ${department.id} by ${createdBy}`);

      return new DepartmentEntity({
        ...department,
        staffCount: department._count.staffs,
        activeFlaggingCount: department._count.flaggings,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create department: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get all departments with pagination and filtering
   */
  async findAll(queryDto: DepartmentQueryDto): Promise<{
    departments: DepartmentEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const { page = 1, limit = 10, search, agency } = queryDto;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.DepartmentWhereInput = {};

      if (search) {
        where.OR = [
          {
            name: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            agency: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: search,
              mode: 'insensitive',
            },
          },
        ];
      }

      if (agency) {
        where.agency = {
          equals: agency,
          mode: 'insensitive',
        };
      }

      const [departments, total] = await Promise.all([
        this.prisma.department.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ agency: 'asc' }, { name: 'asc' }],
          include: {
            _count: {
              select: {
                staffs: true,
                flaggings: {
                  where: {
                    status: 'OPEN',
                  },
                },
              },
            },
          },
        }),
        this.prisma.department.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);

      return {
        departments: departments.map(
          (dept) =>
            new DepartmentEntity({
              ...dept,
              staffCount: dept._count.staffs,
              activeFlaggingCount: dept._count.flaggings,
            }),
        ),
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch departments: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get department by ID
   */
  async findById(id: string): Promise<DepartmentEntity> {
    try {
      const department = await this.prisma.department.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              staffs: true,
              flaggings: {
                where: {
                  status: 'OPEN',
                },
              },
            },
          },
        },
      });

      if (!department) {
        throw new NotFoundException(`Department with ID "${id}" not found`);
      }

      return new DepartmentEntity({
        ...department,
        staffCount: department._count.staffs,
        activeFlaggingCount: department._count.flaggings,
      });
    } catch (error) {
      this.logger.error(
        `Failed to fetch department ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update department
   */
  async updateDepartment(
    id: string,
    updateDto: UpdateDepartmentDto,
    updatedBy: string,
  ): Promise<DepartmentEntity> {
    try {
      // Check if department exists
      const existingDepartment = await this.prisma.department.findUnique({
        where: { id },
      });

      if (!existingDepartment) {
        throw new NotFoundException(`Department with ID "${id}" not found`);
      }

      // Check if name is being updated and if it conflicts with existing department
      if (updateDto.name && updateDto.name !== existingDepartment.name) {
        const nameConflict = await this.prisma.department.findFirst({
          where: {
            name: {
              equals: updateDto.name,
              mode: 'insensitive',
            },
            id: {
              not: id,
            },
          },
        });

        if (nameConflict) {
          throw new ConflictException(
            `A department with the name "${updateDto.name}" already exists`,
          );
        }
      }

      const updatedDepartment = await this.prisma.department.update({
        where: { id },
        data: {
          ...updateDto,
        },
        include: {
          _count: {
            select: {
              staffs: true,
              flaggings: {
                where: {
                  status: 'OPEN',
                },
              },
            },
          },
        },
      });

      this.logger.log(`Department updated: ${id} by ${updatedBy}`);

      return new DepartmentEntity({
        ...updatedDepartment,
        staffCount: updatedDepartment._count.staffs,
        activeFlaggingCount: updatedDepartment._count.flaggings,
      });
    } catch (error) {
      this.logger.error(
        `Failed to update department ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete department
   */
  async deleteDepartment(id: string, deletedBy: string): Promise<void> {
    try {
      // Check if department exists
      const existingDepartment = await this.prisma.department.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              staffs: true,
              flaggings: true,
            },
          },
        },
      });

      if (!existingDepartment) {
        throw new NotFoundException(`Department with ID "${id}" not found`);
      }

      // Check if department has staff or flaggings
      if (existingDepartment._count.staffs > 0) {
        throw new BadRequestException(
          `Cannot delete department "${existingDepartment.name}" because it has ${existingDepartment._count.staffs} staff members assigned. Please reassign staff before deleting.`,
        );
      }

      if (existingDepartment._count.flaggings > 0) {
        throw new BadRequestException(
          `Cannot delete department "${existingDepartment.name}" because it has ${existingDepartment._count.flaggings} flaggings. Please resolve or reassign flaggings before deleting.`,
        );
      }

      await this.prisma.department.delete({
        where: { id },
      });

      this.logger.log(`Department deleted: ${id} by ${deletedBy}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete department ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get all agencies (for filtering)
   */
  async getAgencies(): Promise<string[]> {
    try {
      const agencies = await this.prisma.department.findMany({
        select: {
          agency: true,
        },
        distinct: ['agency'],
        orderBy: {
          agency: 'asc',
        },
      });

      return agencies.map((dept) => dept.agency);
    } catch (error) {
      this.logger.error(
        `Failed to fetch agencies: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get department statistics
   */
  async getStatistics(): Promise<{
    totalDepartments: number;
    totalStaff: number;
    totalActiveFlaggings: number;
    departmentsByAgency: Array<{ agency: string; count: number }>;
  }> {
    try {
      const [
        totalDepartments,
        totalStaff,
        totalActiveFlaggings,
        departmentsByAgency,
      ] = await Promise.all([
        this.prisma.department.count(),
        this.prisma.user.count({
          where: {
            departments: {
              some: {},
            },
          },
        }),
        this.prisma.flag.count({
          where: {
            status: 'OPEN',
          },
        }),
        this.prisma.department.groupBy({
          by: ['agency'],
          _count: {
            id: true,
          },
          orderBy: {
            agency: 'asc',
          },
        }),
      ]);

      return {
        totalDepartments,
        totalStaff,
        totalActiveFlaggings,
        departmentsByAgency: departmentsByAgency.map((item) => ({
          agency: item.agency,
          count: item._count.id,
        })),
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch department statistics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Validate logo file
   */
  private validateLogoFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('Logo file is required');
    }

    // Validate file type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/svg+xml',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, WebP, and SVG formats are allowed for logos',
      );
    }

    // Validate file size (5MB max for logos)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        'File size too large. Maximum size for logos is 5MB',
      );
    }

    // Validate filename
    if (!file.originalname || file.originalname.trim().length === 0) {
      throw new BadRequestException('Invalid filename');
    }
  }
}
