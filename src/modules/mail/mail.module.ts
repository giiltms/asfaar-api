import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './services/mail.service';
import { join } from 'path';
import * as Handlebars from 'handlebars';

// Register Handlebars helpers
Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
Handlebars.registerHelper('lt', (a: any, b: any) => a < b);
Handlebars.registerHelper('gt', (a: any, b: any) => a > b);
Handlebars.registerHelper('lte', (a: any, b: any) => a <= b);
Handlebars.registerHelper('gte', (a: any, b: any) => a >= b);
Handlebars.registerHelper('and', (...args: any[]) =>
  args.slice(0, -1).every(Boolean),
);
Handlebars.registerHelper('or', (...args: any[]) =>
  args.slice(0, -1).some(Boolean),
);
Handlebars.registerHelper('not', (v: any) => !v);
Handlebars.registerHelper('formatDate', (date: any) => {
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    } as Intl.DateTimeFormatOptions);
  } catch {
    return String(date ?? '');
  }
});

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const mailConfig = configService.get('mail');
        const appConfig = configService.get('app');

        // Enable debug logging only when log level is debug
        const isDebugMode = appConfig?.LOG_LEVEL === 'debug';

        return {
          transport: {
            host: mailConfig?.SMTP_HOST || 'localhost',
            port: mailConfig?.SMTP_PORT || 587,
            secure: mailConfig?.SMTP_SECURE || false,
            logger: isDebugMode,
            debug: isDebugMode,
            tls: {
              rejectUnauthorized: true,
              minVersion: 'TLSv1.2',
            },
            auth: {
              user: mailConfig?.SMTP_USER,
              pass: mailConfig?.SMTP_PASS,
            },
          },
          defaults: {
            from: `${mailConfig?.MAIL_FROM_NAME || 'Asfaar Visa Services'} <${
              mailConfig?.MAIL_FROM_EMAIL || 'noreply@asfaarvisaservices.com'
            }>`,
          },
          template: {
            dir: join(__dirname, 'templates'),
            adapter: new HandlebarsAdapter(undefined, {
              inlineCssEnabled: true,
            }),
            options: {
              strict: true,
            },
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
