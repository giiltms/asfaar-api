import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Import YouVerify module
import { YouVerifyModule } from '@providers/youverify/youverify.module';

// Import NIN module components
import { NinController } from './nin.controller';
import { NinService } from './nin.service';
import { NinRepository } from './nin.repository';
import { PrismaModule } from '@providers/prisma';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [
    // YouVerify provider
    YouVerifyModule,
    PrismaModule,
    ConfigModule,
    //Rate limiting
    ThrottlerModule.forRoot(),

    // Event system
    EventEmitterModule.forRoot({
      // Use this instance across the whole app
      global: true,
      // set this to `true` to use wildcards
      wildcard: false,
      // the delimiter used to segment namespaces
      delimiter: '.',
      // set this to `true` if you want to emit the newListener event
      newListener: false,
      // set this to `true` if you want to emit the removeListener event
      removeListener: false,
      // the maximum amount of listeners that can be assigned to an event
      maxListeners: 10,
      // show event name in memory leak message when more than maximum amount of listeners is assigned
      verboseMemoryLeak: false,
      // disable throwing uncaughtException if an error event is emitted and it has no listeners
      ignoreErrors: false,
    }),

    // Configuration
    ConfigModule,
  ],
  controllers: [NinController],
  providers: [NinService, NinRepository],
  exports: [NinService, NinRepository],
})
export class NinModule {}
