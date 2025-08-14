import { Global, Module, OnModuleInit } from '@nestjs/common';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../providers/prisma/prisma.module';
import { DatabaseService } from './database/database.service';
import { CacheService } from './cache/cache.service';
import {
  formSubmissionReferenceMiddleware,
  paymentEmailMiddleware,
  setMailServiceForPaymentMiddleware,
} from '@providers/prisma';
import { MailModule } from '@modules/mail/mail.module';
import { MailService } from '@modules/mail/services/mail.service';

@Global()
@Module({
  imports: [
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisConfig = configService.get('redis');
        return {
          config: {
            host: redisConfig.REDIS_HOST,
            port: redisConfig.REDIS_PORT,
            password: redisConfig.REDIS_PASSWORD,
            db: redisConfig.REDIS_DB,
            retryDelayOnFailover: 100,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            connectTimeout: 10000,
            commandTimeout: 5000,
          },
        };
      },
    }),
    PrismaModule.forRoot({
      isGlobal: true,
      prismaServiceOptions: {
        middlewares: [
          formSubmissionReferenceMiddleware(),
          paymentEmailMiddleware(),
        ],
      },
    }),
    MailModule,
  ],
  providers: [DatabaseService, CacheService],
  exports: [DatabaseService, CacheService, PrismaModule, RedisModule],
})
export class CoreModule implements OnModuleInit {
  constructor(private readonly mailService: MailService) {}

  onModuleInit() {
    // Inject MailService into the payment email middleware
    setMailServiceForPaymentMiddleware(this.mailService);
  }
}
