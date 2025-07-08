import { Logger, Module } from '@nestjs/common';
import appConfig from '@config/app.config';
import { ConfigModule, ConfigService } from '@nestjs/config';
import swaggerConfig from '@config/swagger.config';
import HealthModule from '@modules/health/health.module';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { UserModule } from '@modules/user/user.module';
import { loggingMiddleware, createUserMiddleware } from '@providers/prisma';
import { AuthModule } from '@modules/auth/auth.module';
import jwtConfig from '@config/jwt.config';
import { CaslModule } from '@modules/casl';
import { Roles } from '@modules/app/app.roles';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { JwtModule, JwtService } from '@nestjs/jwt';
import sqsConfig from '@config/sqs.config';
import { AuthTokenService } from '@modules/auth/auth-token.service';
import { TokenRepository } from '@modules/auth/token.repository';
import { RedisModule } from '@nestjs-modules/ioredis';
import { REDIS_HOST, REDIS_PASS, REDIS_PORT } from '@constants/env.constants';
import { RedisService } from '@modules/auth/redis.service';
import { MailModule } from '@modules/mail/mail.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

export const uploadStaticPath = join(process.cwd(), 'uploads'); // Using process.cwd() to ensure consistency
Logger.log(`Serving static files from: ${uploadStaticPath}`);

@Module({
  controllers: [],
  imports: [
    ServeStaticModule.forRoot({
      rootPath: uploadStaticPath,
      serveRoot: '/uploads',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, swaggerConfig, jwtConfig, sqsConfig],
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        config: {
          password: configService.getOrThrow<string>(REDIS_PASS),
          host: configService.getOrThrow<string>(REDIS_HOST),
          port: +configService.get<number>(REDIS_PORT),
        },
      }),
    }),
    PrismaModule.forRoot({
      isGlobal: true,
      prismaServiceOptions: {
        middlewares: [loggingMiddleware(), createUserMiddleware()],
      },
    }),
    JwtModule.register({
      global: true,
    }),
    CaslModule.forRoot<Roles>({
      // Role to grant full access, optional
      superuserRole: Roles.SYSTEM_ADMIN,
    }),
    HealthModule,
    UserModule,
    AuthModule,
    MailModule,
  ],
  providers: [
    AuthTokenService,
    JwtService,
    RedisService,
    TokenRepository,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
})
export class AppModule {}
