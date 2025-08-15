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
  CreateFieldResponseDto,
  FormProgressDto,
  SectionProgressDto,
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

  // Authenticated Form Access
  async getAvailableFormsForUser(
    userId: string,
    query?: {
      countryId?: string;
      country?: string;
      search?: string;
      applicationType?: string;
      includeInactive?: boolean;
    },
  ): Promise<
    Array<{
      id: string;
      name: string;
      description?: string;
      country?: {
        id: string;
        name: string;
        isoCode2: string;
        flag: string;
      };
      sections: number;
      estimatedTime: number;
      hasStarted?: boolean;
      progress?: number;
    }>
  > {
    // Build where clause based on query parameters
    const where: any = {};

    // Country filtering
    if (query?.countryId) {
      where.countryId = query.countryId;
    } else if (query?.country) {
      where.country = {
        isoCode2: query.country.toUpperCase(),
      };
    }

    // Application type filtering
    if (query?.applicationType) {
      where.applicationType = {
        code: query.applicationType,
      };
    }

    // Search filtering
    if (query?.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    // Get all available forms
    const forms = await this.prisma.dynamicForm.findMany({
      where,
      include: {
        country: {
          select: {
            id: true,
            name: true,
            isoCode2: true,
            flag: true,
          },
        },
        sections: {
          include: {
            groups: {
              include: {
                fields: true,
              },
            },
          },
        },
        submissions: {
          where: { userId },
          select: { id: true, status: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Process each form to add metadata
    const formsWithMetadata = await Promise.all(
      forms.map(async (form) => {
        // Calculate form metrics
        let totalFields = 0;
        const sectionsCount = form.sections.length;

        form.sections.forEach((section) => {
          section.groups.forEach((group) => {
            totalFields += group.fields.length;
          });
        });

        // Estimate completion time (2 minutes per field)
        const estimatedTime = Math.max(5, Math.ceil(totalFields * 2));

        // Check if user has started this form
        const hasStarted = form.submissions.length > 0;
        let progress = 0;

        if (hasStarted) {
          try {
            const formProgress = await this.getFormProgress(userId, form.id);
            progress = formProgress.overallProgress;
          } catch (error) {
            // If progress calculation fails, default to 0
            progress = 0;
          }
        }

        return {
          id: form.id,
          name: form.name,
          description: form.description,
          country: form.country
            ? {
                id: form.country.id,
                name: form.country.name,
                isoCode2: form.country.isoCode2,
                flag: form.country.flag,
              }
            : undefined,
          sections: sectionsCount,
          estimatedTime,
          hasStarted,
          progress,
        };
      }),
    );

    return formsWithMetadata;
  }

  async getFormForUser(
    userId: string,
    formId: string,
  ): Promise<{
    form: any;
    progress: FormProgressDto;
    currentResponses: any[];
    submission?: any;
  }> {
    // Get form with full structure
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
        country: {
          select: {
            id: true,
            name: true,
            isoCode2: true,
            isoCode3: true,
            currency: true,
            flag: true,
          },
        },
      },
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    // Get user's current submission and progress
    const submission = await this.prisma.formSubmission.findFirst({
      where: {
        userId,
        formId,
      },
      include: {
        responses: true,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Get progress
    const progress = await this.getFormProgress(userId, formId);

    // Get current responses
    const currentResponses =
      submission?.responses.map((response) => ({
        fieldId: response.fieldId,
        fieldName: response.fieldName,
        value: response.value,
        fileUrls: response.fileUrls,
        metadata: response.metadata,
      })) || [];

    return {
      form,
      progress,
      currentResponses,
      submission: submission
        ? {
            id: submission.id,
            status: submission.status,
            submittedAt: submission.submittedAt,
            createdAt: submission.createdAt,
            updatedAt: submission.updatedAt,
          }
        : null,
    };
  }

  // Helper method for admin to get basic form details
  async getFormBasicDetails(
    formId: string,
  ): Promise<{ id: string; name: string; description?: string }> {
    const form = await this.prisma.dynamicForm.findUnique({
      where: { id: formId },
      select: {
        id: true,
        name: true,
        description: true,
      },
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    return form;
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
        country: {
          select: { id: true, isoCode2: true },
        },
      },
    });

    if (!form) {
      throw new NotFoundException(FORM_NOT_FOUND);
    }

    if (!form.country || !form.country.id) {
      throw new BadRequestException(
        'Form cannot be submitted because no country is configured on this form.',
      );
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

  /**
   * Calculate form progress for a user
   */
  async getFormProgress(
    userId: string,
    formId: string,
  ): Promise<FormProgressDto> {
    // Get form with all structure
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
                  orderBy: { order: 'asc' },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!form) {
      throw new NotFoundException('Form not found');
    }

    // Get user's current submission (draft or submitted)
    const submission = await this.prisma.formSubmission.findFirst({
      where: {
        userId,
        formId,
      },
      include: {
        responses: true,
      },
      orderBy: { updatedAt: 'desc' }, // Get the latest submission
    });

    // Create a map of field responses for quick lookup
    const responseMap = new Map<string, any>();
    if (submission?.responses) {
      submission.responses.forEach((response) => {
        responseMap.set(response.fieldId, response.value);
      });
    }

    // Calculate progress for each section
    const sectionProgress: SectionProgressDto[] = [];
    let totalFormFields = 0;
    let totalFormRequiredFields = 0;
    let totalCompletedFields = 0;
    let totalCompletedRequiredFields = 0;
    let completedSections = 0;
    const allMissingRequiredFields: string[] = [];

    for (const section of form.sections) {
      let sectionTotalFields = 0;
      let sectionRequiredFields = 0;
      let sectionCompletedFields = 0;
      let sectionCompletedRequiredFields = 0;
      const sectionMissingRequired: string[] = [];

      // Count fields in all groups within this section
      for (const group of section.groups) {
        for (const field of group.fields) {
          sectionTotalFields++;
          totalFormFields++;

          if (field.required) {
            sectionRequiredFields++;
            totalFormRequiredFields++;
          }

          // Check if field has a response
          const hasResponse = this.isFieldCompleted(
            field,
            responseMap.get(field.id),
          );

          if (hasResponse) {
            sectionCompletedFields++;
            totalCompletedFields++;

            if (field.required) {
              sectionCompletedRequiredFields++;
              totalCompletedRequiredFields++;
            }
          } else if (field.required) {
            sectionMissingRequired.push(field.label || field.name);
            allMissingRequiredFields.push(
              `${section.title}: ${field.label || field.name}`,
            );
          }
        }
      }

      // Calculate section completion
      const sectionCompletionPercentage =
        sectionTotalFields > 0
          ? Math.round((sectionCompletedFields / sectionTotalFields) * 100)
          : 0;

      // Section is complete if all required fields are filled
      const isSectionComplete =
        sectionRequiredFields === sectionCompletedRequiredFields;

      if (isSectionComplete) {
        completedSections++;
      }

      sectionProgress.push({
        sectionId: section.id,
        sectionTitle: section.title,
        sectionOrder: section.order,
        totalFields: sectionTotalFields,
        requiredFields: sectionRequiredFields,
        completedFields: sectionCompletedFields,
        completedRequiredFields: sectionCompletedRequiredFields,
        isComplete: isSectionComplete,
        completionPercentage: sectionCompletionPercentage,
        missingRequiredFields: sectionMissingRequired,
      });
    }

    // Calculate overall progress
    const overallProgress =
      totalFormFields > 0
        ? Math.round((totalCompletedFields / totalFormFields) * 100)
        : 0;

    // Can submit if all required fields are completed
    const canSubmit = totalFormRequiredFields === totalCompletedRequiredFields;

    // Estimate completion time (rough estimate: 2 minutes per remaining field)
    const remainingFields = totalFormFields - totalCompletedFields;
    const estimatedCompletionTime = remainingFields * 2;

    return {
      formId: form.id,
      formName: form.name,
      userId,
      submissionId: submission?.id,
      submissionStatus: submission?.status as SubmissionStatus,
      totalSections: form.sections.length,
      completedSections,
      overallProgress,
      totalFields: totalFormFields,
      totalRequiredFields: totalFormRequiredFields,
      completedFields: totalCompletedFields,
      completedRequiredFields: totalCompletedRequiredFields,
      canSubmit,
      missingRequiredFields: allMissingRequiredFields,
      sections: sectionProgress,
      lastUpdated: submission?.updatedAt,
      estimatedCompletionTime,
    };
  }

  /**
   * Helper method to determine if a field is completed
   */
  private isFieldCompleted(field: any, value: any): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    // Handle different field types
    switch (field.type) {
      case FieldType.TEXT:
      case FieldType.TEXTAREA:
        return typeof value === 'string' && value.trim().length > 0;

      case FieldType.NUMBER:
        return (
          typeof value === 'number' ||
          (typeof value === 'string' && !isNaN(Number(value)))
        );

      case FieldType.DATE:
        return typeof value === 'string' && value.trim().length > 0;

      case FieldType.SELECT:
        return typeof value === 'string' && value.trim().length > 0;

      case FieldType.MULTISELECT:
        if (Array.isArray(value)) {
          return value.length > 0;
        }
        return typeof value === 'string' && value.trim().length > 0;

      case FieldType.FILE:
        // Check if file URLs are provided (handled in field responses)
        return Array.isArray(value)
          ? value.length > 0
          : typeof value === 'string' && value.trim().length > 0;

      case FieldType.BOOLEAN:
        return typeof value === 'boolean';

      case FieldType.SIGNATURE:
        return typeof value === 'string' && value.trim().length > 0;

      case FieldType.GEOLOCATION:
        // Geolocation should be an object with lat/lng or coordinates
        return (
          typeof value === 'object' &&
          value !== null &&
          (value.lat !== undefined || value.latitude !== undefined)
        );

      default:
        // For any other field type, check if value exists and is not empty
        if (Array.isArray(value)) {
          return value.length > 0;
        }
        return typeof value === 'string'
          ? value.trim().length > 0
          : value !== null && value !== undefined;
    }
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
      referenceNumber: submission.referenceNumber,
    };
  }

  /**
   * Get applicant information by reference number for gatehouse verification
   */
  async getApplicantInfoByReference(referenceNumber: string): Promise<any> {
    const submission = await this.prisma.formSubmission.findUnique({
      where: { referenceNumber },
      include: {
        user: {
          include: {
            ninVerifications: {
              where: {
                verificationStatus: 'VERIFIED',
              },
              orderBy: {
                createdAt: 'desc',
              },
              take: 1,
              select: {
                photo: true,
                nin: true,
                verificationDate: true,
              },
            },
          },
        },
        form: {
          include: {
            country: {
              select: {
                id: true,
                name: true,
                isoCode2: true,
                isoCode3: true,
                flag: true,
              },
            },
          },
        },
        appointment: {
          include: {
            center: {
              select: {
                id: true,
                name: true,
                address: true,
                city: true,
                state: true,
                phone: true,
              },
            },
            queueEntry: {
              include: {
                booth: {
                  select: {
                    id: true,
                    boothNumber: true,
                    appointmentClass: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!submission) {
      return null;
    }

    // Get the most recent verified NIN data
    const ninVerification = submission.user.ninVerifications?.[0];

    // Calculate appointment time validation if appointment exists
    let appointmentData = null;
    if (submission.appointment) {
      const now = new Date();
      const appointmentDate = submission.appointment.appointmentDate;
      const appointmentTime = submission.appointment.appointmentTime;

      // Check if appointment is today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const apptDateOnly = appointmentDate ? new Date(appointmentDate) : null;
      if (apptDateOnly) {
        apptDateOnly.setHours(0, 0, 0, 0);
      }
      const isToday = apptDateOnly
        ? apptDateOnly.getTime() === today.getTime()
        : false;

      // Calculate time difference
      const appointmentDateTime = appointmentTime || appointmentDate;
      const timeDiffMs = appointmentDateTime
        ? appointmentDateTime.getTime() - now.getTime()
        : 0;
      const minutesUntilAppointment = Math.round(timeDiffMs / (1000 * 60));
      const hasTimePassed = minutesUntilAppointment < 0;

      // Format dates for display
      const appointmentDateFormatted = appointmentDate
        ? appointmentDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : 'Not set';

      const appointmentTimeFormatted = appointmentTime
        ? appointmentTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
        : 'Not set';

      appointmentData = {
        id: submission.appointment.id,
        appointmentDate: submission.appointment.appointmentDate,
        appointmentTime: submission.appointment.appointmentTime,
        appointmentDateFormatted,
        appointmentTimeFormatted,
        appointmentClass: submission.appointment.appointmentClass,
        status: submission.appointment.status,
        isToday,
        hasTimePassed,
        minutesUntilAppointment,
        center: submission.appointment.center
          ? {
              name: submission.appointment.center.name,
              address: submission.appointment.center.address,
              city: submission.appointment.center.city,
              state: submission.appointment.center.state,
              phone: submission.appointment.center.phone,
            }
          : null,
        booth: submission.appointment.queueEntry?.booth
          ? {
              boothNumber: submission.appointment.queueEntry.booth.boothNumber,
              appointmentClass:
                submission.appointment.queueEntry.booth.appointmentClass,
            }
          : null,
      };
    }

    return {
      referenceNumber: submission.referenceNumber,
      applicant: {
        firstName: submission.user.firstName,
        lastName: submission.user.lastName,
        email: submission.user.email,
        phone: submission.user.phone,
        photo: ninVerification?.photo || null,
        nin: ninVerification?.nin || submission.user.nin || null,
      },
      form: {
        id: submission.form.id,
        name: submission.form.name,
        country: submission.form.country
          ? {
              name: submission.form.country.name,
              isoCode2: submission.form.country.isoCode2,
              isoCode3: submission.form.country.isoCode3,
              flag: submission.form.country.flag,
            }
          : null,
      },
      submission: {
        id: submission.id,
        status: submission.status,
        submittedAt: submission.submittedAt,
        reviewedAt: submission.reviewedAt,
      },
      appointment: appointmentData,
    };
  }
}
