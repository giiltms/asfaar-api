import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
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
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { BoothsService } from './booths.service';
import { BoothEntity } from './entities/booth.entity';
import {
  CreateBoothDto,
  UpdateBoothDto,
  AssignAgentDto,
  UnassignAgentDto,
  BoothFiltersDto,
  BoothQueryDto,
  BoothResponseDto,
  BoothStatsDto,
} from './dto/booth.dto';
import { PaginationQueryDto } from '@common/dtos/pagination.dto';
import { BaseResponseDto } from '@common/dtos/base-response.dto';
import { AppointmentClass } from '@prisma/client';
import { CurrentUser, JwtUserPayload } from '@common/decorators/current-user.decorator';

@ApiTags('Booths')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('booths')
export class BoothsController {
  constructor(private readonly boothsService: BoothsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new booth' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Booth created successfully',
    type: BoothResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Booth number already exists in center',
  })
  async createBooth(
    @Body(ValidationPipe) createDto: CreateBoothDto,
  ): Promise<BaseResponseDto<BoothEntity>> {
    // TODO: Extract user ID from JWT token
    const createdBy = 'placeholder-admin-id';

    const booth = await this.boothsService.createBooth(createDto, createdBy);
    const boothEntity = new BoothEntity(booth);

    return {
      success: true,
      message: 'Booth created successfully',
      data: boothEntity,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all booths with pagination and filtering' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'centerId', required: false, type: String })
  @ApiQuery({
    name: 'appointmentClass',
    required: false,
    enum: AppointmentClass,
  })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'isOccupied', required: false, type: Boolean })
  @ApiQuery({ name: 'available', required: false, type: Boolean })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booths retrieved successfully',
  })
  async findAllBooths(@Query(ValidationPipe) query: BoothQueryDto) {
    const { page, limit, sortBy, sortOrder, ...filters } = query;
    const pagination = { page, limit, sortBy, sortOrder };
    const result = await this.boothsService.findAllBooths(filters, pagination);

    return {
      success: true,
      message: 'Booths retrieved successfully',
      data: result.data.map((booth) => new BoothEntity(booth)),
      meta: result.meta,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get booth statistics' })
  @ApiQuery({ name: 'centerId', required: false, type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booth statistics retrieved successfully',
    type: BoothStatsDto,
  })
  async getBoothStats(
    @Query('centerId') centerId?: string,
  ): Promise<BaseResponseDto<BoothStatsDto>> {
    const stats = await this.boothsService.getBoothStats(centerId);

    return {
      success: true,
      message: 'Booth statistics retrieved successfully',
      data: stats,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('available/:centerId/:appointmentClass')
  @ApiOperation({ summary: 'Get available booths for appointment class' })
  @ApiParam({ name: 'centerId', type: String })
  @ApiParam({ name: 'appointmentClass', enum: AppointmentClass })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Available booths retrieved successfully',
  })
  async getAvailableBooths(
    @Param('centerId', ParseUUIDPipe) centerId: string,
    @Param('appointmentClass') appointmentClass: AppointmentClass,
  ): Promise<BaseResponseDto<BoothEntity[]>> {
    const booths = await this.boothsService.getAvailableBooths(
      centerId,
      appointmentClass,
    );

    return {
      success: true,
      message: 'Available booths retrieved successfully',
      data: booths.map((booth) => new BoothEntity(booth)),
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booth by ID' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booth retrieved successfully',
    type: BoothResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booth not found',
  })
  async findBoothById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BaseResponseDto<BoothEntity>> {
    const booth = await this.boothsService.findBoothById(id);
    const boothEntity = new BoothEntity(booth);

    return {
      success: true,
      message: 'Booth retrieved successfully',
      data: boothEntity,
      timestamp: new Date().toISOString(),
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update booth' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booth updated successfully',
    type: BoothResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booth not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Booth number already exists in center',
  })
  async updateBooth(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateDto: UpdateBoothDto,
  ): Promise<BaseResponseDto<BoothEntity>> {
    // TODO: Extract user ID from JWT token
    const lastModifiedBy = 'placeholder-admin-id';

    const booth = await this.boothsService.updateBooth(
      id,
      updateDto,
      lastModifiedBy,
    );
    const boothEntity = new BoothEntity(booth);

    return {
      success: true,
      message: 'Booth updated successfully',
      data: boothEntity,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete booth' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booth deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booth not found',
  })
  async deleteBooth(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BaseResponseDto<BoothEntity>> {
    // TODO: Extract user ID from JWT token
    const lastModifiedBy = 'placeholder-admin-id';

    const booth = await this.boothsService.deleteBooth(id, lastModifiedBy);
    const boothEntity = new BoothEntity(booth);

    return {
      success: true,
      message: 'Booth deleted successfully',
      data: boothEntity,
      timestamp: new Date().toISOString(),
    };
  }

  @Put(':id/restore')
  @ApiOperation({ summary: 'Restore deleted booth' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Booth restored successfully',
    type: BoothResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booth not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Booth is not deleted',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Booth number conflict',
  })
  async restoreBooth(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<BoothEntity>> {
    const lastModifiedBy = user.id;

    const booth = await this.boothsService.restoreBooth(id, lastModifiedBy);
    const boothEntity = new BoothEntity(booth);

    return {
      success: true,
      message: 'Booth restored successfully',
      data: boothEntity,
      timestamp: new Date().toISOString(),
    };
  }

  @Put(':id/assign-agent')
  @ApiOperation({ summary: 'Assign agent to booth' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: AssignAgentDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agent assigned to booth successfully',
    type: BoothResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booth or agent not found',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Agent already assigned to another booth',
  })
  async assignAgent(
    @Param('id', ParseUUIDPipe) boothId: string,
    @Body(ValidationPipe) assignDto: AssignAgentDto,
  ): Promise<BaseResponseDto<BoothEntity>> {
    // TODO: Extract user ID from JWT token
    const assignedBy = 'placeholder-admin-id';

    const booth = await this.boothsService.assignAgent(
      boothId,
      assignDto,
      assignedBy,
    );
    const boothEntity = new BoothEntity(booth);

    return {
      success: true,
      message: 'Agent assigned to booth successfully',
      data: boothEntity,
      timestamp: new Date().toISOString(),
    };
  }

  @Put(':id/unassign-agent')
  @ApiOperation({ summary: 'Unassign agent from booth' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UnassignAgentDto, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agent unassigned from booth successfully',
    type: BoothResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Booth not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'No agent assigned to booth or has active sessions',
  })
  async unassignAgent(
    @Param('id', ParseUUIDPipe) boothId: string,
    @Body(ValidationPipe) unassignDto?: UnassignAgentDto,
  ): Promise<BaseResponseDto<BoothEntity>> {
    // TODO: Extract user ID from JWT token
    const unassignedBy = 'placeholder-admin-id';

    const booth = await this.boothsService.unassignAgent(
      boothId,
      unassignDto?.reason,
      unassignedBy,
    );
    const boothEntity = new BoothEntity(booth);

    return {
      success: true,
      message: 'Agent unassigned from booth successfully',
      data: boothEntity,
      timestamp: new Date().toISOString(),
    };
  }
}
