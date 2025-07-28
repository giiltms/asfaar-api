import { EmailProvider, SendEmailOptions } from '../interfaces/email.interface';

export class SendGridEmailProvider implements EmailProvider {
  constructor(private readonly config: any) {}

  async sendEmail(options: SendEmailOptions): Promise<void> {
    // SendGrid implementation would go here
    // This is a placeholder implementation
    const sendGridPayload = {
      from: {
        email: this.config.MAIL_FROM_EMAIL,
        name: this.config.MAIL_FROM_NAME,
      },
      personalizations: [{
        to: this.formatRecipients(options.to),
        ...(options.cc && { cc: this.formatRecipients(options.cc) }),
        ...(options.bcc && { bcc: this.formatRecipients(options.bcc) }),
        subject: options.subject,
      }],
      content: [
        ...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
        ...(options.html ? [{ type: 'text/html', value: options.html }] : []),
      ],
    };

    // In a real implementation, you would use the SendGrid SDK here
    console.log('Would send via SendGrid:', sendGridPayload);
  }

  async healthCheck(): Promise<boolean> {
    try {
      // In a real implementation, you would check SendGrid API connectivity
      return true;
    } catch {
      return false;
    }
  }

  private formatRecipients(recipients: string | string[]): any[] {
    const emails = Array.isArray(recipients) ? recipients : [recipients];
    return emails.map(email => ({ email }));
  }
} 