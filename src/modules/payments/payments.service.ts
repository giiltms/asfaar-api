import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import {
  Prisma,
  Payment,
  PaymentStatus,
  Currency,
  PaymentProvider,
} from '@prisma/client';
import {
  CreatePaymentDto,
  UpdatePaymentStatusDto,
  RefundPaymentDto,
  PaymentFiltersDto,
  PaymentStatisticsDto,
  UpdatePaymentDto,
  InitiatePaymentDto,
  CreateServiceFeeDto,
  ServiceFeeFiltersDto,
  UpdateServiceFeeDto,
} from './dto/payment.dto';
import { PaginationQueryDto } from '@common/dtos';
import { PaginationUtils } from '@common/utils/pagination.utils';
import { PaymentService as PaymentProviderService } from '@shared/services/payment/payment.service';

/**
 * Service for managing payments
 * Handles payment lifecycle, processing, and business logic
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentProviderService: PaymentProviderService,
  ) {}

  /**
   * Create a new payment
   */
  async createPayment(
    createDto: any,
    userId: string,
    reference?: string,
  ): Promise<Payment> {
    try {
      // // Check if submission exists
      // const submission = await this.prisma.formSubmission.findUnique({
      //   where: { id: createDto.submissionId },
      // });

      // if (!submission) {
      //   throw new NotFoundException(
      //     `Form submission with ID "${createDto.submissionId}" not found`,
      //   );
      // }

      // // Check if payment already exists for this submission
      // const existingPayment = await this.prisma.payment.findUnique({
      //   where: { submissionId: createDto.submissionId },
      // });

      // if (existingPayment) {
      //   throw new ConflictException(
      //     `Payment already exists for submission "${createDto.submissionId}"`,
      //   );
      // }

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();
      const processor = createDto.paymentProvider.toUpperCase();

      // Set default values
      const paymentData: Prisma.PaymentCreateInput = {
        amount: createDto.amount,
        currency: createDto.currency || Currency.NGN,
        invoiceNumber,
        reference,
        processor: processor as PaymentProvider,
        createdBy: userId, // Set createdBy to userId for consistency
        user: {
          connect: { id: userId },
        },
        // submission: {
        //   connect: { id: createDto.submissionId },
        // },
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
          serviceFees: {
            include: {
              serviceFee: {
                select: {
                  id: true,
                  name: true,
                  amount: true,
                  currency: true,
                  feeType: true,
                },
              },
            },
          },
        },
      });

      // Create payment-service fee relationships if serviceFees are provided
      if (createDto.serviceFees && Array.isArray(createDto.serviceFees)) {
        // Fetch service fees to get their types and other details
        const serviceFees = await Promise.all(
          createDto.serviceFees.map((serviceFeeId) =>
            this.findServiceFeeById(serviceFeeId),
          ),
        );

        const serviceFeeRelations = serviceFees.map((serviceFee) => ({
          paymentId: payment.id,
          serviceFeeId: serviceFee.id,
          amount: createDto.amount || 0, // Use payment amount for now, could be split per fee
          currency: createDto.currency || 'NGN',
          feeType: serviceFee.feeType, // Copy the fee type from the service fee
        }));

        await this.prisma.paymentServiceFee.createMany({
          data: serviceFeeRelations,
        });
      }

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
   * Create a new payment
   */
  async initiatePayment(
    initiatePaymentDto: InitiatePaymentDto,
    userId: string,
  ): Promise<Payment> {
    try {
      // Check if submission exists
      // const submission = await this.prisma.formSubmission.findUnique({
      //   where: { id: initiatePaymentDto.submissionId },
      // });

      // if (!submission) {
      //   throw new NotFoundException(
      //     `Form submission with ID "${initiatePaymentDto.submissionId}" not found`,
      //   );
      // }

      // // Check if payment already exists for this submission
      // const existingPayment = await this.prisma.payment.findUnique({
      //   where: { submissionId: initiatePaymentDto.submissionId },
      // });

      // if (existingPayment) {
      //   throw new ConflictException(
      //     `Payment already exists for submission "${initiatePaymentDto.submissionId}"`,
      //   );
      // }

      // Validate we have service fees to process
      if (!initiatePaymentDto?.serviceFees?.length) {
        throw new BadRequestException('At least one service fee is required');
      }

      // Fetch all service fees
      const serviceFees = await Promise.all(
        initiatePaymentDto.serviceFees.map((serviceFeeId) =>
          this.findServiceFeeById(serviceFeeId),
        ),
      );

      // Verify all service fees are valid and active
      const invalidFees = serviceFees.filter((fee) => !fee || !fee.isActive);

      if (invalidFees.length > 0) {
        throw new BadRequestException(
          'One or more service fees are invalid or inactive',
        );
      }

      // Calculate total amount
      const totalAmount = serviceFees.reduce((sum, fee) => sum + fee.amount, 0);

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Set default values
      const paymentData: Prisma.PaymentCreateInput = {
        amount: initiatePaymentDto.amount || totalAmount,
        currency: initiatePaymentDto.currency || Currency.NGN,
        invoiceNumber,
        createdBy: userId, // Set createdBy to userId for consistency
        user: {
          connect: { id: userId },
        },
        // if submissionId is provided, connect the payment to the submission
        submission: initiatePaymentDto.submissionId
          ? {
              connect: { id: initiatePaymentDto.submissionId },
            }
          : undefined,
      };

      const payment = await this.prisma.payment.create({
        data: paymentData,
      });

      this.logger.log(
        `Created payment: ${payment.id} for submission: ${initiatePaymentDto.submissionId}`,
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
    // Validate and set default sorting
    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'amount',
      'status',
      'paidAt',
      'failedAt',
    ];
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = pagination;

    // Ensure sortBy is a valid field
    const validSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : 'createdAt';
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
        orderBy: [{ [validSortBy]: sortOrder }],
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
          serviceFees: {
            include: {
              serviceFee: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  amount: true,
                  currency: true,
                  feeType: true,
                  isActive: true,
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
      validSortBy,
      sortOrder,
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
   * Get a single payment by Reference
   */
  async findPaymentByRef(reference: string): Promise<Payment> {
    const payment = await this.prisma.payment.findUnique({
      where: { reference },
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
      throw new NotFoundException(`Payment with ID "${reference}" not found`);
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
        serviceFees: {
          include: {
            serviceFee: {
              select: {
                id: true,
                name: true,
                description: true,
                amount: true,
                currency: true,
                feeType: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get user's payment statistics
   */
  async getUserPaymentStatistics(
    userId: string,
  ): Promise<PaymentStatisticsDto> {
    // Get all payments for the user (direct or through submission)
    const payments = await this.prisma.payment.findMany({
      where: {
        OR: [
          { userId: userId }, // Direct user relationship (for onboarding payments)
          {
            submission: {
              userId: userId, // Through submission relationship
            },
          },
        ],
      },
      select: {
        amount: true,
        currency: true,
        status: true,
      },
    });

    if (payments.length === 0) {
      // Return default statistics for users with no payments
      return {
        totalPayments: 0,
        successfulPayments: 0,
        pendingPayments: 0,
        failedPayments: 0,
        totalAmount: 0,
        successfulAmount: 0,
        currency: Currency.NGN,
        successRate: 0,
      };
    }

    // Calculate statistics
    const totalPayments = payments.length;
    const successfulPayments = payments.filter(
      (p) => p.status === PaymentStatus.COMPLETED,
    ).length;
    const pendingPayments = payments.filter(
      (p) => p.status === PaymentStatus.PENDING,
    ).length;
    const failedPayments = payments.filter(
      (p) => p.status === PaymentStatus.FAILED,
    ).length;

    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const successfulAmount = payments
      .filter((p) => p.status === PaymentStatus.COMPLETED)
      .reduce((sum, p) => sum + p.amount, 0);

    // Use the most common currency, fallback to NGN
    const currency = payments[0]?.currency || Currency.NGN;
    const successRate =
      totalPayments > 0 ? (successfulPayments / totalPayments) * 100 : 0;

    return {
      totalPayments,
      successfulPayments,
      pendingPayments,
      failedPayments,
      totalAmount,
      successfulAmount,
      currency,
      successRate: Math.round(successRate * 100) / 100, // Round to 2 decimal places
    };
  }

  /**
   * Get user's payments with optional filtering and pagination
   */
  async findUserPayments(
    userId: string,
    filters: PaymentFiltersDto = {},
    pagination: PaginationQueryDto = {},
  ) {
    // Validate and set default sorting
    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'amount',
      'status',
      'paidAt',
      'failedAt',
    ];
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = pagination;

    // Ensure sortBy is a valid field
    const validSortBy = allowedSortFields.includes(sortBy)
      ? sortBy
      : 'createdAt';
    const {
      status,
      currency,
      submissionId,
      methodType,
      minAmount,
      maxAmount,
      search,
    } = filters;

    // Build where clause - filter by user directly or through submission relationship
    const where: Prisma.PaymentWhereInput = {
      OR: [
        { userId: userId }, // Direct user relationship (for onboarding payments)
        {
          submission: {
            userId: userId, // Through submission relationship
          },
        },
      ],
    };

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
        orderBy: [{ [sortBy]: sortOrder }],
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
      sortBy,
      sortOrder,
    );

    return {
      data: payments,
      meta,
    };
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
        processorId: updateDto.processorId.toString(),
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
          serviceFees: {
            include: {
              serviceFee: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  amount: true,
                  currency: true,
                  feeType: true,
                  isActive: true,
                },
              },
            },
          },
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

  async createServiceFee(createDto: CreateServiceFeeDto) {
    try {
      const serviceFee = await this.prisma.serviceFee.create({
        data: {
          ...createDto,
          providers: createDto.providers || [],
          isActive: createDto.isActive ?? true,
        },
      });

      this.logger.log(`Created service Fee: ${serviceFee.id}`);

      return serviceFee;
    } catch (error) {
      this.logger.error(
        `Failed to create service Fee: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async findAllServiceFees(
    filters: ServiceFeeFiltersDto = {},
    pagination: PaginationQueryDto = {},
  ) {
    const { page = 1, limit = 10 } = pagination;
    const { isActive, currency, search, feeType } = filters;

    const skip = (page - 1) * limit;

    const result = await this.prisma.serviceFee.findMany({
      where: {
        isActive,
        currency,
        feeType,
        OR: search
          ? [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const total = await this.prisma.serviceFee.count({
      where: {
        isActive,
        currency,
        feeType,
        OR: search
          ? [
              { name: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ]
          : undefined,
      },
    });

    const meta = PaginationUtils.createPaginationMeta(
      page,
      limit,
      total,
      'createdAt',
      'desc',
    );

    return {
      data: result,
      meta,
    };
  }

  async findServiceFeeById(id: string) {
    const serviceFee = await this.prisma.serviceFee.findUnique({
      where: { id },
    });

    if (!serviceFee) {
      throw new NotFoundException(`Service Fee with ID "${id}" not found`);
    }

    return serviceFee;
  }

  async updateServiceFee(id: string, updateDto: UpdateServiceFeeDto) {
    try {
      await this.findServiceFeeById(id);

      const updatedOption = await this.prisma.serviceFee.update({
        where: { id },
        data: updateDto,
      });

      this.logger.log(`Updated service Fee: ${id}`);
      return updatedOption;
    } catch (error) {
      this.logger.error(
        `Failed to update service Fee ${id}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async deleteServiceFee(id: string) {
    try {
      await this.findServiceFeeById(id);

      await this.prisma.serviceFee.delete({
        where: { id },
      });

      this.logger.log(`Deleted service Fee: ${id}`);
      return { message: 'Service Fee deleted successfully' };
    } catch (error) {
      this.logger.error(
        `Failed to delete service Fee ${id}: ${error.message}`,
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
      // Get the payment with service fee information
      const paymentWithServiceFees = await this.prisma.payment.findUnique({
        where: { id: payment.id },
        include: {
          serviceFees: {
            include: {
              serviceFee: {
                select: {
                  id: true,
                  name: true,
                  feeType: true,
                  amount: true,
                },
              },
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (!paymentWithServiceFees) {
        this.logger.warn(`Payment ${payment.id} not found with service fees`);
        return;
      }

      // Process each service fee type
      for (const paymentServiceFee of paymentWithServiceFees.serviceFees) {
        const { serviceFee } = paymentServiceFee;

        switch (serviceFee.feeType) {
          case 'ONBOARDING':
            await this.handleOnboardingPayment(paymentWithServiceFees.user);
            break;
          case 'APPLICATION':
            await this.handleApplicationPayment(
              paymentWithServiceFees.user,
              payment.submissionId,
            );
            break;
          case 'UPGRADE':
            await this.handleUpgradePayment(
              paymentWithServiceFees.user,
              payment.submissionId,
            );
            break;
          case 'RESCHEDULING':
            await this.handleReschedulingPayment(
              paymentWithServiceFees.user,
              payment.submissionId,
            );
            break;
          case 'ADDITIONAL_CHARGE':
            await this.handleAdditionalChargePayment(
              paymentWithServiceFees.user,
              payment.submissionId,
            );
            break;
          default:
            this.logger.log(
              `Unknown service fee type: ${serviceFee.feeType} for payment ${payment.id}`,
            );
        }
      }

      // Handle submission-specific side effects if payment has a submission
      if (payment.submissionId) {
        await this.handleSubmissionPaymentSideEffects(payment.submissionId);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle payment completion side effects: ${error.message}`,
        error.stack,
      );
      // Don't throw - payment update should succeed even if side effects fail
    }
  }

  /**
   * Handle onboarding payment completion
   */
  private async handleOnboardingPayment(user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  }): Promise<void> {
    try {
      // Set onboardingPaid to true for the user
      await this.prisma.user.update({
        where: { id: user.id },
        data: { onboardingPaid: true },
      });

      this.logger.log(
        `User ${user.id} onboarding payment completed, onboardingPaid set to true`,
      );

      // TODO: Send onboarding completion email
      // await this.emailService.sendOnboardingCompletionEmail(user.email, user.firstName);
    } catch (error) {
      this.logger.error(
        `Failed to handle onboarding payment for user ${user.id}: ${error.message}`,
      );
    }
  }

  /**
   * Handle application payment completion
   */
  private async handleApplicationPayment(
    user: { id: string; email: string; firstName?: string; lastName?: string },
    submissionId?: string,
  ): Promise<void> {
    try {
      if (submissionId) {
        // Update submission status or trigger application processing
        this.logger.log(
          `Application payment completed for submission ${submissionId}`,
        );

        // TODO: Implement application-specific logic
        // e.g., update submission status, send confirmation email, etc.
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle application payment for user ${user.id}: ${error.message}`,
      );
    }
  }

  /**
   * Handle upgrade payment completion
   */
  private async handleUpgradePayment(
    user: { id: string; email: string; firstName?: string; lastName?: string },
    submissionId?: string,
  ): Promise<void> {
    try {
      this.logger.log(`Upgrade payment completed for user ${user.id}`);

      // TODO: Implement upgrade-specific logic
      // e.g., upgrade user plan, unlock premium features, etc.
    } catch (error) {
      this.logger.error(
        `Failed to handle upgrade payment for user ${user.id}: ${error.message}`,
      );
    }
  }

  /**
   * Handle rescheduling payment completion
   */
  private async handleReschedulingPayment(
    user: { id: string; email: string; firstName?: string; lastName?: string },
    submissionId?: string,
  ): Promise<void> {
    try {
      this.logger.log(`Rescheduling payment completed for user ${user.id}`);

      // TODO: Implement rescheduling-specific logic
      // e.g., unlock rescheduling feature, send confirmation, etc.
    } catch (error) {
      this.logger.error(
        `Failed to handle rescheduling payment for user ${user.id}: ${error.message}`,
      );
    }
  }

  /**
   * Handle additional charge payment completion
   */
  private async handleAdditionalChargePayment(
    user: { id: string; email: string; firstName?: string; lastName?: string },
    submissionId?: string,
  ): Promise<void> {
    try {
      this.logger.log(
        `Additional charge payment completed for user ${user.id}`,
      );

      // TODO: Implement additional charge logic
      // e.g., unlock additional services, send confirmation, etc.
    } catch (error) {
      this.logger.error(
        `Failed to handle additional charge payment for user ${user.id}: ${error.message}`,
      );
    }
  }

  /**
   * Handle submission-specific payment side effects
   */
  private async handleSubmissionPaymentSideEffects(
    submissionId: string,
  ): Promise<void> {
    try {
      // Update any related biometric appointments to ACTIVE status
      const appointment = await this.prisma.biometricAppointment.findUnique({
        where: { submissionId },
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

      // TODO: Add other submission-specific side effects like sending confirmation emails, etc.
    } catch (error) {
      this.logger.error(
        `Failed to handle submission payment side effects for ${submissionId}: ${error.message}`,
      );
    }
  }
}
