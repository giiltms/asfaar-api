import { Module, forwardRef } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { CaslModule } from '@modules/casl';
import { permissions } from '@modules/user/user.permissions';
import { AuditModule } from '@modules/audit/audit.module';
import { AuthModule } from '@modules/auth/auth.module';
import { PrismaModule } from '@providers/prisma/prisma.module';

@Module({
  imports: [
    CaslModule.forFeature({ permissions }),
    forwardRef(() => AuditModule),
    forwardRef(() => AuthModule),
    PrismaModule,
  ],
  controllers: [UserController],
  providers: [UserService, UserRepository],
  exports: [UserService, UserRepository], // Export UserRepository so other modules can use it
})
export class UserModule {}
