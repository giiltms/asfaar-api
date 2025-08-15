import { DynamicModule, Module, Provider } from '@nestjs/common';
import {
  PrismaModuleAsyncOptions,
  PrismaModuleOptions,
  PrismaOptionsFactory,
} from './interfaces';
import { PRISMA_SERVICE_OPTIONS } from './prisma.constants';
import { PrismaService } from './prisma.service';
import { UserRepository } from '@modules/user/user.repository';
import { MailService } from '@modules/mail/services/mail.service';
import { MailModule } from '@modules/mail/mail.module';
import { PrismaClient } from '@prisma/client';

@Module({
  providers: [PrismaService, PrismaClient, UserRepository, MailService],
  exports: [PrismaService],
  imports: [MailModule],
})
export class PrismaModule {
  static forRoot(options: PrismaModuleOptions = {}): DynamicModule {
    return {
      global: options.isGlobal,
      module: PrismaModule,
      providers: [
        {
          provide: PRISMA_SERVICE_OPTIONS,
          useValue: options.prismaServiceOptions,
        },
      ],
    };
  }

  static forRootAsync(options: PrismaModuleAsyncOptions): DynamicModule {
    return {
      global: options.isGlobal,
      module: PrismaModule,
      imports: options.imports || [],
      providers: this.createAsyncProviders(options),
    };
  }

  private static createAsyncProviders(
    options: PrismaModuleAsyncOptions,
  ): Provider[] {
    if (options.useExisting || options.useFactory) {
      return this.createAsyncOptionsProvider(options);
    }

    return [
      ...this.createAsyncOptionsProvider(options),
      {
        provide: options.useClass,
        useClass: options.useClass,
      },
    ];
  }

  private static createAsyncOptionsProvider(
    options: PrismaModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: PRISMA_SERVICE_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ];
    }
    return [
      {
        provide: PRISMA_SERVICE_OPTIONS,
        useFactory: async (optionsFactory: PrismaOptionsFactory) =>
          await optionsFactory.createPrismaOptions(),
        inject: [options.useExisting || options.useClass],
      },
    ];
  }
}
