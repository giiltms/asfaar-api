import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { JwtUserPayload } from '@common/decorators/current-user.decorator';
import { BiometricCaptureHistoryService } from '../services/biometric-capture-history.service';
import {
  BiometricCaptureHistoryQueryDto,
  BiometricCaptureHistoryResponseDto,
  BiometricCaptureStatisticsDto,
} from '../dto/biometric-capture-history.dto';
import { Roles } from '@common/decorators/roles.decorator';
import { Roles as UserRoles } from '@common/constants/roles.constants';

/**
 * Controller for biometric capture history management
 * Provides endpoints for center managers to view capture history
 */
@ApiTags('Biometric Capture History')
@Controller('biometric-capture-history')
@UseGuards(AuthGuard)
@ApiBearerAuth()
@Roles(UserRoles.CENTER_MANAGER)
export class BiometricCaptureHistoryController {
  constructor(
    private readonly biometricCaptureHistoryService: BiometricCaptureHistoryService,
  ) {}

  /**
   * Get biometric capture history for centers managed by the current user
   */
  @Get()
  @ApiOperation({
    summary: 'Get biometric capture history',
    description:
      'Retrieve biometric capture history for centers managed by the current center manager',
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
    name: 'centerId',
    required: false,
    type: String,
    description: 'Filter by specific center ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Filter by user ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'submissionId',
    required: false,
    type: String,
    description: 'Filter by submission ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'capturedBy',
    required: false,
    type: String,
    description: 'Filter by agent who performed the capture',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({
    name: 'verificationStatus',
    required: false,
    enum: ['PENDING', 'VERIFIED', 'REJECTED', 'EXPIRED'],
    description: 'Filter by verification status',
    example: 'VERIFIED',
  })
  @ApiQuery({
    name: 'isVerified',
    required: false,
    type: Boolean,
    description: 'Filter by verification status (boolean)',
    example: true,
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    type: String,
    description: 'Filter captures from this date onwards (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    type: String,
    description: 'Filter captures up to this date (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
  })
  @ApiQuery({
    name: 'captureDevice',
    required: false,
    type: String,
    description: 'Filter by capture device',
    example: 'Suprema RealScan-G10',
  })
  @ApiQuery({
    name: 'captureLocation',
    required: false,
    type: String,
    description: 'Filter by capture location',
    example: 'Booth 1, Center A',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Biometric capture history retrieved successfully',
    type: BiometricCaptureHistoryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - no centers assigned to manager',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - invalid or missing token',
  })
  async getCaptureHistory(
    @CurrentUser() user: JwtUserPayload,
    @Query(ValidationPipe) query: BiometricCaptureHistoryQueryDto,
  ): Promise<BiometricCaptureHistoryResponseDto> {
    const { page, limit, sortBy, sortOrder, ...filters } = query;
    const pagination = { page, limit, sortBy, sortOrder };

    return this.biometricCaptureHistoryService.getCaptureHistory(
      user.id,
      filters,
      pagination,
    );
  }

  /**
   * Get biometric capture statistics for centers managed by the current user
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Get biometric capture statistics',
    description:
      'Retrieve statistics about biometric captures for centers managed by the current center manager',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    type: String,
    description: 'Filter statistics from this date onwards (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    type: String,
    description: 'Filter statistics up to this date (ISO 8601)',
    example: '2024-12-31T23:59:59Z',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Biometric capture statistics retrieved successfully',
    type: BiometricCaptureStatisticsDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - no centers assigned to manager',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - invalid or missing token',
  })
  async getCaptureStatistics(
    @CurrentUser() user: JwtUserPayload,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ): Promise<BiometricCaptureStatisticsDto> {
    const filters = { fromDate, toDate };

    return this.biometricCaptureHistoryService.getCaptureStatistics(
      user.id,
      filters,
    );
  }

  /**
   * Get detailed information for a specific biometric capture
   */
  @Get(':captureId')
  @ApiOperation({
    summary: 'Get biometric capture details',
    description:
      'Retrieve detailed information for a specific biometric capture',
  })
  @ApiParam({
    name: 'captureId',
    description: 'Biometric capture ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Biometric capture details retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Biometric capture not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - capture not in managed centers',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - invalid or missing token',
  })
  async getCaptureDetails(
    @CurrentUser() user: JwtUserPayload,
    @Param('captureId', ParseUUIDPipe) captureId: string,
  ) {
    return this.biometricCaptureHistoryService.getCaptureDetails(
      user.id,
      captureId,
    );
  }
}
