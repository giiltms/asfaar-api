import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import ApiBaseResponses from '@decorators/api-base-response.decorator';
import { AuditLog, User } from '@prisma/client';
import { SkipThrottle } from '@nestjs/throttler';
import { AuditLogService } from './audit.service';
import { CaslUser, UserProxy } from '@modules/casl';
import ApiOkBaseResponse from '@decorators/api-ok-base-response.decorator';
import AuditBaseEntity from './entities/audit-base.entity';
import { ListAuditLogsDTO } from './dto/audits.dto';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';

@ApiTags('Audit')
@ApiBearerAuth()
@ApiBaseResponses()
@Controller('audit')
@SkipThrottle()
export class AuditController {
  constructor(private readonly auditService: AuditLogService) {}

  @Get()
  @ApiOperation({ summary: 'Get all audit logs' })
  @ApiOkBaseResponse({ dto: AuditBaseEntity, isArray: true, meta: true })
  async findAll(
    @Query() paginationDTO: ListAuditLogsDTO,
  ): Promise<PaginatorTypes.PaginatedResult<AuditLog>> {
    return this.auditService.findAll(paginationDTO);
  }

  @Get(':auditLogId')
  @ApiOperation({ summary: 'Get audit logs' })
  async getAuditLog(@Param('auditLogId') auditLogId: string) {
    return this.auditService.findOne(auditLogId);
  }
}
