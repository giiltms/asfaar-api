import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Roles as UserRoles } from '@common/constants/roles.constants';
import {
  BiometricCaptureService,
  CaptureRequest,
  CaptureResult,
} from './services/biometric-capture.service';
import { FingerPosition } from '@prisma/client';

export class CaptureFingerprintsDto {
  submissionId?: string;
  captureDevice: string;
  captureLocation: string;
  captureMethod: 'SLAP' | 'INDIVIDUAL';
  fingers: {
    position: FingerPosition;
    templateData: string; // Base64 encoded
    wsqImageData?: string; // Base64 encoded
  }[];
}

export class CaptureResponseDto {
  biometricDataId: string;
  fingerprintDataIds: string[];
  overallSuccess: boolean;
  validationResults: {
    isValid: boolean;
    qualityScore: number;
    nfiqScore: number;
    errors: string[];
    warnings: string[];
  }[];
  errors: string[];
}

@ApiTags('Biometric Capture')
@Controller('biometric-capture')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class BiometricCaptureController {
  private readonly logger = new Logger(BiometricCaptureController.name);

  constructor(
    private readonly biometricCaptureService: BiometricCaptureService,
  ) {}

  @Post('capture')
  @Roles(
    UserRoles.BIOMETRIC_AGENT,
    UserRoles.CENTER_MANAGER,
    UserRoles.ADMIN,
    UserRoles.SUPER_ADMIN,
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Capture and store fingerprint data',
    description:
      'Capture fingerprint data using Suprema RealScan-G10 or equivalent device. Stores ISO/IEC 19794-2:2005 templates with encryption.',
  })
  @ApiBody({ type: CaptureFingerprintsDto })
  @ApiResponse({
    status: 201,
    description: 'Fingerprint data captured and stored successfully',
    type: CaptureResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid fingerprint data or validation failed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async captureFingerprints(
    @Request() req: any,
    @Body() captureDto: CaptureFingerprintsDto,
  ): Promise<CaptureResponseDto> {
    this.logger.log(`Fingerprint capture request from user ${req.user.id}`);

    try {
      // Convert base64 data to buffers
      const fingers = captureDto.fingers.map((finger) => ({
        position: finger.position,
        templateData: Buffer.from(finger.templateData, 'base64'),
        wsqImageData: finger.wsqImageData
          ? Buffer.from(finger.wsqImageData, 'base64')
          : undefined,
      }));

      const captureRequest: CaptureRequest = {
        userId: req.user.id,
        submissionId: captureDto.submissionId,
        captureDevice: captureDto.captureDevice,
        captureLocation: captureDto.captureLocation,
        captureMethod: captureDto.captureMethod,
        fingers,
        capturedBy: req.user.id,
      };

      const result = await this.biometricCaptureService.captureFingerprints(
        captureRequest,
      );

      return {
        biometricDataId: result.biometricDataId,
        fingerprintDataIds: result.fingerprintDataIds,
        overallSuccess: result.overallSuccess,
        validationResults: result.validationResults.map((vr) => ({
          isValid: vr.isValid,
          qualityScore: vr.qualityScore,
          nfiqScore: vr.nfiqScore,
          errors: vr.errors,
          warnings: vr.warnings,
        })),
        errors: result.errors,
      };
    } catch (error) {
      this.logger.error('Fingerprint capture failed', error.stack);
      throw error;
    }
  }

  @Get('data/:userId')
  @Roles(
    UserRoles.BIOMETRIC_AGENT,
    UserRoles.CENTER_MANAGER,
    UserRoles.ADMIN,
    UserRoles.SUPER_ADMIN,
    UserRoles.VERIFICATION_OFFICER,
  )
  @ApiOperation({
    summary: 'Retrieve fingerprint data for a user',
    description:
      'Retrieve decrypted fingerprint data for verification or processing purposes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Fingerprint data retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Fingerprint data not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getFingerprintData(
    @Param('userId') userId: string,
    @Query('submissionId') submissionId?: string,
  ) {
    this.logger.log(`Fingerprint data retrieval request for user ${userId}`);

    return await this.biometricCaptureService.getFingerprintData(
      userId,
      submissionId,
    );
  }

  @Get('data')
  @Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  @ApiOperation({
    summary: 'List all fingerprint data (Admin only)',
    description:
      'Retrieve a list of all fingerprint data records for administrative purposes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Fingerprint data list retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async listFingerprintData(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('userId') userId?: string,
    @Query('submissionId') submissionId?: string,
  ) {
    this.logger.log('Fingerprint data list request');

    // Implementation for listing all fingerprint data with pagination and filtering
    return await this.biometricCaptureService.listFingerprintData({
      page,
      limit,
      userId,
      submissionId,
    });
  }

  @Get('data/submission/:submissionId')
  @Roles(
    UserRoles.BIOMETRIC_AGENT,
    UserRoles.CENTER_MANAGER,
    UserRoles.ADMIN,
    UserRoles.SUPER_ADMIN,
    UserRoles.VERIFICATION_OFFICER,
  )
  @ApiOperation({
    summary: 'Get fingerprint data by submission ID',
    description:
      'Retrieve fingerprint data associated with a specific form submission.',
  })
  @ApiResponse({
    status: 200,
    description: 'Fingerprint data retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Fingerprint data not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async getFingerprintDataBySubmissionId(
    @Param('submissionId') submissionId: string,
  ) {
    this.logger.log(
      `Fingerprint data retrieval request for submission ${submissionId}`,
    );

    return await this.biometricCaptureService.getFingerprintDataBySubmissionId(
      submissionId,
    );
  }

  @Delete('data/:biometricDataId')
  @Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete fingerprint data (Admin only)',
    description:
      'Soft delete fingerprint data for audit purposes. Data is retained for compliance.',
  })
  @ApiResponse({
    status: 204,
    description: 'Fingerprint data deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Fingerprint data not found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async deleteFingerprintData(
    @Request() req: any,
    @Param('biometricDataId') biometricDataId: string,
  ): Promise<void> {
    this.logger.log(
      `Fingerprint data deletion request for ${biometricDataId} by ${req.user.id}`,
    );

    await this.biometricCaptureService.deleteFingerprintData(
      biometricDataId,
      req.user.id,
    );
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check for biometric capture service',
    description: 'Check if the biometric capture service is operational.',
  })
  @ApiResponse({
    status: 200,
    description: 'Service is healthy',
  })
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'biometric-capture',
      version: '1.0.0',
    };
  }
}
