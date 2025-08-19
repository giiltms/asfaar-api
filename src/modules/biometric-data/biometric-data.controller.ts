import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { BiometricDataService } from './biometric-data.service';
import {
  CreateBiometricDataDto,
  UpdateBiometricDataDto,
  BiometricDataResponseDto,
} from './dto';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { LocalStorageService } from '@providers/localstorage/localstorage.service';

@ApiTags('Biometric Data')
@Controller('biometric-data')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class BiometricDataController {
  constructor(
    private readonly biometricDataService: BiometricDataService,
    private readonly localStorage: LocalStorageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create new biometric data record' })
  @ApiResponse({
    status: 201,
    description: 'Biometric data created successfully',
    type: BiometricDataResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'User or submission not found' })
  async createBiometricData(
    @Body() createBiometricDataDto: CreateBiometricDataDto,
    @Request() req: any,
  ): Promise<BiometricDataResponseDto> {
    return this.biometricDataService.createBiometricData(
      createBiometricDataDto,
      req.user.id,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get biometric data by ID' })
  @ApiResponse({
    status: 200,
    description: 'Biometric data retrieved successfully',
    type: BiometricDataResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Biometric data not found' })
  async getBiometricDataById(
    @Param('id') id: string,
  ): Promise<BiometricDataResponseDto> {
    return this.biometricDataService.getBiometricDataById(id);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get biometric data by user ID' })
  @ApiResponse({
    status: 200,
    description: 'Biometric data retrieved successfully',
    type: [BiometricDataResponseDto],
  })
  async getBiometricDataByUserId(
    @Param('userId') userId: string,
  ): Promise<BiometricDataResponseDto[]> {
    return this.biometricDataService.getBiometricDataByUserId(userId);
  }

  @Get('submission/:submissionId')
  @ApiOperation({ summary: 'Get biometric data by submission ID' })
  @ApiResponse({
    status: 200,
    description: 'Biometric data retrieved successfully',
    type: BiometricDataResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Biometric data not found' })
  async getBiometricDataBySubmissionId(
    @Param('submissionId') submissionId: string,
  ): Promise<BiometricDataResponseDto | null> {
    return this.biometricDataService.getBiometricDataBySubmissionId(
      submissionId,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update biometric data' })
  @ApiResponse({
    status: 200,
    description: 'Biometric data updated successfully',
    type: BiometricDataResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Biometric data not found' })
  async updateBiometricData(
    @Param('id') id: string,
    @Body() updateBiometricDataDto: UpdateBiometricDataDto,
    @Request() req: any,
  ): Promise<BiometricDataResponseDto> {
    return this.biometricDataService.updateBiometricData(
      id,
      updateBiometricDataDto,
      req.user.id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete biometric data' })
  @ApiResponse({
    status: 200,
    description: 'Biometric data deleted successfully',
  })
  @ApiResponse({ status: 404, description: 'Biometric data not found' })
  async deleteBiometricData(
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    await this.biometricDataService.deleteBiometricData(id);
    return { message: 'Biometric data deleted successfully' };
  }

  @Post(':id/verify')
  @ApiOperation({ summary: 'Verify biometric data' })
  @ApiResponse({
    status: 200,
    description: 'Biometric data verified successfully',
    type: BiometricDataResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Biometric data not found' })
  async verifyBiometricData(
    @Param('id') id: string,
    @Body() body: { verificationStatus: string; verificationNotes?: string },
    @Request() req: any,
  ): Promise<BiometricDataResponseDto> {
    return this.biometricDataService.verifyBiometricData(
      id,
      body.verificationStatus,
      body.verificationNotes,
      req.user.id,
    );
  }

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get biometric data statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
  })
  async getBiometricDataStats() {
    return this.biometricDataService.getBiometricDataStats();
  }

  @Post(':id/fingers')
  @ApiOperation({
    summary: 'Create 442 fingerprint fingers for a biometric record',
  })
  @ApiResponse({ status: 201, description: 'Fingers created successfully' })
  async createFingerprintFingers(
    @Param('id') biometricDataId: string,
    @Body()
    body: {
      fingerprintFingers: Array<{
        fingerPosition: string;
        fingerName?: string;
        templateData?: Record<string, unknown>;
        templateHash?: string;
        templateFormat?: string;
        qualityScore?: number;
        captureAttempts?: number;
        isAcceptable?: boolean;
        captureDevice?: string;
        captureMethod?: string;
        metadata?: Record<string, unknown>;
      }>;
    },
  ) {
    await this.biometricDataService.createFingerprintFingers(
      biometricDataId,
      body.fingerprintFingers,
    );
    return { success: true };
  }

  @Patch(':id/finger/:position')
  @ApiOperation({ summary: 'Update a specific finger in 442 set' })
  @ApiResponse({ status: 200, description: 'Finger updated successfully' })
  async updateFinger(
    @Param('id') biometricDataId: string,
    @Param('position') position: string,
    @Body()
    body: Partial<{
      templateData: Record<string, unknown>;
      templateHash: string;
      templateFormat: string;
      qualityScore: number;
      captureAttempts: number;
      isAcceptable: boolean;
      captureDevice: string;
      captureMethod: string;
      metadata: Record<string, unknown>;
    }>,
  ) {
    return this.biometricDataService.updateFinger(
      biometricDataId,
      position,
      body,
    );
  }

  @Post('by-reference/:referenceNumber')
  @ApiOperation({
    summary:
      'Create or update biometric data using submission reference number',
  })
  @ApiResponse({
    status: 200,
    description: 'Created/updated successfully',
    type: BiometricDataResponseDto,
  })
  async upsertByReference(
    @Param('referenceNumber') referenceNumber: string,
    @Body() dto: Partial<CreateBiometricDataDto>,
    @Request() req: any,
  ): Promise<BiometricDataResponseDto> {
    return this.biometricDataService.createOrUpdateByReferenceNumber(
      referenceNumber,
      dto,
      req.user?.id,
    );
  }

  @Post('by-reference/:referenceNumber/fingers')
  @ApiOperation({
    summary: 'Create 442 fingerprint fingers using submission reference number',
  })
  @ApiResponse({ status: 201, description: 'Fingers created successfully' })
  async createFingersByReference(
    @Param('referenceNumber') referenceNumber: string,
    @Body()
    body: {
      fingerprintFingers: Array<{
        fingerPosition: string;
        fingerName?: string;
        templateData?: Record<string, unknown>;
        templateHash?: string;
        templateFormat?: string;
        qualityScore?: number;
        captureAttempts?: number;
        isAcceptable?: boolean;
        captureDevice?: string;
        captureMethod?: string;
        metadata?: Record<string, unknown>;
      }>;
    },
  ) {
    return this.biometricDataService.createFingersByReferenceNumber(
      referenceNumber,
      body.fingerprintFingers,
    );
  }

  // Upload photo file and attach to biometric record by reference number
  @Post('by-reference/:referenceNumber/photo')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({
    summary: 'Upload applicant photo and attach by reference number',
  })
  @ApiResponse({
    status: 201,
    description: 'Photo saved and BiometricData updated',
  })
  async uploadPhotoByReference(
    @Param('referenceNumber') referenceNumber: string,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    const url = await this.localStorage.upload(file, 'biometrics/photos');
    const updated =
      await this.biometricDataService.createOrUpdateByReferenceNumber(
        referenceNumber,
        { photoUrl: url, capturedBy: req.user?.id },
        req.user?.id,
      );
    return { success: true, photoUrl: url, biometricData: updated };
  }

  @Get('admin/test')
  @ApiOperation({ summary: 'Admin test endpoint for biometric data' })
  @ApiResponse({ status: 200, description: 'Test successful' })
  async adminTest(): Promise<{ message: string; timestamp: Date }> {
    return {
      message: 'Biometric data module is working correctly',
      timestamp: new Date(),
    };
  }
}
