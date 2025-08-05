import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from '@modules/payments/payments.service';
import { PrismaService } from '@providers/prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PaymentStatus, Currency, PaymentMethodType } from '@prisma/client';

// Mock data
const mockUser = {
  id: 'user-1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
};

const mockSubmission = {
  id: 'submission-1',
  userId: 'user-1',
  status: 'SUBMITTED',
  user: mockUser,
};

const mockPayment = {
  id: 'payment-1',
  submissionId: 'submission-1',
  amount: 150.0,
  currency: Currency.NGN,
  status: PaymentStatus.PENDING,
  methodType: PaymentMethodType.CARD,
  description: 'Visa application fee',
  invoiceNumber: 'ASF-202401-0001',
  processorId: null,
  processorName: null,
  receiptUrl: null,
  refundAmount: null,
  refundReason: null,
  paidAt: null,
  failedAt: null,
  refundedAt: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  createdBy: 'user-1',
  lastModifiedBy: null,
  submission: mockSubmission,
};

const mockBiometricAppointment = {
  id: 'appointment-1',
  submissionId: 'submission-1',
  status: 'PENDING',
};

// Mock classes
class MockPrismaService {
  formSubmission = {
    findUnique: jest.fn(),
  };

  payment = {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  };

  biometricAppointment = {
    findUnique: jest.fn(),
    update: jest.fn(),
  };
}

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: MockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: PrismaService,
          useClass: MockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createPayment', () => {
    const createPaymentDto = {
      submissionId: 'submission-1',
      amount: 150.0,
      currency: Currency.NGN,
      methodType: PaymentMethodType.CARD,
      description: 'Visa application fee',
    };

    it('should create a payment successfully', async () => {
      // Arrange
      prismaService.formSubmission.findUnique.mockResolvedValue(mockSubmission);
      prismaService.payment.findUnique.mockResolvedValue(null);
      prismaService.payment.create.mockResolvedValue(mockPayment);

      // Act
      const result = await service.createPayment(createPaymentDto, 'user-1');

      // Assert
      expect(result).toEqual(mockPayment);
      expect(prismaService.formSubmission.findUnique).toHaveBeenCalledWith({
        where: { id: 'submission-1' },
      });
      expect(prismaService.payment.findUnique).toHaveBeenCalledWith({
        where: { submissionId: 'submission-1' },
      });
      expect(prismaService.payment.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when submission does not exist', async () => {
      // Arrange
      prismaService.formSubmission.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createPayment(createPaymentDto, 'user-1'),
      ).rejects.toThrow(NotFoundException);
      expect(prismaService.formSubmission.findUnique).toHaveBeenCalledWith({
        where: { id: 'submission-1' },
      });
    });

    it('should throw ConflictException when payment already exists', async () => {
      // Arrange
      prismaService.formSubmission.findUnique.mockResolvedValue(mockSubmission);
      prismaService.payment.findUnique.mockResolvedValue(mockPayment);

      // Act & Assert
      await expect(
        service.createPayment(createPaymentDto, 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should generate invoice number automatically', async () => {
      // Arrange
      prismaService.formSubmission.findUnique.mockResolvedValue(mockSubmission);
      prismaService.payment.findUnique.mockResolvedValue(null);
      prismaService.payment.count.mockResolvedValue(0);
      prismaService.payment.create.mockResolvedValue({
        ...mockPayment,
        invoiceNumber: 'ASF-202401-0001',
      });

      // Act
      await service.createPayment(createPaymentDto, 'user-1');

      // Assert
      expect(prismaService.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            invoiceNumber: expect.stringMatching(/^ASF-\d{6}-\d{4}$/),
          }),
        }),
      );
    });
  });

  describe('updatePaymentStatus', () => {
    const updateStatusDto = {
      status: PaymentStatus.COMPLETED,
      processorId: 'pi_123456',
      processorName: 'stripe',
      receiptUrl: 'https://stripe.com/receipts/123',
    };

    it('should update payment status successfully', async () => {
      // Arrange
      const updatedPayment = {
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
        paidAt: new Date(),
      };

      prismaService.payment.findUnique.mockResolvedValue(mockPayment);
      prismaService.payment.update.mockResolvedValue(updatedPayment);
      prismaService.biometricAppointment.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.updatePaymentStatus(
        'payment-1',
        updateStatusDto,
        'admin-1',
      );

      // Assert
      expect(result).toEqual(updatedPayment);
      expect(prismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: expect.objectContaining({
          status: PaymentStatus.COMPLETED,
          processorId: 'pi_123456',
          paidAt: expect.any(Date),
        }),
        include: { submission: true },
      });
    });

    it('should activate biometric appointment when payment is completed', async () => {
      // Arrange
      const updatedPayment = {
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
        submissionId: 'submission-1',
      };

      prismaService.payment.findUnique.mockResolvedValue(mockPayment);
      prismaService.payment.update.mockResolvedValue(updatedPayment);
      prismaService.biometricAppointment.findUnique.mockResolvedValue(
        mockBiometricAppointment,
      );
      prismaService.biometricAppointment.update.mockResolvedValue({
        ...mockBiometricAppointment,
        status: 'ACTIVE',
      });

      // Act
      await service.updatePaymentStatus('payment-1', updateStatusDto);

      // Assert
      expect(prismaService.biometricAppointment.findUnique).toHaveBeenCalledWith({
        where: { submissionId: 'submission-1' },
      });
      expect(prismaService.biometricAppointment.update).toHaveBeenCalledWith({
        where: { id: 'appointment-1' },
        data: { status: 'ACTIVE' },
      });
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      // Arrange
      const completedPayment = {
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
      };

      prismaService.payment.findUnique.mockResolvedValue(completedPayment);

      const invalidUpdate = {
        status: PaymentStatus.PENDING,
      };

      // Act & Assert
      await expect(
        service.updatePaymentStatus('payment-1', invalidUpdate),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('refundPayment', () => {
    const refundDto = {
      refundAmount: 75.0,
      refundReason: 'Customer requested cancellation',
    };

    it('should refund payment successfully', async () => {
      // Arrange
      const completedPayment = {
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
        amount: 150.0,
        refundAmount: null,
      };

      const refundedPayment = {
        ...completedPayment,
        status: PaymentStatus.REFUNDED,
        refundAmount: 75.0,
        refundReason: 'Customer requested cancellation',
        refundedAt: new Date(),
      };

      prismaService.payment.findUnique.mockResolvedValue(completedPayment);
      prismaService.payment.update.mockResolvedValue(refundedPayment);

      // Act
      const result = await service.refundPayment('payment-1', refundDto, 'admin-1');

      // Assert
      expect(result).toEqual(refundedPayment);
      expect(prismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: expect.objectContaining({
          status: PaymentStatus.REFUNDED,
          refundAmount: 75.0,
          refundReason: 'Customer requested cancellation',
          refundedAt: expect.any(Date),
        }),
      });
    });

    it('should throw BadRequestException when trying to refund non-completed payment', async () => {
      // Arrange
      const pendingPayment = {
        ...mockPayment,
        status: PaymentStatus.PENDING,
      };

      prismaService.payment.findUnique.mockResolvedValue(pendingPayment);

      // Act & Assert
      await expect(
        service.refundPayment('payment-1', refundDto, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when refund amount exceeds payment amount', async () => {
      // Arrange
      const completedPayment = {
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
        amount: 150.0,
      };

      const invalidRefundDto = {
        refundAmount: 200.0,
        refundReason: 'Invalid amount',
      };

      prismaService.payment.findUnique.mockResolvedValue(completedPayment);

      // Act & Assert
      await expect(
        service.refundPayment('payment-1', invalidRefundDto, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle full refund when no amount specified', async () => {
      // Arrange
      const completedPayment = {
        ...mockPayment,
        status: PaymentStatus.COMPLETED,
        amount: 150.0,
      };

      const fullRefundDto = {
        refundReason: 'Full refund requested',
      };

      prismaService.payment.findUnique.mockResolvedValue(completedPayment);
      prismaService.payment.update.mockResolvedValue({
        ...completedPayment,
        status: PaymentStatus.REFUNDED,
        refundAmount: 150.0,
      });

      // Act
      await service.refundPayment('payment-1', fullRefundDto, 'admin-1');

      // Assert
      expect(prismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        data: expect.objectContaining({
          refundAmount: 150.0,
        }),
      });
    });
  });

  describe('findAllPayments', () => {
    it('should return paginated payments', async () => {
      // Arrange
      const mockPayments = [mockPayment];
      const totalCount = 1;

      prismaService.payment.findMany.mockResolvedValue(mockPayments);
      prismaService.payment.count.mockResolvedValue(totalCount);

      // Act
      const result = await service.findAllPayments(
        { status: PaymentStatus.PENDING },
        { page: 1, limit: 10 },
      );

      // Assert
      expect(result.data).toEqual(mockPayments);
      expect(result.meta).toEqual(
        expect.objectContaining({
          page: 1,
          limit: 10,
          totalItems: totalCount,
        }),
      );
    });

    it('should apply filters correctly', async () => {
      // Arrange
      const filters = {
        status: PaymentStatus.COMPLETED,
        currency: Currency.USD,
        minAmount: 100,
        maxAmount: 500,
        search: 'pi_123',
      };

      prismaService.payment.findMany.mockResolvedValue([]);
      prismaService.payment.count.mockResolvedValue(0);

      // Act
      await service.findAllPayments(filters, { page: 1, limit: 10 });

      // Assert
      expect(prismaService.payment.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: PaymentStatus.COMPLETED,
          currency: Currency.USD,
          amount: {
            gte: 100,
            lte: 500,
          },
          OR: expect.any(Array),
        }),
        skip: 0,
        take: 10,
        orderBy: [{ createdAt: 'desc' }],
        include: expect.any(Object),
      });
    });
  });

  describe('getPaymentStatistics', () => {
    it('should return payment statistics', async () => {
      // Arrange
      prismaService.payment.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(80)  // completed
        .mockResolvedValueOnce(15)  // pending
        .mockResolvedValueOnce(5);  // failed

      prismaService.payment.aggregate.mockResolvedValue({
        _sum: { amount: 12000 },
      });

      prismaService.payment.groupBy.mockResolvedValue([
        { status: PaymentStatus.COMPLETED, _count: { _all: 80 }, _sum: { amount: 12000 } },
        { status: PaymentStatus.PENDING, _count: { _all: 15 }, _sum: { amount: 2250 } },
      ]);

      // Act
      const result = await service.getPaymentStatistics();

      // Assert
      expect(result).toEqual({
        totalPayments: 100,
        completedPayments: 80,
        pendingPayments: 15,
        failedPayments: 5,
        totalRevenue: 12000,
        revenueByStatus: expect.any(Array),
        completionRate: 80,
      });
    });
  });

  describe('findPaymentById', () => {
    it('should return payment when found', async () => {
      // Arrange
      prismaService.payment.findUnique.mockResolvedValue(mockPayment);

      // Act
      const result = await service.findPaymentById('payment-1');

      // Assert
      expect(result).toEqual(mockPayment);
      expect(prismaService.payment.findUnique).toHaveBeenCalledWith({
        where: { id: 'payment-1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when payment not found', async () => {
      // Arrange
      prismaService.payment.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findPaymentById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findPaymentBySubmissionId', () => {
    it('should return payment for submission', async () => {
      // Arrange
      prismaService.payment.findUnique.mockResolvedValue(mockPayment);

      // Act
      const result = await service.findPaymentBySubmissionId('submission-1');

      // Assert
      expect(result).toEqual(mockPayment);
      expect(prismaService.payment.findUnique).toHaveBeenCalledWith({
        where: { submissionId: 'submission-1' },
        include: expect.any(Object),
      });
    });

    it('should return null when no payment found', async () => {
      // Arrange
      prismaService.payment.findUnique.mockResolvedValue(null);

      // Act
      const result = await service.findPaymentBySubmissionId('submission-1');

      // Assert
      expect(result).toBeNull();
    });
  });
}); 