import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { LicenseNumberService } from '@common/services/license-number.service';
import { TravelAgentLicenseStatus } from '@prisma/client';

@Injectable()
export class TravelAgentLicenseService {
  private readonly logger = new Logger(TravelAgentLicenseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly licenseNumberService: LicenseNumberService,
  ) {}

  /**
   * Create a new license when application is approved
   */
  async createLicense(
    applicationId: string,
    userId: string,
    issuedBy: string,
  ): Promise<any> {
    try {
      // Generate license number
      const licenseNumber =
        await this.licenseNumberService.generateTravelAgentLicenseNumber();
      const expiresAt = this.licenseNumberService.calculateLicenseExpiryDate();

      // Create the license
      const license = await this.prisma.travelAgentLicense.create({
        data: {
          userId,
          licenseNumber,
          status: TravelAgentLicenseStatus.ACTIVE,
          issuedAt: new Date(),
          expiresAt,
          ...(applicationId && { applicationId }),
          ...(issuedBy && { issuedBy }),
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          application: {
            select: {
              id: true,
              applicationType: true,
              companyName: true,
            },
          },
        },
      });

      this.logger.log(`Created license ${licenseNumber} for user ${userId}`);
      return license;
    } catch (error) {
      this.logger.error(
        `Failed to create license for application ${applicationId}:`,
        error,
      );
      throw new Error('Failed to create license');
    }
  }

  /**
   * Get license by user ID
   */
  async getLicenseByUserId(userId: string): Promise<any> {
    const license = await this.prisma.travelAgentLicense.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        application: {
          select: {
            id: true,
            applicationType: true,
            companyName: true,
          },
        },
      },
    });

    if (!license) {
      throw new NotFoundException('License not found');
    }

    return license;
  }

  /**
   * Get license by license number
   */
  async getLicenseByNumber(licenseNumber: string): Promise<any> {
    const license = await this.prisma.travelAgentLicense.findUnique({
      where: { licenseNumber },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        application: {
          select: {
            id: true,
            applicationType: true,
            companyName: true,
          },
        },
      },
    });

    if (!license) {
      throw new NotFoundException('License not found');
    }

    return license;
  }

  /**
   * Check if license is valid (active and not expired)
   */
  async isLicenseValid(userId: string): Promise<boolean> {
    try {
      const license = await this.getLicenseByUserId(userId);

      if (license.status !== TravelAgentLicenseStatus.ACTIVE) {
        return false;
      }

      return !this.licenseNumberService.isLicenseExpired(license.expiresAt);
    } catch (error) {
      return false;
    }
  }

  /**
   * Renew an expired license
   */
  async renewLicense(userId: string, renewedBy: string): Promise<any> {
    const existingLicense = await this.getLicenseByUserId(userId);

    if (existingLicense.status !== TravelAgentLicenseStatus.EXPIRED) {
      throw new BadRequestException(
        'License is not expired and cannot be renewed',
      );
    }

    // Generate new license number
    const newLicenseNumber =
      await this.licenseNumberService.generateTravelAgentLicenseNumber();
    const newExpiresAt = this.licenseNumberService.calculateLicenseExpiryDate();

    // Mark old license as expired
    await this.prisma.travelAgentLicense.update({
      where: { id: existingLicense.id },
      data: {
        status: TravelAgentLicenseStatus.EXPIRED,
      },
    });

    // Create renewal record
    const renewedLicense = await this.prisma.travelAgentLicenseRenewal.create({
      data: {
        licenseId: existingLicense.id,
        renewedAt: new Date(),
        newExpiry: newExpiresAt,
        reference: newLicenseNumber,
      },
      include: {
        license: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
            application: {
              select: {
                id: true,
                applicationType: true,
                companyName: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(
      `Renewed license for user ${userId}: ${existingLicense.licenseNumber} -> ${newLicenseNumber}`,
    );
    return renewedLicense;
  }

  /**
   * Revoke a license
   */
  async revokeLicense(
    userId: string,
    revokedBy: string,
    reason: string,
  ): Promise<any> {
    const license = await this.getLicenseByUserId(userId);

    if (license.status !== TravelAgentLicenseStatus.ACTIVE) {
      throw new BadRequestException(
        'License is not active and cannot be revoked',
      );
    }

    const updatedLicense = await this.prisma.travelAgentLicense.update({
      where: { id: license.id },
      data: {
        status: TravelAgentLicenseStatus.REVOKED,
        revokedAt: new Date(),
        revokedBy,
        revokeReason: reason,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        application: {
          select: {
            id: true,
            applicationType: true,
            companyName: true,
          },
        },
      },
    });

    this.logger.log(
      `Revoked license ${license.licenseNumber} for user ${userId}`,
    );
    return updatedLicense;
  }

  /**
   * Get all licenses with pagination
   */
  async getAllLicenses(
    page = 1,
    limit = 10,
    status?: TravelAgentLicenseStatus,
  ): Promise<any> {
    const skip = (page - 1) * limit;
    const where = status ? { status } : {};

    const [licenses, total] = await Promise.all([
      this.prisma.travelAgentLicense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { issuedAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          application: {
            select: {
              id: true,
              applicationType: true,
              companyName: true,
            },
          },
        },
      }),
      this.prisma.travelAgentLicense.count({ where }),
    ]);

    return {
      licenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get license statistics
   */
  async getLicenseStatistics(): Promise<any> {
    const [total, active, expired, revoked, suspended] = await Promise.all([
      this.prisma.travelAgentLicense.count(),
      this.prisma.travelAgentLicense.count({
        where: { status: TravelAgentLicenseStatus.ACTIVE },
      }),
      this.prisma.travelAgentLicense.count({
        where: { status: TravelAgentLicenseStatus.EXPIRED },
      }),
      this.prisma.travelAgentLicense.count({
        where: { status: TravelAgentLicenseStatus.REVOKED },
      }),
      this.prisma.travelAgentLicense.count({
        where: { status: TravelAgentLicenseStatus.SUSPENDED },
      }),
    ]);

    return {
      total,
      active,
      expired,
      revoked,
      suspended,
    };
  }
}
