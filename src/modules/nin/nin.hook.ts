import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { NinVerification, VerificationMethod, VerificationStatus } from './entities/nin.entity';
import { NinRepository } from './nin.repository';

// Event interfaces
export interface NinVerificationStartedEvent {
  nin: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

export interface NinVerificationCompletedEvent {
  nin: string;
  verificationId: string;
  status: VerificationStatus;
  method: string;
  userId?: string;
  data?: any;
  metadata?: any;
  timestamp: Date;
}

export interface NinVerificationFailedEvent {
  nin: string;
  userId?: string;
  error: string;
  attempt: number;
  timestamp: Date;
}

export interface NinDataUpdatedEvent {
  nin: string;
  verificationId: string;
  previousData?: any;
  newData: any;
  userId?: string;
  timestamp: Date;
}

// Event names
export const NIN_EVENTS = {
  VERIFICATION_STARTED: 'nin.verification.started',
  VERIFICATION_COMPLETED: 'nin.verification.completed',
  VERIFICATION_FAILED: 'nin.verification.failed',
  DATA_UPDATED: 'nin.data.updated',
  SUSPICIOUS_ACTIVITY: 'nin.suspicious.activity',
  RATE_LIMIT_EXCEEDED: 'nin.rate.limit.exceeded',
} as const;

@Injectable()
export class NinHookService {
  private readonly logger = new Logger(NinHookService.name);

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly ninRepository: NinRepository,
  ) {}

  // Emit events
  emitVerificationStarted(event: NinVerificationStartedEvent) {
    this.logger.log(`NIN verification started for: ${event.nin}`);
    this.eventEmitter.emit(NIN_EVENTS.VERIFICATION_STARTED, event);
  }

  emitVerificationCompleted(event: NinVerificationCompletedEvent) {
    this.logger.log(`NIN verification completed for: ${event.nin} with status: ${event.status}`);
    this.eventEmitter.emit(NIN_EVENTS.VERIFICATION_COMPLETED, event);
  }

  emitVerificationFailed(event: NinVerificationFailedEvent) {
    this.logger.error(`NIN verification failed for: ${event.nin} - ${event.error}`);
    this.eventEmitter.emit(NIN_EVENTS.VERIFICATION_FAILED, event);
  }

  emitDataUpdated(event: NinDataUpdatedEvent) {
    this.logger.log(`NIN data updated for: ${event.nin}`);
    this.eventEmitter.emit(NIN_EVENTS.DATA_UPDATED, event);
  }

  emitSuspiciousActivity(nin: string, reason: string, metadata?: any) {
    this.logger.warn(`Suspicious activity detected for NIN: ${nin} - ${reason}`);
    this.eventEmitter.emit(NIN_EVENTS.SUSPICIOUS_ACTIVITY, {
      nin,
      reason,
      metadata,
      timestamp: new Date(),
    });
  }

  emitRateLimitExceeded(identifier: string, limit: number, timeWindow: string) {
    this.logger.error(`Rate limit exceeded for: ${identifier}`);
    this.eventEmitter.emit(NIN_EVENTS.RATE_LIMIT_EXCEEDED, {
      identifier,
      limit,
      timeWindow,
      timestamp: new Date(),
    });
  }

  // Event listeners
  @OnEvent(NIN_EVENTS.VERIFICATION_FAILED)
  async handleVerificationFailed(event: NinVerificationFailedEvent) {
    try {
      this.logger.error(`Handling verification failed event for NIN: ${event.nin}`);

      // Update verification record with failure
      await this.updateVerificationRecord(event.nin, {
        verificationStatus: VerificationStatus.FAILED,
        errorMessage: event.error,
        verificationAttempts: event.attempt,
      });

      // Check for suspicious patterns
      if (event.attempt >= 5) {
        this.emitSuspiciousActivity(
          event.nin, 
          'Multiple verification failures', 
          { attempts: event.attempt, error: event.error }
        );
      }

      // Send failure notification
      await this.sendFailureNotification(event);

    } catch (error) {
      this.logger.error(`Error handling verification failed event: ${error.message}`);
    }
  }

  @OnEvent(NIN_EVENTS.DATA_UPDATED)
  async handleDataUpdated(event: NinDataUpdatedEvent) {
    try {
      this.logger.log(`Handling data updated event for NIN: ${event.nin}`);

      // Log data changes for audit trail
      await this.logDataChange(event);

      // Validate data integrity
      await this.validateDataIntegrity(event.nin, event.newData);

      // Notify relevant systems about data update
      await this.notifyDataUpdate(event);

    } catch (error) {
      this.logger.error(`Error handling data updated event: ${error.message}`);
    }
  }

