import { Test, TestingModule } from '@nestjs/testing';
import { BiometricAppointmentsService } from '@modules/biometric-appointments/biometric-appointments.service';
import { PaymentsService } from '@modules/payments/payments.service';
import { BiometricCentersService } from '@modules/biometric-centers/biometric-centers.service';
import { ReferenceNumberService } from '@shared/services/reference-number/reference-number.service';
import { PrismaService } from '@providers/prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  AppointmentClass,
  PaymentStatus,
} from '@prisma/client';

// Mock data
const mockUser = {
  id: 'user-1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
};

const mockPayment = {
  id: 'payment-1',
  status: PaymentStatus.COMPLETED,
  amount: 150.0,
};

const mockSubmission = {
  id: 'submission-1',
  userId: 'user-1',
  status: 'SUBMITTED',
  payment: mockPayment,
  user: mockUser,
};

const mockCenter = {
  id: 'center-1',
  name: 'ASFAAR-ABUJA HQ',
  code: 'ASF-ABJ-HQ',
  centerNumber: '001',
  address: '14 Yedseram Street, Maitama',
  city: 'Abuja',
  state: 'FCT',
  isActive: true,
};

const mockAppointment = {
  id: 'appointment-1',
  userId: 'user-1',
  submissionId: 'submission-1',
  centerId: 'center-1',
  appointmentClass: AppointmentClass.REGULAR,
  status: AppointmentStatus.ACTIVE,
  appointmentDate: new Date('2026-06-15'),
  appointmentTime: new Date('2026-06-15T10:00:00Z'),
  specialRequirements: null,
  confirmationAcknowledged: true,
  consentAcknowledged: true,
  termsAcknowledged: true,
  reminderSent: false,
  rescheduleCount: 0,
  biometricsCaptured: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  user: mockUser,
  submission: mockSubmission,
  center: mockCenter,
};

// Mock classes
class MockPrismaService {
  formSubmission = {
    findUnique: jest.fn(),
    update: jest.fn(),
  };

  biometricAppointment = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
  };

  $transaction = jest.fn();
}

class MockPaymentsService {
  findPaymentBySubmissionId = jest.fn();
}

class MockBiometricCentersService {
  findCenterById = jest.fn();
  checkCenterAvailability = jest.fn();
}

class MockReferenceNumberService {
  generateReferenceNumberForSubmission = jest.fn();
}

