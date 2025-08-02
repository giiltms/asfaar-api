import { Module, forwardRef } from '@nestjs/common';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { AuditLogRepository } from './audit.repository';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [forwardRef(() => AuthModule)],
  controllers: [AuditController],
  providers: [AuditService, AuditLogRepository],
  exports: [AuditService],
})
export class AuditModule {}
