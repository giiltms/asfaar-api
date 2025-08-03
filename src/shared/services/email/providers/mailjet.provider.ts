import { EmailProvider, SendEmailOptions } from '../interfaces/email.interface';

export class MailjetEmailProvider implements EmailProvider {
  constructor(private readonly config: any) {}

  async sendEmail(options: SendEmailOptions): Promise<void> {
    // Mailjet implementation would go here
    // This is a placeholder implementation
    const mailjetPayload = {
      Messages: [
        {
          From: {
            Email: this.config.MAIL_FROM_EMAIL,
            Name: this.config.MAIL_FROM_NAME,
          },
          To: this.formatRecipients(options.to),
          Subject: options.subject,
          TextPart: options.text,
          HTMLPart: options.html,
          ...(options.cc && { Cc: this.formatRecipients(options.cc) }),
          ...(options.bcc && { Bcc: this.formatRecipients(options.bcc) }),
        },
      ],
    };

    // In a real implementation, you would use the Mailjet SDK here
    console.log('Would send via Mailjet:', mailjetPayload);
  }

  async healthCheck(): Promise<boolean> {
    try {
      // In a real implementation, you would check Mailjet API connectivity
      return true;
    } catch {
      return false;
    }
  }

  private formatRecipients(recipients: string | string[]): any[] {
    const emails = Array.isArray(recipients) ? recipients : [recipients];
    return emails.map((email) => ({ Email: email }));
  }
}
