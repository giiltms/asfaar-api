import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsNumber,
  IsNotEmpty,
  IsEmail,
} from 'class-validator';
import { ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentStatus } from '@prisma/client';

export class WebhookPayloadDto {
  @ApiProperty({
    description: 'Webhook event type',
    example: 'charge.success',
  })
  @IsString()
  event: string;

  @ApiProperty({
    description: 'Webhook data payload',
    example: { id: 'tx_123', status: 'success', amount: 5000 },
  })
  @IsObject()
  data: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Transaction reference',
    example: 'ref_123456789',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({
    description: 'Webhook timestamp',
    example: '2023-12-01T10:30:00Z',
  })
  @IsOptional()
  @IsString()
  timestamp?: string;

  @ApiPropertyOptional({
    description: 'Webhook signature/hash',
    example: 'sha256_hash_value',
  })
  @IsOptional()
  @IsString()
  signature?: string;
}

/**
 * Flutterwave Webhook DTO based on official documentation
 *
 * Flutterwave webhook payloads follow this structure:
 * - data: Object containing transaction details (id, status, payment details, customer details)
 * - type: Event type (e.g., charge.completed, charge.failed)
 * - id: Webhook ID (e.g., wbk_W5p6ktwU0jQ8RO4By860)
 * - timestamp: Unix timestamp (e.g., 1735116884019)
 */
export class FlutterwaveWebhookDto {
  @ApiProperty({
    description: 'Event type describing the webhook event',
    example: 'charge.completed',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    description: 'Transaction data containing event details',
    example: {
      id: 'chg_Hq4oBRTJ4r',
      status: 'succeeded',
      amount: 2500,
      currency: 'NGN',
      reference: 'ref_123456',
      customer: {
        id: 'cus_123',
        email: 'user@example.com',
      },
    },
    required: true,
  })
  @IsObject()
  @ValidateNested()
  @Type(() => FlutterwaveTransactionData)
  data: FlutterwaveTransactionData;

  @ApiProperty({
    description: 'Webhook ID for tracking',
    example: 'wbk_W5p6ktwU0jQ8RO4By860',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Unix timestamp when the webhook was sent',
    example: 1735116884019,
    required: true,
  })
  @IsNumber()
  timestamp: number;
}

/**
 * Flutterwave transaction data structure
 */
export class FlutterwaveTransactionData {
  @ApiProperty({
    description: 'Transaction ID from Flutterwave',
    example: 'chg_Hq4oBRTJ4r',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({
    description: 'Transaction status',
    example: 'succeeded',
    required: true,
  })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiPropertyOptional({
    description: 'Transaction amount',
    example: 2500,
  })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Transaction currency',
    example: 'NGN',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Transaction reference',
    example: 'ref_123456',
  })
  @IsOptional()
  @IsString()
  reference?: string;

  @ApiPropertyOptional({
    description: 'Customer information',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => FlutterwaveCustomer)
  customer?: FlutterwaveCustomer;

  @ApiPropertyOptional({
    description: 'Payment method details',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  payment_method?: any;

  @ApiPropertyOptional({
    description: 'Additional transaction metadata',
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  // Allow additional properties as Flutterwave may add new fields
  [key: string]: any;
}

/**
 * Flutterwave customer information
 */
export class FlutterwaveCustomer {
  @ApiPropertyOptional({
    description: 'Customer ID',
    example: 'cus_123',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({
    description: 'Customer email',
    example: 'user@example.com',
  })
  @IsOptional()
  @IsString()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    description: 'Customer name',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Customer phone number',
    example: '+2348012345678',
  })
  @IsOptional()
  @IsString()
  phone_number?: string;

  // Allow additional customer properties
  [key: string]: any;
}

export class PaystackWebhookDto {
  @ApiProperty({ example: 'charge.success' })
  @IsString()
  event: string;

  @ApiProperty({
    description: 'Paystack transaction data',
    example: {
      id: 1234567890,
      reference: 'ref_123456789',
      status: 'success',
      amount: 500000,
      currency: 'NGN',
    },
  })
  @IsObject()
  data: Record<string, any>;
}

export class StripeWebhookDto {
  @ApiProperty({ example: 'payment_intent.succeeded' })
  @IsString()
  type: string;

  @ApiProperty({
    description: 'Stripe event data',
    example: {
      id: 'pi_123456789',
      object: 'payment_intent',
      status: 'succeeded',
      amount: 5000,
      currency: 'usd',
    },
  })
  @IsObject()
  data: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Stripe webhook ID',
    example: 'evt_123456789',
  })
  @IsOptional()
  @IsString()
  id?: string;
}

export class FincraWebhookDto {
  @ApiProperty({ example: 'payment.successful' })
  @IsString()
  event: string;

  @ApiProperty({
    description: 'Fincra transaction data',
    example: {
      id: 'payment_123456789',
      reference: 'ref_123456789',
      status: 'successful',
      amount: '5000.00',
      currency: 'NGN',
    },
  })
  @IsObject()
  data: Record<string, any>;
}

export class WebhookResponseDto {
  @ApiProperty({
    description: 'Whether webhook processing was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Webhook processed successfully',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Event type that was processed',
    example: 'payment.success',
  })
  eventType?: string;

  @ApiPropertyOptional({
    description: 'Transaction reference',
    example: 'ref_123456789',
  })
  reference?: string;

  @ApiPropertyOptional({
    description: 'Processing timestamp',
    example: '2023-12-01T10:30:00Z',
  })
  timestamp?: string;
}
