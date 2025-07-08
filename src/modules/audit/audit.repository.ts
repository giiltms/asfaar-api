import { PrismaService } from '@providers/prisma';
import { Injectable } from '@nestjs/common';
import { paginator } from '@nodeteam/nestjs-prisma-pagination';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { Prisma, AuditLog } from '@prisma/client';
import { PrismaRepositoryClient } from '@providers/prisma/types';

@Injectable()
export class AuditLogRepository {
  private readonly paginate: PaginatorTypes.PaginateFunction;

  constructor(private prisma: PrismaService) {
    /**
     * @desc Create a paginate function
     * @param model
     * @param options
     * @returns Promise<PaginatorTypes.PaginatedResult<T>>
     */
    this.paginate = paginator({
      page: 1,
      perPage: 10,
    });
  }

  findById(
    id: string,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<AuditLog> {
    return transactionClient.auditLog.findUnique({
      where: { id },
    });
  }

  async findOne(
    params: Prisma.AuditLogFindFirstArgs,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<AuditLog | null> {
    return transactionClient.auditLog.findFirst(params);
  }

  async create(
    data: Prisma.AuditLogCreateInput,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<AuditLog> {
    return transactionClient.auditLog.create({
      data,
    });
  }

  async findAll(
    where: Prisma.AuditLogWhereInput,
    include: Prisma.AuditLogInclude,
    orderBy: Prisma.AuditLogOrderByWithRelationInput,
    paginationOptions?: PaginatorTypes.PaginateOptions,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<PaginatorTypes.PaginatedResult<AuditLog>> {
    const paginate = paginator(paginationOptions);
    return paginate(transactionClient.auditLog, {
      where,
      orderBy,
      include,
    });
  }

  async update(
    id: string,
    data: Prisma.AuditLogUpdateInput,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<AuditLog> {
    return await transactionClient.auditLog.update({
      where: { id },
      data,
    });
  }

  async deleteAuditLog(
    id: string,
    transactionClient: PrismaRepositoryClient = this.prisma,
  ): Promise<AuditLog> {
    return await transactionClient.auditLog.delete({
      where: { id },
    });
  }
}
