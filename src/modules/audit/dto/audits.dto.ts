import { PaginationQueryDto } from '../../../common/dtos/pagination.dto';
import { IntersectionType } from '@nestjs/swagger';
import { AuditFiltersDto } from './audit-filters.dto';

export class ListAuditLogsDTO extends IntersectionType(
  PaginationQueryDto,
  AuditFiltersDto,
) {}
