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
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get('MAIL_HOST', 'localhost'),
          port: parseInt(configService.get('MAIL_PORT', '587')),
          secure: configService.get('MAIL_SECURE', 'false') === 'true',
          auth: {
            user: configService.get('MAIL_USER', ''),
            pass: configService.get('MAIL_PASSWORD', ''),
          },
        },
        defaults: {
          from: configService.get('MAIL_FROM', 'noreply@example.com'),
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [MailController],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