describe('BiometricAppointmentsService', () => {
  let service: BiometricAppointmentsService;
  let prismaService: MockPrismaService;
  let paymentsService: MockPaymentsService;
  let biometricCentersService: MockBiometricCentersService;
  let referenceNumberService: MockReferenceNumberService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiometricAppointmentsService,
        {
          provide: PrismaService,
          useClass: MockPrismaService,
        },
        {
          provide: PaymentsService,
          useClass: MockPaymentsService,
        },
        {
          provide: BiometricCentersService,
          useClass: MockBiometricCentersService,
        },
        {
          provide: ReferenceNumberService,
          useClass: MockReferenceNumberService,
        },
      ],
    }).compile();

    service = module.get<BiometricAppointmentsService>(
      BiometricAppointmentsService,
    );
    prismaService = module.get(PrismaService);
    paymentsService = module.get(PaymentsService);
    biometricCentersService = module.get(BiometricCentersService);
    referenceNumberService = module.get(ReferenceNumberService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('createAppointment', () => {
    const createAppointmentDto = {
      submissionId: 'submission-1',
      centerId: 'center-1',
      appointmentClass: AppointmentClass.REGULAR,
      appointmentDate: '2026-06-15',
      appointmentTime: '2026-06-15T10:00:00Z',
      specialRequirements: 'Wheelchair access needed',
      confirmationAcknowledged: true,
      consentAcknowledged: true,
      termsAcknowledged: true,
    };

    it('should create appointment successfully when payment is completed', async () => {
      // Arrange
      prismaService.formSubmission.findUnique.mockResolvedValue(mockSubmission);
      prismaService.biometricAppointment.findUnique.mockResolvedValue(null);
      biometricCentersService.findCenterById.mockResolvedValue(mockCenter);
      biometricCentersService.checkCenterAvailability.mockResolvedValue(true);
      prismaService.biometricAppointment.findFirst.mockResolvedValue(null);
      referenceNumberService.generateReferenceNumberForSubmission.mockResolvedValue('SA00125000001');
      prismaService.$transaction.mockImplementation(async (callback) => {
        return await callback(prismaService);
      });
      prismaService.biometricAppointment.create.mockResolvedValue(mockAppointment);
      prismaService.formSubmission.update.mockResolvedValue(mockSubmission);

      // Act
      const result = await service.createAppointment(
        createAppointmentDto,
        'user-1',
        'user-1',
      );

      // Assert
      expect(result).toEqual(mockAppointment);
      expect(prismaService.formSubmission.findUnique).toHaveBeenCalledWith({
        where: { id: 'submission-1' },
        include: { payment: true },
      });
      expect(referenceNumberService.generateReferenceNumberForSubmission).toHaveBeenCalledWith(
        'submission-1',
        mockCenter.centerNumber,
      );
    });

    it('should throw NotFoundException when submission does not exist', async () => {
      // Arrange
      prismaService.formSubmission.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createAppointment(createAppointmentDto, 'user-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user tries to book for another user submission', async () => {
      // Arrange
      const otherUserSubmission = {
        ...mockSubmission,
        userId: 'other-user',
      };
      prismaService.formSubmission.findUnique.mockResolvedValue(
        otherUserSubmission,
      );

      // Act & Assert
      await expect(
        service.createAppointment(createAppointmentDto, 'user-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when appointment already exists', async () => {
      // Arrange
      prismaService.formSubmission.findUnique.mockResolvedValue(mockSubmission);
      prismaService.biometricAppointment.findUnique.mockResolvedValue(
        mockAppointment,
      );

      // Act & Assert
      await expect(
        service.createAppointment(createAppointmentDto, 'user-1', 'user-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when payment does not exist', async () => {
      // Arrange
      const submissionWithoutPayment = {
        ...mockSubmission,
        payment: null,
      };
      prismaService.formSubmission.findUnique.mockResolvedValue(
        submissionWithoutPayment,
      );
      prismaService.biometricAppointment.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createAppointment(createAppointmentDto, 'user-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
      expect(
        await service
          .createAppointment(createAppointmentDto, 'user-1', 'user-1')
          .catch((e) => e.message),
      ).toContain('Payment must be created before booking an appointment');
    });

    it('should throw BadRequestException when payment is not completed', async () => {
      // Arrange
      const submissionWithPendingPayment = {
        ...mockSubmission,
        payment: {
          ...mockPayment,
          status: PaymentStatus.PENDING,
        },
      };
      prismaService.formSubmission.findUnique.mockResolvedValue(
        submissionWithPendingPayment,
      );
      prismaService.biometricAppointment.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createAppointment(createAppointmentDto, 'user-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when center is not active', async () => {
      // Arrange
      const inactiveCenter = {
        ...mockCenter,
        isActive: false,
      };
      prismaService.formSubmission.findUnique.mockResolvedValue(mockSubmission);
      prismaService.biometricAppointment.findUnique.mockResolvedValue(null);
      biometricCentersService.findCenterById.mockResolvedValue(inactiveCenter);

      // Act & Assert
      await expect(
        service.createAppointment(createAppointmentDto, 'user-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when acknowledgments are not complete', async () => {
      // Arrange
      const incompleteAcknowledgmentDto = {
        ...createAppointmentDto,
        confirmationAcknowledged: false,
      };
      prismaService.formSubmission.findUnique.mockResolvedValue(mockSubmission);
      prismaService.biometricAppointment.findUnique.mockResolvedValue(null);
      biometricCentersService.findCenterById.mockResolvedValue(mockCenter);

      // Act & Assert
      await expect(
        service.createAppointment(
          incompleteAcknowledgmentDto,
          'user-1',
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when appointment date is in the past', async () => {
      // Arrange
      const pastDateDto = {
        ...createAppointmentDto,
        appointmentDate: '2020-01-01',
        appointmentTime: '2020-01-01T10:00:00Z',
      };
      prismaService.formSubmission.findUnique.mockResolvedValue(mockSubmission);
      prismaService.biometricAppointment.findUnique.mockResolvedValue(null);
      biometricCentersService.findCenterById.mockResolvedValue(mockCenter);

      // Act & Assert
      await expect(
        service.createAppointment(pastDateDto, 'user-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when center is not available', async () => {
      // Arrange
      prismaService.formSubmission.findUnique.mockResolvedValue(mockSubmission);
      prismaService.biometricAppointment.findUnique.mockResolvedValue(null);
      biometricCentersService.findCenterById.mockResolvedValue(mockCenter);
      biometricCentersService.checkCenterAvailability.mockResolvedValue(false);

      // Act & Assert
      await expect(
        service.createAppointment(createAppointmentDto, 'user-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when time slot is already booked', async () => {
      // Arrange
      prismaService.formSubmission.findUnique.mockResolvedValue(mockSubmission);
      prismaService.biometricAppointment.findUnique.mockResolvedValue(null);
      biometricCentersService.findCenterById.mockResolvedValue(mockCenter);
      biometricCentersService.checkCenterAvailability.mockResolvedValue(true);
      prismaService.biometricAppointment.findFirst.mockResolvedValue(
        mockAppointment,
      );

      // Act & Assert
      await expect(
        service.createAppointment(createAppointmentDto, 'user-1', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rescheduleAppointment', () => {
    const rescheduleDto = {
      appointmentDate: '2026-07-20',
      appointmentTime: '2026-07-20T14:00:00Z',
      rescheduleReason: 'Unable to attend due to medical emergency',
      centerId: 'center-2',
    };

    it('should reschedule appointment successfully', async () => {
      // Arrange
      const rescheduleableAppointment = {
        ...mockAppointment,
        status: AppointmentStatus.ACTIVE,
      };

      const rescheduledAppointment = {
        ...rescheduleableAppointment,
        status: AppointmentStatus.RESCHEDULED,
        appointmentDate: new Date('2026-07-20'),
        appointmentTime: new Date('2026-07-20T14:00:00Z'),
        rescheduleCount: 1,
      };

      prismaService.biometricAppointment.findFirst.mockResolvedValue(
        rescheduleableAppointment,
      );
      biometricCentersService.findCenterById.mockResolvedValue(mockCenter);
      biometricCentersService.checkCenterAvailability.mockResolvedValue(true);
      prismaService.biometricAppointment.findFirst
        .mockResolvedValueOnce(rescheduleableAppointment) // For findAppointmentById
        .mockResolvedValueOnce(null); // For conflict check
      prismaService.biometricAppointment.update.mockResolvedValue(
        rescheduledAppointment,
      );

      // Act
      const result = await service.rescheduleAppointment(
        'appointment-1',
        rescheduleDto,
        'user-1',
        'user-1',
      );

      // Assert
      expect(result).toEqual(rescheduledAppointment);
      expect(prismaService.biometricAppointment.update).toHaveBeenCalledWith({
        where: { id: 'appointment-1' },
        data: expect.objectContaining({
          status: AppointmentStatus.RESCHEDULED,
          rescheduleCount: { increment: 1 },
        }),
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException when appointment cannot be rescheduled', async () => {
      // Arrange
      const completedAppointment = {
        ...mockAppointment,
        status: AppointmentStatus.COMPLETED,
      };

      prismaService.biometricAppointment.findFirst.mockResolvedValue(
        completedAppointment,
      );

      // Act & Assert
      await expect(
        service.rescheduleAppointment(
          'appointment-1',
          rescheduleDto,
          'user-1',
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeBiometricCapture', () => {
    const captureDto = {
      captureQuality: 'Excellent - All biometrics captured successfully',
      adminNotes: 'Patient was cooperative',
    };

    it('should complete biometric capture successfully', async () => {
      // Arrange
      const activeAppointment = {
        ...mockAppointment,
        status: AppointmentStatus.ACTIVE,
      };

      const completedAppointment = {
        ...activeAppointment,
        status: AppointmentStatus.COMPLETED,
        biometricsCaptured: true,
        capturedAt: new Date(),
        capturedBy: 'staff-1',
      };

      prismaService.biometricAppointment.findFirst.mockResolvedValue(
        activeAppointment,
      );
      prismaService.biometricAppointment.update.mockResolvedValue(
        completedAppointment,
      );

      // Act
      const result = await service.completeBiometricCapture(
        'appointment-1',
        captureDto,
        'staff-1',
      );

      // Assert
      expect(result).toEqual(completedAppointment);
      expect(prismaService.biometricAppointment.update).toHaveBeenCalledWith({
        where: { id: 'appointment-1' },
        data: expect.objectContaining({
          status: AppointmentStatus.COMPLETED,
          biometricsCaptured: true,
          capturedBy: 'staff-1',
          captureQuality: captureDto.captureQuality,
        }),
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException when appointment is not active', async () => {
      // Arrange
      const pendingAppointment = {
        ...mockAppointment,
        status: AppointmentStatus.PENDING,
      };

      prismaService.biometricAppointment.findFirst.mockResolvedValue(
        pendingAppointment,
      );

      // Act & Assert
      await expect(
        service.completeBiometricCapture(
          'appointment-1',
          captureDto,
          'staff-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelAppointment', () => {
    it('should cancel appointment successfully', async () => {
      // Arrange
      const cancellableAppointment = {
        ...mockAppointment,
        status: AppointmentStatus.ACTIVE,
      };

      const cancelledAppointment = {
        ...cancellableAppointment,
        status: AppointmentStatus.CANCELLED,
      };

      prismaService.biometricAppointment.findFirst.mockResolvedValue(
        cancellableAppointment,
      );
      prismaService.biometricAppointment.update.mockResolvedValue(
        cancelledAppointment,
      );

      // Act
      const result = await service.cancelAppointment(
        'appointment-1',
        'Emergency cancellation',
        'user-1',
        'user-1',
      );

      // Assert
      expect(result).toEqual(cancelledAppointment);
      expect(prismaService.biometricAppointment.update).toHaveBeenCalledWith({
        where: { id: 'appointment-1' },
        data: expect.objectContaining({
          status: AppointmentStatus.CANCELLED,
          adminNotes: 'Emergency cancellation',
        }),
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException when appointment cannot be cancelled', async () => {
      // Arrange
      const completedAppointment = {
        ...mockAppointment,
        status: AppointmentStatus.COMPLETED,
      };

      prismaService.biometricAppointment.findFirst.mockResolvedValue(
        completedAppointment,
      );

      // Act & Assert
      await expect(
        service.cancelAppointment(
          'appointment-1',
          'reason',
          'user-1',
          'user-1',
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllAppointments', () => {
    it('should return paginated appointments', async () => {
      // Arrange
      const mockAppointments = [mockAppointment];
      const totalCount = 1;

      prismaService.biometricAppointment.findMany.mockResolvedValue(
        mockAppointments,
      );
      prismaService.biometricAppointment.count.mockResolvedValue(totalCount);

      // Act
      const result = await service.findAllAppointments(
        { status: AppointmentStatus.ACTIVE },
        { page: 1, limit: 10 },
        'user-1',
      );

      // Assert
      expect(result.data).toEqual(mockAppointments);
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
        status: AppointmentStatus.ACTIVE,
        appointmentClass: AppointmentClass.VIP,
        centerId: 'center-1',
        fromDate: '2026-06-01',
        toDate: '2026-06-30',
        biometricsCaptured: false,
      };

      prismaService.biometricAppointment.findMany.mockResolvedValue([]);
      prismaService.biometricAppointment.count.mockResolvedValue(0);

      // Act
      await service.findAllAppointments(filters, { page: 1, limit: 10 });

      // Assert
      expect(prismaService.biometricAppointment.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          status: AppointmentStatus.ACTIVE,
          appointmentClass: AppointmentClass.VIP,
          centerId: 'center-1',
          appointmentDate: {
            gte: new Date('2026-06-01'),
            lte: new Date('2026-06-30'),
          },
          biometricsCaptured: false,
        }),
        skip: 0,
        take: 10,
        orderBy: [{ appointmentDate: 'asc' }, { appointmentTime: 'asc' }],
        include: expect.any(Object),
      });
    });
  });

  describe('getAppointmentStatistics', () => {
    it('should return appointment statistics', async () => {
      // Arrange
      prismaService.biometricAppointment.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(60) // active
        .mockResolvedValueOnce(30) // completed
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(5); // cancelled

      prismaService.biometricAppointment.groupBy.mockResolvedValue([
        { status: AppointmentStatus.ACTIVE, _count: { _all: 60 } },
        { status: AppointmentStatus.COMPLETED, _count: { _all: 30 } },
      ]);

      // Act
      const result = await service.getAppointmentStatistics();

      // Assert
      expect(result).toEqual({
        totalAppointments: 100,
        activeAppointments: 60,
        completedAppointments: 30,
        pendingAppointments: 5,
        cancelledAppointments: 5,
        statusBreakdown: expect.any(Array),
        completionRate: 30,
      });
    });

    it('should filter statistics by center when provided', async () => {
      // Arrange
      prismaService.biometricAppointment.count.mockResolvedValue(0);
      prismaService.biometricAppointment.groupBy.mockResolvedValue([]);

      // Act
      await service.getAppointmentStatistics('center-1');

      // Assert
      expect(prismaService.biometricAppointment.count).toHaveBeenCalledWith({
        where: { centerId: 'center-1' },
      });
    });
  });

  describe('findAppointmentById', () => {
    it('should return appointment when found', async () => {
      // Arrange
      prismaService.biometricAppointment.findFirst.mockResolvedValue(
        mockAppointment,
      );

      // Act
      const result = await service.findAppointmentById(
        'appointment-1',
        'user-1',
      );

      // Assert
      expect(result).toEqual(mockAppointment);
      expect(prismaService.biometricAppointment.findFirst).toHaveBeenCalledWith(
        {
          where: { id: 'appointment-1', userId: 'user-1' },
          include: expect.any(Object),
        },
      );
    });

    it('should throw NotFoundException when appointment not found', async () => {
      // Arrange
      prismaService.biometricAppointment.findFirst.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.findAppointmentById('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
