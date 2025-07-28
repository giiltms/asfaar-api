import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { CaslModule } from '@modules/casl';
import { permissions } from '@modules/user/user.permissions';
import { AuditModule } from '@modules/audit/audit.module';

@Module({
  imports: [CaslModule.forFeature({ permissions }), AuditModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository], // Export UserRepository so other modules can use it
})
export class UserModule {}
