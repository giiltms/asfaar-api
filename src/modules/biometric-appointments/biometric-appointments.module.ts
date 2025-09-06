import { Module } from '@nestjs/common';
import { BiometricAppointmentsService } from './biometric-appointments.service';
import { BiometricAppointmentsController } from './biometric-appointments.controller';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { PaymentsModule } from '@modules/payments/payments.module';
import { BiometricCentersModule } from '@modules/biometric-centers/biometric-centers.module';

/**
 * BiometricAppointmentsModule
 *
 * Manages biometric appointment scheduling and lifecycle
 * Provides services for appointment booking, payment validation, and status management
 * Integrates with PaymentsModule for payment validation and BiometricCentersModule for center management
 */
@Module({
  imports: [
    PrismaModule, // For database operations
    AuthModule, // For authentication guards
    PaymentsModule, // For payment validation before booking
    BiometricCentersModule, // For center availability and validation
  ],
  controllers: [BiometricAppointmentsController],
  providers: [BiometricAppointmentsService],
  exports: [BiometricAppointmentsService], // Export service for use in other modules
})
export class BiometricAppointmentsModule {}
