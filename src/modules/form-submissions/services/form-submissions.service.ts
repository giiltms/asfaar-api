import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import {
  FormSubmission,
  FieldResponse,
  SubmissionStatus,
  Prisma,
  FieldType,
} from '@prisma/client';
import {
  CreateFormSubmissionDto,
  UpdateFormSubmissionDto,
  SubmitFormDto,
  FormSubmissionDto,
  SubmissionQueryDto,
  ReviewSubmissionDto,
  SaveDraftDto,
  SubmissionAnalyticsDto,
  PublicFormDto,
  CreateFieldResponseDto,
} from '../dto/submission.dto';
import {
  FORM_NOT_FOUND,
  FORM_SUBMISSION_NOT_FOUND,
  UNAUTHORIZED_RESOURCE,
  FORBIDDEN_RESOURCE,
} from '@common/constants/errors.constants';

@Injectable()
export class FormSubmissionsService {
  constructor(private readonly prisma: PrismaService) {}

  // Public Form Access (No Authentication Required)
  async getPublicForm(formId: string): Promise<PublicFormDto> {
    const form = await this.prisma.dynamicForm.findUnique({
      where: { id: formId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            groups: {
              orderBy: { order: 'asc' },
              include: {
                fields: {
                  orderBy: { order: 'asc' },
                  include: {
                    options: {
                      orderBy: { order: 'asc' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!form) {
      throw new NotFoundException(FORM_NOT_FOUND);
    }

    return this.mapToPublicFormDto(form);
  }

  async getPublicForms(): Promise<
    Array<{ id: string; name: string; description?: string }>
  > {
    const forms = await this.prisma.dynamicForm.findMany({
      select: {
        id: true,
        name: true,
        description: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return forms;
  }

  // Form Submission Management
  async createSubmission(
    userId: string,
    createSubmissionDto: CreateFormSubmissionDto,
  ): Promise<FormSubmissionDto> {
    const { formId, responses, status, metadata } = createSubmissionDto;

    // Verify form exists
    const form = await this.prisma.dynamicForm.findUnique({
      where: { id: formId },
    });

    if (!form) {
      throw new NotFoundException(FORM_NOT_FOUND);
    }

    // Check if user already has a draft for this form
    const existingDraft = await this.prisma.formSubmission.findFirst({
      where: {
        userId,
        formId,
        status: SubmissionStatus.DRAFT,
      },
    });

    if (existingDraft) {
      // Update existing draft instead of creating new one
      return this.updateSubmission(
        userId,
        existingDraft.id,
        createSubmissionDto,
      );
    }

    const submission = await this.prisma.formSubmission.create({
      data: {
        userId,
        formId,
        status: status || SubmissionStatus.DRAFT,
        metadata,
        responses: responses
          ? {
              create: responses.map((response) => ({
                fieldId: response.fieldId, // Use fieldId instead of formFieldId
                fieldName: response.fieldName,
                value: response.value,
                fileUrls: response.fileUrls || [],
                metadata: response.metadata,
              })),
            }
          : undefined,
      },
      include: this.getSubmissionInclude(),
    });

    return this.mapToSubmissionDto(submission);
  }

  async submitForm(
    userId: string,
    submitDto: SubmitFormDto,
  ): Promise<FormSubmissionDto> {
    const { formId, responses, metadata } = submitDto;

    // Get form with all fields for validation
    const form = await this.prisma.dynamicForm.findUnique({
      where: { id: formId },
      include: {
        sections: {
          include: {
            groups: {
              include: {
                fields: {
                  include: {
                    options: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!form) {
      throw new NotFoundException(FORM_NOT_FOUND);
    }

    // Validate submission against form template
    await this.validateSubmission(form, responses);

    // Check if user already has a submission for this form
    const existingSubmission = await this.prisma.formSubmission.findFirst({
      where: {
        userId,
        formId,
        status: { in: [SubmissionStatus.SUBMITTED, 'APPROVED' as any] }, // Use string literal
      },
    });

    if (existingSubmission) {
      throw new ConflictException('Form has already been submitted');
    }

    // Create or update submission
    let submission = await this.prisma.formSubmission.findFirst({
      where: {
        userId,
        formId,
        status: SubmissionStatus.DRAFT,
      },
    });

    if (submission) {
      // Update existing draft
      submission = await this.prisma.formSubmission.update({
        where: { id: submission.id },
        data: {
          status: SubmissionStatus.SUBMITTED,
          submittedAt: new Date(),
          metadata: {
            ...((submission.metadata as object) || {}),
            ...metadata,
            submittedAt: new Date().toISOString(),
          },
          responses: {
            deleteMany: {}, // Clear existing responses
            create: responses.map((response) => ({
              fieldId: response.fieldId, // Use fieldId
              fieldName: response.fieldName,
              value: response.value,
              fileUrls: response.fileUrls || [],
              metadata: response.metadata,
            })),
          },
        },
        include: this.getSubmissionInclude(),
      });
    } else {
      // Create new submission
      submission = await this.prisma.formSubmission.create({
        data: {
          userId,
          formId,
          status: SubmissionStatus.SUBMITTED,
          submittedAt: new Date(),
          metadata: {
            ...metadata,
            submittedAt: new Date().toISOString(),
          },
          responses: {
            create: responses.map((response) => ({
              fieldId: response.fieldId, // Use fieldId
              fieldName: response.fieldName,
              value: response.value,
              fileUrls: response.fileUrls || [],
              metadata: response.metadata,
            })),
          },
        },
        include: this.getSubmissionInclude(),
      });
    }

    return this.mapToSubmissionDto(submission);
  }

  async saveDraft(
    userId: string,
    draftDto: SaveDraftDto,
  ): Promise<FormSubmissionDto> {
    const { formId, responses, metadata } = draftDto;

    // Verify form exists
    const form = await this.prisma.dynamicForm.findUnique({
      where: { id: formId },
    });

    if (!form) {
      throw new NotFoundException(FORM_NOT_FOUND);
    }

    // Find or create draft
    let submission = await this.prisma.formSubmission.findFirst({
      where: {
        userId,
        formId,
        status: SubmissionStatus.DRAFT,
      },
    });

    if (submission) {
      // Update existing draft
      submission = await this.prisma.formSubmission.update({
        where: { id: submission.id },
        data: {
          metadata: {
            ...((submission.metadata as object) || {}),
            ...metadata,
            lastSaved: new Date().toISOString(),
          },
          responses: {
            deleteMany: {}, // Clear existing responses
            create: responses.map((response) => ({
              fieldId: response.fieldId, // Use fieldId
              fieldName: response.fieldName,
              value: response.value,
              fileUrls: response.fileUrls || [],
              metadata: response.metadata,
            })),
          },
        },
        include: this.getSubmissionInclude(),
      });
    } else {
      // Create new draft
      submission = await this.prisma.formSubmission.create({
        data: {
          userId,
          formId,
          status: SubmissionStatus.DRAFT,
          metadata: {
            ...metadata,
            lastSaved: new Date().toISOString(),
          },
          responses: {
            create: responses.map((response) => ({
              fieldId: response.fieldId, // Use fieldId
              fieldName: response.fieldName,
              value: response.value,
              fileUrls: response.fileUrls || [],
              metadata: response.metadata,
            })),
          },
        },
        include: this.getSubmissionInclude(),
      });
    }

    return this.mapToSubmissionDto(submission);
  }

  async getUserSubmissions(
    userId: string,
    queryDto: SubmissionQueryDto,
  ): Promise<{
    submissions: FormSubmissionDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page,
      limit,
      formId,
      status,
      search,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: Prisma.FormSubmissionWhereInput = {
      userId,
      ...(formId && { formId }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { form: { name: { contains: search, mode: 'insensitive' } } },
          { form: { description: { contains: search, mode: 'insensitive' } } },
        ],
      }),
      ...(dateFrom && { createdAt: { gte: new Date(dateFrom) } }),
      ...(dateTo && { createdAt: { lte: new Date(dateTo) } }),
    };

    const orderBy = this.buildSubmissionOrderBy(sortBy, sortOrder);

    const [submissions, total] = await Promise.all([
      this.prisma.formSubmission.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: this.getSubmissionInclude(),
      }),
      this.prisma.formSubmission.count({ where }),
    ]);

    return {
      submissions: submissions.map((submission) =>
        this.mapToSubmissionDto(submission),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getSubmissionById(
    userId: string,
    submissionId: string,
  ): Promise<FormSubmissionDto> {
    const submission = await this.prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: this.getSubmissionInclude(),
    });

    if (!submission) {
      throw new NotFoundException(FORM_SUBMISSION_NOT_FOUND);
    }

    if (submission.userId !== userId && userId !== 'admin') {
      // Allow admin access
      throw new ForbiddenException(FORBIDDEN_RESOURCE);
    }

    return this.mapToSubmissionDto(submission);
  }

  async updateSubmission(
    userId: string,
    submissionId: string,
    updateDto: UpdateFormSubmissionDto,
  ): Promise<FormSubmissionDto> {
    const existingSubmission = await this.prisma.formSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!existingSubmission) {
      throw new NotFoundException(FORM_SUBMISSION_NOT_FOUND);
    }

    if (existingSubmission.userId !== userId) {
      throw new ForbiddenException(FORBIDDEN_RESOURCE);
    }

    if (existingSubmission.status !== SubmissionStatus.DRAFT) {
      throw new BadRequestException('Only draft submissions can be updated');
    }

    const { responses, ...submissionData } = updateDto;

    const submission = await this.prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        ...submissionData,
        responses: responses
          ? {
              deleteMany: {},
              create: responses.map((response) => ({
                fieldId: response.fieldId, // Use fieldId
                fieldName: response.fieldName,
                value: response.value,
                fileUrls: response.fileUrls || [],
                metadata: response.metadata,
              })),
            }
          : undefined,
      },
      include: this.getSubmissionInclude(),
    });

    return this.mapToSubmissionDto(submission);
  }

  async deleteSubmission(userId: string, submissionId: string): Promise<void> {
    const submission = await this.prisma.formSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException(FORM_SUBMISSION_NOT_FOUND);
    }

    if (submission.userId !== userId && userId !== 'admin') {
      // Allow admin deletion
      throw new ForbiddenException(FORBIDDEN_RESOURCE);
    }

    if (submission.status !== SubmissionStatus.DRAFT && userId !== 'admin') {
      throw new BadRequestException('Only draft submissions can be deleted');
    }

    await this.prisma.formSubmission.delete({
      where: { id: submissionId },
    });
  }

  // Admin Methods
  async getAllSubmissions(queryDto: SubmissionQueryDto): Promise<{
    submissions: FormSubmissionDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page,
      limit,
      formId,
      userId,
      status,
      search,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: Prisma.FormSubmissionWhereInput = {
      ...(formId && { formId }),
      ...(userId && { userId }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { form: { name: { contains: search, mode: 'insensitive' } } },
          { form: { description: { contains: search, mode: 'insensitive' } } },
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { user: { firstName: { contains: search, mode: 'insensitive' } } },
          { user: { lastName: { contains: search, mode: 'insensitive' } } },
        ],
      }),
      ...(dateFrom && { createdAt: { gte: new Date(dateFrom) } }),
      ...(dateTo && { createdAt: { lte: new Date(dateTo) } }),
    };

    const orderBy = this.buildSubmissionOrderBy(sortBy, sortOrder);

    const [submissions, total] = await Promise.all([
      this.prisma.formSubmission.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: this.getSubmissionInclude(),
      }),
      this.prisma.formSubmission.count({ where }),
    ]);

    return {
      submissions: submissions.map((submission) =>
        this.mapToSubmissionDto(submission),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async reviewSubmission(
    reviewerId: string,
    submissionId: string,
    reviewDto: ReviewSubmissionDto,
  ): Promise<FormSubmissionDto> {
    const submission = await this.prisma.formSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException(FORM_SUBMISSION_NOT_FOUND);
    }

    if (submission.status !== SubmissionStatus.SUBMITTED) {
      throw new BadRequestException('Only submitted forms can be reviewed');
    }

    const updatedSubmission = await this.prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        status: reviewDto.status as any, // Cast to enum
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        reviewNotes: reviewDto.reviewNotes,
      },
      include: this.getSubmissionInclude(),
    });

    return this.mapToSubmissionDto(updatedSubmission);
  }

  async getSubmissionAnalytics(): Promise<SubmissionAnalyticsDto> {
    const [total, byStatus, byFormData, recentSubmissions] = await Promise.all([
      this.prisma.formSubmission.count(),
      this.prisma.formSubmission.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.prisma.formSubmission.groupBy({
        by: ['formId'],
        _count: { id: true },
      }),
      this.prisma.formSubmission.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
        select: {
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const statusCounts = {
      draft: 0,
      submitted: 0,
      reviewed: 0,
      approved: 0,
      rejected: 0,
    };

    byStatus.forEach((item) => {
      statusCounts[item.status.toLowerCase() as keyof typeof statusCounts] =
        item._count.id;
    });

    // Get form names for byForm data
    const formIds = byFormData.map((item) => item.formId);
    const forms = await this.prisma.dynamicForm.findMany({
      where: { id: { in: formIds } },
      select: { id: true, name: true },
    });

    const formMap = new Map(forms.map((form) => [form.id, form.name]));
    const byForm = byFormData.map((item) => ({
      formId: item.formId,
      formName: formMap.get(item.formId) || 'Unknown Form',
      count: item._count.id,
    }));

    // Group recent submissions by date
    const recentByDate = recentSubmissions.reduce((acc, submission) => {
      const date = submission.createdAt.toISOString().split('T')[0];
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recent = Object.entries(recentByDate).map(([date, count]) => ({
      date,
      count,
    }));

    const completionRate =
      total > 0 ? (statusCounts.submitted / total) * 100 : 0;

    return {
      total,
      byStatus: statusCounts,
      byForm,
      recent,
      completionRate,
    };
  }

  // Validation Engine
  private async validateSubmission(
    form: any,
    responses: CreateFieldResponseDto[],
  ): Promise<void> {
    const allFields = this.getAllFormFields(form);
    const responseMap = new Map(responses.map((r) => [r.fieldId, r]));

    for (const field of allFields) {
      const response = responseMap.get(field.id);

      // Check required fields
      if (field.required && (!response || this.isEmpty(response.value))) {
        throw new BadRequestException(`Field '${field.label}' is required`);
      }

      // Validate field type and format
      if (response && !this.isEmpty(response.value)) {
        await this.validateFieldValue(field, response.value);
      }
    }
  }

  private getAllFormFields(form: any): any[] {
    const fields: any[] = [];

    for (const section of form.sections) {
      for (const group of section.groups) {
        fields.push(...group.fields);
      }
    }

    return fields;
  }

  private async validateFieldValue(field: any, value: any): Promise<void> {
    // Type validation
    switch (field.type) {
      case FieldType.NUMBER:
        if (isNaN(Number(value))) {
          throw new BadRequestException(
            `Field '${field.label}' must be a number`,
          );
        }
        break;
      case FieldType.DATE:
        if (!this.isValidDate(value)) {
          throw new BadRequestException(
            `Field '${field.label}' must be a valid date`,
          );
        }
        break;
      case FieldType.BOOLEAN:
        if (typeof value !== 'boolean') {
          throw new BadRequestException(
            `Field '${field.label}' must be a boolean`,
          );
        }
        break;
      case FieldType.SELECT:
      case FieldType.MULTISELECT:
        if (!this.isValidOption(field, value)) {
          throw new BadRequestException(
            `Invalid option for field '${field.label}'`,
          );
        }
        break;
    }

    // Custom validation rules
    if (field.validation) {
      await this.validateCustomRules(field, value);
    }
  }

  private isValidDate(value: any): boolean {
    const date = new Date(value);
    return date instanceof Date && !isNaN(date.getTime());
  }

  private isValidOption(field: any, value: any): boolean {
    const validValues = field.options.map((opt: any) => opt.value);

    if (field.type === FieldType.MULTISELECT) {
      return (
        Array.isArray(value) && value.every((v) => validValues.includes(v))
      );
    } else {
      return validValues.includes(value);
    }
  }

  private async validateCustomRules(field: any, value: any): Promise<void> {
    const rules = field.validation;

    if (rules.minLength && value.length < rules.minLength) {
      throw new BadRequestException(
        `Field '${field.label}' must be at least ${rules.minLength} characters`,
      );
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      throw new BadRequestException(
        `Field '${field.label}' must be at most ${rules.maxLength} characters`,
      );
    }

    if (rules.min && Number(value) < rules.min) {
      throw new BadRequestException(
        `Field '${field.label}' must be at least ${rules.min}`,
      );
    }

    if (rules.max && Number(value) > rules.max) {
      throw new BadRequestException(
        `Field '${field.label}' must be at most ${rules.max}`,
      );
    }

    if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
      throw new BadRequestException(`Field '${field.label}' format is invalid`);
    }
  }

  private isEmpty(value: any): boolean {
    return (
      value === null ||
      value === undefined ||
      value === '' ||
      (Array.isArray(value) && value.length === 0)
    );
  }

  // Helper Methods
  private getSubmissionInclude() {
    return {
      responses: {
        orderBy: { createdAt: 'asc' as const },
      },
      form: {
        select: {
          id: true,
          name: true,
          description: true,
        },
      },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    };
  }

  private buildSubmissionOrderBy(sortBy: string, sortOrder: 'asc' | 'desc') {
    const validSortFields = ['createdAt', 'submittedAt', 'status'];
    const field = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    return { [field]: sortOrder };
  }

  private mapToSubmissionDto(submission: any): FormSubmissionDto {
    return {
      id: submission.id,
      formId: submission.formId,
      userId: submission.userId,
      status: submission.status,
      responses: submission.responses.map((response: any) => ({
        id: response.id,
        fieldId: response.fieldId,
        fieldName: response.fieldName,
        value: response.value,
        fileUrls: response.fileUrls,
        metadata: response.metadata,
        createdAt: response.createdAt,
        updatedAt: response.updatedAt,
      })),
      metadata: submission.metadata,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      submittedAt: submission.submittedAt,
      reviewedAt: submission.reviewedAt,
      reviewedBy: submission.reviewedBy,
      reviewNotes: submission.reviewNotes,
      form: submission.form,
      user: submission.user,
    };
  }

  private mapToPublicFormDto(form: any): PublicFormDto {
    return {
      id: form.id,
      name: form.name,
      description: form.description,
      sections: form.sections.map((section: any) => ({
        id: section.id,
        title: section.title,
        description: section.description,
        order: section.order,
        groups: section.groups.map((group: any) => ({
          id: group.id,
          title: group.title,
          description: group.description,
          order: group.order,
          repeatable: group.repeatable,
          fields: group.fields.map((field: any) => ({
            id: field.id,
            label: field.label,
            name: field.name,
            type: field.type,
            required: field.required,
            placeholder: field.placeholder,
            defaultValue: field.defaultValue,
            validation: field.validation,
            config: field.config,
            visibilityCondition: field.visibilityCondition,
            calculation: field.calculation,
            order: field.order,
            options: field.options.map((option: any) => ({
              id: option.id,
              label: option.label,
              value: option.value,
              order: option.order,
            })),
          })),
        })),
      })),
    };
  }
}
