import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';
import { PasswordResetService } from './password-reset.service';
import { TokenService } from './token.service';
import { TokenRepository } from './token.repository';
import { AuthGuard } from './guard/auth.guard';
import { UserModule } from '@modules/user/user.module';
import { MailModule } from '@modules/mail/mail.module';
import { AuditModule } from '@modules/audit/audit.module';
import { LocalStorageModule } from '@providers/localstorage/localstorage.module';
import { RedisService } from './redis.service';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    MailModule,
    forwardRef(() => AuditModule),
    LocalStorageModule,
    JwtModule.registerAsync({
      global: true, // Make JWT module global
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>(
            'JWT_ACCESS_TOKEN_EXPIRATION_TIME',
            '15m',
          ),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthTokenService,
    PasswordResetService,
    TokenService,
    TokenRepository,
    AuthGuard,
    RedisService,
  ],
  exports: [
    AuthService,
    AuthTokenService,
    PasswordResetService,
    TokenService,
    AuthGuard,
  ],
})
export class AuthModule {}