  @OnEvent(NIN_EVENTS.SUSPICIOUS_ACTIVITY)
  async handleSuspiciousActivity(event: any) {
    try {
      this.logger.warn(`Handling suspicious activity for NIN: ${event.nin}`);

      // Log to security system
      await this.logSecurityEvent(event);

      // Temporarily block NIN if needed
      if (this.shouldBlockNin(event)) {
        await this.temporarilyBlockNin(event.nin, event.reason);
      }

      // Send alert to administrators
      await this.sendSecurityAlert(event);

    } catch (error) {
      this.logger.error(`Error handling suspicious activity event: ${error.message}`);
    }
  }

  @OnEvent(NIN_EVENTS.RATE_LIMIT_EXCEEDED)
  async handleRateLimitExceeded(event: any) {
    try {
      this.logger.error(`Handling rate limit exceeded for: ${event.identifier}`);

      // Log rate limit violation
      await this.logRateLimitViolation(event);

      // Send notification to user/admin
      await this.sendRateLimitNotification(event);

    } catch (error) {
      this.logger.error(`Error handling rate limit exceeded event: ${error.message}`);
    }
  }

  // Helper methods
  private async createOrUpdateVerificationRecord(nin: string, data: Partial<NinVerification>) {
    const existingRecord = await this.ninRepository.findByNin(nin);
    
    if (existingRecord) {
      await this.ninRepository.update(nin, data);
    } else {
      const newRecord = this.ninRepository.create({
        nin,
        ...data,
      });
    }
  }

  private async updateVerificationRecord(nin: string, data: Partial<NinVerification>) {
    await this.ninRepository.update(nin , data);
  }

  private async sendSuccessNotification(event: NinVerificationCompletedEvent) {
    // Implement notification logic (email, SMS, push notification, etc.)
    this.logger.log(`Sending success notification for NIN: ${event.nin}`);
    
    // Example: Send to notification service
    // await this.notificationService.send({
    //   type: 'nin_verification_success',
    //   userId: event.userId,
    //   data: { nin: event.nin, verificationId: event.verificationId }
    // });
  }

  private async sendFailureNotification(event: NinVerificationFailedEvent) {
    // Implement failure notification logic
    this.logger.log(`Sending failure notification for NIN: ${event.nin}`);
    
    // Example: Send to notification service
    // await this.notificationService.send({
    //   type: 'nin_verification_failed',
    //   userId: event.userId,
    //   data: { nin: event.nin, error: event.error, attempt: event.attempt }
    // });
  }

  private async updateUserProfile(userId: string, verificationData: any) {
    // Update user profile with verified NIN data
    this.logger.log(`Updating user profile for user: ${userId}`);
    
    // Example: Update user service
    // await this.userService.updateProfile(userId, {
    //   firstName: verificationData.firstName,
    //   lastName: verificationData.lastName,
    //   dateOfBirth: verificationData.dateOfBirth,
    //   isNinVerified: true,
    //   ninVerificationDate: new Date(),
    // });
  }

  private async logDataChange(event: NinDataUpdatedEvent) {
    // Log data changes for compliance and audit
    this.logger.log(`Logging data change for NIN: ${event.nin}`);
    
    // Example: Log to audit service
    // await this.auditService.log({
    //   action: 'nin_data_updated',
    //   entityId: event.nin,
    //   userId: event.userId,
    //   previousData: event.previousData,
    //   newData: event.newData,
    //   timestamp: event.timestamp,
    // });
  }

  private async validateDataIntegrity(nin: string, data: any) {
    // Validate data integrity and consistency
    this.logger.log(`Validating data integrity for NIN: ${nin}`);
    
    // Example validation checks
    if (data.nin && data.nin !== nin) {
      throw new Error('NIN mismatch in verification data');
    }
    
    if (data.dateOfBirth) {
      const birthDate = new Date(data.dateOfBirth);
      const now = new Date();
      if (birthDate > now) {
        this.emitSuspiciousActivity(nin, 'Future birth date detected', { dateOfBirth: data.dateOfBirth });
      }
    }
  }

  private async notifyDataUpdate(event: NinDataUpdatedEvent) {
    // Notify external systems about data updates
    this.logger.log(`Notifying external systems about data update for NIN: ${event.nin}`);
    
    // Example: Notify external services
    // await this.webhookService.notify('nin_data_updated', event);
  }

