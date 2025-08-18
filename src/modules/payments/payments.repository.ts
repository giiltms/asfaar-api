import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PaymentSummaryDto } from './dto/payments.dto';

export interface CreateTransactionData {
  userId: string;
  type: string;
  status: string;
  amount: number;
  currency: string;
  description?: string;
  reference: string;
  provider: string;
  providerData?: any;
  fee?: number;
  netAmount?: number;
}

export interface CreateRefundData {
  transactionId: string;
  amount: number;
  reason?: string;
  status: string;
  reference: string;
  providerData?: any;
}

@Injectable()
export class PaymentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createTransaction(data: CreateTransactionData) {
    return this.prisma.transaction.create({
      data: {
        userId: data.userId,
        type: data.type as any,
        status: data.status as any,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        reference: data.reference,
        provider: data.provider as any,
        providerData: data.providerData,
        fee: data.fee,
        netAmount: data.netAmount,
      },
    });
  }

  async updateTransaction(
    id: string,
    data: Partial<Prisma.TransactionUpdateInput>,
  ) {
    return this.prisma.transaction.update({
      where: { id },
      data,
    });
  }

  async findTransaction(id: string) {
    return this.prisma.transaction.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        refunds: true,
      },
    });
  }

  async findTransactionByReference(reference: string) {
    return this.prisma.transaction.findUnique({
      where: { reference },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
        refunds: true,
      },
    });
  }

  async findUserTransactions(args: {
    userId: string;
    skip: number;
    take: number;
    orderBy: any;
  }) {
    return this.prisma.transaction.findMany({
      where: { userId: args.userId },
      skip: args.skip,
      take: args.take,
      orderBy: args.orderBy,
      include: {
        refunds: true,
      },
    });
  }

  async countUserTransactions(userId: string): Promise<number> {
    return this.prisma.transaction.count({
      where: { userId },
    });
  }

  async createServiceFee(data: Prisma.ServiceFeeCreateInput) {
    return this.prisma.serviceFee.create({
      data,
    });
  }

  async findServiceFeeById(id: string) {
    return this.prisma.serviceFee.findUnique({
      where: { id },
    });
  }

  async findAllServiceFees(
    filters: {
      isActive?: boolean;
      currency?: string;
      search?: string;
      feeType?: any; // Using any temporarily until Prisma client is regenerated
    } = {},
    pagination: { skip?: number; take?: number } = {},
  ) {
    const { isActive, currency, search, feeType } = filters;
    const { skip, take } = pagination;

    const where: Prisma.ServiceFeeWhereInput = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (currency) {
      where.currency = currency;
    }

    if (feeType) {
      where.feeType = feeType;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.serviceFee.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.serviceFee.count({ where }),
    ]);

    return { data, total };
  }

  async updateServiceFee(id: string, data: Prisma.ServiceFeeUpdateInput) {
    return this.prisma.serviceFee.update({
      where: { id },
      data,
    });
  }

  async deleteServiceFee(id: string) {
    return this.prisma.serviceFee.delete({
      where: { id },
    });
  }

  async createRefund(data: CreateRefundData) {
    return this.prisma.transactionRefund.create({
      data: {
        transactionId: data.transactionId,
        amount: data.amount,
        reason: data.reason,
        status: data.status as any,
        reference: data.reference,
        providerData: data.providerData,
      },
    });
  }

  async updateRefund(
    id: string,
    data: Partial<Prisma.TransactionRefundUpdateInput>,
  ) {
    return this.prisma.transactionRefund.update({
      where: { id },
      data,
    });
  }

  async getUserPaymentSummary(userId: string): Promise<PaymentSummaryDto> {
    const [summary] = await this.prisma.$queryRaw<any[]>`
      SELECT 
        COUNT(*)::int as total,
        COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::int as successful,
        COUNT(CASE WHEN status = 'FAILED' THEN 1 END)::int as failed,
        COUNT(CASE WHEN status = 'PENDING' THEN 1 END)::int as pending,
        COALESCE(SUM(CASE WHEN status = 'COMPLETED' AND type = 'PAYMENT' THEN amount ELSE 0 END), 0)::float as "totalAmount",
        'NGN' as currency
      FROM transactions 
      WHERE "userId" = ${userId}
    `;

    return {
      total: summary?.total || 0,
      successful: summary?.successful || 0,
      failed: summary?.failed || 0,
      pending: summary?.pending || 0,
      totalAmount: summary?.totalAmount || 0,
      currency: summary?.currency || 'NGN',
    };
  }

  async createWallet(data: {
    userId: string;
    currency: string;
    balance?: number;
  }) {
    return this.prisma.wallet.create({
      data: {
        userId: data.userId,
        currency: data.currency,
        balance: data.balance || 0,
      },
    });
  }

  async updateWalletBalance(
    userId: string,
    currency: string,
    amount: number,
    operation: 'increment' | 'decrement' = 'increment',
  ) {
    return this.prisma.wallet.update({
      where: {
        userId_currency: {
          userId,
          currency,
        },
      },
      data: {
        balance:
          operation === 'increment'
            ? { increment: amount }
            : { decrement: amount },
        updatedAt: new Date(),
      },
    });
  }

  async getUserWallet(userId: string, currency = 'NGN') {
    return this.prisma.wallet.findUnique({
      where: {
        userId_currency: {
          userId,
          currency,
        },
      },
    });
  }

  async getUserWallets(userId: string) {
    return this.prisma.wallet.findMany({
      where: { userId },
      orderBy: { currency: 'asc' },
    });
  }

  async createPaymentMethod(data: {
    userId: string;
    provider: string;
    type: string;
    isDefault?: boolean;
    providerMethodId?: string;
    last4?: string;
    brand?: string;
    expiryMonth?: number;
    expiryYear?: number;
    bankName?: string;
    accountNumber?: string;
    metadata?: any;
  }) {
    return this.prisma.paymentMethod.create({
      data: {
        userId: data.userId,
        provider: data.provider as any,
        type: data.type as any,
        isDefault: data.isDefault || false,
        providerMethodId: data.providerMethodId,
        last4: data.last4,
        brand: data.brand,
        expiryMonth: data.expiryMonth,
        expiryYear: data.expiryYear,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        metadata: data.metadata,
      },
    });
  }

  async getUserPaymentMethods(userId: string) {
    return this.prisma.paymentMethod.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async updatePaymentMethod(
    id: string,
    data: Partial<Prisma.PaymentMethodUpdateInput>,
  ) {
    return this.prisma.paymentMethod.update({
      where: { id },
      data,
    });
  }

  async deletePaymentMethod(id: string) {
    return this.prisma.paymentMethod.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
