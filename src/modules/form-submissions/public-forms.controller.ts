import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { FormSubmissionsService } from './services/form-submissions.service';
import { PublicFormDto } from './dto/submission.dto';
import { ApiOkBaseResponse } from '@decorators/api-ok-base-response.decorator';
import { ApiDefaultResponse } from '@decorators/api-default-response.decorator';

@ApiTags('Public Forms')
@Controller('public/forms')
export class PublicFormsController {
  constructor(private readonly submissionsService: FormSubmissionsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get available forms',
    description:
      'Get list of all available forms for public access (no authentication required)',
  })
  @ApiResponse({
    status: 200,
    description: 'Available forms retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiDefaultResponse({})
  async getPublicForms() {
    const forms = await this.submissionsService.getPublicForms();
    return { forms };
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get form template',
    description:
      'Get complete form template structure for filling (no authentication required)',
  })
  @ApiParam({
    name: 'id',
    description: 'Form ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkBaseResponse({ dto: PublicFormDto })
  @ApiDefaultResponse({ type: PublicFormDto })
  async getPublicForm(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PublicFormDto> {
    return this.submissionsService.getPublicForm(id);
  }

  @Get(':id/preview')
  @ApiOperation({
    summary: 'Get form preview',
    description: 'Get form structure optimized for preview/display purposes',
  })
  @ApiParam({
    name: 'id',
    description: 'Form ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Form preview retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            description: { type: 'string' },
            estimatedTime: {
              type: 'number',
              description: 'Estimated completion time in minutes',
            },
            totalFields: { type: 'number' },
            requiredFields: { type: 'number' },
            sectionsCount: { type: 'number' },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  fieldsCount: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiDefaultResponse({})
  async getFormPreview(@Param('id', ParseUUIDPipe) id: string) {
    const form = await this.submissionsService.getPublicForm(id);

    let totalFields = 0;
    let requiredFields = 0;

    const sectionsPreview = form.sections.map((section) => {
      let sectionFieldsCount = 0;

      section.groups.forEach((group) => {
        sectionFieldsCount += group.fields.length;
        totalFields += group.fields.length;
        requiredFields += group.fields.filter((field) => field.required).length;
      });

      return {
        title: section.title,
        description: section.description,
        fieldsCount: sectionFieldsCount,
      };
    });

    // Estimate 30 seconds per field + 15 seconds per required field
    const estimatedTime = Math.ceil(totalFields * 0.5 + requiredFields * 0.25);

    return {
      id: form.id,
      name: form.name,
      description: form.description,
      estimatedTime,
      totalFields,
      requiredFields,
      sectionsCount: form.sections.length,
      sections: sectionsPreview,
    };
  }
}
