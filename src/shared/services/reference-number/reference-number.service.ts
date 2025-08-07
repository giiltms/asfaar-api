import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';

export interface ReferenceNumberOptions {
  countryCode: string;
  year?: number;
}

@Injectable()
export class ReferenceNumberService {
  private readonly logger = new Logger(ReferenceNumberService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a unique reference number for an application
   * Format: SA25001234 (CountryCode + Year + 6-digit sequence)
   */
  async generateReferenceNumber(options: ReferenceNumberOptions): Promise<string> {
    const { countryCode, year = new Date().getFullYear() } = options;

    try {
      // Find the country by ISO code
      const country = await this.prisma.country.findUnique({
        where: { isoCode2: countryCode.toUpperCase() },
      });

      if (!country) {
        throw new Error(`Country with code "${countryCode}" not found`);
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

      // Format the reference number: SA25001234
      const yearSuffix = year.toString().slice(-2); // Last 2 digits of year
      const sequenceNumber = counter.counter.toString().padStart(6, '0');
      const referenceNumber = `${countryCode.toUpperCase()}${yearSuffix}${sequenceNumber}`;

      this.logger.log(`Generated reference number: ${referenceNumber} for country: ${countryCode}, year: ${year}, sequence: ${counter.counter}`);

      return referenceNumber;
    } catch (error) {
      this.logger.error(`Failed to generate reference number: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Validate reference number format
   */
  validateReferenceNumber(referenceNumber: string): {
    isValid: boolean;
    countryCode?: string;
    year?: number;
    sequence?: number;
  } {
    // Format: SA25001234 (2 chars + 2 digits + 6 digits)
    const pattern = /^([A-Z]{2})(\d{2})(\d{6})$/;
    const match = referenceNumber.match(pattern);

    if (!match) {
      return { isValid: false };
    }

    const [, countryCode, yearSuffix, sequenceStr] = match;
    const year = 2000 + parseInt(yearSuffix); // Convert YY to YYYY
    const sequence = parseInt(sequenceStr);

    return {
      isValid: true,
      countryCode,
      year,
      sequence,
    };
  }

  /**
   * Parse reference number to extract components
   */
  parseReferenceNumber(referenceNumber: string): {
    countryCode: string;
    year: number;
    sequence: number;
  } | null {
    const validation = this.validateReferenceNumber(referenceNumber);

    if (!validation.isValid) {
      return null;
    }

    return {
      countryCode: validation.countryCode!,
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
      this.logger.error(`Failed to find application by reference: ${error.message}`, error.stack);
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
        remainingSlots: (country.maxApplications || 1000) - (counter?.counter || 0),
      };
    } catch (error) {
      this.logger.error(`Failed to get application stats: ${error.message}`, error.stack);
      throw error;
    }
  }
} 