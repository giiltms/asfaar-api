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
import { AuthGuard } from '@nestjs/passport';
import { ListAuditLogsDTO } from './dto/audits.dto';

@ApiTags('audit')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get audit logs with pagination and filters' })
  @ApiResponse({ status: 200, description: 'List of audit logs' })
  async getAuditLogs(@Query() query: ListAuditLogsDTO) {
    const { page, limit, sortBy, sortOrder, ...filters } = query;
    return this.auditService.getAuditLogs(
      { page, limit, sortBy, sortOrder },
      filters,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit log by ID' })
  @ApiResponse({ status: 200, description: 'Audit log details' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  async getAuditLogById(@Param('id', ParseUUIDPipe) id: string) {
    return this.auditService.getAuditLogById(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete audit log by ID' })
  @ApiResponse({ status: 200, description: 'Audit log deleted successfully' })
  @ApiResponse({ status: 404, description: 'Audit log not found' })
  async deleteAuditLog(@Param('id', ParseUUIDPipe) id: string) {
    await this.auditService.deleteAuditLog(id);
    return { message: 'Audit log deleted successfully' };
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Clean up old audit logs' })
  @ApiResponse({ status: 200, description: 'Old audit logs cleaned up' })
  async cleanupOldLogs(@Query('days') days?: number) {
    await this.auditService.deleteOldAuditLogs(days);
    return { message: 'Old audit logs cleaned up successfully' };
  }
}
