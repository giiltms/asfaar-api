import {
  Body,
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiConsumes,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  JwtUserPayload,
} from '@common/decorators/current-user.decorator';
import { TravelAgentUpgradeService } from './travel-agent-upgrade.service';
import {
  CreateUpgradeApplicationDto,
  CreateDraftApplicationDto,
  CompleteUpgradeApplicationDto,
  UploadUpgradeDocumentDto,
} from './dto/upgrade.dto';

@ApiTags('Travel Agent Upgrade')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('travel-agent/upgrade')
export class TravelAgentUpgradeController {
  constructor(private readonly service: TravelAgentUpgradeService) {}

  @Post('draft')
  @ApiOperation({
    summary: 'Create draft upgrade application',
    description:
      'Create a draft travel agent upgrade application. This allows users to start the application process and upload documents before completing the application.',
  })
  @ApiResponse({
    status: 201,
    description: 'Draft application created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Draft application created successfully',
        },
        data: {
          type: 'object',
          properties: {
            application: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  example: '123e4567-e89b-12d3-a456-426614174000',
                },
                status: { type: 'string', example: 'DRAFT' },
                companyName: { type: 'string', example: 'ABC Travel Agency' },
                companyEmail: {
                  type: 'string',
                  example: 'contact@abctravel.com',
                },
                companyPhone: { type: 'string', example: '+2348012345678' },
                createdAt: {
                  type: 'string',
                  example: '2025-01-20T10:30:00.000Z',
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - validation error or user already has active application',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'You already have an active upgrade application',
        },
        error: {
          type: 'object',
          properties: {
            code: { type: 'number', example: 400000 },
            message: {
              type: 'string',
              example: 'You already have an active upgrade application',
            },
          },
        },
      },
    },
  })
  async createDraft(
    @CurrentUser() user: JwtUserPayload,
    @Body() body: CreateDraftApplicationDto,
  ) {
    return this.service.createDraftApplication(user.id, body);
  }

  @Put('application/:id/complete')
  @ApiOperation({ summary: 'Complete upgrade application' })
  async completeApplication(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') applicationId: string,
    @Body() body: CompleteUpgradeApplicationDto,
  ) {
    return this.service.completeApplication(user.id, applicationId, body);
  }

  @Post('application/:id/payment')
  @ApiOperation({ summary: 'Initiate payment for upgrade application' })
  async initiatePayment(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') applicationId: string,
    @Body() dto: { serviceFeeId: string; paymentMethodId: string },
  ) {
    return this.service.initiatePayment(user.id, applicationId, dto);
  }

  @Get('application')
  @ApiOperation({ summary: 'Get your upgrade application' })
  async getApplication(@CurrentUser() user: JwtUserPayload) {
    return this.service.getMyApplication(user.id);
  }

  @Put('application')
  @ApiOperation({ summary: 'Update upgrade application while pending' })
  async updateApplication(
    @CurrentUser() user: JwtUserPayload,
    @Body() body: Partial<CreateUpgradeApplicationDto>,
  ) {
    return this.service.updateMyApplication(user.id, body);
  }

  @Delete('application')
  @ApiOperation({ 
    summary: 'Cancel and delete your upgrade application',
    description: 'Permanently deletes your upgrade application, allowing you to create a new one. Cannot be undone.'
  })
  @ApiResponse({
    status: 200,
    description: 'Application deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Application not found' }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel finalized application',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Cannot cancel finalized application' }
      }
    }
  })
  async cancel(@CurrentUser() user: JwtUserPayload) {
    return this.service.cancelMyApplication(user.id);
  }

  @Post('retry-payment')
  @ApiOperation({ summary: 'Retry initial application payment' })
  async retryPayment(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: { serviceFeeId: string },
  ) {
    return this.service.retryInitialPayment(user.id, dto.serviceFeeId);
  }

  @Get('fees')
  @ApiOperation({ summary: 'List upgrade service fees' })
  async fees() {
    return this.service.listUpgradeFees();
  }

  @Post('renew')
  @ApiOperation({ summary: 'Initiate license renewal payment' })
  async renew(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: { serviceFeeId: string },
  ) {
    return this.service.renewLicense(user.id, dto.serviceFeeId);
  }

  @Get('license')
  @ApiOperation({ summary: 'Get current license info' })
  async license(@CurrentUser() user: JwtUserPayload) {
    return this.service.getLicenseInfo(user.id);
  }

  @Post('documents/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload document file directly to upgrade application',
    description:
      'Upload required documents for travel agent upgrade application. Only works for DRAFT applications. Supported file types: PDF, JPEG, PNG. Maximum file size: 10MB.',
  })
  @ApiBody({
    description: 'File upload form data',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file to upload',
        },
        applicationId: {
          type: 'string',
          description: 'Application ID to attach document to',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        documentType: {
          type: 'string',
          enum: [
            'CAC_DOCUMENT',
            'TAX_CLEARANCE_CERTIFICATE',
            'NAHCON_DOCUMENT',
            'EFCC_SCUML_DOCUMENT',
            'IATA_DOCUMENT',
          ],
          description: 'Type of document being uploaded',
          example: 'CAC_DOCUMENT',
        },
      },
      required: ['file', 'applicationId', 'documentType'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Document uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Document uploaded successfully' },
        data: {
          type: 'object',
          properties: {
            documentType: { type: 'string', example: 'CAC_DOCUMENT' },
            fileName: { type: 'string', example: 'cac_certificate.pdf' },
            fileSize: { type: 'number', example: 1024000 },
            mimeType: { type: 'string', example: 'application/pdf' },
            fileUrl: {
              type: 'string',
              example:
                '/uploads/user123/travel-agent-cac_document_1640995200000_cac_certificate.pdf',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Invalid document type' },
        error: {
          type: 'object',
          properties: {
            code: { type: 'number', example: 400000 },
            message: { type: 'string', example: 'Invalid document type' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found or not owned by user',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Upgrade application not found' },
        error: {
          type: 'object',
          properties: {
            code: { type: 'number', example: 404000 },
            message: {
              type: 'string',
              example: 'Upgrade application not found',
            },
          },
        },
      },
    },
  })
  async uploadDocumentFile(
    @CurrentUser() user: JwtUserPayload,
    @UploadedFile() file: Express.Multer.File,
    @Body('applicationId') applicationId: string,
    @Body('documentType') documentType: string,
  ) {
    // Validate required fields
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!applicationId) {
      throw new BadRequestException('Application ID is required');
    }
    if (!documentType) {
      throw new BadRequestException('Document type is required');
    }

    return this.service.uploadDocumentFile(
      user.id,
      applicationId,
      documentType,
      file,
    );
  }

  @Put('documents/upload')
  @ApiOperation({
    summary:
      'Attach an uploaded document to the upgrade application (URL-based)',
  })
  async uploadDoc(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: UploadUpgradeDocumentDto,
  ) {
    return this.service.attachDocument(dto.applicationId, dto);
  }
}
