import { Expose, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, PaymentStatus, PaymentMethodType } from '@prisma/client';

/**
 * Payment entity for API response serialization
 * Exposes all relevant payment information while excluding sensitive data
 */
export class PaymentEntity {
  @ApiProperty({ description: 'Unique identifier' })
  @Expose()
  id: string;

  @ApiPropertyOptional({
    description: 'Form submission ID (for visa applications)',
  })
  @Expose()
  submissionId?: string;

  @ApiPropertyOptional({ description: 'Travel agent upgrade application ID' })
  @Expose()
  upgradeApplicationId?: string;

  @ApiProperty({ description: 'Payment amount' })
  @Expose()
  amount: number;

  @ApiProperty({ description: 'Payment currency', enum: Currency })
  @Expose()
  currency: Currency;

  @ApiProperty({ description: 'Payment status', enum: PaymentStatus })
  @Expose()
  status: PaymentStatus;

  @ApiPropertyOptional({
    description: 'Payment method type',
    enum: PaymentMethodType,
  })
  @Expose()
  methodType?: PaymentMethodType;

  @ApiPropertyOptional({ description: 'Payment description' })
  @Expose()
  description?: string;

  @ApiPropertyOptional({ description: 'Payment processor transaction ID' })
  @Expose()
  processorId?: string;

  @ApiPropertyOptional({ description: 'Payment processor name' })
  @Expose()
  processorName?: string;

  @ApiPropertyOptional({ description: 'Invoice number' })
  @Expose()
  invoiceNumber?: string;

  @ApiPropertyOptional({ description: 'Receipt URL' })
  @Expose()
  receiptUrl?: string;

  @ApiPropertyOptional({ description: 'Refund reason if refunded' })
  @Expose()
  refundReason?: string;

  @ApiPropertyOptional({ description: 'Refund amount if refunded' })
  @Expose()
  refundAmount?: number;

  @ApiPropertyOptional({ description: 'When payment was completed' })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  paidAt?: Date;

  @ApiPropertyOptional({ description: 'When payment failed' })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  failedAt?: Date;

  @ApiPropertyOptional({ description: 'When payment was refunded' })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  refundedAt?: Date;

  @ApiPropertyOptional({ description: 'When payment expires' })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  expiresAt?: Date;

  @ApiProperty({ description: 'Creation timestamp' })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @Expose()
  @Transform(({ value }) => value?.toISOString())
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Creator ID' })
  @Expose()
  createdBy?: string;

  @ApiPropertyOptional({ description: 'Last modifier ID' })
  @Expose()
  lastModifiedBy?: string;

  // Computed properties for convenience
  @ApiPropertyOptional({ description: 'Whether payment is completed' })
  @Expose()
  get isCompleted(): boolean {
    return this.status === PaymentStatus.COMPLETED;
  }

  @ApiPropertyOptional({ description: 'Whether payment is pending' })
  @Expose()
  get isPending(): boolean {
    return (
      this.status === PaymentStatus.PENDING ||
      this.status === PaymentStatus.PROCESSING
    );
  }

  @ApiPropertyOptional({ description: 'Whether payment has failed' })
  @Expose()
  get hasFailed(): boolean {
    return this.status === PaymentStatus.FAILED;
  }

  @ApiPropertyOptional({ description: 'Whether payment is refunded' })
  @Expose()
  get isRefunded(): boolean {
    return this.status === PaymentStatus.REFUNDED;
  }

  @ApiPropertyOptional({ description: 'Net amount after refunds' })
  @Expose()
  get netAmount(): number {
    if (this.refundAmount) {
      return this.amount - this.refundAmount;
    }
    return this.amount;
  }

  @ApiPropertyOptional({ description: 'Formatted amount with currency' })
  @Expose()
  get formattedAmount(): string {
    const currencySymbols = {
      [Currency.USD]: '$',
      [Currency.NGN]: '₦',
      [Currency.EUR]: '€',
      [Currency.GBP]: '£',
    };

    const symbol = currencySymbols[this.currency] || this.currency;
    return `${symbol}${this.amount.toFixed(2)}`;
  }

  @ApiPropertyOptional({ description: 'Payment status for display' })
  @Expose()
  get statusDisplay(): string {
    const statusMap = {
      [PaymentStatus.PENDING]: 'Pending',
      [PaymentStatus.PROCESSING]: 'Processing',
      [PaymentStatus.COMPLETED]: 'Completed',
      [PaymentStatus.FAILED]: 'Failed',
      [PaymentStatus.CANCELLED]: 'Cancelled',
      [PaymentStatus.REFUNDED]: 'Refunded',
    };

    return statusMap[this.status] || this.status;
  }
}
