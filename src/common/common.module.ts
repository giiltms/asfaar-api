import { Global, Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

// Configuration imports
import appConfig from './configs/app.config';
import databaseConfig from './configs/database.config';
import redisConfig from './configs/redis.config';
import jwtConfig from './configs/jwt.config';
import storageConfig from './configs/storage.config';
import mailConfig from './configs/mail.config';
import paymentConfig from './configs/payment.config';

// Global filters and interceptors
import { AllExceptionsFilter } from '../filters/all-exception.filter';
import { BadRequestExceptionFilter } from '../filters/bad-request-exception.filter';
import { TransformInterceptor } from './interceptors/transform.interceptor';

/**
 * Common module that provides global configuration, validation, exception handling,
 * rate limiting, and other cross-cutting concerns for the entire application.
 */
@Global()
@Module({
  imports: [
    // Global configuration module
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        redisConfig,
        jwtConfig,
        storageConfig,
        mailConfig,
        paymentConfig,
      ],
      envFilePath: ['.env.local', '.env'],
    }),

    // Static file serving for uploads
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    // Rate limiting - disable for now to avoid configuration issues
    // ThrottlerModule.forRoot([
    //   {
    //     ttl: 60000, // 1 minute
    //     limit: 100, // 100 requests per minute
    //   },
    // ]),
  ],
  providers: [
    // Global validation pipe with enhanced error handling
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          transform: true, // Auto-transform payloads to DTO instances
          whitelist: true, // Strip unknown properties
          forbidNonWhitelisted: true, // Throw error for unknown properties
          skipMissingProperties: false, // Validate even undefined properties
          stopAtFirstError: true, // Stop validation on first error for cleaner responses
          transformOptions: {
            enableImplicitConversion: true, // Auto-convert types (string -> number, etc.)
          },
          errorHttpStatusCode: 400, // Ensure validation errors return 400 Bad Request
        }),
    },

    // Specific validation error filter (handles ValidationPipe BadRequestException)
    {
      provide: APP_FILTER,
      useClass: BadRequestExceptionFilter,
    },

    // Global exception filter (handles all other exceptions)
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },

    // Global response transformation interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
  exports: [ConfigModule],
})
export class CommonModule {}
