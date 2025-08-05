import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './services/mail.service';
import { MailController } from './controllers/mail.controller';
import { join } from 'path';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const mailConfig = configService.get('mail');

        return {
          transport: {
            host: mailConfig?.SMTP_HOST || 'localhost',
            port: mailConfig?.SMTP_PORT || 587,
            secure: mailConfig?.SMTP_SECURE || false,
            auth: {
              user: mailConfig?.SMTP_USER,
              pass: mailConfig?.SMTP_PASS,
            },
          },
          defaults: {
            from: `${mailConfig?.MAIL_FROM_NAME || 'Asfaar Visa Services'} <${mailConfig?.MAIL_FROM_EMAIL || 'noreply@asfaarvisaservices.com'}>`,
          },
          template: {
            dir: join(__dirname, 'templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
