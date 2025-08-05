import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { UserRepository } from '@modules/user/user.repository';
import { AuthController } from './auth.controller';
import { TokenService } from './token.service';
import { AuthTokenService } from './auth-token.service';
import { PasswordResetService } from './password-reset.service';
import { RedisService } from './redis.service';
import { AuthGuard } from './guard/auth.guard';
import { TokenRepository } from './token.repository';
import { MailService } from '@modules/mail/services/mail.service';
import { SharedModule } from '@shared/shared.module';
import { PrismaModule } from '@providers/prisma/prisma.module';

@Module({
  imports: [
    SharedModule,
    PrismaModule,
    ConfigModule,
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
    UserRepository,
    TokenService,
    AuthTokenService,
    PasswordResetService,
    RedisService,
    AuthGuard,
    TokenRepository,
    MailService,
  ],
  exports: [AuthService, AuthGuard, AuthTokenService],
})
export class AuthModule {}
