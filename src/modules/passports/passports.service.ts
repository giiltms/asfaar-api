import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { LocalStorageService } from '@providers/localstorage/localstorage.service';
import {
  CreatePassportDto,
  CreatePassportMultipartDto,
  UpdatePassportDto,
  VerifyPassportDto,
  PassportQueryDto,
  PassportType,
  VerificationStatus,
} from './dto/passport.dto';
import { PassportEntity } from './entities/passport.entity';

@Injectable()
export class PassportsService {
  private readonly logger = new Logger(PassportsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly localStorageService: LocalStorageService,
  ) {}

  /**
   * Create a new passport for a user
   */
  async createPassport(
    userId: string,
    createPassportDto: CreatePassportDto,
    createdBy: string,
  ): Promise<PassportEntity> {
    this.logger.log(`Creating passport for user ${userId}`);

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if passport number already exists for this user
    const existingPassport = await this.prisma.internationalPassport.findFirst({
      where: {
        userId,
        passportNumber: createPassportDto.passportNumber,
      },
    });

    if (existingPassport) {
      throw new BadRequestException(
        `Passport with number ${createPassportDto.passportNumber} already exists for this user`,
      );
    }

    // Validate dates
    const issueDate = new Date(createPassportDto.passportIssueDate);
    const expiryDate = new Date(createPassportDto.passportExpiryDate);

    if (issueDate >= expiryDate) {
      throw new BadRequestException('Issue date must be before expiry date');
    }

    if (expiryDate <= new Date()) {
      throw new BadRequestException('Passport is already expired');
    }

    // Compute document hash for integrity verification (always server-side)
    const documentHash = this.computeDocumentHash(createPassportDto);

    const passport = await this.prisma.internationalPassport.create({
      data: {
        userId,
        passportNumber: createPassportDto.passportNumber,
        passportType: createPassportDto.passportType || PassportType.ORDINARY,
        passportIssueDate: issueDate,
        passportExpiryDate: expiryDate,
        passportIssueCountry: createPassportDto.passportIssueCountry,
        passportPhoto: createPassportDto.passportPhoto,
        passportFrontPhoto: createPassportDto.passportFrontPhoto,
        passportBackPhoto: createPassportDto.passportBackPhoto,
        documentHash,
        documentSize: createPassportDto.documentSize,
        passportMetadata: createPassportDto.passportMetadata,
        createdBy,
        lastModifiedBy: createdBy,
      },
    });

    this.logger.log(`Passport created successfully with ID ${passport.id}`);

    return this.mapToEntity(passport);
  }

  /**
   * Create a new passport for a user with file upload
   */
  async createPassportWithFile(
    userId: string,
    createPassportDto: CreatePassportMultipartDto,
    passportFrontPhotoFile: Express.Multer.File,
    createdBy: string,
  ): Promise<PassportEntity> {
    this.logger.log(`Creating passport with file upload for user ${userId}`);

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if passport number already exists for this user
    const existingPassport = await this.prisma.internationalPassport.findFirst({
      where: {
        userId,
        passportNumber: createPassportDto.passportNumber,
      },
    });

    if (existingPassport) {
      throw new BadRequestException(
        `Passport with number ${createPassportDto.passportNumber} already exists for this user`,
      );
    }

    // Validate dates
    const issueDate = new Date(createPassportDto.passportIssueDate);
    const expiryDate = new Date(createPassportDto.passportExpiryDate);

    if (issueDate >= expiryDate) {
      throw new BadRequestException('Issue date must be before expiry date');
    }

    if (expiryDate <= new Date()) {
      throw new BadRequestException('Passport is already expired');
    }

    // Upload the passport front photo file
    const passportFrontPhotoUrl = await this.localStorageService.upload(
      passportFrontPhotoFile,
      `passports/${userId}`,
    );

    // Calculate file hash and size for integrity verification
    const crypto = require('crypto');
    const fileHash = crypto
      .createHash('sha256')
      .update(passportFrontPhotoFile.buffer)
      .digest('hex');

    // Always use computed hash for file integrity (no user-provided hash)

    const passport = await this.prisma.internationalPassport.create({
      data: {
        userId,
        passportNumber: createPassportDto.passportNumber,
        passportType: createPassportDto.passportType || PassportType.ORDINARY,
        passportIssueDate: issueDate,
        passportExpiryDate: expiryDate,
        passportIssueCountry: createPassportDto.passportIssueCountry,
        passportPhoto: createPassportDto.passportPhoto,
        passportFrontPhoto: passportFrontPhotoUrl,
        passportBackPhoto: createPassportDto.passportBackPhoto,
        documentHash: fileHash, // Always use computed hash for integrity
        documentSize: passportFrontPhotoFile.size,
        passportMetadata: createPassportDto.passportMetadata,
        createdBy,
        lastModifiedBy: createdBy,
      },
    });

    this.logger.log(
      `Passport created successfully with file upload, ID ${passport.id}`,
    );

    return this.mapToEntity(passport);
  }

