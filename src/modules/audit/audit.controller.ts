import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuditService } from './audit.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { ListAuditLogsDTO } from './dto/audits.dto';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of audit logs' })
  async getAuditLogs(@Query() query: ListAuditLogsDTO) {
    // Split the query into pagination and filters parts
    const { page, limit, sortBy, sortOrder, ...filters } = query;
    const paginationDto = { page, limit, sortBy, sortOrder };
    return this.auditService.getAuditLogs(paginationDto, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log by ID' })
  @ApiResponse({ status: 200, description: 'Audit log details' })
  async getAuditLogById(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditService.getAuditLogById(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete audit log by ID' })
  @ApiResponse({ status: 200, description: 'Audit log deleted' })
  async deleteAuditLog(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditService.deleteAuditLog(id);
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Clean up old audit logs' })
  @ApiResponse({ status: 200, description: 'Old audit logs cleaned up' })
  async cleanupOldLogs() {
    return this.auditService.deleteOldAuditLogs();
  }
}
