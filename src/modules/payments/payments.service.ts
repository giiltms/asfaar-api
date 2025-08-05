import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { Prisma, Payment, PaymentStatus, Currency } from '@prisma/client';
import {
  CreatePaymentDto,
  UpdatePaymentStatusDto,
  RefundPaymentDto,
  PaymentFiltersDto,
  UpdatePaymentDto,
} from './dto/payment.dto';
import { PaginationQueryDto } from '@common/dtos';
import { PaginationUtils } from '@common/utils/pagination.utils';

/**
 * Service for managing payments
 * Handles payment lifecycle, processing, and business logic
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new payment
   */
  async createPayment(
    createDto: CreatePaymentDto,
    createdBy?: string,
  ): Promise<Payment> {
    try {
      // Check if submission exists
      const submission = await this.prisma.formSubmission.findUnique({
        where: { id: createDto.submissionId },
      });

      if (!submission) {
        throw new NotFoundException(
          `Form submission with ID "${createDto.submissionId}" not found`,
        );
      }

      // Check if payment already exists for this submission
      const existingPayment = await this.prisma.payment.findUnique({
        where: { submissionId: createDto.submissionId },
      });

      if (existingPayment) {
        throw new ConflictException(
          `Payment already exists for submission "${createDto.submissionId}"`,
        );
      }

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Set default values
      const paymentData: Prisma.PaymentCreateInput = {
        ...createDto,
        currency: createDto.currency || Currency.NGN,
        invoiceNumber,
        createdBy,
        submission: {
          connect: { id: createDto.submissionId },
        },
      };

      const payment = await this.prisma.payment.create({
        data: paymentData,
        include: {
          submission: {
            select: {
              id: true,
              status: true,
              userId: true,
            },
          },
        },
      });

      this.logger.log(
        `Created payment: ${payment.id} for submission: ${createDto.submissionId}`,
      );

      return payment;
    } catch (error) {
      this.logger.error(
        `Failed to create payment: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get all payments with optional filtering and pagination
   */
  async findAllPayments(
    filters: PaymentFiltersDto = {},
    pagination: PaginationQueryDto = {},
  ) {
    const { page = 1, limit = 10 } = pagination;
    const {
      status,
      currency,
      submissionId,
      methodType,
      minAmount,
      maxAmount,
      search,
    } = filters;

    // Build where clause
    const where: Prisma.PaymentWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (currency) {
      where.currency = currency;
    }

    if (submissionId) {
      where.submissionId = submissionId;
    }

    if (methodType) {
      where.methodType = methodType;
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {};
      if (minAmount !== undefined) {
        where.amount.gte = minAmount;
      }
      if (maxAmount !== undefined) {
        where.amount.lte = maxAmount;
      }
    }

    if (search) {
      where.OR = [
        { processorId: { contains: search, mode: 'insensitive' } },
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute queries
    const [payments, totalCount] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          submission: {
            select: {
              id: true,
              status: true,
              userId: true,
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    const meta = PaginationUtils.createPaginationMeta(
      page,
      limit,
      totalCount,
      'createdAt',
      'desc',
    );

    return {
      data: payments,
      meta,
    };
  }

  /**
   * Get a single payment by ID
   */
  async findPaymentById(id: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        submission: {
          select: {
            id: true,
            status: true,
            userId: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException(`Payment with ID "${id}" not found`);
    }

    return payment;
  }

  /**
   * Get payment by submission ID
   */
  async findPaymentBySubmissionId(
    submissionId: string,
  ): Promise<Payment | null> {
    return this.prisma.payment.findUnique({
      where: { submissionId },
      include: {
        submission: {
          select: {
            id: true,
            status: true,
            userId: true,
          },
        },
      },
    });
  }

  /**
   * Update payment status (usually called by payment webhooks)
   */
  async updatePaymentStatus(
    id: string,
    updateDto: UpdatePaymentStatusDto,
    lastModifiedBy?: string,
  ): Promise<Payment> {
    try {
      const payment = await this.findPaymentById(id);

      // Validate status transition
      this.validateStatusTransition(payment.status, updateDto.status);

      // Prepare update data
      const updateData: Prisma.PaymentUpdateInput = {
        status: updateDto.status,
        processorId: updateDto.processorId,
        processorName: updateDto.processorName,
        receiptUrl: updateDto.receiptUrl,
        processorResponse: updateDto.processorResponse,
        lastModifiedBy,
      };

      // Set timestamps based on status
      switch (updateDto.status) {
        case PaymentStatus.COMPLETED:
          updateData.paidAt = new Date();
          break;
        case PaymentStatus.FAILED:
          updateData.failedAt = new Date();
          break;
      }

      const updatedPayment = await this.prisma.payment.update({
        where: { id },
        data: updateData,
        include: {
          submission: true,
        },
      });

      this.logger.log(`Updated payment ${id} status to ${updateDto.status}`);

      // If payment is completed, trigger any side effects (like activating appointments)
      if (updateDto.status === PaymentStatus.COMPLETED) {
        await this.handlePaymentCompletion(updatedPayment);
      }

      return updatedPayment;
    } catch (error) {
      this.logger.error(
        `Failed to update payment status ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(
    id: string,
    refundDto: RefundPaymentDto,
    lastModifiedBy?: string,
  ): Promise<Payment> {
    try {
      const payment = await this.findPaymentById(id);

      if (payment.status !== PaymentStatus.COMPLETED) {
        throw new BadRequestException(
          'Only completed payments can be refunded',
        );
      }

      const refundAmount = refundDto.refundAmount || payment.amount;

      if (refundAmount > payment.amount) {
        throw new BadRequestException(
          'Refund amount cannot exceed payment amount',
        );
      }

      if (
        payment.refundAmount &&
        payment.refundAmount + refundAmount > payment.amount
      ) {
        throw new BadRequestException(
          'Total refund amount cannot exceed payment amount',
        );
      }

      const totalRefundAmount = (payment.refundAmount || 0) + refundAmount;

      const updatedPayment = await this.prisma.payment.update({
        where: { id },
        data: {
          status: PaymentStatus.REFUNDED,
          refundAmount: totalRefundAmount,
          refundReason: refundDto.refundReason,
          refundedAt: new Date(),
          lastModifiedBy,
        },
      });

      this.logger.log(
        `Refunded payment ${id}: ${refundAmount} (Total: ${totalRefundAmount})`,
      );

      return updatedPayment;
    } catch (error) {
      this.logger.error(
        `Failed to refund payment ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update payment details (admin use)
   */
  async updatePayment(
    id: string,
    updateDto: UpdatePaymentDto,
    lastModifiedBy?: string,
  ): Promise<Payment> {
    try {
      await this.findPaymentById(id);

      const updatedPayment = await this.prisma.payment.update({
        where: { id },
        data: {
          ...updateDto,
          lastModifiedBy,
        },
      });

      this.logger.log(`Updated payment details: ${id}`);

      return updatedPayment;
    } catch (error) {
      this.logger.error(
        `Failed to update payment ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStatistics() {
    const [
      totalPayments,
      completedPayments,
      pendingPayments,
      failedPayments,
      totalRevenue,
      revenueByStatus,
    ] = await Promise.all([
      this.prisma.payment.count(),
      this.prisma.payment.count({ where: { status: PaymentStatus.COMPLETED } }),
      this.prisma.payment.count({
        where: {
          status: {
            in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING],
          },
        },
      }),
      this.prisma.payment.count({ where: { status: PaymentStatus.FAILED } }),
      this.prisma.payment.aggregate({
        where: { status: PaymentStatus.COMPLETED },
        _sum: { amount: true },
      }),
      this.prisma.payment.groupBy({
        by: ['status'],
        _count: { _all: true },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalPayments,
      completedPayments,
      pendingPayments,
      failedPayments,
      totalRevenue: totalRevenue._sum.amount || 0,
      revenueByStatus,
      completionRate:
        totalPayments > 0 ? (completedPayments / totalPayments) * 100 : 0,
    };
  }

  /**
   * Generate invoice number
   */
  private async generateInvoiceNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    // Count payments this month
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);

    const count = await this.prisma.payment.count({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const sequence = (count + 1).toString().padStart(4, '0');
    return `ASF-${year}${month.toString().padStart(2, '0')}-${sequence}`;
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(
    currentStatus: PaymentStatus,
    newStatus: PaymentStatus,
  ): void {
    const validTransitions: Record<PaymentStatus, PaymentStatus[]> = {
      [PaymentStatus.PENDING]: [
        PaymentStatus.PROCESSING,
        PaymentStatus.COMPLETED,
        PaymentStatus.FAILED,
        PaymentStatus.CANCELLED,
      ],
      [PaymentStatus.PROCESSING]: [
        PaymentStatus.COMPLETED,
        PaymentStatus.FAILED,
        PaymentStatus.CANCELLED,
      ],
      [PaymentStatus.COMPLETED]: [
        PaymentStatus.REFUNDED,
        PaymentStatus.PARTIALLY_REFUNDED,
      ],
      [PaymentStatus.FAILED]: [PaymentStatus.PENDING], // Allow retry
      [PaymentStatus.CANCELLED]: [PaymentStatus.PENDING], // Allow restart
      [PaymentStatus.REFUNDED]: [], // Final state
      [PaymentStatus.PARTIALLY_REFUNDED]: [PaymentStatus.REFUNDED], // Can refund remainder
    };

    if (!validTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Handle payment completion side effects
   */
  private async handlePaymentCompletion(payment: Payment): Promise<void> {
    try {
      // Update any related biometric appointments to ACTIVE status
      const appointment = await this.prisma.biometricAppointment.findUnique({
        where: { submissionId: payment.submissionId },
      });

      if (appointment && appointment.status === 'PENDING') {
        await this.prisma.biometricAppointment.update({
          where: { id: appointment.id },
          data: { status: 'ACTIVE' },
        });

        this.logger.log(
          `Activated biometric appointment ${appointment.id} after payment completion`,
        );
      }

      // TODO: Add other side effects like sending confirmation emails, etc.
    } catch (error) {
      this.logger.error(
        `Failed to handle payment completion side effects: ${error.message}`,
        error.stack,
      );
      // Don't throw - payment update should succeed even if side effects fail
    }
  }
}
