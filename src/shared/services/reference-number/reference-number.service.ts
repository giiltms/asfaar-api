import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';

export interface ReferenceNumberOptions {
  countryCode: string;
  centerNumber: string; // 3-digit center number
  year?: number;
}

@Injectable()
export class ReferenceNumberService {
  private readonly logger = new Logger(ReferenceNumberService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a unique reference number for an application
   * Format: CC00125000004 (CountryCode + CenterNumber + Year + 6-digit sequence)
   */
  async generateReferenceNumber(
    options: ReferenceNumberOptions,
  ): Promise<string> {
    const {
      countryCode,
      centerNumber,
      year = new Date().getFullYear(),
    } = options;

    try {
      // Validate center number format (3 digits)
      if (!/^\d{3}$/.test(centerNumber)) {
        throw new Error(
          `Invalid center number format. Expected 3 digits, got: ${centerNumber}`,
        );
      }

      // For reference numbers, we always use 'CC' as the country code
      // Find the country by ISO code (but we'll use the original country for the counter)
      const country = await this.prisma.country.findUnique({
        where: { isoCode2: countryCode.toUpperCase() },
      });

      if (!country) {
        throw new Error(`Country with code "${countryCode}" not found`);
      }

      // Verify center number exists
      const center = await this.prisma.biometricCenter.findUnique({
        where: { centerNumber },
      });

      if (!center) {
        throw new Error(
          `Biometric center with number "${centerNumber}" not found`,
        );
      }

      // Get or create application counter for this country/year
      const counter = await this.prisma.$transaction(async (tx) => {
        // Try to find existing counter
        let applicationCounter = await tx.applicationCounter.findUnique({
          where: {
            countryId_year: {
              countryId: country.id,
              year,
            },
          },
        });

        // Create counter if it doesn't exist
        if (!applicationCounter) {
          applicationCounter = await tx.applicationCounter.create({
            data: {
              countryId: country.id,
              year,
              counter: 1,
            },
          });
        } else {
          // Increment the counter
          applicationCounter = await tx.applicationCounter.update({
            where: {
              countryId_year: {
                countryId: country.id,
                year,
              },
            },
            data: {
              counter: {
                increment: 1,
              },
            },
          });
        }

        return applicationCounter;
      });

      // Format the reference number: CC00125000004
      const yearSuffix = year.toString().slice(-2); // Last 2 digits of year
      const sequenceNumber = counter.counter.toString().padStart(6, '0');
      const referenceNumber = `CC${centerNumber}${yearSuffix}${sequenceNumber}`; // Always use CC as country code

      this.logger.log(
        `Generated reference number: ${referenceNumber} for country: CC, center: ${centerNumber}, year: ${year}, sequence: ${counter.counter}`,
      );

      return referenceNumber;
    } catch (error) {
      this.logger.error(
        `Failed to generate reference number: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Generate reference number for a specific form submission and center
   * This is used when creating biometric appointments to ensure the correct center is used
   */
  async generateReferenceNumberForSubmission(
    submissionId: string,
    centerNumber: string,
  ): Promise<string> {
    // Get the form submission to find the form and country
    const submission = await this.prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: {
        form: {
          include: {
            country: {
              select: { id: true, isoCode2: true },
            },
          },
        },
      },
    });

    if (!submission) {
      throw new Error(`Form submission with ID ${submissionId} not found`);
    }

    if (!submission.form.country || !submission.form.country.isoCode2) {
      throw new Error(
        `Form submission ${submissionId} has no associated country`,
      );
    }

    const countryId = submission.form.country.id;
    const countryCode = 'CC'; // Use CC as the country code for reference numbers
    const year = new Date().getFullYear();

    // Validate center number format
    if (!/^\d{3}$/.test(centerNumber)) {
      throw new Error('Center number must be exactly 3 digits');
    }

    // Verify the center exists
    const center = await this.prisma.biometricCenter.findFirst({
      where: { centerNumber },
      select: { id: true, name: true },
    });

    if (!center) {
      throw new Error(`Biometric center with number ${centerNumber} not found`);
    }

    // Generate the reference number
    return this.generateReferenceNumber({
      countryCode,
      centerNumber,
      year,
    });
  }

  /**
   * Validate reference number format
   */
  validateReferenceNumber(referenceNumber: string): {
    isValid: boolean;
    countryCode?: string;
    centerNumber?: string;
    year?: number;
    sequence?: number;
  } {
    // Format: CC00125000004 (2 chars + 3 digits + 2 digits + 6 digits)
    const pattern = /^([A-Z]{2})(\d{3})(\d{2})(\d{6})$/;
    const match = referenceNumber.match(pattern);

    if (!match) {
      return { isValid: false };
    }

    const [, countryCode, centerNumber, yearSuffix, sequenceStr] = match;
    const year = 2000 + parseInt(yearSuffix); // Convert YY to YYYY
    const sequence = parseInt(sequenceStr);

    return {
      isValid: true,
      countryCode,
      centerNumber,
      year,
      sequence,
    };
  }

  /**
   * Parse reference number to extract components
   */
  parseReferenceNumber(referenceNumber: string): {
    countryCode: string;
    centerNumber: string;
    year: number;
    sequence: number;
  } | null {
    const validation = this.validateReferenceNumber(referenceNumber);

    if (!validation.isValid) {
      return null;
    }

    return {
      countryCode: validation.countryCode!,
      centerNumber: validation.centerNumber!,
      year: validation.year!,
      sequence: validation.sequence!,
    };
  }

  /**
   * Find application by reference number
   */
  async findApplicationByReference(referenceNumber: string) {
    try {
      const submission = await this.prisma.formSubmission.findUnique({
        where: { referenceNumber },
        include: {
          form: {
            include: {
              country: true,
            },
          },
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          payment: true,
          appointment: {
            include: {
              center: {
                select: {
                  id: true,
                  name: true,
                  city: true,
                },
              },
            },
          },
        },
      });

      return submission;
    } catch (error) {
      this.logger.error(
        `Failed to find application by reference: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get application statistics by country and year
   */
  async getApplicationStats(countryCode: string, year?: number) {
    const currentYear = year || new Date().getFullYear();

    try {
      const country = await this.prisma.country.findUnique({
        where: { isoCode2: countryCode.toUpperCase() },
      });

      if (!country) {
        throw new Error(`Country with code "${countryCode}" not found`);
      }

      const counter = await this.prisma.applicationCounter.findUnique({
        where: {
          countryId_year: {
            countryId: country.id,
            year: currentYear,
          },
        },
      });

      return {
        countryCode,
        countryName: country.name,
        year: currentYear,
        totalApplications: counter?.counter || 0,
        maxApplications: country.maxApplications || 1000,
        remainingSlots:
          (country.maxApplications || 1000) - (counter?.counter || 0),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get application stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
