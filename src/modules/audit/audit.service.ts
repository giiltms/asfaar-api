import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, AuditLog } from '@prisma/client';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import { AUDIT_NOT_FOUND } from '@constants/errors.constants';
import { AuditLogFiltersDTO } from './dto/audit-filters.dto';
import { ListAuditLogsDTO } from './dto/audits.dto';
import { AuditLogRepository } from './audit.repository';

@Injectable()
export class AuditLogService {
  constructor(private readonly auditRepository: AuditLogRepository) {}

  async log(
    userId: string | undefined,
    action?: string,
    url?: string,
    resourceType?: string,
    resourceId?: string,
    changes?: any,
  ) {
    return this.auditRepository.create({
      user: userId && {
        connect: {
          id: userId,
        },
      },
      action,
      url,
      resourceId,
      resourceType,
      changes,
    });
  }

  async findById(id: string): Promise<AuditLog> {
    const audit = await this.auditRepository.findById(id);
    if (!audit) {
      throw new NotFoundException(AUDIT_NOT_FOUND);
    }
    return audit;
  }

  findOne(id: string): Promise<AuditLog> {
    return this.auditRepository.findOne({
      where: {
        id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            middleName: true,
            lastName: true,
            roles: true,
            avatar: true,
          },
        },
      },
    });
  }

  async findAll(
    auditsDTO: ListAuditLogsDTO,
  ): Promise<PaginatorTypes.PaginatedResult<AuditLog>> {
    const { page, limit, sortBy, order, ...filters } = auditsDTO;

    const where: Prisma.AuditLogWhereInput = this.buildWhereClause(filters);
    const include: Prisma.AuditLogInclude = {
      user: {
        select: {
          firstName: true,
          middleName: true,
          lastName: true,
          roles: true,
          avatar: true,
        },
      },
    };

    const paginationOptions: PaginatorTypes.PaginateOptions = {
      page,
      perPage: limit,
    };

    const sortByColumn: Prisma.AuditLogOrderByWithRelationInput = {
      [sortBy]: order,
    };

    return this.auditRepository.findAll(
      where,
      include,
      sortByColumn,
      paginationOptions,
    );
  }

  private buildWhereClause(
    filters: AuditLogFiltersDTO,
  ): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters) {
      if (filters.createdAfter) {
        where.timestamp = { gte: new Date(filters.createdAfter) };
      }
      if (filters.createdBefore) {
        where.timestamp = { lte: new Date(filters.createdBefore) };
      }
      if (filters.search) {
        where.OR = [
          { action: { contains: filters.search, mode: 'insensitive' } },
          { resourceType: { contains: filters.search, mode: 'insensitive' } },
          { changes: { array_contains: filters.search } },
        ];
      }
      if (filters.resourceType) {
        where.resourceType = filters.resourceType;
      }
      if (filters.userRole) {
        where.user = {
          roles: {
            has: filters.userRole,
          },
        };
      }
    }
    return where;
  }

  getResourceType(request: any): string {
    const url = request.url;
    const match = url.split('/');
    if (match && match[3]) {
      return this.capitalizeFirstLetter(match[3]);
    }
    return 'Unknown';
  }

  private capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  getChanges(request: any, response: any): any {
    // Logic to determine the changes made. This could involve comparing the request body with the response or previous state.
    if (request.method === 'POST') {
      return { created: response };
    }
    if (request.method === 'PUT' || request.method === 'PATCH') {
      return { updated: request.body };
    }
    if (request.method === 'DELETE') {
      return { deleted: response };
    }
    return null;
  }

  determineAction(request: any): string {
    switch (request.method) {
      case 'POST':
        return 'Create';
      case 'PUT':
      case 'PATCH':
        return 'Update';
      case 'DELETE':
        return 'Delete';
      default:
        return 'Unknown';
    }
  }

  getFirstParam(params: any): string | null {
    const paramKeys = Object.keys(params);
    if (paramKeys.length > 0) {
      return params[paramKeys[0]];
    }
    return null;
  }

  async getMetaFromRequest(request: any, response?: any) {
    const user = request.user;
    const url = `${request.method} ${request.url}`;
    const resourceId =
      request?.params?.id || this.getFirstParam(request.params);
    const resourceType = this.getResourceType(request);
    const metadata = {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    };

    const changes = this.getChanges(request, response);
    const action = this.determineAction(request);

    return {
      userId: user?.id,
      action,
      url,
      resourceType,
      resourceId,
      metadata: { ...metadata, changes },
    };
  }
}
