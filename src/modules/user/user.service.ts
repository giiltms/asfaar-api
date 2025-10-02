import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { UserRepository } from '@modules/user/user.repository';
import { Prisma, Roles, User } from '@prisma/client';
import { ListUsersDTO } from './dto/users.dto';
import { USER_NOT_FOUND } from '@common/constants';
import { UserCentersResponseDto } from './dto/user-centers-response.dto';
import { PrismaService } from '@providers/prisma/prisma.service';
import { AuditService } from '@modules/audit/audit.service';
import UserEntity from './entities/user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly userRepository: UserRepository,
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findById(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }
    return new UserEntity(user);
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        roles: true,
        isActive: true,
        isVerified: true,
        onboardingPaid: true,
        createdAt: true,
        updatedAt: true,
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
    return new UserEntity(user);
  }

  /**
   * Find a user by email.
   * @param email The email of the user to find.
   * @returns The user if found, otherwise null.
   */
  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  /**
   * Find a user by email and password.
   * @param email The email of the user to find.
   * @param password The password of the user to find.
   * @returns The user if found, otherwise null.
   */
  findByEmailAndPassword(
    email: string,
    password: string,
  ): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        email,
        password, // Note: In real apps, you'd hash the password first
      },
    });
  }

  /**
   * Find a user by username.
   * @param username The username of the user to find.
   * @returns The user if found, otherwise null.
   */
  findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { username },
    });
  }

  /**
   * Find a user by phone.
   * @param phone The phone of the user to find.
   * @returns The user if found, otherwise null.
   */
  findByPhone(phone: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { phone },
    });
  }

  /**
   * Create a new user.
   * @param data The data to create the user with.
   * @returns The created user.
   */
  async createUser(data: Prisma.UserCreateInput): Promise<UserEntity> {
    const user = await this.userRepository.create(data);
    return new UserEntity(user);
  }

  /**
   * Create a new user with center assignment.
   * @param data The data to create the user with.
   * @param centerIds Optional array of center IDs to assign to the user.
   * @returns The created user with centers included.
   */
  async createUserWithCenters(
    data: Prisma.UserCreateInput,
    centerIds?: string[],
  ): Promise<UserEntity> {
    // If centerIds are provided, validate they exist
    if (centerIds && centerIds.length > 0) {
      const centers = await this.prisma.biometricCenter.findMany({
        where: { id: { in: centerIds } },
        select: { id: true },
      });

      if (centers.length !== centerIds.length) {
        const foundIds = centers.map((c) => c.id);
        const missingIds = centerIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(
          `Centers not found: ${missingIds.join(', ')}`,
        );
      }
    }

    // Create user with centers if provided
    const userData: Prisma.UserCreateInput = { ...data };
    if (centerIds && centerIds.length > 0) {
      userData.biometricCenters = {
        connect: centerIds.map((id) => ({ id })),
      };
    }

    const createdUser = await this.prisma.user.create({
      data: userData,
      include: {
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

    return new UserEntity(createdUser);
  }

  /**
   * Update a user by ID.
   * @param id The ID of the user to update.
   * @param data The data to update the user with.
   * @returns The updated user.
   */
  async updateUser(
    id: string,
    data: Prisma.UserUpdateInput,
  ): Promise<UserEntity> {
    await this.findById(id);
    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      include: {
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
    return new UserEntity(updatedUser);
  }

  /**
   * Delete a user by ID.
   * @param id The ID of the user to delete.
   * @returns The deleted user.
   */
  async deleteUser(id: string): Promise<UserEntity> {
    await this.findById(id);
    const deletedUser = await this.prisma.user.delete({
      where: { id },
      include: {
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
    return new UserEntity(deletedUser);
  }

  /**
   * Update the roles of a user.
   * @param userId The ID of the user to update.
   * @param roles The new roles to assign to the user.
   * @returns The updated user.
   */
  async updateUserRoles(userId: string, roles: Roles[]): Promise<UserEntity> {
    await this.findById(userId);
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { roles },
      include: {
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
    return new UserEntity(updatedUser);
  }

  /**
   * Update the role of a user.
   * @param userId The ID of the user to update.
   * @param role The new role to assign to the user.
   * @returns The updated user.
   */
  async setUserRole(userId: string, role: Roles): Promise<UserEntity> {
    await this.findById(userId);
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { roles: [role] },
      include: {
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
    return new UserEntity(updatedUser);
  }

  /**
   * Activate a user by ID.
   * @param userId The ID of the user to activate.
   * @returns The activated user.
   */
  async activateUser(userId: string): Promise<UserEntity> {
    await this.findById(userId);
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
      include: {
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
    return new UserEntity(updatedUser);
  }

  /**
   * Deactivate a user by ID.
   * @param userId The ID of the user to deactivate.
   * @returns The deactivated user.
   */
  async deactivateUser(userId: string): Promise<UserEntity> {
    await this.findById(userId);
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      include: {
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
    return new UserEntity(updatedUser);
  }

  /**
   * Verify a user by ID.
   * @param userId The ID of the user to verify.
   * @returns The verified user.
   */
  async verifyUser(userId: string): Promise<UserEntity> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
      include: {
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
    return new UserEntity(updatedUser);
  }

  async getUsers(query: ListUsersDTO): Promise<any> {
    // Build where clause from query parameters
    const where: Prisma.UserWhereInput = {};

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.role) {
      where.roles = { hasSome: [query.role] };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (typeof query.isActive === 'boolean') {
      where.isActive = query.isActive;
    }

    if (typeof query.isVerified === 'boolean') {
      where.isVerified = query.isVerified;
    }

    // Build order by clause
    const orderBy: Prisma.UserOrderByWithRelationInput = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    // Pagination options
    const paginationOptions = {
      page: query.page || 1,
      perPage: query.limit || 10,
    };

    const result = await this.userRepository.findAll(
      where,
      {
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
        departments: {
          select: {
            id: true,
            name: true,
            agency: true,
            description: true,
            logoUrl: true,
          },
        },
        country: {
          select: {
            id: true,
            name: true,
            isoCode2: true,
            isoCode3: true,
            flag: true,
            logoUrl: true,
          },
        },
      }, // include
      orderBy,
      paginationOptions,
    );

    // Convert users to UserEntity instances
    const users = result.data.map((user) => new UserEntity(user));

    return {
      ...result,
      data: users,
    };
  }

  async getUserById(id: string): Promise<any> {
    const user = await this.findById(id);
    return {
      success: true,
      data: user, // Already a UserEntity instance
    };
  }

  /**
   * Mark user onboarding as completed
   * @param userId The user ID
   * @returns Updated user entity
   */
  async completeOnboarding(userId: string): Promise<UserEntity> {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingPaid: true },
      include: {
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
    return new UserEntity(updatedUser);
  }

  /**
   * Check if user has completed onboarding
   * @param userId The user ID
   * @returns Boolean indicating onboarding status
   */
  async hasCompletedOnboarding(userId: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }
    return user.onboardingPaid;
  }

  /**
   * Update user centers (staff access)
   * @param userId The user ID
   * @param centerIds Array of center IDs to assign to the user
   * @returns Updated user entity
   */
  async updateUserCenters(
    userId: string,
    centerIds: string[],
    changedById?: string,
  ): Promise<UserEntity> {
    // First verify the user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }

    // Verify all centers exist
    const centers = await this.prisma.biometricCenter.findMany({
      where: { id: { in: centerIds } },
      select: { id: true },
    });

    if (centers.length !== centerIds.length) {
      const foundIds = centers.map((c) => c.id);
      const missingIds = centerIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Centers not found: ${missingIds.join(', ')}`,
      );
    }

    // Capture previous centers for audit
    const previous = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { biometricCenters: { select: { id: true } } },
    });

    // Update user centers by updating the biometricCenters relation
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        biometricCenters: {
          set: centerIds.map((id) => ({ id })),
        },
      },
      include: {
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

    // Write audit log (non-blocking best-effort)
    try {
      await this.prisma.auditLog.create({
        data: {
          action: 'UPDATE',
          resource: 'USER_CENTERS',
          resourceId: userId,
          userId: changedById,
          oldValues: {
            centerIds: (previous?.biometricCenters || []).map((c) => c.id),
          },
          newValues: { centerIds },
          timestamp: new Date(),
        },
      });
    } catch (e) {
      // swallow audit errors
    }

    return new UserEntity(updatedUser);
  }

  /**
   * Update user departments (staff access)
   * @param userId The user ID
   * @param departmentIds Array of department IDs to assign to the user
   * @returns Updated user entity
   */
  async updateUserDepartments(
    userId: string,
    departmentIds: string[],
    changedById?: string,
  ): Promise<UserEntity> {
    // First verify the user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }

    // Verify all departments exist
    const departments = await this.prisma.department.findMany({
      where: { id: { in: departmentIds } },
      select: { id: true },
    });

    if (departments.length !== departmentIds.length) {
      const foundIds = departments.map((d) => d.id);
      const missingIds = departmentIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(
        `Departments not found: ${missingIds.join(', ')}`,
      );
    }

    // Capture previous departments for audit
    const previous = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { departments: { select: { id: true } } },
    });

    // Update user departments by updating the departments relation
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        departments: {
          set: departmentIds.map((id) => ({ id })),
        },
      },
      include: {
        departments: {
          select: {
            id: true,
            name: true,
            agency: true,
            description: true,
            logoUrl: true,
          },
        },
      },
    });

    // Write audit log (non-blocking best-effort)
    try {
      const previousIds = previous?.departments?.map((d) => d.id) || [];
      const currentIds =
        (updatedUser as any).departments?.map((d: any) => d.id) || [];

      const added = currentIds.filter((id) => !previousIds.includes(id));
      const removed = previousIds.filter((id) => !currentIds.includes(id));

      if (added.length > 0 || removed.length > 0) {
        await this.prisma.auditLog.create({
          data: {
            userId,
            action: 'USER_DEPARTMENTS_UPDATED',
            resource: 'User',
            resourceId: userId,
            oldValues: {
              departments: previousIds,
            },
            newValues: {
              departments: currentIds,
              added: added,
              removed: removed,
            },
            timestamp: new Date(),
          },
        });
      }
    } catch (auditError) {
      this.logger.warn(
        'Failed to write audit log for user departments update',
        auditError,
      );
    }

    this.logger.log(
      `User ${userId} departments updated by ${
        changedById || 'system'
      }. Added: [${departmentIds.join(', ')}]`,
    );

    return new UserEntity(updatedUser);
  }

  /**
   * Get user departments
   * @param userId The user ID
   * @returns User departments
   */
  async getUserDepartments(userId: string): Promise<any> {
    // First verify the user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }

    // Get user with departments
    const userWithDepartments = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        departments: {
          select: {
            id: true,
            name: true,
            agency: true,
            description: true,
            logoUrl: true,
            createdAt: true,
          },
        },
      },
    });

    return {
      userId: userWithDepartments.id,
      email: userWithDepartments.email,
      fullName: `${userWithDepartments.firstName || ''} ${
        userWithDepartments.lastName || ''
      }`.trim(),
      departments: (userWithDepartments as any).departments || [],
    };
  }

  /**
   * Get user centers
   * @param userId The user ID
   * @returns User centers response
   */
  async getUserCenters(userId: string): Promise<UserCentersResponseDto> {
    // First verify the user exists
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }

    // Get user with centers
    const userWithCenters = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
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

    if (!userWithCenters) {
      throw new NotFoundException(USER_NOT_FOUND);
    }

    return {
      userId: userWithCenters.id,
      userEmail: userWithCenters.email,
      userName:
        `${userWithCenters.firstName || ''} ${
          userWithCenters.lastName || ''
        }`.trim() || 'Unknown User',
      centers: userWithCenters.biometricCenters,
      totalCenters: userWithCenters.biometricCenters.length,
    };
  }

  /**
   * Update user's assigned country
   */
  async updateUserCountry(
    userId: string,
    countryId: string,
    changedById: string,
  ): Promise<UserEntity> {
    try {
      // Validate user exists
      const user = await this.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Validate country exists
      const country = await this.prisma.country.findUnique({
        where: { id: countryId },
        select: { id: true, name: true, isoCode2: true, isActive: true },
      });

      if (!country) {
        throw new BadRequestException('Country not found');
      }

      if (!country.isActive) {
        throw new BadRequestException('Country is not active');
      }

      // Validate user has embassy role (optional validation)
      const hasEmbassyRole = user.roles.some((role) =>
        ['EMBASSY_OFFICER', 'LIAISON_OFFICER', 'AUTHORITY'].includes(role),
      );

      if (!hasEmbassyRole) {
        this.logger.warn(
          `User ${userId} assigned to country ${countryId} but doesn't have embassy role`,
        );
      }

      // Get current country assignment for audit
      const currentUser = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { countryId: true },
      });

      // Update user's country assignment
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          countryId: countryId,
        },
        include: {
          addresses: {
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
          },
          ninVerifications: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
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
          departments: {
            select: {
              id: true,
              name: true,
              agency: true,
              description: true,
              logoUrl: true,
            },
          },
          country: {
            select: {
              id: true,
              name: true,
              isoCode2: true,
              isoCode3: true,
              flag: true,
              logoUrl: true,
            },
          },
        },
      });

      // Create audit log
      await this.auditService.createAuditLog({
        user: { id: changedById } as any,
        action: 'UPDATE',
        resource: 'USER_COUNTRY',
        resourceId: userId,
        oldValues: { countryId: currentUser?.countryId },
        newValues: { countryId: countryId },
        url: `/users/${userId}/country`,
        ipAddress: 'N/A',
        userAgent: 'N/A',
      });

      this.logger.log(
        `User ${userId} assigned to country ${country.name} (${country.isoCode2}) by ${changedById}`,
      );

      return new UserEntity(updatedUser);
    } catch (error) {
      this.logger.error(
        `Failed to update user country for user ${userId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
