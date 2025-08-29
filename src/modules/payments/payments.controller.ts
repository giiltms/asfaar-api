import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  Request,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
  ValidationPipe,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import {
  CreatePaymentDto,
  UpdatePaymentStatusDto,
  RefundPaymentDto,
  PaymentFiltersDto,
  PaymentQueryDto,
  PaymentStatisticsDto,
  PaymentStatisticsResponseDto,
  UpdatePaymentDto,
  InitiatePaymentDto,
  ServiceFeeFiltersDto,
  ServiceFeeQueryDto,
  CreateServiceFeeDto,
  UpdateServiceFeeDto,
} from './dto/payment.dto';
import { PaymentEntity } from './entities/payment.entity';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { PaginationQueryDto } from '@common/dtos';
import { UserService } from '@modules/user/user.service';
import { PaymentService as PaymentProviderService } from '@shared/services/payment/payment.service';
import { ConfigService } from '@nestjs/config';

/**
 * Controller for managing payments
 * Provides REST API endpoints for payment operations
 */
@ApiTags('Payments')
@Controller('payments')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly paymentProviderService: PaymentProviderService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a new payment
   */
  @Post()
  @ApiOperation({
    summary: 'Create a new payment',
    description: 'Create a new payment for a form submission',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment created successfully',
    type: PaymentEntity,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Payment already exists for this submission',
  })
  async createPayment(
    @Request() req: any,
    @Body(ValidationPipe) createDto: CreatePaymentDto,
    // TODO: Extract user ID from JWT token when user context is available
    // @CurrentUser() user: User,
  ) {
    const payment = await this.paymentsService.createPayment(
      createDto,
      req.user?.id, // userId
      undefined, // reference
    );

    return {
      message: 'Payment created successfully',
      data: payment,
    };
  }

  /**
   * Get all service fees
   */
  @Get('fee')
  @ApiOperation({
    summary: 'Get service fees',
    description: 'Get all service fees with filtering and pagination',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service fee retrieved successfully',
  })
  async findAllServiceFees(
    @Query(new ValidationPipe({ transform: true }))
    query: ServiceFeeQueryDto,
  ) {
    const { page, limit, sortBy, sortOrder, currency, search, feeType } = query;

    const filters = { currency, search, feeType };
    const pagination = { page, limit, sortBy, sortOrder };

    const result = await this.paymentsService.findAllServiceFees(
      filters,
      pagination,
    );
    return {
      message: 'Service fee retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  /**
   * Get all payments with optional filtering and pagination
   */
  @Get()
  @ApiOperation({
    summary: 'Get all payments',
    description:
      'Retrieve all payments with optional filtering, search, and pagination',
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
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by payment status',
    example: 'COMPLETED',
  })
  @ApiQuery({
    name: 'currency',
    required: false,
    type: String,
    description: 'Filter by currency',
    example: 'USD',
  })
  @ApiQuery({
    name: 'submissionId',
    required: false,
    type: String,
    description: 'Filter by submission ID',
    example: 'uuid-string',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by processor ID, invoice number, or description',
    example: 'pi_123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payments retrieved successfully',
    type: [PaymentEntity],
  })
  async findAllPayments(
    @Query(new ValidationPipe({ transform: true }))
    query: PaymentQueryDto,
  ) {
    const {
      page,
      limit,
      sortBy,
      sortOrder,
      status,
      currency,
      submissionId,
      methodType,
      minAmount,
      maxAmount,
      search,
    } = query;

    const filters = {
      status,
      currency,
      submissionId,
      methodType,
      minAmount,
      maxAmount,
      search,
    };
    const pagination = { page, limit, sortBy, sortOrder };

    const result = await this.paymentsService.findAllPayments(
      filters,
      pagination,
    );

    return {
      message: 'Payments retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  /**
   * Get current user's payments
   */
  @Get('my')
  @ApiOperation({
    summary: 'Get my payments',
    description:
      "Retrieve current user's payments with optional filtering and pagination",
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
    name: 'status',
    required: false,
    type: String,
    description: 'Filter by payment status',
    example: 'COMPLETED',
  })
  @ApiQuery({
    name: 'currency',
    required: false,
    type: String,
    description: 'Filter by currency',
    example: 'USD',
  })
  @ApiQuery({
    name: 'submissionId',
    required: false,
    type: String,
    description: 'Filter by submission ID',
    example: 'uuid-string',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by processor ID, invoice number, or description',
    example: 'pi_123',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User payments retrieved successfully',
    type: [PaymentEntity],
  })
  async findMyPayments(
    @Request() req: any,
    @Query(new ValidationPipe({ transform: true }))
    query: PaymentQueryDto,
  ) {
    const userId = req.user.id;
    const {
      page,
      limit,
      sortBy,
      sortOrder,
      status,
      currency,
      submissionId,
      methodType,
      minAmount,
      maxAmount,
      search,
    } = query;

    const filters = {
      status,
      currency,
      submissionId,
      methodType,
      minAmount,
      maxAmount,
      search,
    };
    const pagination = { page, limit, sortBy, sortOrder };

    const result = await this.paymentsService.findUserPayments(
      userId,
      filters,
      pagination,
    );

    return {
      message: 'User payments retrieved successfully',
      data: result.data,
      meta: result.meta,
    };
  }

  /**
   * Get current user's payment statistics
   */
  @Get('my/statistics')
  @ApiOperation({
    summary: 'Get my payment statistics',
    description:
      "Retrieve current user's payment statistics including counts and amounts",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User payment statistics retrieved successfully',
    type: PaymentStatisticsResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
  })
  async getMyPaymentStatistics(@Request() req: any) {
    const userId = req.user.id;
    const statistics = await this.paymentsService.getUserPaymentStatistics(
      userId,
    );

    return {
      message: 'User payment statistics retrieved successfully',
      data: statistics,
    };
  }

  /**
   * Initiate a new payment
   */
  @Post('initiate')
  @ApiOperation({
    summary: 'Initiate a new payment',
    description: 'Initiate a new payment for a form submission',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment initiated successfully',
    type: PaymentEntity,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  //@UseGuards(AuthGuard)  // or JwtAuthGuard, or whatever your auth guard is
  @ApiBearerAuth()
  async initiatePayment(
    @Request() req: any,
    @Body(ValidationPipe) initiatePaymentDto: InitiatePaymentDto,
  ) {
    const user = req.user;

    // Validate we have service fees to process
    if (!initiatePaymentDto?.serviceFees?.length) {
      throw new BadRequestException('At least one service fee is required');
    }

    // Fetch all service fees
    const serviceFees = await Promise.all(
      initiatePaymentDto.serviceFees.map((serviceFeeId) =>
        this.paymentsService.findServiceFeeById(serviceFeeId),
      ),
    );

    // Verify all service fees are valid and active
    const invalidFees = serviceFees.filter((fee) => !fee || !fee.isActive);

    if (invalidFees.length > 0) {
      throw new BadRequestException(
        'One or more service fees are invalid or inactive',
      );
    }

    // Calculate total amount
    const totalAmount = serviceFees.reduce((sum, fee) => sum + fee.amount, 0);

    // Determine payment type from service fees
    const paymentTypes = [
      ...new Set(serviceFees.map((fee) => fee.feeType).filter(Boolean)),
    ];
    const primaryPaymentType =
      paymentTypes.length > 0 ? paymentTypes[0] : 'UNKNOWN';

    // Create route-based callback URL with payment type information
    const baseCallbackUrl = this.configService.get(
      'payment.PAYMENT_CALLBACK_URL',
    );

    // Determine the route based on payment type
    let paymentRoute = 'application'; // default route
    if (primaryPaymentType === 'ONBOARDING') {
      paymentRoute = 'onboarding';
    } else if (primaryPaymentType === 'UPGRADE') {
      paymentRoute = 'upgrade';
    } else if (primaryPaymentType === 'RESCHEDULING') {
      paymentRoute = 'rescheduling';
    } else if (primaryPaymentType === 'ADDITIONAL_CHARGE') {
      paymentRoute = 'additional-charge';
    }

    const enhancedCallbackUrl = `${baseCallbackUrl}/${paymentRoute}`;

    // Prepare payment data
    const paymentData = {
      ...initiatePaymentDto,
      amount: totalAmount,
      email: user.email,
      user: user?.id,
      serviceFees: initiatePaymentDto.serviceFees,
      callbackUrl: enhancedCallbackUrl, // Use enhanced callback URL
      metadata: {
        feeDetails: serviceFees.map((fee) => ({
          id: fee.id,
          name: fee.name,
          amount: fee.amount,
          feeType: fee.feeType,
        })),
        paymentType: primaryPaymentType,
        feeTypes: paymentTypes,
        paymentRoute: paymentRoute, // Include the route for frontend routing
        feeBearer: 'business', // You absorb the fees (recommended)
      },
      customerName: `${user.firstName} ${user.lastName}`,
    };

    const payment = await this.paymentProviderService.initiatePayment(
      paymentData,
    );

    await this.paymentsService.createPayment(
      paymentData,
      user.id, // userId
      payment.reference, // reference
    );

    return {
      message: 'Payment initiated successfully',
      data: payment,
    };
  }

  /**
   * Get a specific payment by ID
   */
  @Get(':reference/verify')
  @ApiOperation({
    summary: 'Verify payment by Ref',
    description: 'Retrieve a specific payment by Ref',
  })
  @ApiParam({
    name: 'reference',
    description: 'Payment Ref',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment retrieved successfully',
    type: PaymentEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  async verifyPayment(@Param('reference') reference: string) {
    const payment = await this.paymentsService.findPaymentByRef(reference);

    // Validate that the payment has a processor set
    if (!payment.processor) {
      throw new BadRequestException(
        `Payment processor not set for payment ${payment.id}. Cannot verify payment without knowing the provider.`,
      );
    }

    const result = await this.paymentProviderService.verifyPayment(
      reference,
      payment.processor,
    );

    return {
      message: 'Payment retrieved successfully',
      data: result,
    };
  }

  /**
   * Get payment statistics
   */
  @Get('statistics')
  @ApiOperation({
    summary: 'Get payment statistics',
    description: 'Retrieve payment statistics and analytics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment statistics retrieved successfully',
  })
  async getPaymentStatistics() {
    const statistics = await this.paymentsService.getPaymentStatistics();

    return {
      message: 'Payment statistics retrieved successfully',
      data: statistics,
    };
  }

  /**
   * Get a specific payment by ID
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get payment by ID',
    description: 'Retrieve a specific payment by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment retrieved successfully',
    type: PaymentEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  async findPaymentById(@Param('id', ParseUUIDPipe) id: string) {
    const payment = await this.paymentsService.findPaymentById(id);

    return {
      message: 'Payment retrieved successfully',
      data: payment,
    };
  }

  /**
   * Get payment by submission ID
   */
  @Get('submission/:submissionId')
  @ApiOperation({
    summary: 'Get payment by submission ID',
    description: 'Retrieve payment for a specific form submission',
  })
  @ApiParam({
    name: 'submissionId',
    description: 'Form submission ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment retrieved successfully',
    type: PaymentEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found for this submission',
  })
  async findPaymentBySubmissionId(
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
  ) {
    const payment = await this.paymentsService.findPaymentBySubmissionId(
      submissionId,
    );

    if (!payment) {
      return {
        message: 'No payment found for this submission',
        data: null,
      };
    }

    return {
      message: 'Payment retrieved successfully',
      data: payment,
    };
  }

  /**
   * Update payment status (usually called by payment webhooks)
   */
  @Put(':id/status')
  @ApiOperation({
    summary: 'Update payment status',
    description:
      'Update payment status (typically used by payment processor webhooks)',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment status updated successfully',
    type: PaymentEntity,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid status transition',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  async updatePaymentStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdatePaymentStatusDto,
    // TODO: Extract user ID from JWT token when user context is available
    // @CurrentUser() user: User,
  ) {
    const payment = await this.paymentsService.updatePaymentStatus(
      id,
      updateDto,
      // user?.id,
    );

    return {
      message: 'Payment status updated successfully',
      data: payment,
    };
  }

  /**
   * Update payment details (admin use)
   */
  @Put(':id')
  @ApiOperation({
    summary: 'Update payment details',
    description: 'Update payment details (admin use)',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment updated successfully',
    type: PaymentEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  async updatePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdatePaymentDto,
    // TODO: Extract user ID from JWT token when user context is available
    // @CurrentUser() user: User,
  ) {
    const payment = await this.paymentsService.updatePayment(
      id,
      updateDto,
      // user?.id,
    );

    return {
      message: 'Payment updated successfully',
      data: payment,
    };
  }

  /**
   * Create a new service fee (Admin only)
   */
  @Post('fee')
  @ApiOperation({
    summary: 'Create a service fee',
    description: 'Create a new service fee (Admin only)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment option created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async createServiceFee(@Body(ValidationPipe) createDto: CreateServiceFeeDto) {
    const option = await this.paymentsService.createServiceFee(createDto);

    return {
      message: 'Payment option created successfully',
      data: option,
    };
  }

  /**
   * Get a service fee by ID
   */
  @Get('fee/:id')
  @ApiOperation({
    summary: 'Get service fee by ID',
    description: 'Get a specific service fee by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment option ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment option retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment option not found',
  })
  async findServiceFeeById(@Param('id', ParseUUIDPipe) id: string) {
    const option = await this.paymentsService.findServiceFeeById(id);
    return {
      message: 'Payment option retrieved successfully',
      data: option,
    };
  }

  /**
   * Update a service fee (Admin only)
   */
  @Put('fee/:id')
  @ApiOperation({
    summary: 'Update service fee',
    description: 'Update a service fee (Admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment option ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment option updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment option not found',
  })
  async updateServiceFee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateServiceFeeDto,
  ) {
    const option = await this.paymentsService.updateServiceFee(id, updateDto);
    return {
      message: 'Payment option updated successfully',
      data: option,
    };
  }

  /**
   * Delete a service fee (Admin only)
   */
  @Delete('fee/:id')
  @ApiOperation({
    summary: 'Delete service fee',
    description: 'Delete a service fee (Admin only)',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment option ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment option deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment option not found',
  })
  async deleteServiceFee(@Param('id', ParseUUIDPipe) id: string) {
    await this.paymentsService.deleteServiceFee(id);
    return {
      message: 'Payment option deleted successfully',
    };
  }

  /**
   * Refund a payment
   */
  @Put(':id/refund')
  @ApiOperation({
    summary: 'Refund a payment',
    description: 'Process a full or partial refund for a completed payment',
  })
  @ApiParam({
    name: 'id',
    description: 'Payment ID',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment refunded successfully',
    type: PaymentEntity,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Payment cannot be refunded or invalid refund amount',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Payment not found',
  })
  async refundPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) refundDto: RefundPaymentDto,
    // TODO: Extract user ID from JWT token when user context is available
    // @CurrentUser() user: User,
  ) {
    const payment = await this.paymentsService.refundPayment(
      id,
      refundDto,
      // user?.id,
    );

    return {
      message: 'Payment refunded successfully',
      data: payment,
    };
  }

  /**
   * Admin test endpoint for health checks
   */
  @Get('admin/test')
  @ApiOperation({
    summary: 'Test endpoint',
    description: 'Health check endpoint for payments module',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Test successful',
  })
  async adminTest() {
    return {
      message: 'Payments module is working correctly',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      features: [
        'Payment creation',
        'Status updates',
        'Refund processing',
        'Statistics',
        'Webhook support',
      ],
    };
  }
}
