import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import {
  CurrentUser,
  JwtUserPayload,
} from '@common/decorators/current-user.decorator';
import { Roles } from '@common/constants/roles.constants';
import { hasUnrestrictedAccess } from '@common/access/privileged-scope';
import { AgicScanDto } from './dto/agic.dto';
import { AgicImportService } from './agic-import.service';
import { AgicBiometricSyncService } from './agic-biometric-sync.service';
import { AgicScanError, parseAgicScan } from './agic-scan';

/** Staff at the center's door. */
const GATE_ROLES = [Roles.GATEHOUSE, Roles.RECEPTIONIST, Roles.CENTER_MANAGER];
/** Staff who look after sending biometrics to AGIC. */
const SYNC_ROLES = [Roles.CENTER_MANAGER];

/**
 * Checked here rather than with @Roles: RolesGuard reads its metadata with
 * the decorator function as the key, finds nothing, and lets every request
 * through.
 */
function requireRole(user: JwtUserPayload, allowed: Roles[]) {
  const roles: string[] = user?.roles || [];
  if (hasUnrestrictedAccess(roles)) return;
  if (!roles.some((role) => (allowed as string[]).includes(role))) {
    throw new ForbiddenException('Your role cannot use the AGIC integration');
  }
}

function appointmentNumberParam(value: string) {
  try {
    return parseAgicScan(value);
  } catch (error) {
    if (error instanceof AgicScanError)
      throw new BadRequestException(error.message);
    throw error;
  }
}

@ApiTags('AGIC Integration')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('agic')
export class AgicController {
  constructor(
    private readonly importService: AgicImportService,
    private readonly syncService: AgicBiometricSyncService,
  ) {}

  @Post('gatehouse/import')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Import an AGIC applicant from their slip (Gatehouse)',
    description:
      'Takes the scanned AGIC slip QR code or appointment number, fetches the applicant from AGIC, ' +
      'makes them a client of the AGIC travel agency account, and books a confirmed appointment in their ' +
      'AGIC slot. Returns the ASFAAR reference number to look up and check in. Scanning the same slip again ' +
      'returns the same application.',
  })
  @ApiResponse({
    status: 200,
    description: 'Applicant imported, or already imported',
  })
  @ApiResponse({ status: 400, description: 'Not an AGIC appointment number' })
  @ApiResponse({ status: 404, description: 'AGIC has no such appointment' })
  @ApiResponse({
    status: 409,
    description:
      'Record conflicts with an existing ASFAAR account, or is cancelled on AGIC',
  })
  @ApiResponse({
    status: 502,
    description: 'AGIC unreachable or answered unexpectedly',
  })
  @ApiResponse({
    status: 503,
    description:
      'Integration not configured, or no matching center/form/agency',
  })
  async importFromScan(
    @Body() body: AgicScanDto,
    @CurrentUser() user: JwtUserPayload,
  ) {
    requireRole(user, GATE_ROLES);
    const data = await this.importService.importFromScan(body.scan, user.id);
    return {
      success: true,
      message: data.alreadyImported
        ? 'AGIC applicant already registered'
        : 'AGIC applicant registered and booked',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('imports/:appointmentNumber/biometric-sync')
  @ApiOperation({
    summary: 'Where sending this applicant’s biometrics to AGIC stands',
  })
  @ApiParam({ name: 'appointmentNumber', example: 'AGIC-BIO-260929-62ACF5' })
  async syncStatus(
    @Param('appointmentNumber') appointmentNumber: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    requireRole(user, [...GATE_ROLES, ...SYNC_ROLES]);
    return {
      success: true,
      data: await this.syncService.status(
        appointmentNumberParam(appointmentNumber),
      ),
    };
  }

  @Post('imports/:appointmentNumber/biometric-sync/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retry sending this applicant’s biometrics to AGIC now',
  })
  @ApiParam({ name: 'appointmentNumber', example: 'AGIC-BIO-260929-62ACF5' })
  async retrySync(
    @Param('appointmentNumber') appointmentNumber: string,
    @CurrentUser() user: JwtUserPayload,
  ) {
    requireRole(user, SYNC_ROLES);
    return {
      success: true,
      data: await this.syncService.retry(
        appointmentNumberParam(appointmentNumber),
      ),
    };
  }
}
