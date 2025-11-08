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
      // Get application to determine license type
      const application =
        await this.prisma.travelAgentUpgradeApplication.findUnique({
          where: { id: applicationId },
          select: { applicationType: true },
        });

      if (!application) {
        throw new Error(`Application ${applicationId} not found`);
      }

      // Generate license number
      const licenseNumber =
        await this.licenseNumberService.generateTravelAgentLicenseNumber();

      // Get configured license duration
      const durationDays = await this.getConfiguredLicenseDuration();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + durationDays);

      // Create the license
      const license = await this.prisma.travelAgentLicense.create({
        data: {
          userId,
          licenseNumber,
          licenseType: application.applicationType,
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
            travelAgentProfile: {
              select: {
                id: true,
              },
            },
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
            travelAgentProfile: {
              select: {
                id: true,
              },
            },
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
  async renewLicense(userId: string): Promise<any> {
    const existingLicense = await this.getLicenseByUserId(userId);

    if (existingLicense.status !== TravelAgentLicenseStatus.EXPIRED) {
      throw new BadRequestException(
        'License is not expired and cannot be renewed',
      );
    }

    // Generate new license number
    const newLicenseNumber =
      await this.licenseNumberService.generateTravelAgentLicenseNumber();

    // Get configured license duration for renewal
    const durationDays = await this.getConfiguredLicenseDuration();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + durationDays);

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
    licenseId: string,
    revokedBy: string,
    reason: string,
  ): Promise<any> {
    const license = await this.prisma.travelAgentLicense.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      throw new NotFoundException('License not found');
    }

    if (license.status !== TravelAgentLicenseStatus.ACTIVE) {
      throw new BadRequestException(
        'License is not active and cannot be revoked',
      );
    }

    const updatedLicense = await this.prisma.travelAgentLicense.update({
      where: { id: licenseId },
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
      `Revoked license ${license.licenseNumber} (ID: ${licenseId}) for user ${license.userId}`,
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

  /**
   * Get license by ID
   */
  async getLicenseById(licenseId: string): Promise<any> {
    const license = await this.prisma.travelAgentLicense.findUnique({
      where: { id: licenseId },
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
   * Suspend a license
   */
  async suspendLicense(
    licenseId: string,
    suspendedBy: string,
    reason: string,
  ): Promise<any> {
    const license = await this.prisma.travelAgentLicense.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      throw new NotFoundException('License not found');
    }

    if (license.status !== 'ACTIVE') {
      throw new BadRequestException('Only active licenses can be suspended');
    }

    const updatedLicense = await this.prisma.travelAgentLicense.update({
      where: { id: licenseId },
      data: {
        status: 'SUSPENDED',
        suspendedAt: new Date(),
        suspendedBy,
        suspendedReason: reason,
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
      },
    });

    this.logger.log(`License ${licenseId} suspended by ${suspendedBy}`);
    return updatedLicense;
  }

  /**
   * Reactivate a suspended license
   */
  async reactivateLicense(
    licenseId: string,
    reactivatedBy: string,
    reason?: string,
  ): Promise<any> {
    const license = await this.prisma.travelAgentLicense.findUnique({
      where: { id: licenseId },
    });

    if (!license) {
      throw new NotFoundException('License not found');
    }

    if (license.status !== 'SUSPENDED') {
      throw new BadRequestException(
        'Only suspended licenses can be reactivated',
      );
    }

    const updatedLicense = await this.prisma.travelAgentLicense.update({
      where: { id: licenseId },
      data: {
        status: 'ACTIVE',
        suspendedAt: null,
        suspendedBy: null,
        suspendedReason: null,
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
      `License ${licenseId} reactivated by ${reactivatedBy}${reason ? ` - Reason: ${reason}` : ''
      }`,
    );
    return updatedLicense;
  }

  /**
   * Process expired licenses (mark as EXPIRED)
   */
  async processExpiredLicenses(): Promise<{
    processed: number;
    expired: string[];
  }> {
    const now = new Date();
    const expiredLicenses = await this.prisma.travelAgentLicense.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          lt: now,
        },
      },
      select: {
        id: true,
        licenseNumber: true,
        userId: true,
      },
    });

    if (expiredLicenses.length === 0) {
      return { processed: 0, expired: [] };
    }

    const licenseIds = expiredLicenses.map((license) => license.id);

    await this.prisma.travelAgentLicense.updateMany({
      where: {
        id: {
          in: licenseIds,
        },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    const expiredLicenseNumbers = expiredLicenses.map(
      (license) => license.licenseNumber,
    );

    this.logger.log(
      `Processed ${expiredLicenses.length
      } expired licenses: ${expiredLicenseNumbers.join(', ')}`,
    );

    return {
      processed: expiredLicenses.length,
      expired: expiredLicenseNumbers,
    };
  }

  /**
   * Get licenses expiring soon (within specified days)
   */
  async getLicensesExpiringSoon(days = 30): Promise<any[]> {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const expiringLicenses = await this.prisma.travelAgentLicense.findMany({
      where: {
        status: 'ACTIVE',
        expiresAt: {
          lte: futureDate,
          gte: new Date(),
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            travelAgentProfile: {
              select: {
                id: true,
                company: {
                  select: {
                    companyName: true,
                  },
                },
              },
            },
          },
        },
        application: {
          select: {
            companyName: true,
          },
        },
      },
      orderBy: {
        expiresAt: 'asc',
      },
    });

    return expiringLicenses;
  }

  /**
   * Enhanced license statistics
   */
  async getEnhancedLicenseStatistics(): Promise<any> {
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    const [
      total,
      active,
      expired,
      revoked,
      suspended,
      expiringIn30Days,
      expiringIn7Days,
      recentlyIssued,
      recentlyRenewed,
    ] = await Promise.all([
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
      this.prisma.travelAgentLicense.count({
        where: {
          status: TravelAgentLicenseStatus.ACTIVE,
          expiresAt: {
            lte: thirtyDaysFromNow,
            gte: now,
          },
        },
      }),
      this.prisma.travelAgentLicense.count({
        where: {
          status: TravelAgentLicenseStatus.ACTIVE,
          expiresAt: {
            lte: sevenDaysFromNow,
            gte: now,
          },
        },
      }),
      this.prisma.travelAgentLicense.count({
        where: {
          issuedAt: {
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
      this.prisma.travelAgentLicenseRenewal.count({
        where: {
          renewedAt: {
            gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
    ]);

    return {
      total,
      active,
      expired,
      revoked,
      suspended,
      expiringIn30Days,
      expiringIn7Days,
      recentlyIssued,
      recentlyRenewed,
      renewalRate: total > 0 ? (recentlyRenewed / total) * 100 : 0,
    };
  }

  /**
   * Get current license duration configuration
   */
  async getLicenseDurationConfig(): Promise<any> {
    try {
      const config =
        await this.prisma.travelAgentLicenseDurationConfig.findFirst({
          where: { isActive: true },
          orderBy: { setAt: 'desc' },
        });

      if (!config) {
        return {
          success: true,
          message: 'No license duration configuration found',
          data: {
            durationDays: 365, // Default 1 year
            isDefault: true,
            message: 'Using default 1-year duration (365 days)',
          },
        };
      }

      return {
        success: true,
        message: 'License duration configuration retrieved successfully',
        data: config,
      };
    } catch (error) {
      this.logger.error('Error getting license duration configuration:', error);
      throw new Error('Failed to get license duration configuration');
    }
  }

  /**
   * Update license duration configuration
   */
  async updateLicenseDurationConfig(
    adminId: string,
    durationDays: number,
    notes?: string,
  ): Promise<any> {
    try {
      // Validate duration
      if (durationDays < 1 || durationDays > 3650) {
        throw new BadRequestException(
          'Duration must be between 1 and 3650 days (10 years)',
        );
      }

      // Deactivate any existing active configuration
      await this.prisma.travelAgentLicenseDurationConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });

      // Create new configuration
      const config = await this.prisma.travelAgentLicenseDurationConfig.create({
        data: {
          durationDays,
          isActive: true,
          setBy: adminId,
          notes,
        },
      });

      this.logger.log(
        `License duration configuration updated by admin ${adminId}: ${durationDays} days`,
      );

      return {
        success: true,
        message: 'License duration configuration updated successfully',
        data: config,
      };
    } catch (error) {
      this.logger.error(
        'Error updating license duration configuration:',
        error,
      );
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new Error('Failed to update license duration configuration');
    }
  }

  /**
   * Get configured license duration in days
   */
  async getConfiguredLicenseDuration(): Promise<number> {
    try {
      const config =
        await this.prisma.travelAgentLicenseDurationConfig.findFirst({
          where: { isActive: true },
          orderBy: { setAt: 'desc' },
        });

      return config?.durationDays || 365; // Default to 1 year if no config
    } catch (error) {
      this.logger.error('Error getting configured license duration:', error);
      return 365; // Default to 1 year on error
    }
  }
}
