import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from '@modules/user/user.service';
import { UserRepository } from '@modules/user/user.repository';
import { PrismaService } from '@providers/prisma/prisma.service';
import { AuditService } from '@modules/audit/audit.service';

describe('UserService', () => {
  let service: UserService;

  const mockUserRepository = {
    findById: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    updateUser: jest.fn(),
    deleteUser: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    biometricCenter: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: UserRepository,
          useValue: mockUserRepository,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: 'AuditService',
          useValue: {
            createAuditLog: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Basic functionality', () => {
    it('should have getUsers method', () => {
      expect(typeof service.getUsers).toBe('function');
    });

    it('should have findById method', () => {
      expect(typeof service.findById).toBe('function');
    });

    it('should have findOne method', () => {
      expect(typeof service.findOne).toBe('function');
    });

    it('should have findByEmail method', () => {
      expect(typeof service.findByEmail).toBe('function');
    });

    it('should have createUser method', () => {
      expect(typeof service.createUser).toBe('function');
    });

    it('should have updateUser method', () => {
      expect(typeof service.updateUser).toBe('function');
    });

    it('should have deleteUser method', () => {
      expect(typeof service.deleteUser).toBe('function');
    });

    it('should have setUserRole method', () => {
      expect(typeof service.setUserRole).toBe('function');
    });

    it('should have activateUser method', () => {
      expect(typeof service.activateUser).toBe('function');
    });

    it('should have deactivateUser method', () => {
      expect(typeof service.deactivateUser).toBe('function');
    });

    it('should have verifyUser method', () => {
      expect(typeof service.verifyUser).toBe('function');
    });
  });
});
