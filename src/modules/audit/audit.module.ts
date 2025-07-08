import { Module } from '@nestjs/common';
import { CaslModule } from '@modules/casl';
import { permissions } from '@modules/user/user.permissions';
import { AuditController } from './audit.controller';
import { AuditLogService } from './audit.service';
import { AuditLogRepository } from './audit.repository';
import { AuditLogInterceptor } from '@interceptors/audit-log.interceptor';

@Module({
  imports: [CaslModule.forFeature({ permissions })],
  controllers: [AuditController],
  providers: [AuditLogService, AuditLogRepository, AuditLogInterceptor],
  exports: [AuditLogService, AuditLogRepository],
})
export class AuditModule {}
