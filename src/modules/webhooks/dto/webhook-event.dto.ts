import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsNumber } from 'class-validator';
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

export class FlutterwaveWebhookDto {
  @ApiProperty({ example: 'charge.completed' })
  @IsString()
  event: string;

  @ApiProperty({
    description: 'Flutterwave transaction data',
    example: {
      id: 1234567,
      tx_ref: 'ref_123456789',
      flw_ref: 'FLW123456789',
      status: 'successful',
      amount: 5000,
      currency: 'NGN',
    },
  })
  @IsObject()
  data: Record<string, any>;
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
