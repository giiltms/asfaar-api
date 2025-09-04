import {
  Controller,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import {
  CurrentUser,
  JwtUserPayload,
} from '@common/decorators/current-user.decorator';
import { DashboardFrontdeskService } from './dashboard-frontdesk.service';
import {
  CheckInAppointmentDto,
  AddToQueueDto,
  UpdateQueueStatusDto,
} from './dto/appointment-management.dto';

@ApiTags('Appointment Management')
@Controller('appointment-management')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class AppointmentManagementController {
  constructor(
    private readonly dashboardFrontdeskService: DashboardFrontdeskService,
  ) {}

  @Post('check-in/:referenceNumber')
  @ApiOperation({
    summary: 'Gatehouse check-in for applicant',
    description:
      'Mark an applicant as checked in when they arrive at the gatehouse using their reference number',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Applicant successfully checked in',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid reference number or already checked in',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - not assigned to this center',
  })
  async checkInApplicant(
    @Param('referenceNumber') referenceNumber: string,
    @Body() checkInData: CheckInAppointmentDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const userId = user.id;
    return this.dashboardFrontdeskService.checkInApplicant(
      referenceNumber,
      userId,
      checkInData,
    );
  }

  @Post('queue/add/:referenceNumber')
  @ApiOperation({
    summary: 'Add applicant to queue',
    description:
      'Receptionist adds a checked-in applicant to the processing queue using their reference number',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Applicant successfully added to queue',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid reference number or not checked in',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - not assigned to this center',
  })
  async addToQueue(
    @Param('referenceNumber') referenceNumber: string,
    @Body() queueData: AddToQueueDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const userId = user.id;
    return this.dashboardFrontdeskService.addToQueue(
      referenceNumber,
      userId,
      queueData,
    );
  }

  @Put('queue/:queueEntryId/status')
  @ApiOperation({
    summary: 'Update queue status',
    description:
      'Update the status of an applicant in the queue (called, in progress, completed)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Queue status updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid queue entry or status transition',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - not assigned to this center',
  })
  async updateQueueStatus(
    @Param('queueEntryId') queueEntryId: string,
    @Body() statusData: UpdateQueueStatusDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    const userId = user.id;
    return this.dashboardFrontdeskService.updateQueueStatus(
      queueEntryId,
      userId,
      statusData,
    );
  }

  @Post('queue/:queueEntryId/assign-booth')
  @ApiOperation({
    summary: 'Assign booth to applicant',
    description: 'Assign a specific booth to an applicant in the queue',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booth assigned successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid queue entry or booth',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied - not assigned to this center',
  })
  async assignBooth(
    @Param('queueEntryId') queueEntryId: string,
    @Body() boothData: { boothId: string },
    @CurrentUser() user: JwtUserPayload,
  ) {
    const userId = user.id;
    return this.dashboardFrontdeskService.assignBooth(
      queueEntryId,
      boothData.boothId,
      userId,
    );
  }
}
