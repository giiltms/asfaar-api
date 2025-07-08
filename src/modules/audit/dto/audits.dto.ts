import { IntersectionType } from '@nestjs/swagger';
import { AuditPaginationDTO } from './audit-pagination.dto';
import { AuditLogFiltersDTO } from './audit-filters.dto';

export class ListAuditLogsDTO extends IntersectionType(
  AuditPaginationDTO,
  AuditLogFiltersDTO,
) {}
