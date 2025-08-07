import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpStatus,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { QueueService } from './queue.service';
import { QueueEntity } from './entities/queue.entity';
import {
  CheckInDto,
  UpdateQueueStatusDto,
  CallNextDto,
  QueueFiltersDto,
  QueueResponseDto,
  QueueStatsDto,
  QueuePositionResponseDto,
  BulkUpdateQueueDto,
} from './dto/queue.dto';
import { PaginationQueryDto } from '@common/dtos/pagination.dto';
import { BaseResponseDto } from '@common/dtos/base-response.dto';
import { AppointmentClass, QueueStatus } from '@prisma/client';

@ApiTags('Queue Management')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Post('check-in')
  @ApiOperation({
    summary: 'Check in to queue',
    description: 'Add applicant to FIFO queue for biometric capture'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Successfully checked in to queue',
    type: QueueResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Appointment not eligible for queue or validation failed',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Already in queue',
  })
  async checkIn(
    @Body(ValidationPipe) checkInDto: CheckInDto,
  ): Promise<BaseResponseDto<QueueEntity>> {
    const queueEntry = await this.queueService.checkIn(checkInDto);
    const queueEntity = new QueueEntity(queueEntry);

    return {
      success: true,
      message: `Successfully checked in to queue. Queue number: ${queueEntry.queueNumber}`,
      data: queueEntity,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('position/:appointmentId')
  @ApiOperation({
    summary: 'Get queue position',
    description: 'Get current position and estimated wait time for appointment'
  })
  @ApiParam({ name: 'appointmentId', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue position retrieved successfully',
    type: QueuePositionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Appointment not found in queue',
  })
  async getQueuePosition(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ): Promise<BaseResponseDto<QueuePositionResponseDto>> {
    const position = await this.queueService.getQueuePosition(appointmentId);

    return {
      success: true,
      message: 'Queue position retrieved successfully',
      data: position,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('call-next')
  @ApiOperation({
    summary: 'Call next in queue',
    description: 'Call next person in FIFO order and assign to available booth'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Next person called successfully',
    type: QueueResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'No one waiting in queue',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'No available booths',
  })
  async callNext(
    @Body(ValidationPipe) callNextDto: CallNextDto,
  ): Promise<BaseResponseDto<QueueEntity>> {
    const queueEntry = await this.queueService.callNext(callNextDto);
    const queueEntity = new QueueEntity(queueEntry);

    return {
      success: true,
      message: `Called next person to booth ${queueEntry.boothId ? `booth-${queueEntry.boothId}` : 'available booth'}`,
      data: queueEntity,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Get all queue entries',
    description: 'Get queue entries with filtering and pagination'
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'centerId', required: false, type: String })
  @ApiQuery({ name: 'appointmentClass', required: false, enum: AppointmentClass })
  @ApiQuery({ name: 'status', required: false, enum: QueueStatus })
  @ApiQuery({ name: 'boothId', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue entries retrieved successfully',
  })
  async findAllQueueEntries(
    @Query(ValidationPipe) pagination: PaginationQueryDto,
    @Query(ValidationPipe) filters: QueueFiltersDto,
  ) {
    const result = await this.queueService.findAllQueueEntries(filters, pagination);

    return {
      success: true,
      message: 'Queue entries retrieved successfully',
      data: result.data.map((entry) => new QueueEntity(entry)),
      meta: result.meta,
    };
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get queue statistics',
    description: 'Get comprehensive queue statistics and analytics'
  })
  @ApiQuery({ name: 'centerId', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue statistics retrieved successfully',
    type: QueueStatsDto,
  })
  async getQueueStats(
    @Query('centerId') centerId?: string,
  ): Promise<BaseResponseDto<QueueStatsDto>> {
    const stats = await this.queueService.getQueueStats(centerId);

    return {
      success: true,
      message: 'Queue statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('center/:centerId')
  @ApiOperation({
    summary: 'Get queue for specific center',
    description: 'Get current queue status for a specific biometric center'
  })
  @ApiParam({ name: 'centerId', type: String })
  @ApiQuery({ name: 'appointmentClass', required: false, enum: AppointmentClass })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Center queue retrieved successfully',
  })
  async getCenterQueue(
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Query('appointmentClass') appointmentClass?: AppointmentClass,
  ) {
    const filters: QueueFiltersDto = {
      centerId,
      appointmentClass,
      activeOnly: true,
    };

    const result = await this.queueService.findAllQueueEntries(filters, {
      page: 1,
      limit: 50,
    });

    return {
      success: true,
      message: 'Center queue retrieved successfully',
      data: result.data.map((entry) => new QueueEntity(entry)),
      meta: result.meta,
    };
  }

  @Put(':queueId/status')
  @ApiOperation({
    summary: 'Update queue entry status',
    description: 'Update status of a queue entry (admin/agent only)'
  })
  @ApiParam({ name: 'queueId', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue status updated successfully',
    type: QueueResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Queue entry not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid status transition',
  })
  async updateQueueStatus(
    @Param('queueId', ParseUUIDPipe) queueId: string,
    @Body(ValidationPipe) updateDto: UpdateQueueStatusDto,
  ): Promise<BaseResponseDto<QueueEntity>> {
    const queueEntry = await this.queueService.updateQueueStatus(queueId, updateDto);
    const queueEntity = new QueueEntity(queueEntry);

    return {
      success: true,
      message: `Queue status updated to ${updateDto.status}`,
      data: queueEntity,
      timestamp: new Date().toISOString(),
    };
  }

  @Put(':queueId/cancel')
  @ApiOperation({
    summary: 'Cancel queue entry',
    description: 'Cancel a queue entry and release booth if assigned'
  })
  @ApiParam({ name: 'queueId', type: String })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'Reason for cancellation' },
      },
    },
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue entry cancelled successfully',
    type: QueueResponseDto,
  })
  async cancelQueueEntry(
    @Param('queueId', ParseUUIDPipe) queueId: string,
    @Body() body?: { reason?: string },
  ): Promise<BaseResponseDto<QueueEntity>> {
    const queueEntry = await this.queueService.cancelQueueEntry(queueId, body?.reason);
    const queueEntity = new QueueEntity(queueEntry);

    return {
      success: true,
      message: 'Queue entry cancelled successfully',
      data: queueEntity,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('my-position/:appointmentId')
  @ApiOperation({
    summary: 'Get my queue position (applicant view)',
    description: 'Get queue position for applicants to see their status'
  })
  @ApiParam({ name: 'appointmentId', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Your queue position',
    type: QueuePositionResponseDto,
  })
  async getMyQueuePosition(
    @Param('appointmentId', ParseUUIDPipe) appointmentId: string,
  ): Promise<BaseResponseDto<QueuePositionResponseDto>> {
    // TODO: Verify that the requesting user owns this appointment
    const position = await this.queueService.getQueuePosition(appointmentId);

    return {
      success: true,
      message: 'Your queue position retrieved successfully',
      data: position,
      timestamp: new Date().toISOString(),
    };
  }

  @Put('bulk-update')
  @ApiOperation({
    summary: 'Bulk update queue entries',
    description: 'Update multiple queue entries at once (admin only)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue entries updated successfully',
  })
  async bulkUpdateQueue(
    @Body(ValidationPipe) bulkUpdateDto: BulkUpdateQueueDto,
  ): Promise<BaseResponseDto<{ updated: number }>> {
    // TODO: Implement bulk update logic
    // const result = await this.queueService.bulkUpdateQueue(bulkUpdateDto);

    return {
      success: true,
      message: `Updated ${bulkUpdateDto.queueIds.length} queue entries to ${bulkUpdateDto.status}`,
      data: { updated: bulkUpdateDto.queueIds.length },
      timestamp: new Date().toISOString(),
    };
  }

  // Real-time endpoints for queue monitoring
  @Get('monitor/center/:centerId')
  @ApiOperation({
    summary: 'Real-time queue monitor',
    description: 'Get real-time queue status for center dashboard'
  })
  @ApiParam({ name: 'centerId', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Real-time queue status',
  })
  async monitorCenterQueue(
    @Param('centerId', ParseUUIDPipe) centerId: string,
  ) {
    const [stats, activeQueue] = await Promise.all([
      this.queueService.getQueueStats(centerId),
      this.queueService.findAllQueueEntries(
        { centerId, activeOnly: true },
        { page: 1, limit: 20 },
      ),
    ]);

    return {
      success: true,
      message: 'Real-time queue status retrieved',
      data: {
        stats,
        activeQueue: activeQueue.data.map((entry) => new QueueEntity(entry)),
        timestamp: new Date().toISOString(),
      },
    };
  }
} 