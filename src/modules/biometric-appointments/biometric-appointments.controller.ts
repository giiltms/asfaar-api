import {
  Controller,
  Get,
  Post,
  Put,
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
import { BiometricAppointmentsService } from './biometric-appointments.service';
import {
  CreateBiometricAppointmentDto,
  UpdateAppointmentStatusDto,
  RescheduleAppointmentDto,
  CompleteBiometricCaptureDto,
  AppointmentFiltersDto,
  AppointmentQueryDto,
} from './dto/biometric-appointment.dto';
import { BiometricAppointmentEntity } from './entities/biometric-appointment.entity';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import {
  CurrentUser,
  JwtUserPayload,
} from '@common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@common/dtos';

/**
 * Controller for managing biometric appointments
 * Provides REST API endpoints for appointment operations with payment validation
 */
@ApiTags('Biometric Appointments')
@Controller('biometric-appointments')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class BiometricAppointmentsController {
  constructor(
    private readonly appointmentsService: BiometricAppointmentsService,
  ) {}

  /**
   * Create a new biometric appointment (will be activated after payment)
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new biometric appointment',
    description:
      'Create a new biometric appointment for a form submission. Appointment will be activated when payment is completed.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Appointment created successfully',
    type: BiometricAppointmentEntity,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Payment not completed or invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Appointment already exists for this submission',
  })
  async createAppointment(
    @Body(ValidationPipe) createDto: CreateBiometricAppointmentDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const appointment = await this.appointmentsService.createAppointment(
      createDto,
      user.id,
    );

    return {
      message: 'Biometric appointment created successfully',
      data: appointment,
    };
  }

  /**
   * Get all appointments with optional filtering and pagination
   */
  @Get()
  @ApiOperation({
    summary: 'Get all appointments',
    description:
      'Retrieve all appointments with optional filtering, search, and pagination',
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
    example: 'appointmentDate',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Sort order',
    example: 'desc',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'],
    description: 'Filter by appointment status',
    example: 'CONFIRMED',
  })
  @ApiQuery({
    name: 'appointmentClass',
    required: false,
    enum: ['REGULAR', 'PREMIUM', 'EXPRESS'],
    description: 'Filter by appointment class',
    example: 'REGULAR',
  })
  @ApiQuery({
    name: 'centerId',
    required: false,
    type: String,
    description: 'Filter by biometric center',
    example: 'uuid-string',
  })
  @ApiQuery({
    name: 'userId',
    required: false,
    type: String,
    description: 'Filter by user ID',
    example: 'uuid-string',
  })
  @ApiQuery({
    name: 'submissionId',
    required: false,
    type: String,
    description: 'Filter by submission ID',
    example: 'uuid-string',
  })
  @ApiQuery({
    name: 'referenceNumber',
    required: false,
    type: String,
    description: 'Filter by reference number',
    example: 'CC01225000001',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    type: String,
    description: 'Filter appointments from this date (YYYY-MM-DD)',
    example: '2024-02-01',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    type: String,
    description: 'Filter appointments to this date (YYYY-MM-DD)',
    example: '2024-02-28',
  })
  @ApiQuery({
    name: 'biometricsCaptured',
    required: false,
    type: Boolean,
    description: 'Filter by whether biometrics are captured',
    example: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Appointments retrieved successfully',
    type: [BiometricAppointmentEntity],
  })
  async findAllAppointments(
    @Query() query: AppointmentQueryDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    // Extract pagination and filters from the combined query
    const { page, limit, sortBy, sortOrder, ...filters } = query;
    const pagination = { page, limit, sortBy, sortOrder };

    // Filter by user unless they have admin role
    const result = await this.appointmentsService.findAllAppointments(
      filters,
      pagination,
      user.roles?.includes('ADMIN') || user.roles?.includes('SUPER_ADMIN')
        ? undefined
        : user.id,
    );

    return {
      message: 'Appointments retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  /**
   * Get appointment statistics
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Get appointment statistics',
    description: 'Retrieve appointment statistics and analytics',
  })
  @ApiQuery({
    name: 'centerId',
    required: false,
    type: String,
    description: 'Filter statistics by center',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Appointment statistics retrieved successfully',
  })
  async getAppointmentStatistics(@Query('centerId') centerId?: string) {
    const statistics = await this.appointmentsService.getAppointmentStatistics(
      centerId,
    );

    return {
      message: 'Appointment statistics retrieved successfully',
      data: statistics,
    };
  }

  /**
   * Get user's appointments
   */
  @Get('my-appointments')
  @ApiOperation({
    summary: 'Get current user appointments',
    description: 'Retrieve appointments for the authenticated user',
  })
  @ApiQuery({
    name: 'referenceNumber',
    required: false,
    type: String,
    description: 'Filter by reference number',
    example: 'CC01225000001',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User appointments retrieved successfully',
    type: [BiometricAppointmentEntity],
  })
  async getMyAppointments(
    @Query() filters: AppointmentFiltersDto,
    @Query() pagination: PaginationQueryDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const result = await this.appointmentsService.findAllAppointments(
      filters,
      pagination,
      user.id,
    );

    return {
      message: 'Your appointments retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  /**
   * Get a specific appointment by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get appointment by ID',
    description: 'Retrieve a specific appointment by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Appointment ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Appointment retrieved successfully',
    type: BiometricAppointmentEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Appointment not found',
  })
  async findAppointmentById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const appointment = await this.appointmentsService.findAppointmentById(
      id,
      user.roles?.includes('ADMIN') ? undefined : user.id,
    );

    return {
      message: 'Appointment retrieved successfully',
      data: appointment,
    };
  }

  /**
   * Get appointment by reference number
   */
  @Get('by-reference/:referenceNumber')
  @ApiOperation({
    summary: 'Get appointment by reference number',
    description: 'Retrieve a specific appointment by its reference number',
  })
  @ApiParam({
    name: 'referenceNumber',
    description: 'Reference number (e.g., CC01225000001)',
    example: 'CC01225000001',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Appointment retrieved successfully',
    type: BiometricAppointmentEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Appointment not found',
  })
  async findAppointmentByReferenceNumber(
    @Param('referenceNumber') referenceNumber: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const appointment =
      await this.appointmentsService.findAppointmentByReferenceNumber(
        referenceNumber,
        user.roles?.includes('ADMIN') || user.roles?.includes('SUPER_ADMIN')
          ? undefined
          : user.id,
      );

    return {
      message: 'Appointment retrieved successfully',
      data: appointment,
    };
  }

  /**
   * Update appointment status (admin use)
   */
  @Put(':id/status')
  @ApiOperation({
    summary: 'Update appointment status',
    description: 'Update appointment status (admin use)',
  })
  @ApiParam({
    name: 'id',
    description: 'Appointment ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Appointment status updated successfully',
    type: BiometricAppointmentEntity,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid status transition',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Appointment not found',
  })
  async updateAppointmentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateAppointmentStatusDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const appointment = await this.appointmentsService.updateAppointmentStatus(
      id,
      updateDto,
      user.id,
    );

    return {
      message: 'Appointment status updated successfully',
      data: appointment,
    };
  }

  /**
   * Reschedule an appointment
   */
  @Put(':id/reschedule')
  @ApiOperation({
    summary: 'Reschedule an appointment',
    description: 'Reschedule an existing appointment to a new date/time',
  })
  @ApiParam({
    name: 'id',
    description: 'Appointment ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Appointment rescheduled successfully',
    type: BiometricAppointmentEntity,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot reschedule appointment or time slot unavailable',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Appointment not found',
  })
  async rescheduleAppointment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) rescheduleDto: RescheduleAppointmentDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const appointment = await this.appointmentsService.rescheduleAppointment(
      id,
      rescheduleDto,
      user.id,
      user.id,
    );

    return {
      message: 'Appointment rescheduled successfully',
      data: appointment,
    };
  }

  /**
   * Complete biometric capture
   */
  @Put(':id/complete')
  @ApiOperation({
    summary: 'Complete biometric capture',
    description:
      'Mark biometric capture as completed for an active appointment',
  })
  @ApiParam({
    name: 'id',
    description: 'Appointment ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Biometric capture completed successfully',
    type: BiometricAppointmentEntity,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Appointment is not active or already completed',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Appointment not found',
  })
  async completeBiometricCapture(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) captureDto: CompleteBiometricCaptureDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const appointment = await this.appointmentsService.completeBiometricCapture(
      id,
      captureDto,
      user.id,
    );

    return {
      message: 'Biometric capture completed successfully',
      data: appointment,
    };
  }

  /**
   * Cancel an appointment
   */
  @Put(':id/cancel')
  @ApiOperation({
    summary: 'Cancel an appointment',
    description: 'Cancel an existing appointment',
  })
  @ApiParam({
    name: 'id',
    description: 'Appointment ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Appointment cancelled successfully',
    type: BiometricAppointmentEntity,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot cancel appointment with current status',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Appointment not found',
  })
  async cancelAppointment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason', ValidationPipe) reason: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const appointment = await this.appointmentsService.cancelAppointment(
      id,
      reason,
      user.id,
      user.id,
    );

    return {
      message: 'Appointment cancelled successfully',
      data: appointment,
    };
  }

  /**
   * Admin test endpoint for health checks
   */
  @Get('admin/test')
  @ApiOperation({
    summary: 'Test endpoint',
    description: 'Health check endpoint for biometric appointments module',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test successful',
  })
  async adminTest() {
    return {
      message: 'Biometric appointments module is working correctly',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      features: [
        'Payment validation',
        'Appointment booking',
        'Automatic activation via webhooks',
        'Rescheduling',
        'Cancellation',
        'Biometric capture completion',
        'Statistics',
      ],
    };
  }
}
