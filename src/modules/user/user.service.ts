import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '@modules/user/user.repository';
import { Prisma, Roles, User } from '@prisma/client';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { ListUsersDTO } from './dto/users.dto';
import { UserFiltersDTO } from './dto/user-filters.dto';
import { USER_NOT_FOUND } from '@common/constants';
import UserEntity from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findById(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }
    return new UserEntity(user);
  }

  async findOne(id: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
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
   * Update a user by ID.
   * @param id The ID of the user to update.
   * @param data The data to update the user with.
   * @returns The updated user.
   */
  async updateUser(
    id: string,
    data: Prisma.UserUpdateInput,
  ): Promise<UserEntity> {
    const user = await this.findById(id);
    const updatedUser = await this.userRepository.updateUser(id, data);
    return new UserEntity(updatedUser);
  }

  /**
   * Delete a user by ID.
   * @param id The ID of the user to delete.
   * @returns The deleted user.
   */
  async deleteUser(id: string): Promise<UserEntity> {
    const user = await this.findById(id);
    const deletedUser = await this.userRepository.deleteUser(id);
    return new UserEntity(deletedUser);
  }

  /**
   * Update the roles of a user.
   * @param userId The ID of the user to update.
   * @param roles The new roles to assign to the user.
   * @returns The updated user.
   */
  async updateUserRoles(userId: string, roles: Roles[]): Promise<UserEntity> {
    const user = await this.findById(userId);
    const updatedUser = await this.userRepository.updateUser(userId, { roles });
    return new UserEntity(updatedUser);
  }

  /**
   * Update the role of a user.
   * @param userId The ID of the user to update.
   * @param role The new role to assign to the user.
   * @returns The updated user.
   */
  async setUserRole(userId: string, role: Roles): Promise<UserEntity> {
    const user = await this.findById(userId);
    const updatedUser = await this.userRepository.updateUser(userId, {
      roles: [role],
    });
    return new UserEntity(updatedUser);
  }

  /**
   * Activate a user by ID.
   * @param userId The ID of the user to activate.
   * @returns The activated user.
   */
  async activateUser(userId: string): Promise<UserEntity> {
    const user = await this.findById(userId);
    const updatedUser = await this.userRepository.updateUser(userId, {
      isActive: true,
    });
    return new UserEntity(updatedUser);
  }

  /**
   * Deactivate a user by ID.
   * @param userId The ID of the user to deactivate.
   * @returns The deactivated user.
   */
  async deactivateUser(userId: string): Promise<UserEntity> {
    const user = await this.findById(userId);
    const updatedUser = await this.userRepository.updateUser(userId, {
      isActive: false,
    });
    return new UserEntity(updatedUser);
  }

  /**
   * Verify a user by ID.
   * @param userId The ID of the user to verify.
   * @returns The verified user.
   */
  async verifyUser(userId: string): Promise<UserEntity> {
    const updatedUser = await this.userRepository.updateUser(userId, {
      isVerified: true,
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

    if (query.roles && query.roles.length > 0) {
      where.roles = { hasSome: query.roles };
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
      {}, // include
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
    const updatedUser = await this.userRepository.updateUser(userId, {
      onboardingPaid: true,
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
}
