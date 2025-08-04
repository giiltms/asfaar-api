import { OnEvent } from '@nestjs/event-emitter';
import { Injectable, Logger } from '@nestjs/common';
import {
  NinVerification,
  VerificationStatus,
  VerificationMethod,
} from '@prisma/client';

export class NinVerificationEvent {
  constructor(
    public readonly verification: NinVerification,
    public readonly context?: any,
  ) {}
}

@Injectable()
export class NinEventHandler {
  private readonly logger = new Logger(NinEventHandler.name);

  @OnEvent('nin.verification.completed')
  handleVerificationCompleted(event: NinVerificationEvent) {
    this.logger.log(
      `NIN verification completed for: ${event.verification.nin}`,
    );

    // Add any post-verification logic here
    // e.g., update user profile, send notifications, etc.
  }

  @OnEvent('nin.verification.failed')
  handleVerificationFailed(event: NinVerificationEvent) {
    this.logger.error(
      `NIN verification failed for: ${event.verification.nin}`,
    );

    // Add failure handling logic here
    // e.g., log failed attempts, send alerts, etc.
  }

  @OnEvent('nin.verification.updated')
  handleVerificationUpdated(event: NinVerificationEvent) {
    this.logger.log(
      `NIN verification updated for: ${event.verification.nin}`,
    );

    // Add update handling logic here
  }
}
