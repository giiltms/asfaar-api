import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { ApplicationTypesService } from './application-types.service';
import {
  ApplicationTypeFiltersDto,
  CreateApplicationTypeDto,
  UpdateApplicationTypeDto,
} from './dto/application-type.dto';

@ApiTags('Application Types')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('application-types')
export class ApplicationTypesController {
  constructor(private readonly service: ApplicationTypesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new application type' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Created' })
  async create(@Body(ValidationPipe) dto: CreateApplicationTypeDto) {
    const data = await this.service.create(dto);
    return { success: true, message: 'Application type created', data };
  }

  @Get()
  @ApiOperation({ summary: 'List application types' })
  @ApiResponse({ status: HttpStatus.OK, description: 'OK' })
  async findAll(
    @Query(new ValidationPipe({ transform: true }))
    filters: ApplicationTypeFiltersDto,
  ) {
    const data = await this.service.findAll(filters);
    return { success: true, message: 'Application types retrieved', data };
  }

  @Get(':code')
  @ApiOperation({ summary: 'Get application type by code' })
  @ApiParam({ name: 'code', description: 'Application type code' })
  @ApiResponse({ status: HttpStatus.OK, description: 'OK' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Not found' })
  async findOne(@Param('code') code: string) {
    const data = await this.service.findOne(code);
    return { success: true, message: 'Application type retrieved', data };
  }

  @Put(':code')
  @ApiOperation({ summary: 'Update application type' })
  @ApiParam({ name: 'code', description: 'Application type code' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Updated' })
  async update(
    @Param('code') code: string,
    @Body(ValidationPipe) dto: UpdateApplicationTypeDto,
  ) {
    const data = await this.service.update(code, dto);
    return { success: true, message: 'Application type updated', data };
  }

  @Delete(':code')
  @ApiOperation({ summary: 'Delete application type' })
  @ApiParam({ name: 'code', description: 'Application type code' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Deleted' })
  async remove(@Param('code') code: string) {
    await this.service.remove(code);
    return { success: true, message: 'Application type deleted' };
  }
}
