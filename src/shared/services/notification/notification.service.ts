import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface NotificationData {
  userId?: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: Record<string, any>;
  channels?: NotificationChannel[];
}

export enum NotificationType {
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
}

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  /**
   * Send notification through specified channels
   */
  async sendNotification(data: NotificationData): Promise<void> {
    try {
      this.logger.log(`Sending notification: ${data.title}`);

      // Emit events for each notification channel
      const channels = data.channels || [NotificationChannel.IN_APP];

      for (const channel of channels) {
        await this.eventEmitter.emitAsync(`notification.${channel}`, data);
      }

      this.logger.log(`Notification sent successfully: ${data.title}`);
    } catch (error) {
      this.logger.error(`Failed to send notification: ${data.title}`, error);
      throw error;
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(
    data: Omit<NotificationData, 'channels'>,
  ): Promise<void> {
    return this.sendNotification({
      ...data,
      channels: [NotificationChannel.EMAIL],
    });
  }

  /**
   * Send SMS notification
   */
  async sendSmsNotification(
    data: Omit<NotificationData, 'channels'>,
  ): Promise<void> {
    return this.sendNotification({
      ...data,
      channels: [NotificationChannel.SMS],
    });
  }

  /**
   * Send push notification
   */
  async sendPushNotification(
    data: Omit<NotificationData, 'channels'>,
  ): Promise<void> {
    return this.sendNotification({
      ...data,
      channels: [NotificationChannel.PUSH],
    });
  }

  /**
   * Send in-app notification
   */
  async sendInAppNotification(
    data: Omit<NotificationData, 'channels'>,
  ): Promise<void> {
    return this.sendNotification({
      ...data,
      channels: [NotificationChannel.IN_APP],
    });
  }

  /**
   * Send welcome notification to new users
   */
  async sendWelcomeNotification(
    userId: string,
    userName: string,
  ): Promise<void> {
    return this.sendNotification({
      userId,
      title: 'Welcome!',
      message: `Welcome to our platform, ${userName}! We're excited to have you on board.`,
      type: NotificationType.SUCCESS,
      channels: [NotificationChannel.EMAIL, NotificationChannel.IN_APP],
      data: { userName },
    });
  }

  /**
   * Send password reset notification
   */
  async sendPasswordResetNotification(
    userId: string,
    resetUrl: string,
  ): Promise<void> {
    return this.sendNotification({
      userId,
      title: 'Password Reset',
      message:
        'You requested a password reset. Click the link in your email to reset your password.',
      type: NotificationType.INFO,
      channels: [NotificationChannel.EMAIL],
      data: { resetUrl },
    });
  }

  /**
   * Send security alert notification
   */
  async sendSecurityAlert(
    userId: string,
    alertType: string,
    details: string,
  ): Promise<void> {
    return this.sendNotification({
      userId,
      title: 'Security Alert',
      message: `Security alert: ${alertType}. ${details}`,
      type: NotificationType.WARNING,
      channels: [
        NotificationChannel.EMAIL,
        NotificationChannel.SMS,
        NotificationChannel.IN_APP,
      ],
      data: { alertType, details },
    });
  }

  /**
   * Broadcast notification to all users
   */
  async broadcastNotification(
    data: Omit<NotificationData, 'userId'>,
  ): Promise<void> {
    return this.sendNotification({
      ...data,
      title: `[Broadcast] ${data.title}`,
    });
  }
}
