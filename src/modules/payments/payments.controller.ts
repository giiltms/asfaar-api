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
  UpdatePaymentDto,
  InitiatePaymentDto,
  PaymentOptionFiltersDto,
  CreatePaymentOptionDto,
  UpdatePaymentOptionDto,
} from './dto/payment.dto';
import { PaymentEntity } from './entities/payment.entity';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { PaginationQueryDto } from '@common/dtos';
import { User } from '@prisma/client';
import { UserService } from '@modules/user/user.service';
import { UserProxy } from '@modules/casl/proxies/user.proxy';
import { CaslUser } from '@modules/casl/decorators/casl-user';

/**
 * Controller for managing payments
 * Provides REST API endpoints for payment operations
 */
@ApiTags('Payments')
@Controller('payments')
//@UseGuards(AuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly userService: UserService

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
    @Body(ValidationPipe) createDto: CreatePaymentDto,
    // TODO: Extract user ID from JWT token when user context is available
    // @CurrentUser() user: User,
  ) {
    const payment = await this.paymentsService.createPayment(
      createDto,
      // user?.id,
    );

    return {
      message: 'Payment created successfully',
      data: payment,
    };
  }

     /**
   * Get all payment options
   */
  @Get('options')
  @ApiOperation({
    summary: 'Get payment options',
    description: 'Get all payment options with filtering and pagination',
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
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'currency',
    required: false,
    type: String,
    description: 'Filter by currency',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by name or description',

  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Payment options retrieved successfully',
  })
  async findAllPaymentOptions(
  @Query(new ValidationPipe({ transform: true })) filters: PaymentOptionFiltersDto,
  @Query(new ValidationPipe({ transform: true })) pagination: PaginationQueryDto,
  ) {


  console.log('Filters:', filters);
  console.log('Pagination:', pagination);

    const result = await this.paymentsService.findAllPaymentOptions(
      filters,
      pagination,
    );
    return {
      message: 'Payment options retrieved successfully',
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
    @Query() filters: PaymentFiltersDto,
    @Query() pagination: PaginationQueryDto,
  ) {
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
   * Initiate a new payment
   */
  @Post("initiate")
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
    @Body(ValidationPipe) initiatePaymentDto: InitiatePaymentDto
  ) {
    console.log("initiatePayment->request: ", req.user)

    const userId = req.user.id;

    const paymentOption = await this.paymentsService.findPaymentOptionById(initiatePaymentDto.paymentOption);
    
    const user = await this.userService.getUserById(userId);
    initiatePaymentDto.amount = paymentOption.amount
    initiatePaymentDto.email = user.email

    if (!paymentOption || !paymentOption.isActive) {
      //this.logger.error(`Invalid or inactive payment option: ${paymentOption}`);
      throw new BadRequestException('Invalid or inactive payment option');
    }

    const payment = await this.paymentsService.initiatePayment(
      initiatePaymentDto,
      userId,
    );

    return {
      message: 'Payment initiated successfully',
      data: payment,
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
   * Create a new payment option (Admin only)
   */
  @Post('options')
  @ApiOperation({
    summary: 'Create a payment option',
    description: 'Create a new payment option (Admin only)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment option created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async createPaymentOption(
    @Body(ValidationPipe) createDto: CreatePaymentOptionDto,
  ) {

    const option = await this.paymentsService.createPaymentOption(createDto);

    return {
      message: 'Payment option created successfully',
      data: option,
    };
  }

 

  /**
   * Get a payment option by ID
   */
  @Get('options/:id')
  @ApiOperation({
    summary: 'Get payment option by ID',
    description: 'Get a specific payment option by its ID',
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
  async findPaymentOptionById(@Param('id', ParseUUIDPipe) id: string) {
    const option = await this.paymentsService.findPaymentOptionById(id);
    return {
      message: 'Payment option retrieved successfully',
      data: option,
    };
  }

  /**
   * Update a payment option (Admin only)
   */
  @Put('options/:id')
  @ApiOperation({
    summary: 'Update payment option',
    description: 'Update a payment option (Admin only)',
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
  async updatePaymentOption(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdatePaymentOptionDto,
  ) {
    const option = await this.paymentsService.updatePaymentOption(id, updateDto);
    return {
      message: 'Payment option updated successfully',
      data: option,
    };
  }

  /**
   * Delete a payment option (Admin only)
   */
  @Delete('options/:id')
  @ApiOperation({
    summary: 'Delete payment option',
    description: 'Delete a payment option (Admin only)',
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
  
  async deletePaymentOption(@Param('id', ParseUUIDPipe) id: string) {
    await this.paymentsService.deletePaymentOption(id);
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