  private async logSecurityEvent(event: any) {
    // Log security events to security information system
    this.logger.warn(`Logging security event: ${JSON.stringify(event)}`);
    
    // Example: Log to security service
    // await this.securityService.logEvent({
    //   type: 'nin_suspicious_activity',
    //   nin: event.nin,
    //   reason: event.reason,
    //   metadata: event.metadata,
    //   timestamp: event.timestamp,
    // });
  }

  private shouldBlockNin(event: any): boolean {
    // Determine if NIN should be temporarily blocked
    const suspiciousReasons = [
      'Multiple verification failures',
      'Rapid repeated attempts',
      'Invalid data patterns',
    ];
    
    return suspiciousReasons.includes(event.reason);
  }

  private async temporarilyBlockNin(nin: string, reason: string) {
    // Temporarily block NIN verification
    this.logger.warn(`Temporarily blocking NIN: ${nin} - Reason: ${reason}`);
    
    // Example: Add to blocked list with expiry
    // await this.cacheService.set(
    //   `blocked_nin:${nin}`,
    //   { reason, blockedAt: new Date() },
    //   60 * 60 * 24 // 24 hours
    // );
  }

  private async sendSecurityAlert(event: any) {
    // Send security alert to administrators
    this.logger.warn(`Sending security alert for NIN: ${event.nin}`);
    
    // Example: Send to alert service
    // await this.alertService.send({
    //   type: 'security_alert',
    //   severity: 'medium',
    //   title: 'Suspicious NIN Verification Activity',
    //   message: `Suspicious activity detected for NIN: ${event.nin}`,
    //   data: event,
    // });
  }

  private async logRateLimitViolation(event: any) {
    // Log rate limit violations
    this.logger.error(`Logging rate limit violation: ${JSON.stringify(event)}`);
    
    // Example: Log to monitoring service
    // await this.monitoringService.logMetric('nin_rate_limit_exceeded', 1, {
    //   identifier: event.identifier,
    //   limit: event.limit,
    //   timeWindow: event.timeWindow,
    // });
  }

  private async sendRateLimitNotification(event: any) {
    // Send rate limit notification
    this.logger.error(`Sending rate limit notification: ${event.identifier}`);
    
    // Example: Send to notification service
    // await this.notificationService.send({
    //   type: 'rate_limit_exceeded',
    //   identifier: event.identifier,
    //   message: `Rate limit of ${event.limit} requests per ${event.timeWindow} exceeded`,
    // });
  }

  // Public utility methods for other services to use
  async isNinBlocked(nin: string): Promise<boolean> {
    // Check if NIN is temporarily blocked
    // return await this.cacheService.exists(`blocked_nin:${nin}`);
    return false; // Placeholder
  }



  async handleVerificationStarted(event: NinVerificationStartedEvent) {
    try {
      // Log the verification attempt
      this.logger.log(`Handling verification started event for NIN: ${event.nin}`);
      
      // You can add additional logic here like:
      // - Sending notifications
      // - Updating analytics
      // - Logging to external systems
      
      // Create or update verification record with pending status
      await this.createOrUpdateVerificationRecord(event.nin, {
        verificationStatus: VerificationStatus.PENDING,
        userId: event.userId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
      });

    } catch (error) {
      this.logger.error(`Error handling verification started event: ${error.message}`);
    }
  }

  @OnEvent(NIN_EVENTS.VERIFICATION_COMPLETED)
  async handleVerificationCompleted(event: NinVerificationCompletedEvent) {

    try {
      this.logger.log(`Handling verification completed event for NIN: ${event.nin}`);

      // Update the verification record with completed data
      await this.updateVerificationRecord(event.nin, {
        verificationStatus: event.status,
        verificationMethod: event.method as VerificationMethod,
        verificationId: event.verificationId,
        verificationDate: event.timestamp,
        rawData: event.data,
        metadata: event.metadata,
      });

      // Send success notification if needed
      if (event.status === VerificationStatus.VERIFIED) {
        await this.sendSuccessNotification(event);
      }

      // Update user profile if applicable
      if (event.userId && event.status === VerificationStatus.VERIFIED) {
        await this.updateUserProfile(event.userId, event.data);
      }

    } catch (error) {
      this.logger.error(`Error handling verification completed event: ${error.message}`);
    }
  }

}