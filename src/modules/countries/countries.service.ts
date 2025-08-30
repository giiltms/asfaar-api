import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { LocalStorageService } from '@providers/localstorage/localstorage.service';
import { Country, Prisma } from '@prisma/client';
import { PaginationUtils } from '@common/utils/pagination.utils';
import {
  CreateCountryDto,
  UpdateCountryDto,
  CountryFiltersDto,
  CountryStatsDto,
  CountryApplicationStatsDto,
} from './dto/country.dto';

@Injectable()
export class CountriesService {
  private readonly logger = new Logger(CountriesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly localStorageService: LocalStorageService,
  ) {}

  /**
   * Create a new country
   */
  async createCountry(
    createCountryDto: CreateCountryDto,
    createdBy?: string,
  ): Promise<Country> {
    try {
      // Check for existing country with same ISO codes
      const existingCountry = await this.prisma.country.findFirst({
        where: {
          OR: [
            { isoCode2: createCountryDto.isoCode2 },
            { isoCode3: createCountryDto.isoCode3 },
            { numericCode: createCountryDto.numericCode },
            { name: createCountryDto.name },
          ],
        },
      });

      if (existingCountry) {
        let conflictField = 'name';
        if (existingCountry.isoCode2 === createCountryDto.isoCode2) {
          conflictField = 'ISO 2-letter code';
        } else if (existingCountry.isoCode3 === createCountryDto.isoCode3) {
          conflictField = 'ISO 3-letter code';
        } else if (
          existingCountry.numericCode === createCountryDto.numericCode
        ) {
          conflictField = 'numeric code';
        }

        throw new ConflictException(
          `Country with this ${conflictField} already exists`,
        );
      }

      const country = await this.prisma.country.create({
        data: {
          ...createCountryDto,
          createdBy,
        },
      });

      this.logger.log(`Created country: ${country.name} (${country.isoCode2})`);
      return country;
    } catch (error) {
      this.logger.error(
        `Failed to create country: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get all countries with filters and pagination
   */
  async findAllCountries(filters: CountryFiltersDto) {
    try {
      const {
        page = 1,
        limit = 10,
        name,
        isoCode2,
        isoCode3,
        region,
        subregion,
        currency,
        isActive,
        sortBy = 'name',
        sortOrder = 'asc',
      } = filters;

      // Build where clause
      const where: Prisma.CountryWhereInput = {};

      if (name) {
        where.name = {
          contains: name,
          mode: 'insensitive',
        };
      }

      if (isoCode2) {
        where.isoCode2 = isoCode2;
      }

      if (isoCode3) {
        where.isoCode3 = isoCode3;
      }

      if (region) {
        where.region = {
          contains: region,
          mode: 'insensitive',
        };
      }

      if (subregion) {
        where.subregion = {
          contains: subregion,
          mode: 'insensitive',
        };
      }

      if (currency) {
        where.currency = currency;
      }

      if (typeof isActive === 'boolean') {
        where.isActive = isActive;
      }

      // Build orderBy
      const orderBy: Prisma.CountryOrderByWithRelationInput = {};
      orderBy[sortBy] = sortOrder;

      // Get total count
      const total = await this.prisma.country.count({ where });

      // Get countries with pagination
      const countries = await this.prisma.country.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          forms: {
            select: {
              id: true,
              name: true,
            },
          },
          applicationCounters: {
            where: {
              year: new Date().getFullYear(),
            },
          },
        },
      });

      const meta = PaginationUtils.createPaginationMeta(
        page,
        limit,
        total,
        sortBy,
        sortOrder,
      );

      return {
        data: countries,
        meta,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch countries: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get active countries only (public endpoint)
   */
  async findActiveCountries(filters?: Partial<CountryFiltersDto>) {
    try {
      const activeFilters: CountryFiltersDto = {
        ...filters,
        isActive: true,
        page: filters?.page || 1,
        limit: filters?.limit || 50,
        sortBy: filters?.sortBy || 'name',
        sortOrder: filters?.sortOrder || 'asc',
      };

      return this.findAllCountries(activeFilters);
    } catch (error) {
      this.logger.error(
        `Failed to fetch active countries: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get country by ID
   */
  async findCountryById(
    id: string,
    includeRelations = false,
  ): Promise<Country> {
    try {
      const include = includeRelations
        ? {
            forms: {
              select: {
                id: true,
                name: true,
                description: true,
                createdAt: true,
              },
            },
            applicationCounters: true,
          }
        : undefined;

      const country = await this.prisma.country.findUnique({
        where: { id },
        include,
      });

      if (!country) {
        throw new NotFoundException(`Country with ID "${id}" not found`);
      }

      return country;
    } catch (error) {
      this.logger.error(
        `Failed to fetch country by ID: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get country by ISO code
   */
  async findCountryByCode(code: string): Promise<Country> {
    try {
      const country = await this.prisma.country.findFirst({
        where: {
          OR: [
            { isoCode2: code.toUpperCase() },
            { isoCode3: code.toUpperCase() },
          ],
        },
        include: {
          applicationCounters: {
            where: {
              year: new Date().getFullYear(),
            },
          },
        },
      });

      if (!country) {
        throw new NotFoundException(`Country with code "${code}" not found`);
      }

      return country;
    } catch (error) {
      this.logger.error(
        `Failed to fetch country by code: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update country
   */
  async updateCountry(
    id: string,
    updateCountryDto: UpdateCountryDto,
  ): Promise<Country> {
    try {
      const existingCountry = await this.findCountryById(id);

      // Check for conflicts if ISO codes are being updated
      if (
        updateCountryDto.isoCode2 ||
        updateCountryDto.isoCode3 ||
        updateCountryDto.numericCode ||
        updateCountryDto.name
      ) {
        const conflictWhere: Prisma.CountryWhereInput = {
          AND: [
            { id: { not: id } },
            {
              OR: [],
            },
          ],
        };

        const orConditions: Prisma.CountryWhereInput[] = [];

        if (updateCountryDto.isoCode2) {
          orConditions.push({ isoCode2: updateCountryDto.isoCode2 });
        }
        if (updateCountryDto.isoCode3) {
          orConditions.push({ isoCode3: updateCountryDto.isoCode3 });
        }
        if (updateCountryDto.numericCode) {
          orConditions.push({ numericCode: updateCountryDto.numericCode });
        }
        if (updateCountryDto.name) {
          orConditions.push({ name: updateCountryDto.name });
        }

        if (orConditions.length > 0) {
          (conflictWhere.AND![1] as any).OR = orConditions;

          const conflictingCountry = await this.prisma.country.findFirst({
            where: conflictWhere,
          });

          if (conflictingCountry) {
            throw new ConflictException(
              'Another country with these details already exists',
            );
          }
        }
      }

      const updatedCountry = await this.prisma.country.update({
        where: { id },
        data: updateCountryDto,
        include: {
          forms: {
            select: {
              id: true,
              name: true,
            },
          },
          applicationCounters: {
            where: {
              year: new Date().getFullYear(),
            },
          },
        },
      });

      this.logger.log(
        `Updated country: ${updatedCountry.name} (${updatedCountry.isoCode2})`,
      );
      return updatedCountry;
    } catch (error) {
      this.logger.error(
        `Failed to update country: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Activate country
   */
  async activateCountry(id: string): Promise<Country> {
    try {
      const country = await this.updateCountry(id, { isActive: true });
      this.logger.log(
        `Activated country: ${country.name} (${country.isoCode2})`,
      );
      return country;
    } catch (error) {
      this.logger.error(
        `Failed to activate country: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Deactivate country
   */
  async deactivateCountry(id: string): Promise<Country> {
    try {
      // Check if country has active forms
      const country = await this.findCountryById(id, true);

      if ((country as any).forms && (country as any).forms.length > 0) {
        throw new BadRequestException(
          'Cannot deactivate country with active forms. Please deactivate forms first.',
        );
      }

      const updatedCountry = await this.updateCountry(id, { isActive: false });
      this.logger.log(
        `Deactivated country: ${updatedCountry.name} (${updatedCountry.isoCode2})`,
      );
      return updatedCountry;
    } catch (error) {
      this.logger.error(
        `Failed to deactivate country: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete country (soft delete by deactivating)
   */
  async deleteCountry(id: string): Promise<void> {
    try {
      await this.deactivateCountry(id);
      this.logger.log(`Soft deleted country with ID: ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete country: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get country statistics
   */
  async getCountryStatistics(): Promise<CountryStatsDto> {
    try {
      const [totalCountries, activeCountries, regionStats, capacityStats] =
        await Promise.all([
          this.prisma.country.count(),
          this.prisma.country.count({
            where: { isActive: true },
          }),
          this.prisma.country.groupBy({
            by: ['region'],
            _count: {
              id: true,
            },
            where: {
              region: {
                not: null,
              },
            },
          }),
          this.prisma.country.aggregate({
            _sum: {
              maxApplications: true,
            },
            _avg: {
              visaProcessingDays: true,
            },
            where: {
              isActive: true,
            },
          }),
        ]);

      const byRegion: Record<string, number> = {};
      regionStats.forEach((stat) => {
        if (stat.region) {
          byRegion[stat.region] = stat._count.id;
        }
      });

      return {
        total: totalCountries,
        active: activeCountries,
        inactive: totalCountries - activeCountries,
        byRegion,
        totalCapacity: capacityStats._sum.maxApplications || 0,
        averageProcessingDays: Math.round(
          capacityStats._avg.visaProcessingDays || 0,
        ),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get country statistics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get application statistics for a country
   */
  async getCountryApplicationStats(
    countryCode: string,
    year?: number,
  ): Promise<CountryApplicationStatsDto> {
    try {
      const currentYear = year || new Date().getFullYear();

      const country = await this.findCountryByCode(countryCode);

      const counter = await this.prisma.applicationCounter.findUnique({
        where: {
          countryId_year: {
            countryId: country.id,
            year: currentYear,
          },
        },
      });

      const totalApplications = counter?.counter || 0;
      const maxApplications = country.maxApplications || 1000;
      const remainingSlots = Math.max(0, maxApplications - totalApplications);
      const utilizationPercentage =
        Math.round((totalApplications / maxApplications) * 100 * 100) / 100;

      return {
        countryId: country.id,
        countryName: country.name,
        isoCode2: country.isoCode2,
        year: currentYear,
        totalApplications,
        maxApplications,
        remainingSlots,
        utilizationPercentage,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get country application stats: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get countries grouped by region
   */
  async getCountriesByRegion(activeOnly = true) {
    try {
      const where: Prisma.CountryWhereInput = activeOnly
        ? { isActive: true }
        : {};

      const countries = await this.prisma.country.findMany({
        where,
        orderBy: [{ region: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          isoCode2: true,
          isoCode3: true,
          region: true,
          subregion: true,
          currency: true,
          flag: true,
          visaProcessingDays: true,
          applicationFee: true,
        },
      });

      // Group by region
      const groupedByRegion: Record<string, any[]> = {};
      countries.forEach((country) => {
        const region = country.region || 'Unknown';
        if (!groupedByRegion[region]) {
          groupedByRegion[region] = [];
        }
        groupedByRegion[region].push(country);
      });

      return groupedByRegion;
    } catch (error) {
      this.logger.error(
        `Failed to get countries by region: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Upload country logo
   */
  async uploadCountryLogo(
    countryId: string,
    file: Express.Multer.File,
  ): Promise<Country> {
    try {
      // Validate file type
      const allowedMimeTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/svg+xml',
      ];

      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(
          'Invalid file type. Only JPEG, PNG, and SVG files are allowed.',
        );
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new BadRequestException(
          'File size too large. Maximum size is 5MB.',
        );
      }

      // Check if country exists
      const country = await this.prisma.country.findUnique({
        where: { id: countryId },
      });

      if (!country) {
        throw new NotFoundException(`Country with ID ${countryId} not found`);
      }

      // Generate filename based on country code
      const fileExtension = file.originalname.split('.').pop();
      const filename = `${country.isoCode2.toLowerCase()}-logo.${fileExtension}`;

      // Upload file
      const logoPath = await this.localStorageService.upload(
        { ...file, originalname: filename },
        'countries/logos',
      );

      // Update country with logo URL
      const updatedCountry = await this.prisma.country.update({
        where: { id: countryId },
        data: {
          logoUrl: `/uploads/${logoPath}`,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Logo uploaded for country: ${country.name}`);
      return updatedCountry;
    } catch (error) {
      this.logger.error(
        `Failed to upload logo for country ${countryId}:`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete country logo
   */
  async deleteCountryLogo(countryId: string): Promise<Country> {
    try {
      const country = await this.prisma.country.findUnique({
        where: { id: countryId },
      });

      if (!country) {
        throw new NotFoundException(`Country with ID ${countryId} not found`);
      }

      if (!country.logoUrl) {
        throw new BadRequestException('Country does not have a logo to delete');
      }

      // Delete file from storage
      const filePath = country.logoUrl.replace('/uploads/', '');
      try {
        await this.localStorageService.delete(filePath);
      } catch (deleteError) {
        this.logger.warn(`Failed to delete file: ${filePath}`, deleteError);
        // Continue with database update even if file deletion fails
      }

      // Update country to remove logo URL
      const updatedCountry = await this.prisma.country.update({
        where: { id: countryId },
        data: {
          logoUrl: null,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Logo deleted for country: ${country.name}`);
      return updatedCountry;
    } catch (error) {
      this.logger.error(
        `Failed to delete logo for country ${countryId}:`,
        error.stack,
      );
      throw error;
    }
  }
}
