import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  SerializeOptions,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { BaseResponseDto } from '@common/dtos/base-response.dto';
import { CountriesService } from './countries.service';
import CountryEntity from './entities/country.entity';
import {
  CreateCountryDto,
  UpdateCountryDto,
  CountryFiltersDto,
  CountryStatsDto,
  CountryApplicationStatsDto,
} from './dto/country.dto';

// Public Countries Controller (for form creation, etc.)
@ApiTags('Countries')
@Controller('countries')
@SerializeOptions({
  excludeExtraneousValues: true,
})
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all active countries' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Countries retrieved successfully',
    type: BaseResponseDto<CountryEntity[]>,
  })
  async getActiveCountries(@Query() filters: CountryFiltersDto) {
    const result = await this.countriesService.findActiveCountries(filters);

    return {
      success: true,
      message: 'Active countries retrieved successfully',
      data: {
        countries: plainToInstance(CountryEntity, result.data),
        meta: result.meta,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('by-region')
  @ApiOperation({ summary: 'Get active countries grouped by region' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Countries grouped by region retrieved successfully',
  })
  async getCountriesByRegion() {
    const data = await this.countriesService.getCountriesByRegion(true);

    return {
      success: true,
      message: 'Countries grouped by region retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('code/:code')
  @ApiOperation({ summary: 'Get country by ISO code' })
  @ApiParam({ name: 'code', description: 'ISO 2 or 3 letter country code' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Country retrieved successfully',
    type: BaseResponseDto<CountryEntity>,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Country not found' })
  async getCountryByCode(@Param('code') code: string) {
    const country = await this.countriesService.findCountryByCode(code);

    return {
      success: true,
      message: 'Country retrieved successfully',
      data: plainToInstance(CountryEntity, country),
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get country by ID' })
  @ApiParam({ name: 'id', description: 'Country ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Country retrieved successfully',
    type: BaseResponseDto<CountryEntity>,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Country not found' })
  async getCountryById(@Param('id') id: string) {
    const country = await this.countriesService.findCountryById(id, true);

    return {
      success: true,
      message: 'Country retrieved successfully',
      data: plainToInstance(CountryEntity, country),
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':code/application-stats')
  @ApiOperation({ summary: 'Get application statistics for a country' })
  @ApiParam({ name: 'code', description: 'ISO 2 or 3 letter country code' })
  @ApiQuery({ name: 'year', required: false, description: 'Year for statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Country application statistics retrieved successfully',
    type: BaseResponseDto<CountryApplicationStatsDto>,
  })
  async getCountryApplicationStats(
    @Param('code') code: string,
    @Query('year') year?: number,
  ) {
    const stats = await this.countriesService.getCountryApplicationStats(
      code,
      year ? parseInt(year.toString()) : undefined,
    );

    return {
      success: true,
      message: 'Country application statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }
}

// Admin Countries Controller
@ApiTags('Admin - Countries')
@Controller('admin/countries')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@SerializeOptions({
  excludeExtraneousValues: true,
})
export class AdminCountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new country' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Country created successfully',
    type: BaseResponseDto<CountryEntity>,
  })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Country already exists' })
  async createCountry(@Body() createCountryDto: CreateCountryDto) {
    const country = await this.countriesService.createCountry(createCountryDto);

    return {
      success: true,
      message: 'Country created successfully',
      data: plainToInstance(CountryEntity, country),
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all countries (admin view)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Countries retrieved successfully',
    type: BaseResponseDto<CountryEntity[]>,
  })
  async getAllCountries(@Query() filters: CountryFiltersDto) {
    const result = await this.countriesService.findAllCountries(filters);

    return {
      success: true,
      message: 'Countries retrieved successfully',
      data: {
        countries: plainToInstance(CountryEntity, result.data),
        meta: result.meta,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get country statistics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Country statistics retrieved successfully',
    type: BaseResponseDto<CountryStatsDto>,
  })
  async getCountryStatistics() {
    const stats = await this.countriesService.getCountryStatistics();

    return {
      success: true,
      message: 'Country statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('by-region-all')
  @ApiOperation({ summary: 'Get all countries grouped by region (including inactive)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Countries grouped by region retrieved successfully',
  })
  async getAllCountriesByRegion() {
    const data = await this.countriesService.getCountriesByRegion(false);

    return {
      success: true,
      message: 'All countries grouped by region retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get country by ID (admin view)' })
  @ApiParam({ name: 'id', description: 'Country ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Country retrieved successfully',
    type: BaseResponseDto<CountryEntity>,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Country not found' })
  async getCountryByIdAdmin(@Param('id') id: string) {
    const country = await this.countriesService.findCountryById(id, true);

    return {
      success: true,
      message: 'Country retrieved successfully',
      data: plainToInstance(CountryEntity, country),
      timestamp: new Date().toISOString(),
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update country' })
  @ApiParam({ name: 'id', description: 'Country ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Country updated successfully',
    type: BaseResponseDto<CountryEntity>,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Country not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Country details conflict' })
  async updateCountry(
    @Param('id') id: string,
    @Body() updateCountryDto: UpdateCountryDto,
  ) {
    const country = await this.countriesService.updateCountry(id, updateCountryDto);

    return {
      success: true,
      message: 'Country updated successfully',
      data: plainToInstance(CountryEntity, country),
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/activate')
  @ApiOperation({ summary: 'Activate country' })
  @ApiParam({ name: 'id', description: 'Country ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Country activated successfully',
    type: BaseResponseDto<CountryEntity>,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Country not found' })
  async activateCountry(@Param('id') id: string) {
    const country = await this.countriesService.activateCountry(id);

    return {
      success: true,
      message: 'Country activated successfully',
      data: plainToInstance(CountryEntity, country),
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate country' })
  @ApiParam({ name: 'id', description: 'Country ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Country deactivated successfully',
    type: BaseResponseDto<CountryEntity>,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Country not found' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot deactivate country with active forms',
  })
  async deactivateCountry(@Param('id') id: string) {
    const country = await this.countriesService.deactivateCountry(id);

    return {
      success: true,
      message: 'Country deactivated successfully',
      data: plainToInstance(CountryEntity, country),
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete country (soft delete)' })
  @ApiParam({ name: 'id', description: 'Country ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Country deleted successfully',
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Country not found' })
  async deleteCountry(@Param('id') id: string) {
    await this.countriesService.deleteCountry(id);

    return {
      success: true,
      message: 'Country deleted successfully',
      timestamp: new Date().toISOString(),
    };
  }
} 