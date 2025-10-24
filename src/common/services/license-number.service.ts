import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';

@Injectable()
export class LicenseNumberService {
  private readonly logger = new Logger(LicenseNumberService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a unique travel agent license number
   * Format: ASF-TA-YYYY-NNNNNN
   * - ASF: Platform prefix
   * - TA: Travel Agent identifier
   * - YYYY: Year of generation
   * - NNNNNN: 6-digit sequential number
   */
  async generateTravelAgentLicenseNumber(): Promise<string> {
    try {
      const currentYear = new Date().getFullYear();
      const prefix = `ASF-TA-${currentYear}`;

      // Get the highest existing license number for this year
      const existingLicense = await this.prisma.travelAgentLicense.findFirst({
        where: {
          licenseNumber: {
            startsWith: prefix,
          },
        },
        orderBy: {
          licenseNumber: 'desc',
        },
        select: {
          licenseNumber: true,
        },
      });

      let nextNumber = 1;
      if (existingLicense?.licenseNumber) {
        // Extract the number part and increment
        const numberPart = existingLicense.licenseNumber.split('-').pop();
        if (numberPart) {
          nextNumber = parseInt(numberPart, 10) + 1;
        }
      }

      // Format as 6-digit number with leading zeros
      const formattedNumber = nextNumber.toString().padStart(6, '0');
      const licenseNumber = `${prefix}-${formattedNumber}`;

      this.logger.log(
        `Generated travel agent license number: ${licenseNumber}`,
      );
      return licenseNumber;
    } catch (error) {
      this.logger.error(
        'Failed to generate travel agent license number:',
        error,
      );
      throw new Error('Failed to generate license number');
    }
  }

  /**
   * Calculate license expiry date (1 year from generation date)
   */
  calculateLicenseExpiryDate(): Date {
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    return expiryDate;
  }

  /**
   * Validate license number format
   */
  validateLicenseNumber(licenseNumber: string): boolean {
    const pattern = /^ASF-TA-\d{4}-\d{6}$/;
    return pattern.test(licenseNumber);
  }

  /**
   * Check if license is expired
   */
  isLicenseExpired(expiryDate: Date): boolean {
    return new Date() > expiryDate;
  }

  /**
   * Get license status
   */
  getLicenseStatus(
    expiryDate: Date | null,
  ): 'ACTIVE' | 'EXPIRED' | 'NO_LICENSE' {
    if (!expiryDate) {
      return 'NO_LICENSE';
    }
    return this.isLicenseExpired(expiryDate) ? 'EXPIRED' : 'ACTIVE';
  }
}
