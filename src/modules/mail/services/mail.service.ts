import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

export interface PaymentConfirmationData {
  userName: string;
  userEmail: string;
  referenceNumber: string;
  paymentReference: string;
  transactionId: string;
  amount: number;
  currency: string;
  paymentDate: string;
  applicationId: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  async sendRegisterationConfirmation(email: string, data: any): Promise<void> {
    const siteUrl = this.configService.get('SITE_URL', 'http://localhost:3000');
    const contactEmail = this.configService.get(
      'CONTACT_EMAIL',
      'contact@example.com',
    );

    await this.mailerService.sendMail({
      to: email,
      subject: 'Registration Confirmation',
      template: 'registeration-confirmation',
      context: {
        ...data,
        siteUrl,
        contactEmail,
      },
    });
  }

  async sendWelcomeEmail(email: string, data: any): Promise<void> {
    const siteUrl = this.configService.get('SITE_URL', 'http://localhost:3000');

    await this.mailerService.sendMail({
      to: email,
      subject: 'Welcome!',
      template: 'welcome-email',
      context: {
        ...data,
        siteUrl,
      },
    });
  }

  async sendPasswordResetEmail(
    email: string,
    resetToken: string,
  ): Promise<void> {
    const siteUrl = this.configService.get('SITE_URL', 'http://localhost:3000');

    await this.mailerService.sendMail({
      to: email,
      subject: 'Password Reset Request',
      template: 'request-reset-password',
      context: {
        resetToken,
        siteUrl,
        resetUrl: `${siteUrl}/reset-password?token=${resetToken}`,
      },
    });
  }

  async sendEmailVerification(
    email: string,
    userName: string,
    verificationToken: string,
  ): Promise<void> {
    try {
      // This is the link to the frontend
      const siteUrl = this.configService.get(
        'SITE_URL',
        'http://localhost:3000',
      );
      const verificationLink = `${siteUrl}/verification/verify-email?token=${verificationToken}`;

      await this.mailerService.sendMail({
        to: email,
        subject: 'Verify Your Email Address - Asfaar Visa Services',
        template: 'email-verification',
        context: {
          userName,
          verificationLink,
        },
      });

      this.logger.debug(`Email verification sent successfully to: ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email verification to ${email}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendPaymentConfirmation(data: PaymentConfirmationData): Promise<void> {
    try {
      const dashboardUrl = this.configService.get(
        'SITE_URL',
        'http://localhost:3000',
      );

      await this.mailerService.sendMail({
        to: data.userEmail,
        subject: 'Payment Confirmation - Asfaar Visa Services',
        template: 'paymentconfirmation',
        context: {
          userName: data.userName,
          referenceNumber: data.referenceNumber,
          paymentReference: data.paymentReference,
          transactionId: data.transactionId,
          amount: data.amount,
          currency: data.currency,
          paymentDate: data.paymentDate,
          applicationId: data.applicationId,
          dashboardUrl,
        },
      });

      this.logger.log(
        `Payment confirmation email sent successfully to: ${data.userEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send payment confirmation email to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }
}
