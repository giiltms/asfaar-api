import { Module } from '@nestjs/common';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { UserModule } from '@modules/user/user.module';
import { FormSubmissionsModule } from '@modules/form-submissions/form-submissions.module';
import { PaymentsModule } from '@modules/payments/payments.module';
import { BiometricAppointmentsModule } from '@modules/biometric-appointments/biometric-appointments.module';
import { SharedModule } from '@shared/shared.module';
import { TravelAgentController } from './travel-agent.controller';
import { TravelAgentService } from './travel-agent.service';
import { TravelAgentClientsController } from './travel-agent-clients.controller';
import { TravelAgentClientsService } from './travel-agent-clients.service';
import { TravelAgentAnalyticsController } from './travel-agent-analytics.controller';
import { TravelAgentAnalyticsService } from './travel-agent-analytics.service';

/**
 * TravelAgentModule
 *
 * Manages travel agent operations including:
 * - Client management and relationships
 * - Application management on behalf of clients
 * - Payment processing for clients
 * - Appointment scheduling for clients
 * - Analytics and reporting
 * - Communication with clients
 */
@Module({
  imports: [
    PrismaModule, // For database operations
    AuthModule, // For authentication guards
    UserModule, // For user creation and management
    SharedModule, // For NIN verification service
    FormSubmissionsModule, // For form submission management
    PaymentsModule, // For payment processing
    BiometricAppointmentsModule, // For appointment scheduling
  ],
  controllers: [
    TravelAgentController,
    TravelAgentClientsController,
    TravelAgentAnalyticsController,
  ],
  providers: [
    TravelAgentService,
    TravelAgentClientsService,
    TravelAgentAnalyticsService,
  ],
  exports: [
    TravelAgentService,
    TravelAgentClientsService,
    TravelAgentAnalyticsService,
  ],
})
export class TravelAgentModule {}
