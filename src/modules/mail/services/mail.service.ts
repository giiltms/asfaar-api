import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

/**
 * Shared shape for biometric appointment mail.
 *
 * Unlike the older notification payloads, this carries an explicit recipient
 * list so the managing travel agent is copied alongside the applicant. Every
 * field is required because the Handlebars adapter runs in strict mode - a
 * missing key throws at render time rather than rendering blank.
 */
export interface BiometricAppointmentMailData {
  /** Applicant - the primary recipient. */
  to: string;
  /** Managing travel agent, when the application was filed by one. */
  cc: string[];
  applicantName: string;
  agentName: string;
  referenceNumber: string;
  centerName: string;
  centerAddress: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentClass: string;
  /** Prior date, on a reschedule. Empty string otherwise. */
  previousAppointmentDate: string;
  /** Reschedule or cancellation reason. Empty string when none was given. */
  reason: string;
}

export interface PaymentConfirmationData {
  /**
   * Managing travel agent, copied on this applicant's lifecycle mail.
   * Absent when the application was not filed by an agent.
   */
  cc?: string[];
  agentName?: string;
  userName: string;
  userEmail: string;
  referenceNumber: string;
  paymentReference: string;
  transactionId: string;
  amount: number;
  currency: string;
  paymentDate: string;
  applicationId: string;
  paymentType?: string; // 'ONBOARDING', 'APPLICATION', 'UPGRADE', etc.
}

export interface EmbassySubmissionData {
  /**
   * Managing travel agent, copied on this applicant's lifecycle mail.
   * Absent when the application was not filed by an agent.
   */
  cc?: string[];
  agentName?: string;
  userName: string;
  userEmail: string;
  referenceNumber: string;
  embassyName: string;
  submissionDate: string;
}

export interface BiometricCaptureData {
  /**
   * Managing travel agent, copied on this applicant's lifecycle mail.
   * Absent when the application was not filed by an agent.
   */
  cc?: string[];
  agentName?: string;
  userName: string;
  userEmail: string;
  referenceNumber: string;
  centerName: string;
  captureDate: string;
}

export interface ApplicationQueryData {
  /**
   * Managing travel agent, copied on this applicant's lifecycle mail.
   * Absent when the application was not filed by an agent.
   */
  cc?: string[];
  agentName?: string;
  userName: string;
  userEmail: string;
  referenceNumber: string;
  queryMessage: string;
  requiredDocuments?: string[];
  queryDate: string;
  applicationUrl: string;
}

export interface ApplicationDecisionData {
  /**
   * Managing travel agent, copied on this applicant's lifecycle mail.
   * Absent when the application was not filed by an agent.
   */
  cc?: string[];
  agentName?: string;
  userName: string;
  userEmail: string;
  referenceNumber: string;
  embassyName: string;
  decision: 'APPROVED' | 'REJECTED';
  decisionDate: string;
  reason?: string;
}

export interface TravelAgentUpgradePaymentData {
  userEmail: string;
  userFullName: string;
  applicationId: string;
  applicationType: string;
  companyName: string;
  paymentAmount: number;
  paymentCurrency: string;
  paymentReference: string;
  paymentDate: string;
  reviewTimeline: string;
  supportEmail: string;
  platformName: string;
}

export interface TravelAgentUpgradeDecisionData {
  userEmail: string;
  userFullName: string;
  applicationId: string;
  applicationType: string;
  companyName: string;
  decision: 'APPROVED' | 'REJECTED';
  decisionDate: string;
  reason?: string;
  licenseNumber?: string;
  licenseExpiryDate?: string;
  supportEmail: string;
  platformName: string;
}

export interface LicenseExpirationNotificationData {
  userEmail: string;
  userName: string;
  licenseNumber: string;
  companyName: string;
  daysUntilExpiry: number;
  expiryDate: string;
  urgency: 'URGENT' | 'WARNING' | 'REMINDER';
  subject: string;
}

export interface LicenseIssuedNotificationData {
  userEmail: string;
  userName: string;
  licenseNumber: string;
  companyName: string;
  issuedDate: string;
  expiryDate: string;
  subject: string;
}

export interface LicenseSuspendedNotificationData {
  userEmail: string;
  userName: string;
  licenseNumber: string;
  companyName: string;
  suspendedDate: string;
  suspensionReason: string;
  suspendedBy: string;
  subject: string;
}

