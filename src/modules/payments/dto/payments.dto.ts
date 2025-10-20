import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsEmail,
  IsBoolean,
  IsUUID,
  Min,
  Max,
  Length,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PaymentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

export enum PaymentMethodType {
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  WALLET = 'WALLET',
  USSD = 'USSD',
  QR_CODE = 'QR_CODE',
  CRYPTO = 'CRYPTO',
  MOBILE_MONEY = 'MOBILE_MONEY',
}

export enum PaymentProvider {
  FLUTTERWAVE = 'FLUTTERWAVE',
  PAYSTACK = 'PAYSTACK',
  FINCRA = 'FINCRA',
  STRIPE = 'STRIPE',
  PAYPAL = 'PAYPAL',
}

export enum TransactionType {
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  PAYOUT = 'PAYOUT',
  TRANSFER = 'TRANSFER',
  SUBSCRIPTION = 'SUBSCRIPTION',
  WITHDRAWAL = 'WITHDRAWAL',
}

export class InitiatePaymentDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 5000,
    description: 'Amount in kobo/cents (NGN 50.00)',
  })
  @IsNumber()
  @Min(100) // Minimum 1 NGN
  @Max(10000000) // Maximum 100,000 NGN
  amount: number;

  @ApiPropertyOptional({ example: 'NGN', default: 'NGN' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: 'Payment for order #123' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: { orderId: '123', customerId: 'user-456' },
    description: 'Additional metadata for the payment',
  })
  @IsOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    example: ['card', 'bank_transfer', 'ussd'],
    type: [String],
  })
  @IsOptional()
  paymentMethods?: string[];

  @ApiPropertyOptional({
    example: { customerNote: 'Rush order' },
    description: 'Custom fields for the payment',
  })
  @IsOptional()
  customFields?: Record<string, string>;
}

export class PaymentResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'https://checkout.paystack.com/xyz123' })
  authorizationUrl: string;

  @ApiProperty({ example: 'PAY_1234567890_ABCDEF' })
  reference: string;

  @ApiPropertyOptional({ example: 'xyz123' })
  accessCode?: string;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiPropertyOptional()
  providerData?: Record<string, any>;
}

export class VerifyPaymentDto {
  @ApiProperty({ example: 'PAY_1234567890_ABCDEF' })
  @IsString()
  reference: string;
}

export class PaymentVerificationDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'PAY_1234567890_ABCDEF' })
  reference: string;

  @ApiProperty({ example: 5000 })
  amount: number;

  @ApiProperty({ example: 'NGN' })
  currency: string;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.COMPLETED })
  status: PaymentStatus;

  @ApiPropertyOptional({ example: 'Approved by Financial Institution' })
  gatewayResponse?: string;

  @ApiPropertyOptional({ example: '2023-12-01T10:30:00Z' })
  paidAt?: Date;

  @ApiPropertyOptional({ example: 'card' })
  channel?: string;

  @ApiPropertyOptional({ example: 75 })
  fees?: number;

  @ApiPropertyOptional()
  customer?: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

export class RefundPaymentDto {
  @ApiProperty({ example: 'PAY_1234567890_ABCDEF' })
  @IsString()
  transactionReference: string;

  @ApiPropertyOptional({
    example: 2500,
    description: 'Amount to refund (partial refund if less than original)',
  })
  @IsNumber()
  @IsOptional()
  @Min(100)
  amount?: number;

  @ApiPropertyOptional({ example: 'Customer requested refund' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ example: 'Approved by manager' })
  @IsString()
  @IsOptional()
  merchantNote?: string;
}

export class RefundResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'REF_1234567890_ABCDEF' })
  refundReference: string;

  @ApiProperty({ example: 2500 })
  amount: number;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PENDING })
  status: PaymentStatus;

  @ApiPropertyOptional()
  providerData?: Record<string, any>;
}

export class CreateTransferRecipientDto {
  @ApiProperty({ example: 'nuban', enum: ['nuban', 'mobile_money', 'basa'] })
  @IsEnum(['nuban', 'mobile_money', 'basa'])
  type: 'nuban' | 'mobile_money' | 'basa';

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  name: string;

  @ApiProperty({ example: '0123456789' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ example: '044' })
  @IsString()
  bankCode: string;

