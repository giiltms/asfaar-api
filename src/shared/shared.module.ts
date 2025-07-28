import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// Temporarily comment out NotificationService to fix dependency injection
// import { NotificationService } from './services/notification/notification.service';

@Module({
  imports: [ConfigModule],
  providers: [
    // NotificationService, // Commented out until EventEmitter dependency is properly configured
  ],
  exports: [
    // NotificationService, // Commented out until EventEmitter dependency is properly configured
  ],
})
export class SharedModule {} 