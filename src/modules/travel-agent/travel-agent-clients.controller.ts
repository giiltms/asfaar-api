import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
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
} from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Roles as UserRoles } from '@common/constants/roles.constants';
import {
  CurrentUser,
  JwtUserPayload,
} from '@common/decorators/current-user.decorator';
import { TravelAgentClientsService } from './travel-agent-clients.service';
import {
  CreateClientDto,
  ClientProfileDto,
  ClientAnalyticsDto,
  ClientFiltersDto,
} from './dto/travel-agent.dto';
import ApiOkBaseResponse from '@common/decorators/api-ok-base-response.decorator';
import { ApiDefaultResponse } from '@common/decorators/api-default-response.decorator';

/**
 * Controller for travel agent client operations
 * Provides REST API endpoints for client management
 */
@ApiTags('Travel Agent - Clients')
@Controller('travel-agent/clients')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRoles.AGENCY)
@ApiBearerAuth()
export class TravelAgentClientsController {
  constructor(private readonly clientsService: TravelAgentClientsService) {}

  /**
   * Get all clients for travel agent
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get all clients',
    description:
      'Retrieve all clients for the travel agent with optional filtering and pagination.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search clients by name or email',
    example: 'john@example.com',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 10,
  })
  @ApiResponse({
    status: 200,
    description: 'Clients retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Clients retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', example: 'uuid-string' },
                  email: { type: 'string', example: 'john.doe@example.com' },
                  phone: { type: 'string', example: '+1234567890' },
                  fullName: { type: 'string', example: 'John Doe' },
                  avatar: { type: 'string', example: 'https://example.com/avatar.jpg' },
                  isVerified: { type: 'boolean', example: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  totalApplications: { type: 'number', example: 3 },
                  successfulApplications: { type: 'number', example: 2 },
                  lastApplicationDate: { type: 'string', format: 'date-time' },
                },
              },
            },
            total: { type: 'number', example: 25 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
          },
        },
      },
    },
  })
  async getClients(
    @CurrentUser() user: JwtUserPayload,
    @Query(ValidationPipe) filters: ClientFiltersDto,
  ) {
    const result = await this.clientsService.getClients(user.id, filters);

    return {
      success: true,
      message: 'Clients retrieved successfully',
      data: result,
    };
  }

  /**
   * Get client by ID
   */
  @Get(':clientId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get client by ID',
    description: 'Retrieve detailed information about a specific client.',
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID',
    example: 'uuid-string',
  })
  @ApiOkBaseResponse({ dto: ClientProfileDto })
  @ApiDefaultResponse({ type: ClientProfileDto })
  async getClient(
    @CurrentUser() user: JwtUserPayload,
    @Param('clientId') clientId: string,
  ): Promise<ClientProfileDto> {
    return this.clientsService.getClient(user.id, clientId);
  }

  /**
   * Create or update client profile
   */
  @Post(':clientId/profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create or update client profile',
    description:
      'Create or update client profile information for better client management.',
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID',
    example: 'uuid-string',
  })
  @ApiOkBaseResponse({ dto: ClientProfileDto })
  @ApiDefaultResponse({ type: ClientProfileDto })
  async createOrUpdateClientProfile(
    @CurrentUser() user: JwtUserPayload,
    @Param('clientId') clientId: string,
    @Body(ValidationPipe) createDto: CreateClientDto,
  ): Promise<ClientProfileDto> {
    return this.clientsService.createOrUpdateClientProfile(
      user.id,
      clientId,
      createDto,
    );
  }

  /**
   * Get client analytics
   */
  @Get(':clientId/analytics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get client analytics',
    description: 'Retrieve analytics data for a specific client.',
  })
  @ApiParam({
    name: 'clientId',
    description: 'Client ID',
    example: 'uuid-string',
  })
  @ApiOkBaseResponse({ dto: ClientAnalyticsDto })
  @ApiDefaultResponse({ type: ClientAnalyticsDto })
  async getClientAnalytics(
    @CurrentUser() user: JwtUserPayload,
    @Param('clientId') clientId: string,
  ): Promise<ClientAnalyticsDto> {
    return this.clientsService.getClientAnalytics(user.id, clientId);
  }

  // Communication endpoints - TODO: Implement when ClientCommunication model is added to schema
}
