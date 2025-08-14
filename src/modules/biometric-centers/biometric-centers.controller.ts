import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BiometricCentersService } from './biometric-centers.service';
import {
  CreateBiometricCenterDto,
  UpdateBiometricCenterDto,
  BiometricCenterFiltersDto,
  BiometricCenterQueryDto,
} from './dto/biometric-center.dto';
import { BiometricCenterEntity } from './entities/biometric-center.entity';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { PaginationQueryDto } from '@common/dtos';

/**
 * Controller for managing biometric centers
 * Provides REST API endpoints for CRUD operations
 */
@ApiTags('Biometric Centers')
@Controller('biometric-centers')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class BiometricCentersController {
  constructor(
    private readonly biometricCentersService: BiometricCentersService,
  ) {}

  /**
   * Create a new biometric center
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new biometric center',
    description: 'Create a new biometric center with all necessary details',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Biometric center created successfully',
    type: BiometricCenterEntity,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async createCenter(
    @Body(ValidationPipe) createDto: CreateBiometricCenterDto,
    // TODO: Extract user ID from JWT token when user context is available
    // @CurrentUser() user: User,
  ) {
    const center = await this.biometricCentersService.createCenter(
      createDto,
      // user?.id,
    );

    return {
      message: 'Biometric center created successfully',
      data: center,
    };
  }

  /**
   * Get all biometric centers with optional filtering and pagination
   */
  @Get()
  @ApiOperation({
    summary: 'Get all biometric centers',
    description:
      'Retrieve all biometric centers with optional filtering, search, and pagination',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    type: String,
    description: 'Field to sort by',
    example: 'name',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order',
    example: 'asc',
  })
  @ApiQuery({
    name: 'city',
    required: false,
    type: String,
    description: 'Filter by city',
    example: 'Abuja',
  })
  @ApiQuery({
    name: 'state',
    required: false,
    type: String,
    description: 'Filter by state',
    example: 'Federal Capital Territory',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
    example: true,
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name, code, or address',
    example: 'ASFAAR',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Biometric centers retrieved successfully',
    type: [BiometricCenterEntity],
  })
  async findAllCenters(@Query(ValidationPipe) query: BiometricCenterQueryDto) {
    const { page, limit, sortBy, sortOrder, ...filters } = query;
    const pagination = { page, limit, sortBy, sortOrder };
    const result = await this.biometricCentersService.findAllCenters(
      filters,
      pagination,
    );

    return {
      message: 'Biometric centers retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  /**
   * Get active biometric centers by city
   */
  @Get('active/city/:city')
  @ApiOperation({
    summary: 'Get active biometric centers by city',
    description: 'Retrieve all active biometric centers in a specific city',
  })
  @ApiParam({
    name: 'city',
    description: 'City name',
    example: 'Abuja',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active biometric centers in city retrieved successfully',
    type: [BiometricCenterEntity],
  })
  async findActiveCentersByCity(@Param('city') city: string) {
    const centers = await this.biometricCentersService.findActiveCentersByCity(
      city,
    );

    return {
      message: `Active biometric centers in ${city} retrieved successfully`,
      data: centers,
    };
  }

  /**
   * Get active biometric centers by state
   */
  @Get('active/state/:state')
  @ApiOperation({
    summary: 'Get active biometric centers by state',
    description: 'Retrieve all active biometric centers in a specific state',
  })
  @ApiParam({
    name: 'state',
    description: 'State name',
    example: 'Federal Capital Territory',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Active biometric centers in state retrieved successfully',
    type: [BiometricCenterEntity],
  })
  async findActiveCentersByState(@Param('state') state: string) {
    const centers = await this.biometricCentersService.findActiveCentersByState(
      state,
    );

    return {
      message: `Active biometric centers in ${state} retrieved successfully`,
      data: centers,
    };
  }

  /**
   * Get a specific biometric center by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get biometric center by ID',
    description: 'Retrieve a specific biometric center by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Biometric center ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Biometric center retrieved successfully',
    type: BiometricCenterEntity,
  })
  async findCenterById(@Param('id', ParseUUIDPipe) id: string) {
    const center = await this.biometricCentersService.findCenterById(id);

    return {
      message: 'Biometric center retrieved successfully',
      data: center,
    };
  }

  /**
   * Check center availability for a specific date
   */
  @Get(':id/availability')
  @ApiOperation({
    summary: 'Check center availability',
    description:
      'Check the availability of a biometric center for a specific date',
  })
  @ApiParam({
    name: 'id',
    description: 'Biometric center ID',
    example: 'uuid-string',
  })
  @ApiQuery({
    name: 'date',
    description: 'Date to check availability (YYYY-MM-DD)',
    example: '2024-02-15',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Center availability checked successfully',
  })
  async checkCenterAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('date') dateString: string,
  ) {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      throw new Error('Invalid date format. Use YYYY-MM-DD');
    }

    const availability =
      await this.biometricCentersService.checkCenterAvailability(id, date);

    return {
      message: 'Center availability checked successfully',
      data: {
        date: dateString,
        centerId: id,
        ...availability,
      },
    };
  }

  /**
   * Update a biometric center
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update biometric center',
    description: 'Update an existing biometric center',
  })
  @ApiParam({
    name: 'id',
    description: 'Biometric center ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Biometric center updated successfully',
    type: BiometricCenterEntity,
  })
  async updateCenter(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateBiometricCenterDto,
    // TODO: Extract user ID from JWT token when user context is available
    // @CurrentUser() user: User,
  ) {
    const center = await this.biometricCentersService.updateCenter(
      id,
      updateDto,
      // user?.id,
    );

    return {
      message: 'Biometric center updated successfully',
      data: center,
    };
  }

  /**
   * Deactivate a biometric center (soft delete)
   */
  @Delete(':id/deactivate')
  @ApiOperation({
    summary: 'Deactivate biometric center',
    description:
      'Deactivate a biometric center (soft delete by setting isActive to false)',
  })
  @ApiParam({
    name: 'id',
    description: 'Biometric center ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Biometric center deactivated successfully',
    type: BiometricCenterEntity,
  })
  async deactivateCenter(
    @Param('id', ParseUUIDPipe) id: string,
    // TODO: Extract user ID from JWT token when user context is available
    // @CurrentUser() user: User,
  ) {
    const center = await this.biometricCentersService.deleteCenterSoft(
      id,
      // user?.id,
    );

    return {
      message: 'Biometric center deactivated successfully',
      data: center,
    };
  }

  /**
   * Admin test endpoint for health checks
   */
  @Get('admin/test')
  @ApiOperation({
    summary: 'Test endpoint',
    description: 'Health check endpoint for biometric centers module',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test successful',
  })
  async adminTest() {
    return {
      message: 'Biometric Centers module is working correctly',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }
}
