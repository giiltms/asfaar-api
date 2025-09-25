import { Injectable, NotFoundException, Logger } from '@nestjs/common';
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
        `${userWithCenters.firstName || ''} ${userWithCenters.lastName || ''
          }`.trim() || 'Unknown User',
      centers: userWithCenters.biometricCenters,
      totalCenters: userWithCenters.biometricCenters.length,
    };
  }
}
