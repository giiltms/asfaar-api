import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from '@modules/user/user.repository';
import { Prisma, Roles, User } from '@prisma/client';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { USER_NOT_FOUND } from '@constants/errors.constants';
import { ListUsersDTO } from './dto/users.dto';
import { UserFiltersDTO } from './dto/user-filters.dto';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }
    return user;
  }

  findOne(id: string): Promise<User> {
    return this.userRepository.findOne({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        roles: true,
      },
    });
  }

  findUser(id: string): Promise<User> {
    return this.userRepository.findOne({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true, // Add other fields you need from User
        roles: true,
      },
    });
  }

  async findAll(
    projectsDTO: ListUsersDTO,
  ): Promise<PaginatorTypes.PaginatedResult<User>> {
    const { page, limit, sortBy, sortOrder, ...filters } = projectsDTO;

    const where: Prisma.UserWhereInput = this.buildWhereClause(filters);
    const include: Prisma.UserInclude = {
      // regionalProfile: true,
    };

    const paginationOptions: PaginatorTypes.PaginateOptions = {
      page,
      perPage: limit,
    };

    const sortByColumn: Prisma.UserOrderByWithRelationInput = {
      [sortBy]: sortOrder,
    };

    return this.userRepository.findAll(
      where,
      include,
      sortByColumn,
      paginationOptions,
    );
  }

  /**
   * Update a user by ID.
   * @param id The ID of the user to update.
   * @param data The updated user data.
   * @returns The updated user.
   */
  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    const user = await this.findById(id);
    return this.userRepository.updateUser(id, data);
  }

  /**
   * Delete a user by ID.
   * @param id The ID of the user to delete.
   * @returns The deleted user.
   */
  async deleteUser(id: string): Promise<User> {
    const user = await this.findById(id);
    return this.userRepository.deleteUser(id);
  }

  /**
   * Update the roles of a user.
   * @param userId The ID of the user to update.
   * @param roles The new roles to assign to the user.
   * @returns The updated user.
   */
  async updateUserRoles(userId: string, roles: Roles[]): Promise<User> {
    const user = await this.findById(userId);
    return this.userRepository.updateUser(userId, { roles });
  }

  /**
   * Update the role of a user.
   * @param userId The ID of the user to update.
   * @param role The new role to assign to the user.
   * @returns The updated user.
   */
  async setUserRole(userId: string, role: Roles): Promise<User> {
    const user = await this.findById(userId);
    return this.userRepository.updateUser(userId, { roles: [role] });
  }

  /**
   * Activate a user by ID.
   * @param userId The ID of the user to activate.
   * @returns The updated user.
   */
  async activateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    return this.userRepository.updateUser(userId, { isActive: true });
  }

  /**
   * Deactivate a user by ID.
   * @param userId The ID of the user to deactivate.
   * @returns The updated user.
   */
  async deactivateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    return this.userRepository.updateUser(userId, { isActive: false });
  }

  /**
   * Verify a user by ID.
   * @param userId The ID of the user to verify.
   * @returns The updated user.
   */
  async verifyUser(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    return this.userRepository.updateUser(userId, { isVerified: true });
  }

  async getUsers(query: ListUsersDTO): Promise<any> {
    // Simplified implementation
    return {
      data: [],
      meta: {
        total: 0,
        page: query.page || 1,
        limit: query.limit || 10,
        totalPages: 0,
      },
    };
  }

  async getUserById(id: string): Promise<any> {
    // Simplified implementation
    return this.userRepository.findOne({
      where: { id },
    });
  }

  private buildWhereClause(filters: UserFiltersDTO) {
    const where: Prisma.UserWhereInput = {};

    if (filters) {
      if (filters.createdAfter) {
        where.createdAt = { gte: new Date(filters.createdAfter) };
      }
      if (filters.createdBefore) {
        where.createdAt = { lte: new Date(filters.createdBefore) };
      }
      if (filters.role) {
        where.roles = { has: filters.role };
      }
      if (filters.search) {
        where.OR = [
          { firstName: { contains: filters.search, mode: 'insensitive' } },
          { middleName: { contains: filters.search, mode: 'insensitive' } },
          { lastName: { contains: filters.search, mode: 'insensitive' } },
          { email: { contains: filters.search, mode: 'insensitive' } },
        ];
      }
    }

    return where;
  }
}
