import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { AuditLogRepository } from './audit.repository'; // Fixed: use AuditLogRepository
import { User } from '@prisma/client';
import { AuditFiltersDto } from './dto/audit-filters.dto';
import { PaginationQueryDto } from '../../common/dtos/pagination.dto';

export interface CreateAuditLogData {
  user: User;
  action: string;
  resource: string;
  resourceId: string;
  oldValues?: any;
  newValues?: any;
  url: string;
  ipAddress: string;
  userAgent: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly auditRepository: AuditLogRepository, // Fixed: use AuditLogRepository
  ) {}

  async createAuditLog(data: CreateAuditLogData): Promise<void> {
    try {
      await this.prismaService.auditLog.create({
        data: {
          user: { connect: { id: data.user.id } },
          action: data.action,
          url: data.url,
          resourceId: data.resourceId,
          resource: data.resource, // Fixed: use 'resource' instead of 'resourceType'
          oldValues: data.oldValues,
          newValues: data.newValues,
          ipAddress: data.ipAddress,
          userAgent: data.userAgent,
          timestamp: new Date(),
        },
      });

      this.logger.log(
        `Audit log created: ${data.user.email} performed ${data.action} on ${data.resource}:${data.resourceId}`,
      );
    } catch (error) {
      this.logger.error('Error creating audit log:', error);
      // Don't throw error to avoid breaking main operation
    }
  }

  async getAuditLogs(
    paginationDto: PaginationQueryDto,
    filters: AuditFiltersDto,
  ) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'timestamp',
      sortOrder = 'desc',
    } = paginationDto;
    const offset = (page - 1) * limit;

    // Build where clause based on filters
    const where: any = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.action) {
      where.action = { contains: filters.action, mode: 'insensitive' };
    }

    if (filters.resource) {
      where.resource = { contains: filters.resource, mode: 'insensitive' };
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.timestamp = {};
      if (filters.dateFrom) {
        where.timestamp.gte = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.timestamp.lte = new Date(filters.dateTo);
      }
    }

    if (filters.search) {
      where.OR = [
        { action: { contains: filters.search, mode: 'insensitive' } },
        { resource: { contains: filters.search, mode: 'insensitive' } }, // Fixed: use 'resource' instead of 'resourceType'
        { url: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Apply resource filter if provided
    if (filters.resource) {
      where.resource = filters.resource; // Fixed: use 'resource' instead of 'resourceType'
    }

    // Get total count
    const total = await this.prismaService.auditLog.count({ where });

    // Get audit logs with pagination
    const auditLogs = await this.prismaService.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: offset,
      take: limit,
    });

    return {
      data: auditLogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAuditLogById(id: string) {
    return this.prismaService.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });
  }

  async deleteAuditLog(id: string): Promise<void> {
    await this.prismaService.auditLog.delete({
      where: { id },
    });
  }

  async deleteAuditLogsByUser(userId: string): Promise<void> {
    await this.prismaService.auditLog.deleteMany({
      where: { userId },
    });
  }

  async deleteOldAuditLogs(daysOld = 90): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prismaService.auditLog.deleteMany({
      where: {
        timestamp: {
          lt: cutoffDate,
        },
      },
    });

    this.logger.log(
      `Deleted ${result.count} audit logs older than ${daysOld} days`,
    );
  }
}
