import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsEnum } from 'class-validator';
import { PaymentStatus, PaymentProvider, FeeType } from '@prisma/client';

export class FinanceOverviewDto {
  @ApiProperty({
    description: 'Total revenue across all payments',
    example: 2450000,
  })
  totalRevenue: number;

  @ApiProperty({
    description: 'Total number of transactions',
    example: 428,
  })
  totalTransactions: number;

  @ApiProperty({
    description: 'Number of successful payments',
    example: 398,
  })
  successfulPayments: number;

  @ApiProperty({
    description: 'Number of failed payments',
    example: 30,
  })
  failedPayments: number;

  @ApiProperty({
    description: 'Monthly growth percentage',
    example: 12.5,
  })
  monthlyGrowth: number;

  @ApiProperty({
    description: 'Average transaction value',
    example: 5724.3,
  })
  averageTransactionValue: number;

  @ApiProperty({
    description: 'Success rate percentage',
    example: 92.9,
  })
  successRate: number;
}

export class PaymentProviderDataDto {
  @ApiProperty({
    description: 'Revenue by payment provider',
    example: {
      paystack: 980000,
      flutterwave: 857500,
      fincra: 612500,
    },
  })
  paystack?: number;
  flutterwave?: number;
  fincra?: number;
  stripe?: number;
  paypal?: number;
}

export class PaymentTypeDataDto {
  @ApiProperty({
    description: 'Revenue by payment type/fee category',
    example: {
      visa: 1470000,
      travel: 612500,
      onboarding: 245000,
      additional: 122500,
    },
  })
  onboarding?: number;
  visa?: number;
  upgrade?: number;
  rescheduling?: number;
  additional?: number;
}

export class MonthlyTransactionDto {
  @ApiProperty({
    description: 'Month name',
    example: 'Jan',
  })
  month: string;

  @ApiProperty({
    description: 'Transaction count by provider for this month',
    example: {
      paystack: 85,
      flutterwave: 67,
      fincra: 45,
    },
  })
  paystack?: number;
  flutterwave?: number;
  fincra?: number;
  stripe?: number;
  paypal?: number;

  // Allow additional properties for dynamic provider data
  [key: string]: string | number | undefined;
}

export class RecentPaymentDto {
  @ApiProperty({
    description: 'Payment ID',
    example: '1',
  })
  id: string;

  @ApiProperty({
    description: 'Payment type description',
    example: 'Visa Application',
  })
  type: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 150000,
  })
  amount: number;

  @ApiProperty({
    description: 'Payment status',
    example: 'paid',
    enum: PaymentStatus,
  })
  status: string;

  @ApiProperty({
    description: 'User who made the payment',
    example: 'John Doe',
  })
  user: string;

  @ApiProperty({
    description: 'Payment reference number',
    example: 'VA123456',
  })
  reference: string;

  @ApiProperty({
    description: 'Payment date',
    example: '2024-01-10',
  })
  date: string;

  @ApiProperty({
    description: 'Country code',
    example: 'SA',
  })
  country: string;

  @ApiProperty({
    description: 'Payment provider used',
    example: 'paystack',
    enum: PaymentProvider,
  })
  provider: string;

  @ApiProperty({
    description: 'Currency of payment',
    example: 'NGN',
  })
  currency: string;
}

export class FinanceDataDto {
  @ApiProperty({
    description: 'Finance overview statistics',
    type: FinanceOverviewDto,
  })
  overview: FinanceOverviewDto;

  @ApiProperty({
    description: 'Revenue breakdown by payment provider',
    type: PaymentProviderDataDto,
  })
  paymentProviderData: PaymentProviderDataDto;

  @ApiProperty({
    description: 'Revenue breakdown by payment type',
    type: PaymentTypeDataDto,
  })
  paymentTypeData: PaymentTypeDataDto;

  @ApiProperty({
    description: 'Monthly transaction trends',
    type: [MonthlyTransactionDto],
  })
  monthlyTransactions: MonthlyTransactionDto[];

  @ApiProperty({
    description: 'Recent payments list',
    type: [RecentPaymentDto],
  })
  recentPayments: RecentPaymentDto[];
}

export class FinanceFiltersDto {
  @ApiPropertyOptional({
    description: 'Date range filter',
    example: {
      start: '2024-01-01',
      end: '2024-01-10',
    },
  })
  @IsOptional()
  dateRange?: {
    start: string;
    end: string;
  };

  @ApiPropertyOptional({
    description: 'Country filter',
    example: 'Nigeria',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'Payment provider filter',
    example: 'paystack',
    enum: PaymentProvider,
  })
  @IsOptional()
  @IsEnum(PaymentProvider)
  paymentProvider?: PaymentProvider;

  @ApiPropertyOptional({
    description: 'Payment type/fee category filter',
    example: 'visa',
    enum: FeeType,
  })
  @IsOptional()
  @IsEnum(FeeType)
  paymentType?: FeeType;

  @ApiPropertyOptional({
    description: 'Payment status filter',
    example: 'completed',
    enum: PaymentStatus,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}

export class FinanceMetadataDto {
  @ApiProperty({
    description: 'Applied filters',
    type: FinanceFiltersDto,
  })
  filters: FinanceFiltersDto;

  @ApiProperty({
    description: 'Data generation timestamp',
    example: '2024-01-10T10:30:00Z',
  })
  generatedAt: string;

  @ApiProperty({
    description: 'Data period covered',
    example: 'Last 30 days',
  })
  period: string;
}

export class FinanceOverviewResponseDto {
  @ApiProperty({
    description: 'Success status',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Response message',
    example: 'Finance data retrieved successfully',
  })
  message: string;

  @ApiProperty({
    description: 'Finance data',
    type: FinanceDataDto,
  })
  data: FinanceDataDto;

  @ApiProperty({
    description: 'Response metadata',
    type: FinanceMetadataDto,
  })
  metadata: FinanceMetadataDto;
}

export class FinanceQueryDto {
  @ApiPropertyOptional({
    description: 'Start date for data filtering (YYYY-MM-DD)',
    example: '2024-01-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for data filtering (YYYY-MM-DD)',
    example: '2024-01-10',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Country filter',
    example: 'Nigeria',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    description: 'Payment provider filter',
    example: 'paystack',
    enum: PaymentProvider,
  })
  @IsOptional()
  @IsEnum(PaymentProvider)
  paymentProvider?: PaymentProvider;

  @ApiPropertyOptional({
    description: 'Payment type/fee category filter',
    example: 'visa',
    enum: FeeType,
  })
  @IsOptional()
  @IsEnum(FeeType)
  paymentType?: FeeType;

  @ApiPropertyOptional({
    description: 'Payment status filter',
    example: 'completed',
    enum: PaymentStatus,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;
}
