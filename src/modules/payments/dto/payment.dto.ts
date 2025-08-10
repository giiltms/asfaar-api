import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsEnum,
  IsUUID,
  IsPositive,
  IsUrl,
  Min,
  IsBoolean,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Currency, PaymentStatus, PaymentMethodType } from '@prisma/client';
import { PaymentProvider } from '@common/configs/payment.config';
import { PaymentProvider as PrismaPaymentProvider } from '@prisma/client';

// Base DTO for creating a payment
export class CreatePaymentDto {
  @ApiProperty({
    description: 'Form submission ID that this payment is for',
    example: 'uuid-string',
  })
  @IsNotEmpty()
  @IsUUID()
  submissionId?: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 150.0,
    minimum: 0.01,
  })
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  @IsPositive()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({
    description: 'Payment currency',
    example: 'USD',
    enum: Currency,
    default: Currency.NGN,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({
    description: 'Payment method type',
    example: 'CARD',
    enum: PaymentMethodType,
  })
  @IsOptional()
  @IsEnum(PaymentMethodType)
  methodType?: PaymentMethodType;

  @ApiPropertyOptional({
    description: 'Description of what the payment is for',
    example: 'Visa application processing fee',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

//DTO for initiating a payment
export class InitiatePaymentDto {
  @ApiProperty({
    description: 'Form submission ID that this payment is for',
  })
  @IsUUID()
  @IsOptional()
  submissionId?: string;

  @ApiProperty({
    description: 'User email',
  })
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Payment amount',
  })
  @IsNumber()
  @Type(() => Number)
  @IsPositive()
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Payment currency',
    enum: Currency,
    default: Currency.NGN,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({
    description: 'Payment method type',
    enum: PaymentMethodType,
  })
  @IsOptional()
  @IsEnum(PaymentMethodType)
  methodType?: PaymentMethodType;

  @ApiPropertyOptional({
    description: 'Payment provider',
    enum: PaymentProvider,
  })
  @IsOptional()
  @IsEnum(PaymentProvider)
  paymentProvider?: PaymentProvider;

  @ApiPropertyOptional({
    description: 'Service Fees UUIDs',
  })
  @IsOptional()
  @IsArray()
  serviceFees?: [string];

  @ApiPropertyOptional({
    description: 'Description of what the payment is for',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

// DTO for updating payment status (usually via webhooks)
export class UpdatePaymentStatusDto {
  @ApiProperty({
    description: 'Payment status',
    example: 'COMPLETED',
    enum: PaymentStatus,
  })
  @IsNotEmpty()
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Payment processor transaction ID',
    example: 'pi_1234567890',
  })
  @IsOptional()
  @IsString()
  processorId?: string;

  @ApiPropertyOptional({
    description: 'Payment processor name',
    example: 'stripe',
  })
  @IsOptional()
  @IsString()
  processorName?: string;

  @ApiPropertyOptional({
    description: 'Receipt URL',
    example: 'https://stripe.com/receipts/xyz',
  })
  @IsOptional()
  @IsUrl()
  receiptUrl?: string;

  @ApiPropertyOptional({
    description: 'Full response from payment processor',
    example: { id: 'pi_123', amount: 15000, status: 'succeeded' },
  })
  @IsOptional()
  processorResponse?: any;
}

// DTO for refunding a payment
export class RefundPaymentDto {
  @ApiProperty({
    description: 'Refund amount (if partial refund)',
    example: 75.0,
    minimum: 0.01,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @IsPositive()
  @Min(0.01)
  refundAmount?: number;

  @ApiProperty({
    description: 'Reason for refund',
    example: 'Customer requested cancellation',
  })
  @IsNotEmpty()
  @IsString()
  refundReason: string;
}

// DTO for filtering payments
export class PaymentFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter by payment status',
    example: 'COMPLETED',
    enum: PaymentStatus,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Filter by currency',
    example: 'USD',
    enum: Currency,
  })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({
    description: 'Filter by submission ID',
    example: 'uuid-string',
  })
  @IsOptional()
  @IsUUID()
  submissionId?: string;

  @ApiPropertyOptional({
    description: 'Filter by payment method type',
    example: 'CARD',
    enum: PaymentMethodType,
  })
  @IsOptional()
  @IsEnum(PaymentMethodType)
  methodType?: PaymentMethodType;

  @ApiPropertyOptional({
    description: 'Filter by minimum amount',
    example: 50,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  minAmount?: number;

  @ApiPropertyOptional({
    description: 'Filter by maximum amount',
    example: 500,
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(0)
  maxAmount?: number;

  @ApiPropertyOptional({
    description: 'Search by processor ID or invoice number',
    example: 'pi_123',
  })
  @IsOptional()
  @IsString()
  search?: string;
}

// Response DTO for payment
export class PaymentResponseDto {
  @ApiProperty({ description: 'Unique identifier' })
  id: string;

  @ApiProperty({ description: 'Form submission ID' })
  submissionId: string;

  @ApiProperty({ description: 'Payment amount' })
  amount: number;

  @ApiProperty({ description: 'Payment currency', enum: Currency })
  currency: Currency;

  @ApiProperty({ description: 'Payment status', enum: PaymentStatus })
  status: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Payment method type',
    enum: PaymentMethodType,
  })
  methodType?: PaymentMethodType;

  @ApiPropertyOptional({ description: 'Payment description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Payment processor transaction ID' })
  processorId?: string;

  @ApiPropertyOptional({ description: 'Payment processor name' })
  processorName?: string;

  @ApiPropertyOptional({ description: 'Invoice number' })
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Receipt URL' })
  receiptUrl?: string;

  @ApiPropertyOptional({ description: 'Refund reason if refunded' })
  refundReason?: string;

  @ApiPropertyOptional({ description: 'Refund amount if refunded' })
  refundAmount?: number;

  @ApiPropertyOptional({ description: 'When payment was completed' })
  paidAt?: Date;

  @ApiPropertyOptional({ description: 'When payment failed' })
  failedAt?: Date;

  @ApiPropertyOptional({ description: 'When payment was refunded' })
  refundedAt?: Date;

  @ApiPropertyOptional({ description: 'When payment expires' })
  expiresAt?: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Creator ID' })
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Last modifier ID' })
  lastModifiedBy?: string;
}

// DTO for updating payment details (admin use)
export class UpdatePaymentDto extends PartialType(CreatePaymentDto) {
  @ApiPropertyOptional({
    description: 'Invoice number',
    example: 'INV-2024-001',
  })
  @IsOptional()
  @IsString()
  invoiceNumber?: string;

  @ApiPropertyOptional({
    description: 'Receipt URL',
    example: 'https://receipts.example.com/123',
  })
  @IsOptional()
  @IsUrl()
  receiptUrl?: string;

  @ApiPropertyOptional({
    description: 'Payment expiration date',
    example: '2024-02-01T12:00:00Z',
  })
  @IsOptional()
  @Transform(({ value }) => new Date(value))
  expiresAt?: Date;
}

export class CreateServiceFeeDto {
  @ApiProperty({
    description: 'Name of the payment option',
    example: 'Visa Fee',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Description of the payment option',
    example: 'Visa application processing fee',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Amount in kobo',
    example: 50000,
  })
  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({
    description: 'Currency',
    example: 'NGN',
    default: 'NGN',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Allowed payment providers',
    type: [String],
    enum: PrismaPaymentProvider,
  })
  @IsOptional()
  @IsArray()
  providers?: PrismaPaymentProvider[];

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { customField: 'value' },
  })
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional({
    description: 'Whether the option is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateServiceFeeDto {
  @ApiPropertyOptional({
    description: 'Name of the payment option',
    example: 'Visa Fee',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    description: 'Description of the payment option',
    example: 'Visa application processing fee',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Amount in kobo',
    example: 50000,
  })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Currency',
    example: 'NGN',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Allowed payment providers',
    type: [String],
    enum: PrismaPaymentProvider,
  })
  @IsOptional()
  @IsArray()
  providers?: PrismaPaymentProvider[];

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { customField: 'value' },
  })
  @IsOptional()
  metadata?: any;

  @ApiPropertyOptional({
    description: 'Whether the option is active',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ServiceFeeFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter by active status',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filter by currency',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    description: 'Search by name or description',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
