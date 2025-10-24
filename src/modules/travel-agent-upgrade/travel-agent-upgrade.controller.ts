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
import { UpgradeApplicationStatus } from '@prisma/client';

@ApiTags('Travel Agent Upgrade')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('travel-agent/upgrade')
export class TravelAgentUpgradeController {
  constructor(private readonly service: TravelAgentUpgradeService) {}

  @Post('draft')
  @ApiOperation({
    summary: 'Create or get existing draft upgrade application',
    description:
      'Create a draft travel agent upgrade application or return existing draft/pending application. If user has an existing application in a continuable state (DRAFT, PENDING, PENDING_PAYMENT, PENDING_REVIEW, UNDER_REVIEW), it will be returned. If the existing application is in a final state (APPROVED, REJECTED, etc.), an error will be thrown.',
  })
  @ApiResponse({
    status: 201,
    description: 'Draft application created or existing application returned',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Draft application created successfully',
          description:
            'Will be "Draft application created successfully" for new applications or "Existing application retrieved" for existing applications',
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
                bankDetails: {
                  type: 'object',
                  nullable: true,
                  description: 'Bank details if application is completed',
                },
                directors: {
                  type: 'array',
                  description:
                    'Director information if application is completed',
                },
                payment: {
                  type: 'object',
                  nullable: true,
                  description:
                    'Payment information if payment has been initiated',
                },
              },
            },
            isExisting: {
              type: 'boolean',
              description:
                'True if returning existing application, false if creating new one',
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
        message: {
          type: 'string',
          example: 'Validation failed',
        },
        error: {
          type: 'object',
          properties: {
            code: { type: 'number', example: 400000 },
            message: {
              type: 'string',
              example: 'Invalid input data',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'User already has an application in final state',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example:
            'You already have an application with status: APPROVED. Please contact support if you need assistance.',
        },
        error: {
          type: 'object',
          properties: {
            code: { type: 'number', example: 400001 },
            message: {
              type: 'string',
              example: 'Application already exists in final state',
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

  @Get('application')
  @ApiOperation({ summary: 'Get your most recent upgrade application' })
  async getApplication(@CurrentUser() user: JwtUserPayload) {
    return this.service.getMyApplication(user.id);
  }

  @Get('application/:id')
  @ApiOperation({ summary: 'Get specific upgrade application by ID' })
  async getApplicationById(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') applicationId: string,
  ) {
    return this.service.getMyApplication(user.id, applicationId);
  }

  @Get('applications')
  @ApiOperation({ summary: 'Get all your upgrade applications' })
  async getApplications(@CurrentUser() user: JwtUserPayload) {
    return this.service.getMyApplications(user.id);
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
    summary: 'Cancel and delete your most recent upgrade application',
    description:
      'Permanently deletes your most recent upgrade application, allowing you to create a new one. Cannot be undone.',
  })
  @ApiResponse({
    status: 200,
    description: 'Application deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Application not found' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel finalized application',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Cannot cancel finalized application',
        },
      },
    },
  })
  async cancel(@CurrentUser() user: JwtUserPayload) {
    return this.service.cancelMyApplication(user.id);
  }

  @Delete('application/:id')
  @ApiOperation({
    summary: 'Cancel and delete specific upgrade application by ID',
    description:
      'Permanently deletes the specified upgrade application. Cannot be undone.',
  })
  @ApiResponse({
    status: 200,
    description: 'Application deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Application not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Application not found' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel finalized application',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Cannot cancel finalized application',
        },
      },
    },
  })
  async cancelById(
    @CurrentUser() user: JwtUserPayload,
    @Param('id') applicationId: string,
  ) {
    return this.service.cancelMyApplication(user.id, applicationId);
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
    @Body() dto: { licenseId: string; serviceFeeId: string },
  ) {
    return this.service.renewLicense(user.id, dto.licenseId, dto.serviceFeeId);
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
            'DSS_DOCUMENT',
            'NANTA_DOCUMENT',
          ],
          description:
            'Type of document being uploaded. Note: For director identification documents, provide the URL directly with director information when completing the application.',
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
