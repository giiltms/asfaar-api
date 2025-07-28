import { Module } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditLogRepository } from './audit.repository';

@Module({
  controllers: [AuditController],
  providers: [AuditService, AuditLogRepository],
  exports: [AuditService],
})
export class AuditModule {}
