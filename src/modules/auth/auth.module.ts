import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserRepository } from '@modules/user/user.repository';
import { AuthTokenService } from '@modules/auth/auth-token.service';
import { TokenRepository } from '@modules/auth/token.repository';
import { CaslModule } from '@modules/casl';
import { permissions } from '@modules/auth/auth.permissions';
import { RedisService } from './redis.service';
import { TokenService } from './token.service';
import { PasswordResetService } from './password-reset.service';
import LocalStorageModule from '@providers/localstorage/localstorage.module';
import { AuditModule } from '@modules/audit/audit.module';

@Module({
  imports: [
    CaslModule.forFeature({ permissions }),
    LocalStorageModule,
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenService,
    TokenService,
    UserRepository,
    PasswordResetService,
    TokenRepository,
    RedisService,
  ],
})
export class AuthModule {}