export interface LicenseRevokedNotificationData {
  userEmail: string;
  userName: string;
  licenseNumber: string;
  companyName: string;
  revokedDate: string;
  revocationReason: string;
  revokedBy: string;
  subject: string;
}

export interface LicenseReactivatedNotificationData {
  userEmail: string;
  userName: string;
  licenseNumber: string;
  companyName: string;
  reactivatedDate: string;
  reactivationReason: string;
  reactivatedBy: string;
  subject: string;
}

export interface ClientAddedNotificationData {
  userEmail: string;
  userName: string;
  agentName: string;
  companyName: string;
  addedDate: string;
  subject: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * The cc option for a sendMail call, omitted entirely when there is nobody
   * to copy so the header is not emitted empty.
   */
  private ccOption(data: { cc?: string[] }): { cc?: string[] } {
    return data.cc?.length ? { cc: data.cc } : {};
  }

  /**
   * Template context describing the copied agent. Always defined, because the
   * Handlebars adapter runs in strict mode and a missing key throws at render.
   */
  private agentContext(data: { cc?: string[]; agentName?: string }): {
    hasAgent: boolean;
    agentName: string;
  } {
    return {
      hasAgent: !!data.cc?.length,
      agentName: data.agentName || '',
    };
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
    userName?: string,
  ): Promise<void> {
    const siteUrl = this.configService.get('SITE_URL', 'http://localhost:3000');

    await this.mailerService.sendMail({
      to: email,
      subject: 'Password Reset Request',
      template: 'request-reset-password',
      context: {
        userName: userName || 'User',
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
      const amountFormatted = `${data.currency} ${Number(
        data.amount,
      ).toLocaleString()}`;

      // Choose template based on payment type
      const isOnboarding = data.paymentType === 'ONBOARDING';
      const template = isOnboarding
        ? 'onboarding-payment-confirmation'
        : 'application-payment-confirmation';
      const subject = isOnboarding
        ? 'Onboarding Payment Confirmation - Asfaar Visa Services'
        : 'Application Payment Confirmation - Asfaar Visa Services';

      await this.mailerService.sendMail({
        to: data.userEmail,
        ...this.ccOption(data),
        subject,
        template,
        context: {
          ...this.agentContext(data),
          userName: data.userName,
          referenceNumber: data.referenceNumber || 'N/A',
          paymentReference: data.paymentReference,
          transactionId: data.transactionId,
          amountFormatted,
          paymentDate: data.paymentDate,
          applicationId: data.applicationId,
          dashboardUrl,
        },
      });

      this.logger.log(
        `Payment confirmation email sent successfully to: ${data.userEmail} using template: ${template}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send payment confirmation email to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendEmbassySubmissionNotification(
    data: EmbassySubmissionData,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: data.userEmail,
        ...this.ccOption(data),
        subject: 'Application Submitted to Embassy - Asfaar Visa Services',
        template: 'embassysubmission',
        context: {
          ...this.agentContext(data),
          userName: data.userName,
          referenceNumber: data.referenceNumber,
          embassyName: data.embassyName,
          submissionDate: data.submissionDate,
        },
      });

      this.logger.log(
        `Embassy submission notification sent successfully to: ${data.userEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send embassy submission notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendBiometricCaptureNotification(
    data: BiometricCaptureData,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: data.userEmail,
        ...this.ccOption(data),
        subject: 'Biometric Capture Completed - Asfaar Visa Services',
        template: 'biometriccapturing',
        context: {
          ...this.agentContext(data),
          userName: data.userName,
          referenceNumber: data.referenceNumber,
          centerName: data.centerName,
          captureDate: data.captureDate,
        },
      });

      this.logger.log(
        `Biometric capture notification sent successfully to: ${data.userEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send biometric capture notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendApplicationQueryNotification(
    data: ApplicationQueryData,
  ): Promise<void> {
    try {
      const dashboardUrl = this.configService.get(
        'SITE_URL',
        'http://localhost:3000',
      );

      await this.mailerService.sendMail({
        to: data.userEmail,
        ...this.ccOption(data),
        subject: 'Application Query - Action Required - Asfaar Visa Services',
        template: 'applicationquery',
        context: {
          ...this.agentContext(data),
          userName: data.userName,
          referenceNumber: data.referenceNumber,
          queryMessage: data.queryMessage,
          requiredDocuments: data.requiredDocuments || [],
          queryDate: data.queryDate,
          applicationUrl: data.applicationUrl,
          dashboardUrl,
        },
      });

      this.logger.log(
        `Application query notification sent successfully to: ${data.userEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send application query notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendApplicationDecisionNotification(
    data: ApplicationDecisionData,
  ): Promise<void> {
    try {
      const subject =
        data.decision === 'APPROVED'
          ? 'Visa Application Approved - Asfaar Visa Services'
          : 'Visa Application Decision - Asfaar Visa Services';

      await this.mailerService.sendMail({
        to: data.userEmail,
        ...this.ccOption(data),
        subject,
        template: 'applicationdecision',
        context: {
          ...this.agentContext(data),
          userName: data.userName,
          referenceNumber: data.referenceNumber,
          embassyName: data.embassyName,
          decision: data.decision,
          decisionDate: data.decisionDate,
          reason: data.reason,
        },
      });

      this.logger.log(
        `Application decision notification (${data.decision}) sent successfully to: ${data.userEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send application decision notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendTravelAgentUpgradePaymentConfirmation(
    data: TravelAgentUpgradePaymentData,
  ): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to: data.userEmail,
        subject:
          'Travel Agent Upgrade Payment Received - Application Under Review',
        template: 'travel-agent-upgrade-payment-confirmation',
        context: {
          userFullName: data.userFullName,
          applicationId: data.applicationId,
          applicationType: data.applicationType,
          companyName: data.companyName,
          paymentAmount: data.paymentAmount,
          paymentCurrency: data.paymentCurrency,
          paymentReference: data.paymentReference,
          paymentDate: data.paymentDate,
          reviewTimeline: data.reviewTimeline,
          supportEmail: data.supportEmail,
          platformName: data.platformName,
        },
      });

      this.logger.log(
        `Travel agent upgrade payment confirmation email sent to ${data.userEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send travel agent upgrade payment confirmation to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendTravelAgentUpgradeDecisionNotification(
    data: TravelAgentUpgradeDecisionData,
  ): Promise<void> {
    try {
      const subject =
        data.decision === 'APPROVED'
          ? 'Travel Agent Upgrade Application Approved - {{platformName}}'
          : 'Travel Agent Upgrade Application Decision - {{platformName}}';

      await this.mailerService.sendMail({
        to: data.userEmail,
        subject: subject.replace('{{platformName}}', data.platformName),
        template: 'travel-agent-upgrade-decision',
        context: {
          userFullName: data.userFullName,
          applicationId: data.applicationId,
          applicationType: data.applicationType,
          companyName: data.companyName,
          decision: data.decision,
          decisionDate: data.decisionDate,
          reason: data.reason,
          licenseNumber: data.licenseNumber,
          licenseExpiryDate: data.licenseExpiryDate,
          supportEmail: data.supportEmail,
          platformName: data.platformName,
        },
      });

      this.logger.log(
        `Travel agent upgrade decision notification (${data.decision}) sent successfully to: ${data.userEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send travel agent upgrade decision notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendLicenseExpirationNotification(
    data: LicenseExpirationNotificationData,
  ): Promise<void> {
    try {
      const supportEmail = this.configService.get(
        'mail.MAIL_FROM_EMAIL',
        'support@asfaarvisaservices.com',
      );
      const platformName = this.configService.get(
        'app.APP_NAME',
        'Asfaar Visa Services',
      );
      const dashboardUrl = this.configService.get(
        'app.SITE_URL',
        'http://localhost:3000',
      );

      await this.mailerService.sendMail({
        to: data.userEmail,
        subject: data.subject,
        template: 'license-expiration-notification',
        context: {
          subject: data.subject,
          userName: data.userName,
          licenseNumber: data.licenseNumber,
          companyName: data.companyName,
          daysUntilExpiry: data.daysUntilExpiry,
          expiryDate: data.expiryDate,
          urgency: data.urgency,
          supportEmail,
          platformName,
          dashboardUrl,
        },
      });

      this.logger.log(
        `License expiration notification (${data.urgency}) sent successfully to: ${data.userEmail} for license ${data.licenseNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send license expiration notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendLicenseIssuedNotification(
    data: LicenseIssuedNotificationData,
  ): Promise<void> {
    try {
      const supportEmail = this.configService.get(
        'mail.MAIL_FROM_EMAIL',
        'support@asfaarvisaservices.com',
      );
      const platformName = this.configService.get(
        'app.APP_NAME',
        'Asfaar Visa Services',
      );
      const dashboardUrl = this.configService.get(
        'app.SITE_URL',
        'http://localhost:3000',
      );

      await this.mailerService.sendMail({
        to: data.userEmail,
        subject: data.subject,
        template: 'license-issued-notification',
        context: {
          subject: data.subject,
          userName: data.userName,
          licenseNumber: data.licenseNumber,
          companyName: data.companyName,
          issuedDate: data.issuedDate,
          expiryDate: data.expiryDate,
          supportEmail,
          platformName,
          dashboardUrl,
        },
      });

      this.logger.log(
        `License issued notification sent successfully to: ${data.userEmail} for license ${data.licenseNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send license issued notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendLicenseSuspendedNotification(
    data: LicenseSuspendedNotificationData,
  ): Promise<void> {
    try {
      const supportEmail = this.configService.get(
        'mail.MAIL_FROM_EMAIL',
        'support@asfaarvisaservices.com',
      );
      const platformName = this.configService.get(
        'app.APP_NAME',
        'Asfaar Visa Services',
      );
      const dashboardUrl = this.configService.get(
        'app.SITE_URL',
        'http://localhost:3000',
      );

      await this.mailerService.sendMail({
        to: data.userEmail,
        subject: data.subject,
        template: 'license-suspended-notification',
        context: {
          subject: data.subject,
          userName: data.userName,
          licenseNumber: data.licenseNumber,
          companyName: data.companyName,
          suspendedDate: data.suspendedDate,
          suspensionReason: data.suspensionReason,
          suspendedBy: data.suspendedBy,
          supportEmail,
          platformName,
          dashboardUrl,
        },
      });

      this.logger.log(
        `License suspended notification sent successfully to: ${data.userEmail} for license ${data.licenseNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send license suspended notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendLicenseRevokedNotification(
    data: LicenseRevokedNotificationData,
  ): Promise<void> {
    try {
      const supportEmail = this.configService.get(
        'mail.MAIL_FROM_EMAIL',
        'support@asfaarvisaservices.com',
      );
      const platformName = this.configService.get(
        'app.APP_NAME',
        'Asfaar Visa Services',
      );
      const dashboardUrl = this.configService.get(
        'app.SITE_URL',
        'http://localhost:3000',
      );

      await this.mailerService.sendMail({
        to: data.userEmail,
        subject: data.subject,
        template: 'license-revoked-notification',
        context: {
          subject: data.subject,
          userName: data.userName,
          licenseNumber: data.licenseNumber,
          companyName: data.companyName,
          revokedDate: data.revokedDate,
          revocationReason: data.revocationReason,
          revokedBy: data.revokedBy,
          supportEmail,
          platformName,
          dashboardUrl,
        },
      });

      this.logger.log(
        `License revoked notification sent successfully to: ${data.userEmail} for license ${data.licenseNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send license revoked notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendLicenseReactivatedNotification(
    data: LicenseReactivatedNotificationData,
  ): Promise<void> {
    try {
      const supportEmail = this.configService.get(
        'mail.MAIL_FROM_EMAIL',
        'support@asfaarvisaservices.com',
      );
      const platformName = this.configService.get(
        'app.APP_NAME',
        'Asfaar Visa Services',
      );
      const dashboardUrl = this.configService.get(
        'app.SITE_URL',
        'http://localhost:3000',
      );

      await this.mailerService.sendMail({
        to: data.userEmail,
        subject: data.subject,
        template: 'license-reactivated-notification',
        context: {
          subject: data.subject,
          userName: data.userName,
          licenseNumber: data.licenseNumber,
          companyName: data.companyName,
          reactivatedDate: data.reactivatedDate,
          reactivationReason: data.reactivationReason,
          reactivatedBy: data.reactivatedBy,
          supportEmail,
          platformName,
          dashboardUrl,
        },
      });

      this.logger.log(
        `License reactivated notification sent successfully to: ${data.userEmail} for license ${data.licenseNumber}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send license reactivated notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  async sendClientAddedNotification(
    data: ClientAddedNotificationData,
  ): Promise<void> {
    try {
      const supportEmail = this.configService.get(
        'mail.MAIL_FROM_EMAIL',
        'support@asfaarvisaservices.com',
      );
      const platformName = this.configService.get(
        'app.APP_NAME',
        'Asfaar Visa Services',
      );
      const dashboardUrl = this.configService.get(
        'app.SITE_URL',
        'http://localhost:3000',
      );

      await this.mailerService.sendMail({
        to: data.userEmail,
        subject: data.subject,
        template: 'client-added-notification',
        context: {
          subject: data.subject,
          userName: data.userName,
          companyName: data.companyName,
          addedDate: data.addedDate,
          supportEmail,
          platformName,
          dashboardUrl,
        },
      });

      this.logger.log(
        `Client added notification sent successfully to: ${data.userEmail}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send client added notification to ${data.userEmail}:`,
        error.message,
      );
      throw error;
    }
  }

  /**
   * Confirm a biometric appointment to the applicant, copying their travel agent.
   *
   * Sent when the appointment becomes real to the applicant - on activation
   * after payment clears - not at booking time, when it is still PENDING and
   * may never be paid for.
   */
  async sendBiometricAppointmentScheduled(
    data: BiometricAppointmentMailData,
  ): Promise<void> {
    await this.sendBiometricAppointmentMail(
      data,
      'biometric-appointment-scheduled',
      `Biometric Appointment Confirmed - ${data.referenceNumber}`,
    );
  }

  /**
   * Remind the applicant of an upcoming appointment, copying their agent.
   *
   * Sent once per appointment by the reminder job; a reschedule clears the
   * flag so the new date gets its own reminder.
   */
  async sendBiometricAppointmentReminder(
    data: BiometricAppointmentMailData,
  ): Promise<void> {
    await this.sendBiometricAppointmentMail(
      data,
      'biometric-appointment-reminder',
      `Reminder: Biometric Appointment ${data.appointmentDate} - ${data.referenceNumber}`,
    );
  }

  /**
   * Tell the applicant and their travel agent that an appointment moved.
   */
  async sendBiometricAppointmentRescheduled(
    data: BiometricAppointmentMailData,
  ): Promise<void> {
    await this.sendBiometricAppointmentMail(
      data,
      'biometric-appointment-rescheduled',
      `Biometric Appointment Rescheduled - ${data.referenceNumber}`,
    );
  }

  /**
   * Tell the applicant and their travel agent that an appointment was cancelled.
   */
  async sendBiometricAppointmentCancelled(
    data: BiometricAppointmentMailData,
  ): Promise<void> {
    await this.sendBiometricAppointmentMail(
      data,
      'biometric-appointment-cancelled',
      `Biometric Appointment Cancelled - ${data.referenceNumber}`,
    );
  }

  /**
   * Shared dispatch for the three appointment lifecycle mails - they differ
   * only by template and subject.
   */
  private async sendBiometricAppointmentMail(
    data: BiometricAppointmentMailData,
    template: string,
    subject: string,
  ): Promise<void> {
    const dashboardUrl = this.configService.get(
      'SITE_URL',
      'http://localhost:3000',
    );

    try {
      await this.mailerService.sendMail({
        to: data.to,
        ...(data.cc.length > 0 && { cc: data.cc }),
        subject,
        template,
        context: {
          applicantName: data.applicantName,
          agentName: data.agentName,
          hasAgent: data.cc.length > 0,
          referenceNumber: data.referenceNumber,
          centerName: data.centerName,
          centerAddress: data.centerAddress,
          appointmentDate: data.appointmentDate,
          appointmentTime: data.appointmentTime,
          appointmentClass: data.appointmentClass,
          previousAppointmentDate: data.previousAppointmentDate,
          reason: data.reason,
          hasReason: data.reason.length > 0,
          dashboardUrl,
        },
      });

      this.logger.log(
        `${template} sent to ${data.to}${
          data.cc.length > 0 ? ` (cc: ${data.cc.join(', ')})` : ''
        }`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send ${template} to ${data.to}:`,
        error.message,
      );
      throw error;
    }
  }
}
