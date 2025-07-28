import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthTokenService } from './auth-token.service';
import { PasswordResetService } from './password-reset.service';
import { TokenService } from './token.service';
import { TokenRepository } from './token.repository';
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
    AuditModule, // Add AuditModule so AuthController can inject AuditService
    LocalStorageModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME', '15m'),
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
    RedisService,
  ],
  exports: [
    AuthService,
    AuthTokenService,
    PasswordResetService,
    TokenService,
  ],
})
export class AuthModule {}
