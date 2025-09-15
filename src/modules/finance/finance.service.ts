import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { PaymentStatus, PaymentProvider, FeeType } from '@prisma/client';
import {
  FinanceQueryDto,
  FinanceOverviewResponseDto,
  FinanceDataDto,
  FinanceOverviewDto,
  PaymentProviderDataDto,
  PaymentTypeDataDto,
  MonthlyTransactionDto,
  RecentPaymentDto,
  FinanceFiltersDto,
  FinanceMetadataDto,
} from './dto/finance.dto';
import { addDays, subDays, format, startOfMonth, endOfMonth, eachMonthOfInterval } from 'date-fns';

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get comprehensive finance overview for finance dashboard
   */
  async getFinanceOverview(query: FinanceQueryDto): Promise<FinanceOverviewResponseDto> {
    try {
      this.logger.log('Generating finance overview analytics');

      // Build date filter
      const dateFilter = this.buildDateFilter(query);

      // Build additional filters
      const additionalFilters = this.buildAdditionalFilters(query);

      // Get finance data
      const financeData = await this.getFinanceData(dateFilter, additionalFilters);

      // Build response
      const response: FinanceOverviewResponseDto = {
        success: true,
        message: 'Finance data retrieved successfully',
        data: financeData,
        metadata: {
          filters: {
            dateRange: {
              start: query.startDate || this.getDefaultStartDate(),
              end: query.endDate || this.getDefaultEndDate(),
            },
            country: query.country || 'All',
            paymentProvider: query.paymentProvider || null,
            paymentType: query.paymentType || null,
            paymentStatus: query.paymentStatus || null,
          },
          generatedAt: new Date().toISOString(),
          period: this.getPeriodDescription(query),
        },
      };

      this.logger.log('Finance overview generated successfully');
      return response;
    } catch (error) {
      this.logger.error('Failed to generate finance overview', error.stack);
      throw error;
    }
  }

  /**
   * Get comprehensive finance data
   */
  private async getFinanceData(
    dateFilter: any,
    additionalFilters: any,
  ): Promise<FinanceDataDto> {
    const whereClause = {
      ...dateFilter,
      ...additionalFilters,
    };

    // Get overview statistics
    const overview = await this.getFinanceOverviewStats(whereClause);

    // Get payment provider data
    const paymentProviderData = await this.getPaymentProviderData(whereClause);

    // Get payment type data
    const paymentTypeData = await this.getPaymentTypeData(whereClause);

    // Get monthly transactions
    const monthlyTransactions = await this.getMonthlyTransactions(whereClause);

    // Get recent payments
    const recentPayments = await this.getRecentPayments(whereClause);

    return {
      overview,
      paymentProviderData,
      paymentTypeData,
      monthlyTransactions,
      recentPayments,
    };
  }

  /**
   * Get finance overview statistics
   */
  private async getFinanceOverviewStats(whereClause: any): Promise<FinanceOverviewDto> {
    const [
      totalRevenue,
      totalTransactions,
      successfulPayments,
      failedPayments,
      previousMonthRevenue,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { ...whereClause, status: PaymentStatus.COMPLETED },
        _sum: { amount: true },
      }),
      this.prisma.payment.count({ where: whereClause }),
      this.prisma.payment.count({
        where: { ...whereClause, status: PaymentStatus.COMPLETED },
      }),
      this.prisma.payment.count({
        where: { ...whereClause, status: PaymentStatus.FAILED },
      }),
      this.getPreviousMonthRevenue(whereClause),
    ]);

    const revenue = totalRevenue._sum.amount || 0;
    const monthlyGrowth = this.calculateMonthlyGrowth(revenue, previousMonthRevenue);
    const averageTransactionValue = totalTransactions > 0 ? revenue / totalTransactions : 0;
    const successRate = totalTransactions > 0 ? (successfulPayments / totalTransactions) * 100 : 0;

    return {
      totalRevenue: revenue,
      totalTransactions,
      successfulPayments,
      failedPayments,
      monthlyGrowth,
      averageTransactionValue: Number(averageTransactionValue.toFixed(2)),
      successRate: Number(successRate.toFixed(1)),
    };
  }

  /**
   * Get payment provider breakdown
   */
  private async getPaymentProviderData(whereClause: any): Promise<PaymentProviderDataDto> {
    const providerData = await this.prisma.payment.groupBy({
      by: ['processor'],
      where: { ...whereClause, status: PaymentStatus.COMPLETED },
      _sum: { amount: true },
    });

    const result: PaymentProviderDataDto = {};
    providerData.forEach((item) => {
      if (item.processor) {
        const provider = item.processor.toLowerCase() as keyof PaymentProviderDataDto;
        if (provider in result) {
          result[provider] = item._sum.amount || 0;
        }
      }
    });

    return result;
  }

  /**
   * Get payment type breakdown
   */
  private async getPaymentTypeData(whereClause: any): Promise<PaymentTypeDataDto> {
    const typeData = await this.prisma.paymentServiceFee.groupBy({
      by: ['feeType'],
      where: {
        payment: {
          ...whereClause,
          status: PaymentStatus.COMPLETED,
        },
      },
      _sum: { amount: true },
    });

    const result: PaymentTypeDataDto = {};
    typeData.forEach((item) => {
      if (item.feeType) {
        const typeName = this.getFeeTypeDisplayName(item.feeType) as keyof PaymentTypeDataDto;
        if (typeName in result) {
          result[typeName] = item._sum.amount || 0;
        }
      }
    });

    return result;
  }

  /**
   * Get monthly transaction trends
   */
  private async getMonthlyTransactions(whereClause: any): Promise<MonthlyTransactionDto[]> {
    const startDate = whereClause.createdAt?.gte || subDays(new Date(), 365);
    const endDate = whereClause.createdAt?.lte || new Date();

    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    const monthlyData: MonthlyTransactionDto[] = [];

    for (const month of months) {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);

      const monthData = await this.prisma.payment.groupBy({
        by: ['processor'],
        where: {
          ...whereClause,
          status: PaymentStatus.COMPLETED,
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        _count: { id: true },
      });

      const monthResult: MonthlyTransactionDto = {
        month: format(month, 'MMM'),
      };

      monthData.forEach((item) => {
        if (item.processor) {
          const provider = item.processor.toLowerCase();
          (monthResult as any)[provider] = item._count.id;
        }
      });

      monthlyData.push(monthResult);
    }

    return monthlyData;
  }

  /**
   * Get recent payments
   */
  private async getRecentPayments(whereClause: any): Promise<RecentPaymentDto[]> {
    const payments = await this.prisma.payment.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        submission: {
          include: {
            form: {
              include: {
                country: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
        serviceFees: {
          include: {
            serviceFee: {
              select: {
                name: true,
                feeType: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    return payments.map((payment) => ({
      id: payment.id,
      type: this.getPaymentTypeDescription(payment.serviceFees || []),
      amount: payment.amount,
      status: payment.status.toLowerCase(),
      user: `${payment.user?.firstName || ''} ${payment.user?.lastName || ''}`.trim() || 'Unknown User',
      reference: payment.reference || payment.invoiceNumber || 'N/A',
      date: format(payment.createdAt, 'yyyy-MM-dd'),
      country: payment.submission?.form?.country?.name || '-',
      provider: payment.processor?.toLowerCase() || 'unknown',
      currency: payment.currency,
    }));
  }

  /**
   * Build date filter from query parameters
   */
  private buildDateFilter(query: FinanceQueryDto): any {
    if (query.startDate && query.endDate) {
      return {
        createdAt: {
          gte: new Date(query.startDate),
          lte: new Date(query.endDate),
        },
      };
    }

    // Default to last 30 days
    return {
      createdAt: {
        gte: subDays(new Date(), 30),
        lte: new Date(),
      },
    };
  }

  /**
   * Build additional filters from query parameters
   */
  private buildAdditionalFilters(query: FinanceQueryDto): any {
    const filters: any = {};

    if (query.paymentProvider) {
      filters.processor = query.paymentProvider;
    }

    if (query.paymentStatus) {
      filters.status = query.paymentStatus;
    }

    if (query.country) {
      filters.submission = {
        form: {
          country: {
            name: query.country,
          },
        },
      };
    }

    return filters;
  }

  /**
   * Get previous month revenue for growth calculation
   */
  private async getPreviousMonthRevenue(whereClause: any): Promise<number> {
    const currentMonthStart = startOfMonth(new Date());
    const previousMonthEnd = subDays(currentMonthStart, 1);
    const previousMonthStart = startOfMonth(previousMonthEnd);

    const result = await this.prisma.payment.aggregate({
      where: {
        ...whereClause,
        status: PaymentStatus.COMPLETED,
        createdAt: {
          gte: previousMonthStart,
          lte: previousMonthEnd,
        },
      },
      _sum: { amount: true },
    });

    return result._sum.amount || 0;
  }

  /**
   * Calculate monthly growth percentage
   */
  private calculateMonthlyGrowth(currentRevenue: number, previousRevenue: number): number {
    if (previousRevenue === 0) return currentRevenue > 0 ? 100 : 0;
    return Number(((currentRevenue - previousRevenue) / previousRevenue) * 100);
  }

  /**
   * Get fee type display name
   */
  private getFeeTypeDisplayName(feeType: FeeType): string {
    const displayNames = {
      [FeeType.ONBOARDING]: 'onboarding',
      [FeeType.APPLICATION]: 'visa',
      [FeeType.UPGRADE]: 'upgrade',
      [FeeType.RESCHEDULING]: 'rescheduling',
      [FeeType.ADDITIONAL_CHARGE]: 'additional',
    };
    return displayNames[feeType] || feeType.toLowerCase();
  }

  /**
   * Get payment type description from service fees
   */
  private getPaymentTypeDescription(serviceFees: any[]): string {
    if (serviceFees.length === 0) return 'Unknown';

    const primaryFee = serviceFees[0];
    if (primaryFee?.serviceFee?.feeType) {
      return this.getFeeTypeDisplayName(primaryFee.serviceFee.feeType);
    }

    return primaryFee?.serviceFee?.name || 'Unknown';
  }

  /**
   * Get default start date (30 days ago)
   */
  private getDefaultStartDate(): string {
    return format(subDays(new Date(), 30), 'yyyy-MM-dd');
  }

  /**
   * Get default end date (today)
   */
  private getDefaultEndDate(): string {
    return format(new Date(), 'yyyy-MM-dd');
  }

  /**
   * Get period description
   */
  private getPeriodDescription(query: FinanceQueryDto): string {
    if (query.startDate && query.endDate) {
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return `Last ${diffDays} days`;
    }
    return 'Last 30 days';
  }
}
