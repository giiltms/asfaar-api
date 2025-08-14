import {
  Controller,
  Get,
  Param,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { FormSubmissionsService } from './services/form-submissions.service';
import { GatehouseResponseDto } from './dto/gatehouse.dto';

@ApiTags('Applications')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(private readonly submissionsService: FormSubmissionsService) {}

  @Get('gatehouse/:referenceNumber')
  @ApiOperation({
    summary: 'Get applicant info by reference number (Gatehouse)',
    description:
      'Retrieve basic applicant information and biometric appointment details using reference number. ' +
      'This endpoint is designed for gatehouse personnel to verify applicant identity and appointment timing. ' +
      'Returns detailed appointment date/time validation including whether the appointment is today, ' +
      'if the time has passed, and minutes until/since the appointment. ' +
      "Also includes the applicant's photo from NIN verification for visual identification.",
  })
  @ApiParam({
    name: 'referenceNumber',
    description: 'Application reference number (e.g., SA25001234)',
    example: 'SA25001234',
  })
  @ApiResponse({
    status: 200,
    description:
      'Applicant information retrieved successfully with appointment time validation',
    type: GatehouseResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid reference number format',
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
  })
  async getApplicantByReference(
    @Param('referenceNumber') referenceNumber: string,
  ) {
    // Basic validation of reference number format
    if (!referenceNumber || referenceNumber.length < 8) {
      throw new BadRequestException('Invalid reference number format');
    }

    const applicantInfo =
      await this.submissionsService.getApplicantInfoByReference(
        referenceNumber,
      );

    if (!applicantInfo) {
      throw new NotFoundException(
        `Application with reference number "${referenceNumber}" not found`,
      );
    }

    return {
      success: true,
      message: 'Applicant information retrieved successfully',
      data: applicantInfo,
      timestamp: new Date().toISOString(),
    };
  }
}
