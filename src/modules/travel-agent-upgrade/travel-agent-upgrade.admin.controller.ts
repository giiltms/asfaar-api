import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles as UserRoles } from '@common/constants/roles.constants';
import { Roles } from '@common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtUserPayload,
} from '@common/decorators/current-user.decorator';
import { TravelAgentUpgradeService } from './travel-agent-upgrade.service';

@ApiTags('Admin - Travel Agent Upgrade')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
@Controller('admin/travel-agent/upgrade')
export class AdminTravelAgentUpgradeController {
  constructor(private readonly service: TravelAgentUpgradeService) {}

  @Get('applications')
  @ApiOperation({
    summary: 'List upgrade applications',
    description:
      'Get a paginated list of travel agent upgrade applications with optional status filtering. Only accessible by ADMIN and SUPER_ADMIN roles.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter applications by status',
    enum: [
      'DRAFT',
      'PENDING',
      'PENDING_PAYMENT',
      'PENDING_REVIEW',
      'UNDER_REVIEW',
      'APPROVED',
      'REJECTED',
      'CANCELLED',
    ],
    example: 'PENDING_REVIEW',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number for pagination',
    example: 1,
    type: 'number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of applications per page',
    example: 20,
    type: 'number',
  })
  @ApiResponse({
    status: 200,
    description: 'Applications retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Applications retrieved successfully',
        },
        data: {
          type: 'object',
          properties: {
            applications: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    example: '123e4567-e89b-12d3-a456-426614174000',
                  },
                  status: { type: 'string', example: 'PENDING_REVIEW' },
                  companyName: { type: 'string', example: 'ABC Travel Agency' },
                  companyEmail: {
                    type: 'string',
                    example: 'contact@abctravel.com',
                  },
                  createdAt: {
                    type: 'string',
                    example: '2025-01-20T10:30:00.000Z',
                  },
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', example: 'user123' },
                      firstName: { type: 'string', example: 'John' },
                      lastName: { type: 'string', example: 'Doe' },
                      email: {
                        type: 'string',
                        example: 'john.doe@example.com',
                      },
                    },
                  },
                },
              },
            },
            pagination: {
              type: 'object',
              properties: {
                page: { type: 'number', example: 1 },
                limit: { type: 'number', example: 20 },
                total: { type: 'number', example: 50 },
                totalPages: { type: 'number', example: 3 },
              },
            },
          },
        },
      },
    },
  })
  async list(
    @Query('status') status?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.service.listApplications({
      status,
      page: Number(page),
      limit: Number(limit),
    });
  }

  @Post('applications/:id/approve')
  @ApiOperation({
    summary: 'Approve an upgrade application and issue license',
    description:
      'Approve a travel agent upgrade application and automatically issue a travel agent license. This action cannot be undone.',
  })
  @ApiParam({
    name: 'id',
    description: 'Application ID to approve',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({
    description: 'Approval details',
    schema: {
      type: 'object',
      properties: {
        reviewNotes: {
          type: 'string',
          description: 'Optional notes about the approval',
          example: 'All documents verified and requirements met',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Application approved successfully and license issued',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Application approved and license issued',
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
                status: { type: 'string', example: 'APPROVED' },
                approvedAt: {
                  type: 'string',
                  example: '2025-01-20T10:30:00.000Z',
                },
                approvedBy: { type: 'string', example: 'admin123' },
              },
            },
            license: {
              type: 'object',
              properties: {
                id: { type: 'string', example: 'license123' },
                licenseNumber: { type: 'string', example: 'AGT-2025-000001' },
                status: { type: 'string', example: 'ACTIVE' },
                issuedAt: {
                  type: 'string',
                  example: '2025-01-20T10:30:00.000Z',
                },
                expiresAt: {
                  type: 'string',
                  example: '2026-01-20T10:30:00.000Z',
                },
              },
            },
          },
        },
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
        error: {
          type: 'object',
          properties: {
            code: { type: 'number', example: 404000 },
            message: { type: 'string', example: 'Application not found' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Application cannot be approved',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Application is not in a state that can be approved',
        },
        error: {
          type: 'object',
          properties: {
            code: { type: 'number', example: 400000 },
            message: {
              type: 'string',
              example: 'Application is not in a state that can be approved',
            },
          },
        },
      },
    },
  })
  async approve(
    @Param('id') id: string,
    @CurrentUser() admin: JwtUserPayload,
    @Body() body: { reviewNotes?: string },
  ) {
    return this.service.approveApplication(admin.id, id, body?.reviewNotes);
  }

  @Post('applications/:id/reject')
  @ApiOperation({ summary: 'Reject an upgrade application' })
  async reject(
    @Param('id') id: string,
    @CurrentUser() admin: JwtUserPayload,
    @Body() body: { rejectionReason?: string; reviewNotes?: string },
  ) {
    return this.service.rejectApplication(admin.id, id, body?.rejectionReason);
  }

  @Get('applications/:id')
  @ApiOperation({ summary: 'Get a single upgrade application' })
  async getOne(@Param('id') id: string) {
    return this.service.getApplicationById(id);
  }

  @Put('applications/:id/review')
  @ApiOperation({
    summary: 'Mark application as UNDER_REVIEW / assign reviewer',
  })
  async toReview(
    @Param('id') id: string,
    @CurrentUser() reviewer: JwtUserPayload,
    @Body() body: { reviewNotes?: string },
  ) {
    return this.service.markUnderReview(id, reviewer.id, body?.reviewNotes);
  }
}
