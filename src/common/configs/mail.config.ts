import { registerAs } from '@nestjs/config';
import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export enum MailProvider {
  SMTP = 'smtp',
  MAILJET = 'mailjet',
  SENDGRID = 'sendgrid',
  SES = 'ses',
}

class MailConfigValidation {
  @IsEnum(MailProvider)
  @IsOptional()
  MAIL_PROVIDER: MailProvider = MailProvider.SMTP;

  @IsString()
  @IsOptional()
  MAIL_FROM_NAME: string = 'NestJS Boilerplate';

  @IsString()
  @IsOptional()
  MAIL_FROM_EMAIL: string = 'noreply@example.com';

  // SMTP Configuration
  @IsString()
  @IsOptional()
  SMTP_HOST: string = 'localhost';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  SMTP_PORT: number = 587;

  @IsString()
  @IsOptional()
  SMTP_USER: string;

  @IsString()
  @IsOptional()
  SMTP_PASS: string;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  SMTP_SECURE: boolean = false;

  // Mailjet Configuration
  @IsString()
  @IsOptional()
  MAILJET_API_KEY: string;

  @IsString()
  @IsOptional()
  MAILJET_API_SECRET: string;

  // SendGrid Configuration
  @IsString()
  @IsOptional()
  SENDGRID_API_KEY: string;

  // AWS SES Configuration
  @IsString()
  @IsOptional()
  AWS_SES_REGION: string = 'us-east-1';

  @IsString()
  @IsOptional()
  AWS_SES_ACCESS_KEY_ID: string;

  @IsString()
  @IsOptional()
  AWS_SES_SECRET_ACCESS_KEY: string;
}

export default registerAs('mail', (): MailConfigValidation => {
  const config = new MailConfigValidation();

  config.MAIL_PROVIDER = process.env.MAIL_PROVIDER as MailProvider || MailProvider.SMTP;
  config.MAIL_FROM_NAME = process.env.MAIL_FROM_NAME || 'NestJS Boilerplate';
  config.MAIL_FROM_EMAIL = process.env.MAIL_FROM_EMAIL || 'noreply@example.com';

  // SMTP
  config.SMTP_HOST = process.env.SMTP_HOST || 'localhost';
  config.SMTP_PORT = parseInt(process.env.SMTP_PORT, 10) || 587;
  config.SMTP_USER = process.env.SMTP_USER;
  config.SMTP_PASS = process.env.SMTP_PASS;
  config.SMTP_SECURE = process.env.SMTP_SECURE === 'true';

  // Mailjet
  config.MAILJET_API_KEY = process.env.MAILJET_API_KEY;
  config.MAILJET_API_SECRET = process.env.MAILJET_API_SECRET;

  // SendGrid
  config.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

  // AWS SES
  config.AWS_SES_REGION = process.env.AWS_SES_REGION || 'us-east-1';
  config.AWS_SES_ACCESS_KEY_ID = process.env.AWS_SES_ACCESS_KEY_ID;
  config.AWS_SES_SECRET_ACCESS_KEY = process.env.AWS_SES_SECRET_ACCESS_KEY;

  return config;
}); 