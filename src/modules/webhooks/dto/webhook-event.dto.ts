import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsObject,
  IsNumber,
  IsNotEmpty,
  IsEmail,
} from 'class-validator';
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
 * Flutterwave Webhook DTO based on actual webhook structure
 *
 * Flutterwave webhook payloads follow this structure:
 * - id: Webhook ID (e.g., 9603080)
 * - txRef: Transaction reference (e.g., PAY_MEZZKS0V_SCZ89C)
 * - flwRef: Flutterwave reference (e.g., flwm3s4m0c1756662648279)
 * - status: Transaction status (e.g., successful)
 * - amount: Transaction amount in kobo
 * - customer: Customer information object
 * - entity: Entity information object
 * - eventType: Event type (e.g., USSD_TRANSACTION)
 */
export class FlutterwaveWebhookDto {
  @ApiProperty({
    description: 'Flutterwave webhook ID',
    example: 9603080,
  })
  @IsNumber()
  id: number;

  @ApiProperty({
    description: 'Transaction reference',
    example: 'PAY_MEZZKS0V_SCZ89C',
  })
  @IsString()
  txRef: string;

  @ApiProperty({
    description: 'Flutterwave reference',
    example: 'flwm3s4m0c1756662648279',
  })
  @IsString()
  flwRef: string;

  @ApiProperty({
    description: 'Order reference',
    example: 'URF_1756662647884_6593835',
  })
  @IsString()
  orderRef: string;

  @ApiPropertyOptional({
    description: 'Payment plan',
    example: null,
  })
  @IsOptional()
  paymentPlan?: any;

  @ApiPropertyOptional({
    description: 'Payment page',
    example: null,
  })
  @IsOptional()
  paymentPage?: any;

  @ApiProperty({
    description: 'Created at timestamp',
    example: '2025-08-31T17:50:47.000Z',
  })
  @IsString()
  createdAt: string;

  @ApiProperty({
    description: 'Transaction amount',
    example: 2000,
  })
  @IsNumber()
  amount: number;

  @ApiProperty({
    description: 'Charged amount',
    example: 2000,
  })
  @IsNumber()
  charged_amount: number;

  @ApiProperty({
    description: 'Transaction status',
    example: 'successful',
  })
  @IsString()
  status: string;

  @ApiProperty({
    description: 'IP address',
    example: '52.209.154.143',
  })
  @IsString()
  IP: string;

  @ApiProperty({
    description: 'Currency',
    example: 'NGN',
  })
  @IsString()
  currency: string;

  @ApiProperty({
    description: 'Application fee',
    example: 28,
  })
  @IsNumber()
  appfee: number;

  @ApiProperty({
    description: 'Merchant fee',
    example: 0,
  })
  @IsNumber()
  merchantfee: number;

  @ApiProperty({
    description: 'Merchant bears fee',
    example: 1,
  })
  @IsNumber()
  merchantbearsfee: number;

  @ApiProperty({
    description: 'Charge type',
    example: 'normal',
  })
  @IsString()
  charge_type: string;

  @ApiProperty({
    description: 'Customer information',
    type: Object,
  })
  @IsObject()
  customer: Record<string, any>;

  @ApiProperty({
    description: 'Entity information',
    type: Object,
  })
  @IsObject()
  entity: Record<string, any>;

  @ApiProperty({
    description: 'Event type (Flutterwave specific field)',
    example: 'USSD_TRANSACTION',
  })
  @IsString()
  'event.type': string;
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
