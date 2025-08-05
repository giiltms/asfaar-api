import { Module } from '@nestjs/common';
import { BiometricCentersService } from './biometric-centers.service';
import { BiometricCentersController } from './biometric-centers.controller';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';

/**
 * BiometricCentersModule
 * 
 * Manages biometric centers throughout the application
 * Provides services for CRUD operations, filtering, and availability checking
 */
@Module({
  imports: [
    PrismaModule, // For database operations
    AuthModule,   // For authentication guards
  ],
  controllers: [BiometricCentersController],
  providers: [BiometricCentersService],
  exports: [BiometricCentersService], // Export service for use in other modules
})
export class BiometricCentersModule {} 