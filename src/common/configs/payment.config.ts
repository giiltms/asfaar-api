import { registerAs } from '@nestjs/config';
import {
  IsEnum,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { validateConfig } from '../utils/validate-config';

export enum PaymentProvider {
  FLUTTERWAVE = 'flutterwave',
  PAYSTACK = 'paystack',
  FINCRA = 'fincra',
  STRIPE = 'stripe',
  PAYPAL = 'paypal',
}

class PaymentConfig {
  @IsEnum(PaymentProvider)
  PAYMENT_PROVIDER: PaymentProvider;

  @IsString()
  @IsOptional()
  PAYMENT_WEBHOOK_SECRET?: string;

  @IsString()
  @IsOptional()
  PAYMENT_CALLBACK_URL?: string;

  @IsString()
  @IsOptional()
  PAYMENT_CANCEL_URL?: string;

  @IsBoolean()
  @IsOptional()
  PAYMENT_SANDBOX_MODE?: boolean;

  // Flutterwave Configuration
  @IsString()
  @IsOptional()
  FLUTTERWAVE_PUBLIC_KEY?: string;

  @IsString()
  @IsOptional()
  FLUTTERWAVE_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  FLUTTERWAVE_ENCRYPTION_KEY?: string;

  @IsString()
  @IsOptional()
  FLUTTERWAVE_WEBHOOK_SECRET?: string;

  // Paystack Configuration
  @IsString()
  @IsOptional()
  PAYSTACK_PUBLIC_KEY?: string;

  @IsString()
  @IsOptional()
  PAYSTACK_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  PAYSTACK_WEBHOOK_SECRET?: string;

  // Fincra Configuration
  @IsString()
  @IsOptional()
  FINCRA_PUBLIC_KEY?: string;

  @IsString()
  @IsOptional()
  FINCRA_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  FINCRA_MERCHANT_ID?: string;

  @IsString()
  @IsOptional()
  FINCRA_WEBHOOK_SECRET?: string;

  // Stripe Configuration
  @IsString()
  @IsOptional()
  STRIPE_PUBLISHABLE_KEY?: string;

  @IsString()
  @IsOptional()
  STRIPE_SECRET_KEY?: string;

  @IsString()
  @IsOptional()
  STRIPE_WEBHOOK_SECRET?: string;

  // PayPal Configuration
  @IsString()
  @IsOptional()
  PAYPAL_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  PAYPAL_CLIENT_SECRET?: string;

  @IsString()
  @IsOptional()
  PAYPAL_WEBHOOK_SECRET?: string;

  // Transaction settings
  @IsNumber()
  @IsOptional()
  PAYMENT_TIMEOUT_MINUTES?: number;

  @IsNumber()
  @IsOptional()
  PAYMENT_MAX_AMOUNT?: number;

  @IsNumber()
  @IsOptional()
  PAYMENT_MIN_AMOUNT?: number;
}

export default registerAs('payment', () => {
  const config = {
    PAYMENT_PROVIDER:
      (process.env.PAYMENT_PROVIDER as PaymentProvider) ||
      PaymentProvider.PAYSTACK,
    PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET,
    PAYMENT_CALLBACK_URL:
      process.env.PAYMENT_CALLBACK_URL ||
      'http://localhost:3000/payments/callback',
    PAYMENT_CANCEL_URL:
      process.env.PAYMENT_CANCEL_URL || 'http://localhost:3000/payments/cancel',
    PAYMENT_SANDBOX_MODE: process.env.PAYMENT_SANDBOX_MODE === 'true',

    // Flutterwave
    FLUTTERWAVE_PUBLIC_KEY: process.env.FLUTTERWAVE_PUBLIC_KEY,
    FLUTTERWAVE_SECRET_KEY: process.env.FLUTTERWAVE_SECRET_KEY,
    FLUTTERWAVE_ENCRYPTION_KEY: process.env.FLUTTERWAVE_ENCRYPTION_KEY,
    FLUTTERWAVE_WEBHOOK_SECRET: process.env.FLUTTERWAVE_WEBHOOK_SECRET,

    // Paystack
    PAYSTACK_PUBLIC_KEY: process.env.PAYSTACK_PUBLIC_KEY,
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
    PAYSTACK_WEBHOOK_SECRET: process.env.PAYSTACK_WEBHOOK_SECRET,

    // Fincra
    FINCRA_PUBLIC_KEY: process.env.FINCRA_PUBLIC_KEY,
    FINCRA_SECRET_KEY: process.env.FINCRA_SECRET_KEY,
    FINCRA_MERCHANT_ID: process.env.FINCRA_MERCHANT_ID,
    FINCRA_WEBHOOK_SECRET: process.env.FINCRA_WEBHOOK_SECRET,

    // Stripe
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,

    // PayPal
    PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
    PAYPAL_WEBHOOK_SECRET: process.env.PAYPAL_WEBHOOK_SECRET,

    // Settings
    PAYMENT_TIMEOUT_MINUTES:
      parseInt(process.env.PAYMENT_TIMEOUT_MINUTES) || 30,
    PAYMENT_MAX_AMOUNT: parseInt(process.env.PAYMENT_MAX_AMOUNT) || 10000000, // 100,000.00
    PAYMENT_MIN_AMOUNT: parseInt(process.env.PAYMENT_MIN_AMOUNT) || 100, // 1.00
  };

  // Return the config directly without validation for now to avoid async issues
  return config;
});
