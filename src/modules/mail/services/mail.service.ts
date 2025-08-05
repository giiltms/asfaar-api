import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly logger: Logger,
  ) {
    this.logger = new Logger(MailService.name);
  }

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
    // This is the link to the frontend
    const siteUrl = this.configService.get('SITE_URL', 'http://localhost:3000');
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
    this.logger.debug('Email verification sent to', email);
  }
}
