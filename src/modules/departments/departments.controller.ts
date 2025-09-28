import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
  HttpStatus,
  ValidationPipe,
  UploadedFile,
  UseInterceptors as UseNestInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { DepartmentsService } from './departments.service';
import {
  CreateDepartmentDto,
  CreateDepartmentMultipartDto,
  UpdateDepartmentDto,
  DepartmentQueryDto,
} from './dto/department.dto';
import { DepartmentEntity } from './entities/department.entity';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtUserPayload,
} from '@common/decorators/current-user.decorator';
import { Roles as UserRoles } from '@common/constants/roles.constants';

@ApiTags('Departments')
@Controller('departments')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
@UseInterceptors(ClassSerializerInterceptor)
export class DepartmentsController {
  constructor(private readonly departmentsService: DepartmentsService) {}

  @Post()
  @Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  @UseNestInterceptors(FileInterceptor('logo'))
  @ApiOperation({
    summary: 'Create a new department',
    description:
      'Create a new department with name, agency, description, and upload a logo file',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Department data with logo file',
    type: CreateDepartmentMultipartDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Department created successfully',
    type: DepartmentEntity,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or logo file',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Department with this name already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async createDepartment(
    @Body(ValidationPipe) createDepartmentDto: CreateDepartmentMultipartDto,
    @CurrentUser() user: JwtUserPayload,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({
            fileType: /^image\/(jpeg|jpg|png|webp|svg\+xml)$/,
          }),
        ],
        fileIsRequired: true, // Logo is now required
      }),
    )
    logoFile: Express.Multer.File,
  ): Promise<DepartmentEntity> {
    return this.departmentsService.createDepartmentWithLogo(
      createDepartmentDto,
      logoFile,
      user.id,
    );
  }

  @Get()
  @Roles(
    UserRoles.ADMIN,
    UserRoles.SUPER_ADMIN,
    UserRoles.VERIFICATION_OFFICER,
    UserRoles.CENTER_MANAGER,
  )
  @ApiOperation({
    summary: 'Get all departments',
    description:
      'Retrieve all departments with pagination, search, and filtering options',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search term',
  })
  @ApiQuery({
    name: 'agency',
    required: false,
    type: String,
    description: 'Filter by agency',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Departments retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        departments: {
          type: 'array',
          items: { $ref: '#/components/schemas/DepartmentEntity' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
        totalPages: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async findAll(@Query(ValidationPipe) queryDto: DepartmentQueryDto) {
    return this.departmentsService.findAll(queryDto);
  }

  @Get('agencies')
  @Roles(
    UserRoles.ADMIN,
    UserRoles.SUPER_ADMIN,
    UserRoles.VERIFICATION_OFFICER,
    UserRoles.CENTER_MANAGER,
  )
  @ApiOperation({
    summary: 'Get all agencies',
    description:
      'Retrieve a list of all unique agencies for filtering purposes',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Agencies retrieved successfully',
    schema: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getAgencies(): Promise<string[]> {
    return this.departmentsService.getAgencies();
  }

  @Get('statistics')
  @Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get department statistics',
    description: 'Retrieve statistics about departments, staff, and flaggings',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalDepartments: { type: 'number' },
        totalStaff: { type: 'number' },
        totalActiveFlaggings: { type: 'number' },
        departmentsByAgency: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              agency: { type: 'string' },
              count: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async getStatistics() {
    return this.departmentsService.getStatistics();
  }

  @Get(':id')
  @Roles(
    UserRoles.ADMIN,
    UserRoles.SUPER_ADMIN,
    UserRoles.VERIFICATION_OFFICER,
    UserRoles.CENTER_MANAGER,
  )
  @ApiOperation({
    summary: 'Get department by ID',
    description: 'Retrieve a specific department by its ID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department retrieved successfully',
    type: DepartmentEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Department not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async findById(@Param('id') id: string): Promise<DepartmentEntity> {
    return this.departmentsService.findById(id);
  }

  @Patch(':id')
  @Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Update department',
    description: 'Update an existing department',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department updated successfully',
    type: DepartmentEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Department not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Department with this name already exists',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async updateDepartment(
    @Param('id') id: string,
    @Body(ValidationPipe) updateDepartmentDto: UpdateDepartmentDto,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<DepartmentEntity> {
    return this.departmentsService.updateDepartment(
      id,
      updateDepartmentDto,
      user.id,
    );
  }

  @Delete(':id')
  @Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Delete department',
    description: 'Delete a department (only if it has no staff or flaggings)',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Department deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Department not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot delete department with staff or flaggings',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async deleteDepartment(
    @Param('id') id: string,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<void> {
    await this.departmentsService.deleteDepartment(id, user.id);
  }

  @Get(':id/test')
  @Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Test endpoint for department',
    description: 'Smoke test endpoint to verify department module is working',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Department module is working',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        departmentId: { type: 'string' },
        timestamp: { type: 'string' },
      },
    },
  })
  async testEndpoint(@Param('id') id: string) {
    return {
      message: 'Department module is working correctly',
      departmentId: id,
      timestamp: new Date().toISOString(),
    };
  }
}