  /**
   * Get all passports with pagination and filtering
   */
  async findAllPassports(query: PassportQueryDto): Promise<{
    passports: PassportEntity[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 10, ...filters } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (filters.passportNumber) {
      where.passportNumber = {
        contains: filters.passportNumber,
        mode: 'insensitive',
      };
    }

    if (filters.passportType) {
      where.passportType = filters.passportType;
    }

    if (filters.verificationStatus) {
      where.verificationStatus = filters.verificationStatus;
    }

    if (filters.passportIssueCountry) {
      where.passportIssueCountry = filters.passportIssueCountry;
    }

    if (filters.expiredOnly) {
      where.passportExpiryDate = {
        lt: new Date(),
      };
    }

    const [passports, total] = await Promise.all([
      this.prisma.internationalPassport.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.internationalPassport.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      passports: passports.map((passport) => this.mapToEntity(passport)),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Get passports for a specific user
   */
  async findUserPassports(userId: string): Promise<PassportEntity[]> {
    this.logger.log(`Fetching passports for user ${userId}`);

    const passports = await this.prisma.internationalPassport.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return passports.map((passport) => this.mapToEntity(passport));
  }

  /**
   * Get a specific passport by ID
   */
  async findPassportById(id: string): Promise<PassportEntity> {
    this.logger.log(`Fetching passport with ID ${id}`);

    const passport = await this.prisma.internationalPassport.findUnique({
      where: { id },
    });

    if (!passport) {
      throw new NotFoundException(`Passport with ID ${id} not found`);
    }

    return this.mapToEntity(passport);
  }

  /**
   * Update a passport
   */
  async updatePassport(
    id: string,
    updatePassportDto: UpdatePassportDto,
    lastModifiedBy: string,
  ): Promise<PassportEntity> {
    this.logger.log(`Updating passport with ID ${id}`);

    const existingPassport = await this.prisma.internationalPassport.findUnique(
      {
        where: { id },
      },
    );

    if (!existingPassport) {
      throw new NotFoundException(`Passport with ID ${id} not found`);
    }

    // Validate dates if provided
    if (
      updatePassportDto.passportIssueDate ||
      updatePassportDto.passportExpiryDate
    ) {
      const issueDate = updatePassportDto.passportIssueDate
        ? new Date(updatePassportDto.passportIssueDate)
        : existingPassport.passportIssueDate;
      const expiryDate = updatePassportDto.passportExpiryDate
        ? new Date(updatePassportDto.passportExpiryDate)
        : existingPassport.passportExpiryDate;

      if (issueDate >= expiryDate) {
        throw new BadRequestException('Issue date must be before expiry date');
      }
    }

    const passport = await this.prisma.internationalPassport.update({
      where: { id },
      data: {
        ...updatePassportDto,
        passportIssueDate: updatePassportDto.passportIssueDate
          ? new Date(updatePassportDto.passportIssueDate)
          : undefined,
        passportExpiryDate: updatePassportDto.passportExpiryDate
          ? new Date(updatePassportDto.passportExpiryDate)
          : undefined,
        lastModifiedBy,
      },
    });

    this.logger.log(`Passport updated successfully with ID ${id}`);

    return this.mapToEntity(passport);
  }

  /**
   * Verify a passport
   */
  async verifyPassport(
    id: string,
    verifyPassportDto: VerifyPassportDto,
    verifiedBy: string,
  ): Promise<PassportEntity> {
    this.logger.log(`Verifying passport with ID ${id}`);

    const existingPassport = await this.prisma.internationalPassport.findUnique(
      {
        where: { id },
      },
    );

    if (!existingPassport) {
      throw new NotFoundException(`Passport with ID ${id} not found`);
    }

    const passport = await this.prisma.internationalPassport.update({
      where: { id },
      data: {
        isVerified:
          verifyPassportDto.verificationStatus === VerificationStatus.VERIFIED,
        verificationStatus: verifyPassportDto.verificationStatus,
        verificationNotes: verifyPassportDto.verificationNotes,
        verifiedAt: new Date(),
        verifiedBy,
        lastModifiedBy: verifiedBy,
      },
    });

    this.logger.log(`Passport verification updated for ID ${id}`);

    return this.mapToEntity(passport);
  }

  /**
   * Delete a passport
   */
  async deletePassport(id: string): Promise<void> {
    this.logger.log(`Deleting passport with ID ${id}`);

    const existingPassport = await this.prisma.internationalPassport.findUnique(
      {
        where: { id },
      },
    );

    if (!existingPassport) {
      throw new NotFoundException(`Passport with ID ${id} not found`);
    }

    await this.prisma.internationalPassport.delete({
      where: { id },
    });

    this.logger.log(`Passport deleted successfully with ID ${id}`);
  }

  /**
   * Get passport statistics
   */
  async getPassportStatistics(): Promise<{
    total: number;
    verified: number;
    pending: number;
    rejected: number;
    expired: number;
    byType: Record<string, number>;
    byCountry: Record<string, number>;
  }> {
    const [total, verified, pending, rejected, expired, byType, byCountry] =
      await Promise.all([
        this.prisma.internationalPassport.count(),
        this.prisma.internationalPassport.count({
          where: { verificationStatus: VerificationStatus.VERIFIED },
        }),
        this.prisma.internationalPassport.count({
          where: { verificationStatus: VerificationStatus.PENDING },
        }),
        this.prisma.internationalPassport.count({
          where: { verificationStatus: VerificationStatus.REJECTED },
        }),
        this.prisma.internationalPassport.count({
          where: { passportExpiryDate: { lt: new Date() } },
        }),
        this.prisma.internationalPassport.groupBy({
          by: ['passportType'],
          _count: { passportType: true },
        }),
        this.prisma.internationalPassport.groupBy({
          by: ['passportIssueCountry'],
          _count: { passportIssueCountry: true },
        }),
      ]);

    return {
      total,
      verified,
      pending,
      rejected,
      expired,
      byType: byType.reduce((acc, item) => {
        acc[item.passportType] = item._count.passportType;
        return acc;
      }, {} as Record<string, number>),
      byCountry: byCountry.reduce((acc, item) => {
        acc[item.passportIssueCountry] = item._count.passportIssueCountry;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Compute document hash for integrity verification
   */
  private computeDocumentHash(data: any): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');

    // Hash the passport data for integrity
    const passportData = {
      passportNumber: data.passportNumber,
      passportType: data.passportType,
      passportIssueDate: data.passportIssueDate,
      passportExpiryDate: data.passportExpiryDate,
      passportIssueCountry: data.passportIssueCountry,
      passportPhoto: data.passportPhoto,
      passportFrontPhoto: data.passportFrontPhoto,
      passportBackPhoto: data.passportBackPhoto,
      passportMetadata: data.passportMetadata,
    };

    hash.update(JSON.stringify(passportData));
    return hash.digest('hex');
  }

  /**
   * Map Prisma model to entity
   */
  private mapToEntity(passport: any): PassportEntity {
    const now = new Date();
    const expiryDate = new Date(passport.passportExpiryDate);
    const daysUntilExpiry = Math.ceil(
      (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    );

    return {
      id: passport.id,
      userId: passport.userId,
      passportNumber: passport.passportNumber,
      passportType: passport.passportType,
      passportIssueDate: passport.passportIssueDate,
      passportExpiryDate: passport.passportExpiryDate,
      passportIssueCountry: passport.passportIssueCountry,
      passportPhoto: passport.passportPhoto,
      passportFrontPhoto: passport.passportFrontPhoto,
      passportBackPhoto: passport.passportBackPhoto,
      isVerified: passport.isVerified,
      verificationStatus: passport.verificationStatus,
      verificationNotes: passport.verificationNotes,
      verifiedAt: passport.verifiedAt,
      verifiedBy: passport.verifiedBy,
      documentHash: passport.documentHash,
      documentSize: passport.documentSize,
      passportMetadata: passport.passportMetadata,
      createdAt: passport.createdAt,
      updatedAt: passport.updatedAt,
      createdBy: passport.createdBy,
      lastModifiedBy: passport.lastModifiedBy,
      isExpired: expiryDate <= now,
      daysUntilExpiry,
    };
  }
}
