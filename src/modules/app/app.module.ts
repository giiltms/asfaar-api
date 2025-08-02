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
    // PostsModule, // Add PostsModule when it exists
    // HealthModule, // Add HealthModule when it exists
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
