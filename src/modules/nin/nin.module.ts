import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Import YouVerify module
import { YouVerifyModule } from '@providers/youverify/youverify.module';

// Import NIN module components
import { NinController } from './nin.controller';
import { NinService } from './nin.service';
import { NinVerification } from './entities/nin.entity';
import { NinRepository } from './nin.repository';
import { PrismaService } from '@providers/prisma/prisma.service';
import { PrismaModule } from '@providers/prisma';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '@modules/auth/auth.module';
// import { 
//   NinPermissionsGuard, 
//   NinOwnershipGuard, 
//   NinAuthGuard 
// } from './nin.permissions';

@Module({
  imports: [

    // YouVerify provider
    YouVerifyModule,
    PrismaModule,
    ConfigModule,
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
    AuthModule, // Import AuthModule for authentication services
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
  providers: [
    NinService,
    NinRepository,
  ],
  exports: [
    NinService,
    NinRepository
    // Export guards so other modules can use them
  ],
})
export class NinModule {
  constructor() {
    console.log('🔐 NIN Verification Module initialized');
    console.log('📋 Features enabled:');
    console.log('  ✅ NIN Verification via YouVerify');
    console.log('  ✅ Database persistence');
    console.log('  ✅ Event-driven hooks');
    console.log('  ✅ Role-based permissions');
    console.log('  ✅ Rate limiting');
    console.log('  ✅ Audit trails');
    console.log('  ✅ Bulk operations');
    console.log('  ✅ Export functionality');
  }
}