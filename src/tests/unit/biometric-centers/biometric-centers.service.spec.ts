import { Test, TestingModule } from '@nestjs/testing';
import { BiometricCentersService } from '@modules/biometric-centers/biometric-centers.service';
import { PrismaService } from '@providers/prisma/prisma.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

// Mock data
const mockManager = {
  id: 'manager-1',
  firstName: 'Jane',
  lastName: 'Smith',
  email: 'jane@example.com',
};

const mockCenter = {
  id: 'center-1',
  name: 'ASFAAR-ABUJA HQ',
  code: 'ASF-ABJ-HQ',
  address: '14 Yedseram Street, Maitama',
  city: 'Abuja',
  state: 'FCT',
  country: 'Nigeria',
  postalCode: '900271',
  phone: '+2347007004001',
  email: 'info@asfaarvisaservices.com',
  website: 'https://asfaarvisaservices.com',
  isActive: true,
  capacity: 100,
  openingTime: '08:00',
  closingTime: '17:00',
  workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  appointmentDuration: 30,
  bufferTime: 15,
  servicesOffered: ['Biometric Capture', 'Document Verification'],
  specialFacilities: ['Wheelchair Access', 'Parking'],
  managerId: 'manager-1',
  manager: mockManager,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  createdBy: 'admin-1',
  lastModifiedBy: null,
};

const mockAppointment = {
  id: 'appointment-1',
  centerId: 'center-1',
  status: 'ACTIVE',
  appointmentDate: new Date('2024-02-15'),
  appointmentTime: new Date('2024-02-15T10:00:00Z'),
};

