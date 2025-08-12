import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { FormsService } from './services/forms.service';
import {
  CreateFormDto,
  UpdateFormDto,
  FormDto,
  FormSummaryDto,
  CreateFormSectionDto,
  UpdateFormSectionDto,
  CreateInputGroupDto,
  UpdateInputGroupDto,
  CreateFormFieldDto,
  UpdateFormFieldDto,
  FormQueryDto,
  AssociateServiceFeesDto,
  UpdateFormServiceFeesDto,
  FormServiceFeeDto,
} from './dto/form.dto';
import { ApiOkBaseResponse } from '@decorators/api-ok-base-response.decorator';
import { ApiDefaultResponse } from '@decorators/api-default-response.decorator';

@ApiTags('Form Templates')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('forms')
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  // Form Template CRUD
  @Post()
  @ApiOperation({
    summary: 'Create new form template',
    description:
      'Create a new dynamic form template with sections, groups, and fields',
  })
  @ApiOkBaseResponse({ dto: FormDto })
  @ApiDefaultResponse({ type: FormDto })
  async createForm(@Body() createFormDto: CreateFormDto): Promise<FormDto> {
    return this.formsService.createForm(createFormDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get form templates',
    description:
      'Get all form templates with pagination and filtering, including country-specific filtering',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({
    name: 'countryId',
    required: false,
    description: 'Filter by country ID',
  })
  @ApiQuery({
    name: 'countryCode',
    required: false,
    description: 'Filter by country ISO code (2-letter)',
  })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiQuery({ name: 'sortBy', required: false, description: 'Sort field' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Sort order' })
  @ApiResponse({
    status: 200,
    description: 'Form templates retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            forms: {
              type: 'array',
              items: { $ref: '#/components/schemas/FormSummaryDto' },
            },
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiDefaultResponse({})
  async getForms(@Query() queryDto: FormQueryDto) {
    return this.formsService.getForms(queryDto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get form template by ID',
    description: 'Get a specific form template with all its components',
  })
  @ApiParam({
    name: 'id',
    description: 'Form ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkBaseResponse({ dto: FormDto })
  @ApiDefaultResponse({ type: FormDto })
  async getFormById(@Param('id', ParseUUIDPipe) id: string): Promise<FormDto> {
    return this.formsService.getFormById(id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update form template',
    description: 'Update an existing form template',
  })
  @ApiParam({
    name: 'id',
    description: 'Form ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkBaseResponse({ dto: FormDto })
  @ApiDefaultResponse({ type: FormDto })
  async updateForm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFormDto: UpdateFormDto,
  ): Promise<FormDto> {
    return this.formsService.updateForm(id, updateFormDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete form template',
    description: 'Delete a form template (only if no submissions exist)',
  })
  @ApiParam({
    name: 'id',
    description: 'Form ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Form deleted successfully',
  })
  @ApiDefaultResponse({})
  async deleteForm(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.formsService.deleteForm(id);
  }

  @Post(':id/duplicate')
  @ApiOperation({
    summary: 'Duplicate form template',
    description: 'Create a copy of an existing form template',
  })
  @ApiParam({
    name: 'id',
    description: 'Form ID to duplicate',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkBaseResponse({ dto: FormDto })
  @ApiDefaultResponse({ type: FormDto })
  async duplicateForm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body?: { name?: string },
  ): Promise<FormDto> {
    return this.formsService.duplicateForm(id, body?.name);
  }

  @Get(':id/analytics')
  @ApiOperation({
    summary: 'Get form analytics',
    description: 'Get analytics and statistics for a form template',
  })
  @ApiParam({
    name: 'id',
    description: 'Form ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Form analytics',
    schema: {
      type: 'object',
      properties: {
        form: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            sectionsCount: { type: 'number' },
            fieldsCount: { type: 'number' },
          },
        },
        submissions: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            completed: { type: 'number' },
            drafts: { type: 'number' },
            reviewed: { type: 'number' },
            rejected: { type: 'number' },
          },
        },
        completionRate: { type: 'number' },
      },
    },
  })
  @ApiDefaultResponse({})
  async getFormAnalytics(@Param('id', ParseUUIDPipe) id: string) {
    return this.formsService.getFormAnalytics(id);
  }

  // Section Management
  @Post(':id/sections')
  @ApiOperation({
    summary: 'Add section to form',
    description: 'Add a new section to an existing form template',
  })
  @ApiParam({
    name: 'id',
    description: 'Form ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Section added successfully',
  })
  @ApiDefaultResponse({})
  async addSectionToForm(
    @Param('id', ParseUUIDPipe) formId: string,
    @Body() sectionDto: CreateFormSectionDto,
  ) {
    return this.formsService.addSectionToForm(formId, sectionDto);
  }

  @Put('sections/:id')
  @ApiOperation({
    summary: 'Update form section',
    description: 'Update an existing form section',
  })
  @ApiParam({
    name: 'id',
    description: 'Section ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Section updated successfully',
  })
  @ApiDefaultResponse({})
  async updateSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSectionDto: UpdateFormSectionDto,
  ) {
    return this.formsService.updateSection(id, updateSectionDto);
  }

  @Delete('sections/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete form section',
    description: 'Delete a form section and all its components',
  })
  @ApiParam({
    name: 'id',
    description: 'Section ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Section deleted successfully',
  })
  @ApiDefaultResponse({})
  async deleteSection(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.formsService.deleteSection(id);
  }

  // Group Management
  @Post('sections/:id/groups')
  @ApiOperation({
    summary: 'Add group to section',
    description: 'Add a new input group to a form section',
  })
  @ApiParam({
    name: 'id',
    description: 'Section ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Group added successfully',
  })
  @ApiDefaultResponse({})
  async addGroupToSection(
    @Param('id', ParseUUIDPipe) sectionId: string,
    @Body() groupDto: CreateInputGroupDto,
  ) {
    return this.formsService.addGroupToSection(sectionId, groupDto);
  }

  @Put('groups/:id')
  @ApiOperation({
    summary: 'Update input group',
    description: 'Update an existing input group',
  })
  @ApiParam({
    name: 'id',
    description: 'Group ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Group updated successfully',
  })
  @ApiDefaultResponse({})
  async updateGroup(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGroupDto: UpdateInputGroupDto,
  ) {
    return this.formsService.updateGroup(id, updateGroupDto);
  }

  @Delete('groups/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete input group',
    description: 'Delete an input group and all its fields',
  })
  @ApiParam({
    name: 'id',
    description: 'Group ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Group deleted successfully',
  })
  @ApiDefaultResponse({})
  async deleteGroup(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.formsService.deleteGroup(id);
  }

  // Field Management
  @Post('groups/:id/fields')
  @ApiOperation({
    summary: 'Add field to group',
    description: 'Add a new form field to an input group',
  })
  @ApiParam({
    name: 'id',
    description: 'Group ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Field added successfully',
  })
  @ApiDefaultResponse({})
  async addFieldToGroup(
    @Param('id', ParseUUIDPipe) groupId: string,
    @Body() fieldDto: CreateFormFieldDto,
  ) {
    return this.formsService.addFieldToGroup(groupId, fieldDto);
  }

  @Put('fields/:id')
  @ApiOperation({
    summary: 'Update form field',
    description: 'Update an existing form field',
  })
  @ApiParam({
    name: 'id',
    description: 'Field ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Field updated successfully',
  })
  @ApiDefaultResponse({})
  async updateField(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateFieldDto: UpdateFormFieldDto,
  ) {
    return this.formsService.updateField(id, updateFieldDto);
  }

  @Delete('fields/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete form field',
    description: 'Delete a form field and its options',
  })
  @ApiParam({
    name: 'id',
    description: 'Field ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Field deleted successfully',
  })
  @ApiDefaultResponse({})
  async deleteField(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.formsService.deleteField(id);
  }

  // Service Fee Management Endpoints
  @Get(':id/service-fees')
  @ApiOperation({ summary: 'Get service fees associated with a form' })
  @ApiParam({
    name: 'id',
    description: 'Form ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkBaseResponse({ dto: FormServiceFeeDto, isArray: true })
  @ApiDefaultResponse({})
  async getFormServiceFees(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<FormServiceFeeDto[]> {
    return this.formsService.getFormServiceFees(id);
  }

  @Post(':id/service-fees')
  @ApiOperation({ summary: 'Associate service fees with a form' })
  @ApiParam({
    name: 'id',
    description: 'Form ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Service fees associated successfully',
    type: [FormServiceFeeDto],
  })
  @ApiDefaultResponse({})
  async associateServiceFees(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() associateDto: AssociateServiceFeesDto,
  ): Promise<FormServiceFeeDto[]> {
    return this.formsService.associateServiceFees(
      id,
      associateDto.serviceFeeIds,
    );
  }

  @Put(':id/service-fees')
  @ApiOperation({ summary: 'Update service fees associated with a form' })
  @ApiParam({
    name: 'id',
    description: 'Form ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkBaseResponse({ dto: FormServiceFeeDto, isArray: true })
  @ApiDefaultResponse({})
  async updateFormServiceFees(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateFormServiceFeesDto,
  ): Promise<FormServiceFeeDto[]> {
    return this.formsService.updateFormServiceFees(id, updateDto.serviceFeeIds);
  }

  @Delete(':id/service-fees/:serviceFeeId')
  @ApiOperation({ summary: 'Remove a specific service fee from a form' })
  @ApiParam({
    name: 'id',
    description: 'Form ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'serviceFeeId',
    description: 'Service Fee ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkBaseResponse({ dto: FormServiceFeeDto, isArray: true })
  @ApiDefaultResponse({})
  async removeServiceFeeFromForm(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('serviceFeeId', ParseUUIDPipe) serviceFeeId: string,
  ): Promise<FormServiceFeeDto[]> {
    return this.formsService.removeServiceFeeFromForm(id, serviceFeeId);
  }

  @Delete(':id/service-fees')
  @ApiOperation({ summary: 'Remove all service fees from a form' })
  @ApiParam({
    name: 'id',
    description: 'Form ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All service fees removed successfully',
  })
  @ApiDefaultResponse({})
  async removeAllServiceFeesFromForm(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    return this.formsService.removeAllServiceFeesFromForm(id);
  }
}
