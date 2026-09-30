import {
  Controller,
  Get,
  Param,
  UseGuards,
  BadRequestException,
  ForbiddenException,
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
import {
  CurrentUser,
  JwtUserPayload,
} from '@common/decorators/current-user.decorator';
import { Roles } from '@common/constants/roles.constants';
import { hasUnrestrictedAccess } from '@common/access/privileged-scope';
import { FormSubmissionsService } from './services/form-submissions.service';
import { GatehouseResponseDto } from './dto/gatehouse.dto';

/** Staff at the center's door, who look applicants up to let them in. */
const GATE_ROLES: string[] = [
  Roles.GATEHOUSE,
  Roles.RECEPTIONIST,
  Roles.CENTER_MANAGER,
];

/**
 * The gatehouse lookup returns an applicant's photo, phone and appointment,
 * and finds them by AGIC numbers that are easy to guess, so it is for gate
 * staff only. Checked here rather than with @Roles, which RolesGuard ignores
 * (see agic.controller.ts).
 */
function requireGateRole(user: JwtUserPayload) {
  const roles: string[] = user?.roles || [];
  if (hasUnrestrictedAccess(roles)) return;
  if (!roles.some((role) => GATE_ROLES.includes(role))) {
    throw new ForbiddenException('Only gate staff can look applicants up');
  }
}

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
  @ApiResponse({
    status: 403,
    description: 'Not gate staff',
  })
  async getApplicantByReference(
    @Param('referenceNumber') referenceNumber: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    requireGateRole(user);
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