  @ApiPropertyOptional({ example: 'NGN', default: 'NGN' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class TransferRecipientResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'RCP_1234567890' })
  recipientCode: string;

  @ApiPropertyOptional()
  providerData?: Record<string, any>;
}

export class InitiateTransferDto {
  @ApiProperty({ example: 'RCP_1234567890' })
  @IsString()
  recipientCode: string;

  @ApiProperty({ example: 10000, description: 'Amount in kobo/cents' })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiPropertyOptional({ example: 'Salary payment' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ example: 'NGN', default: 'NGN' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional({ example: 'TRF_1234567890_CUSTOM' })
  @IsString()
  @IsOptional()
  reference?: string;
}

export class TransferResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'TRF_1234567890_ABCDEF' })
  reference: string;

  @ApiPropertyOptional({ example: 'TRF_xyz123' })
  transferCode?: string;

  @ApiProperty({ example: 10000 })
  amount: number;

  @ApiProperty({
    enum: ['success', 'pending', 'failed', 'reversed'],
    example: 'pending',
  })
  status: 'success' | 'pending' | 'failed' | 'reversed';

  @ApiPropertyOptional()
  providerData?: Record<string, any>;
}

export class ResolveAccountDto {
  @ApiProperty({
    example: '0123456789',
    description: 'Bank account number to verify',
    minLength: 10,
    maxLength: 10,
  })
  @IsString()
  @Length(10, 10, { message: 'Account number must be exactly 10 digits' })
  @Matches(/^\d{10}$/, { message: 'Account number must contain only digits' })
  accountNumber: string;

  @ApiProperty({
    example: '044',
    description: 'Bank code from the list of banks',
    minLength: 3,
    maxLength: 3,
  })
  @IsString()
  @Length(3, 3, { message: 'Bank code must be exactly 3 characters' })
  @Matches(/^\d{3}$/, { message: 'Bank code must contain only digits' })
  bankCode: string;
}

export class ResolveAccountResponseDto {
  @ApiProperty({ example: 'John Doe' })
  accountName: string;

  @ApiProperty({ example: '0123456789' })
  accountNumber: string;
}

export class BankDto {
  @ApiProperty({ example: 'Access Bank' })
  name: string;

  @ApiProperty({ example: '044' })
  code: string;

  @ApiPropertyOptional({ example: 'Nigeria' })
  country?: string;
}

export class TransactionDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'PAY_1234567890_ABCDEF' })
  reference: string;

  @ApiProperty({ enum: TransactionType, example: TransactionType.PAYMENT })
  type: TransactionType;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.COMPLETED })
  status: PaymentStatus;

  @ApiProperty({ example: 5000 })
  amount: number;

  @ApiProperty({ example: 'NGN' })
  currency: string;

  @ApiPropertyOptional({ example: 'Payment for order #123' })
  description?: string;

  @ApiProperty({ enum: PaymentProvider, example: PaymentProvider.PAYSTACK })
  provider: PaymentProvider;

  @ApiPropertyOptional({ example: 75 })
  fee?: number;

  @ApiPropertyOptional({ example: 4925 })
  netAmount?: number;

  @ApiPropertyOptional({ example: '2023-12-01T10:30:00Z' })
  processedAt?: Date;

  @ApiPropertyOptional({ example: '2023-12-01T10:35:00Z' })
  completedAt?: Date;

  @ApiProperty({ example: '2023-12-01T10:25:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2023-12-01T10:35:00Z' })
  updatedAt: Date;

  constructor(partial: Partial<TransactionDto>) {
    Object.assign(this, partial);
  }
}

export class PaymentSummaryDto {
  @ApiProperty({ example: 150 })
  total: number;

  @ApiProperty({ example: 125 })
  successful: number;

  @ApiProperty({ example: 15 })
  failed: number;

  @ApiProperty({ example: 10 })
  pending: number;

  @ApiProperty({ example: 1250000 })
  totalAmount: number;

  @ApiProperty({ example: 'NGN' })
  currency: string;
}

export class WebhookDto {
  @ApiProperty({ example: 'charge.success' })
  event: string;

  @ApiPropertyOptional()
  data?: Record<string, any>;

  @ApiPropertyOptional({ example: 'signature_hash' })
  signature?: string;

  @ApiPropertyOptional({ example: '2023-12-01T10:30:00Z' })
  timestamp?: string;
}
