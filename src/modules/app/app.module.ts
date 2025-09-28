import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from '../../common';
import { CoreModule } from '../../core';
import { SharedModule } from '../../shared';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';
import { AddressModule } from '../address/address.module';
import { FormsModule } from '../forms/forms.module';
import { FormSubmissionsModule } from '../form-submissions/form-submissions.module';
import { BiometricCentersModule } from '../biometric-centers/biometric-centers.module';
import { PaymentsModule } from '../payments/payments.module';
import { BiometricAppointmentsModule } from '../biometric-appointments/biometric-appointments.module';
import { BoothsModule } from '../booths/booths.module';
import { QueueModule } from '../queue/queue.module';
import { ApplicantDashboardModule } from '../dashboard-applicant/applicant-dashboard.module';
import { CountriesModule } from '../countries/countries.module';
import { ApplicationTypesModule } from '../application-types/application-types.module';
import { WebhooksModule } from '../webhooks/webhooks.module';
import { BiometricCaptureModule } from '../biometric-capture/biometric-capture.module';
import { DashboardVerificationModule } from '../dashboard-verification/dashboard-verification.module';
import { DashboardLiaisonModule } from '../dashboard-liaison/dashboard-liaison.module';
import { DashboardEmbassyModule } from '../dashboard-embassy/dashboard-embassy.module';
import { DashboardFrontdeskModule } from '../dashboard-frontdesk/dashboard-frontdesk.module';
import { AnalyticsModule } from '../analytics/analytics.module';
import { FinanceModule } from '../finance/finance.module';
import { DepartmentsModule } from '../departments/departments.module';
import { PassportsModule } from '../passports/passports.module';

// Commenting out modules that don't exist yet
// import { HealthModule } from '../health/health.module';
// import { PostsModule } from '../posts/posts.module';

@Module({
  imports: [
    // Global modules for configuration, core services, and shared utilities
    CommonModule,
    CoreModule,
    SharedModule,
    // Feature modules
    AuthModule,
    UserModule,
    AddressModule,
    FormsModule,
    FormSubmissionsModule,
    BiometricCentersModule,
    PaymentsModule,
    BiometricAppointmentsModule,
    BoothsModule,
    QueueModule,
    ApplicantDashboardModule,
    CountriesModule,
    ApplicationTypesModule,
    WebhooksModule,
    BiometricCaptureModule,
    DashboardVerificationModule,
    DashboardLiaisonModule,
    DashboardEmbassyModule,
    DashboardFrontdeskModule,
    AnalyticsModule,
    FinanceModule,
    DepartmentsModule,
    PassportsModule,
    // HealthModule, // Add HealthModule when it exists
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