// Mock classes
class MockPrismaService {
  biometricCenter = {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  biometricAppointment = {
    count: jest.fn(),
    findMany: jest.fn(),
  };

  user = {
    findUnique: jest.fn(),
  };
}

describe('BiometricCentersService', () => {
  let service: BiometricCentersService;
  let prismaService: MockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BiometricCentersService,
        {
          provide: PrismaService,
          useClass: MockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BiometricCentersService>(BiometricCentersService);
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

  describe('createCenter', () => {
    const createCenterDto = {
      name: 'ASFAAR-LAGOS IKEJA',
      code: 'ASF-LAG-IKJ',
      address: '123 Allen Avenue, Ikeja',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      phone: '+2347007004002',
      email: 'lagos@asfaarvisaservices.com',
      isActive: true,
      capacity: 80,
      openingTime: '08:00',
      closingTime: '17:00',
      workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      appointmentDuration: 30,
      bufferTime: 15,
      servicesOffered: ['Biometric Capture'],
      specialFacilities: ['Parking'],
      managerId: 'manager-1',
    };

    it('should create center successfully', async () => {
      // Arrange
      prismaService.biometricCenter.findFirst.mockResolvedValue(null); // duplicate check
      prismaService.user.findUnique.mockResolvedValue(mockManager);
      prismaService.biometricCenter.create.mockResolvedValue(mockCenter);

      // Act
      const result = await service.createCenter(createCenterDto, 'admin-1');

      // Assert
      expect(result).toEqual(mockCenter);
      expect(prismaService.biometricCenter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ...createCenterDto,
            createdBy: 'admin-1',
          }),
        }),
      );
    });

    it('should throw ConflictException when name already exists', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockManager); // Mock manager found
      const conflictingCenter = { ...mockCenter, name: createCenterDto.name }; // Same name
      prismaService.biometricCenter.findFirst.mockResolvedValue(
        conflictingCenter,
      );

      // Act & Assert
      await expect(
        service.createCenter(createCenterDto, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when code already exists', async () => {
      // Arrange
      prismaService.user.findUnique.mockResolvedValue(mockManager); // Mock manager found
      const conflictingCenter = { ...mockCenter, code: createCenterDto.code }; // Same code
      prismaService.biometricCenter.findFirst.mockResolvedValue(
        conflictingCenter,
      );

      // Act & Assert
      await expect(
        service.createCenter(createCenterDto, 'admin-1'),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when manager does not exist', async () => {
      // Arrange
      prismaService.biometricCenter.findFirst.mockResolvedValue(null);
      prismaService.user.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.createCenter(createCenterDto, 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should set default values when not provided', async () => {
      // Arrange
      const minimalDto = {
        name: 'Test Center',
        code: 'TEST-001',
        address: 'Test Address',
        city: 'Test City',
        state: 'Test State',
      };

      prismaService.biometricCenter.findFirst.mockResolvedValue(null);
      prismaService.user.findUnique.mockResolvedValue(null); // No manager for this test
      prismaService.biometricCenter.create.mockResolvedValue({
        ...mockCenter,
        ...minimalDto,
      });

      // Act
      await service.createCenter(minimalDto, 'admin-1');

      // Assert
      expect(prismaService.biometricCenter.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            country: 'Nigeria', // default value
            appointmentDuration: 30, // default value
            bufferTime: 15, // default value
            workingDays: [
              'MONDAY',
              'TUESDAY',
              'WEDNESDAY',
              'THURSDAY',
              'FRIDAY',
            ], // default
          }),
        }),
      );
    });
  });

  describe('findAllCenters', () => {
    it('should return paginated centers', async () => {
      // Arrange
      const mockCenters = [mockCenter];
      const totalCount = 1;
      const appointmentCounts = [{ centerId: 'center-1', _count: { _all: 5 } }];

      prismaService.biometricCenter.findMany.mockResolvedValue(mockCenters);
      prismaService.biometricCenter.count.mockResolvedValue(totalCount);
      prismaService.biometricAppointment.count.mockResolvedValue(5);

      // Act
      const result = await service.findAllCenters(
        { isActive: true },
        { page: 1, limit: 10 },
      );

      // Assert
      expect(result.data).toEqual(mockCenters);
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
        isActive: true,
        city: 'Abuja',
        state: 'FCT',
        search: 'ASFAAR',
      };

      prismaService.biometricCenter.findMany.mockResolvedValue([]);
      prismaService.biometricCenter.count.mockResolvedValue(0);

      // Act
      await service.findAllCenters(filters, { page: 1, limit: 10 });

      // Assert
      expect(prismaService.biometricCenter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            city: expect.objectContaining({
              contains: 'Abuja',
              mode: 'insensitive',
            }),
            state: expect.objectContaining({
              contains: 'FCT',
              mode: 'insensitive',
            }),
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: expect.objectContaining({
                  contains: 'ASFAAR',
                  mode: 'insensitive',
                }),
              }),
            ]),
          }),
          skip: 0,
          take: 10,
          orderBy: expect.arrayContaining([
            expect.objectContaining({ isActive: 'desc' }),
            expect.objectContaining({ name: 'asc' }),
          ]),
          include: expect.any(Object),
        }),
      );
    });
  });

  describe('findCenterById', () => {
    it('should return center when found', async () => {
      // Arrange
      prismaService.biometricCenter.findUnique.mockResolvedValue(mockCenter);

      // Act
      const result = await service.findCenterById('center-1');

      // Assert
      expect(result).toEqual(mockCenter);
      expect(prismaService.biometricCenter.findUnique).toHaveBeenCalledWith({
        where: { id: 'center-1' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when center not found', async () => {
      // Arrange
      prismaService.biometricCenter.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findCenterById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findCenterByCode', () => {
    it('should return center when found', async () => {
      // Arrange
      prismaService.biometricCenter.findUnique.mockResolvedValue(mockCenter);

      // Act
      const result = await service.findCenterByCode('ASF-ABJ-HQ');

      // Assert
      expect(result).toEqual(mockCenter);
      expect(prismaService.biometricCenter.findUnique).toHaveBeenCalledWith({
        where: { code: 'ASF-ABJ-HQ' },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException when center not found', async () => {
      // Arrange
      prismaService.biometricCenter.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(service.findCenterByCode('NONEXISTENT')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateCenter', () => {
    const updateCenterDto = {
      name: 'Updated Center Name',
      phone: '+2347007004999',
      isActive: false,
    };

    it('should update center successfully', async () => {
      // Arrange
      const updatedCenter = {
        ...mockCenter,
        ...updateCenterDto,
      };

      prismaService.biometricCenter.findUnique
        .mockResolvedValueOnce(mockCenter) // find center
        .mockResolvedValueOnce(null) // name conflict check
        .mockResolvedValueOnce(null); // code conflict check
      prismaService.biometricCenter.update.mockResolvedValue(updatedCenter);

      // Act
      const result = await service.updateCenter(
        'center-1',
        updateCenterDto,
        'admin-1',
      );

      // Assert
      expect(result).toEqual(updatedCenter);
      expect(prismaService.biometricCenter.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'center-1' },
          data: expect.objectContaining({
            ...updateCenterDto,
            lastModifiedBy: 'admin-1',
          }),
        }),
      );
    });

    it('should throw NotFoundException when center does not exist', async () => {
      // Arrange
      prismaService.biometricCenter.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.updateCenter('nonexistent', updateCenterDto, 'admin-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteCenterSoft', () => {
    it('should soft delete center successfully', async () => {
      // Arrange
      const deactivatedCenter = {
        ...mockCenter,
        isActive: false,
      };

      prismaService.biometricCenter.findUnique.mockResolvedValue(mockCenter);
      prismaService.biometricAppointment.count.mockResolvedValue(0);
      prismaService.biometricCenter.update.mockResolvedValue(deactivatedCenter);

      // Act
      const result = await service.deleteCenterSoft('center-1', 'admin-1');

      // Assert
      expect(result).toEqual(deactivatedCenter);
      expect(prismaService.biometricCenter.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'center-1' },
          data: expect.objectContaining({
            isActive: false,
            lastModifiedBy: 'admin-1',
          }),
        }),
      );
    });

    it('should throw BadRequestException when center has active appointments', async () => {
      // Arrange
      prismaService.biometricCenter.findUnique.mockResolvedValue(mockCenter);
      prismaService.biometricAppointment.count.mockResolvedValue(5);

      // Act & Assert
      await expect(
        service.deleteCenterSoft('center-1', 'admin-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findActiveCentersByCity', () => {
    it('should return active centers in city', async () => {
      // Arrange
      const mockCenters = [mockCenter];
      prismaService.biometricCenter.findMany.mockResolvedValue(mockCenters);

      // Act
      const result = await service.findActiveCentersByCity('Abuja');

      // Assert
      expect(result).toEqual(mockCenters);
      expect(prismaService.biometricCenter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            city: expect.objectContaining({
              contains: 'Abuja',
              mode: 'insensitive',
            }),
            isActive: true,
          }),
          orderBy: expect.objectContaining({ name: 'asc' }),
        }),
      );
    });
  });

  describe('findActiveCentersByState', () => {
    it('should return active centers in state', async () => {
      // Arrange
      const mockCenters = [mockCenter];
      prismaService.biometricCenter.findMany.mockResolvedValue(mockCenters);

      // Act
      const result = await service.findActiveCentersByState('FCT');

      // Assert
      expect(result).toEqual(mockCenters);
      expect(prismaService.biometricCenter.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            state: expect.objectContaining({
              contains: 'FCT',
              mode: 'insensitive',
            }),
            isActive: true,
          }),
          orderBy: expect.objectContaining({ name: 'asc' }),
        }),
      );
    });
  });

  describe('checkCenterAvailability', () => {
    it('should return true when center is available', async () => {
      // Arrange
      const availableCenter = {
        ...mockCenter,
        isActive: true,
        capacity: 100,
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      };

      prismaService.biometricCenter.findUnique.mockResolvedValue(
        availableCenter,
      );
      prismaService.biometricAppointment.count.mockResolvedValue(20); // 20 booked slots

      // Test for a Monday
      const monday = new Date('2026-06-15'); // A Monday

      // Act
      const result = await service.checkCenterAvailability('center-1', monday);

      // Assert
      expect(result).toEqual({
        isAvailable: true,
        capacity: 100,
        bookedSlots: 20,
        availableSlots: 80,
      });
    });

    it('should return false when center is not active', async () => {
      // Arrange
      const inactiveCenter = {
        ...mockCenter,
        isActive: false,
      };

      prismaService.biometricCenter.findUnique.mockResolvedValue(
        inactiveCenter,
      );

      // Act
      const result = await service.checkCenterAvailability(
        'center-1',
        new Date('2026-06-15'),
      );

      // Assert
      expect(result).toEqual(
        expect.objectContaining({
          isAvailable: false,
          capacity: 0,
          bookedSlots: 0,
          availableSlots: 0,
        }),
      );
    });

    it('should return availability based on capacity and bookings', async () => {
      // Arrange
      const availableCenter = {
        ...mockCenter,
        isActive: true,
        capacity: 100,
        workingDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
      };

      prismaService.biometricCenter.findUnique.mockResolvedValue(
        availableCenter,
      );
      prismaService.biometricAppointment.count.mockResolvedValue(100); // Fully booked

      // Test for a Saturday
      const saturday = new Date('2026-06-13'); // A Saturday

      // Act
      const result = await service.checkCenterAvailability(
        'center-1',
        saturday,
      );

      // Assert
      expect(result).toEqual({
        isAvailable: false, // No available slots because fully booked
        capacity: 100,
        bookedSlots: 100,
        availableSlots: 0,
      });
    });

    it('should throw NotFoundException when center does not exist', async () => {
      // Arrange
      prismaService.biometricCenter.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.checkCenterAvailability('nonexistent', new Date()),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
