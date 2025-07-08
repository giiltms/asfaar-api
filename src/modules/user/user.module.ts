import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { UserRepository } from '@modules/user/user.repository';
import { CaslModule } from '@modules/casl';
import { permissions } from '@modules/user/user.permissions';
import { AuditModule } from '@modules/audit/audit.module';

@Module({
  imports: [CaslModule.forFeature({ permissions }), AuditModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
})
export class UserModule {}
