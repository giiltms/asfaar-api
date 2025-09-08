import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
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
  CancelSubmissionDto,
  FileUploadDto,
} from '../dto/submission.dto';
import {
  FORM_NOT_FOUND,
  FORM_SUBMISSION_NOT_FOUND,
  UNAUTHORIZED_RESOURCE,
  FORBIDDEN_RESOURCE,
} from '@common/constants/errors.constants';
import { PaginationQueryDto } from '@common/dtos/pagination.dto';

@Injectable()
export class FormSubmissionsService {
  private readonly logger = new Logger(FormSubmissionsService.name);

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
              instanceIndex: response.instanceIndex ?? 0,
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
    const { formId, submissionId, responses, metadata, biometricAppointment } =
      submitDto;

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

    // Find the submission to work with (either by submissionId or existing draft)
    let submission: any = null;

    if (submissionId) {
      // User provided a specific submission ID (likely from file uploads)
      submission = await this.prisma.formSubmission.findFirst({
        where: {
          id: submissionId,
          userId,
          formId,
          status: {
            in: [SubmissionStatus.DRAFT, SubmissionStatus.PENDING_PAYMENT],
          },
        },
      });

      if (!submission) {
        throw new NotFoundException(
          `Draft submission with ID ${submissionId} not found or not accessible`,
        );
      }
    } else {
      // Look for existing draft submission
      submission = await this.prisma.formSubmission.findFirst({
        where: {
          userId,
          formId,
          status: SubmissionStatus.DRAFT,
        },
      });
    }

    // Get existing responses for validation (to check FILE fields)
    const existingResponses = submission
      ? await this.prisma.fieldResponse.findMany({
        where: { submissionId: submission.id },
      })
      : [];

    // Validate submission against form template
    await this.validateSubmission(form, responses, existingResponses);

    // Users are allowed to have multiple submissions for the same form template
    // No need to check for existing submitted versions

    // Use database transaction for atomic operations
    submission = await this.prisma.$transaction(async (tx) => {
      let updatedSubmission;

      if (submission) {
        // Update existing draft submission
        const existingResponseMap = new Map(
          existingResponses.map((r) => [
            `${r.fieldId}:${(r as any).instanceIndex ?? 0}`,
            r,
          ]),
        );

        // Merge new responses with existing ones, preserving file uploads
        const mergedResponses = responses.map((response) => {
          const key = `${response.fieldId}:${response.instanceIndex ?? 0}`;
          const existingResponse = existingResponseMap.get(key);

          // For file fields, preserve existing fileUrls if no new ones provided
          if (response.fileUrls && response.fileUrls.length > 0) {
            // New file URLs provided, use them
            return {
              fieldId: response.fieldId,
              fieldName: response.fieldName,
              value: response.value,
              fileUrls: response.fileUrls,
              metadata: response.metadata,
              instanceIndex: response.instanceIndex ?? 0,
            };
          } else if (
            existingResponse &&
            existingResponse.fileUrls &&
            existingResponse.fileUrls.length > 0
          ) {
            // No new file URLs, but existing ones exist - preserve them
            return {
              fieldId: response.fieldId,
              fieldName: response.fieldName,
              value: response.value,
              fileUrls: existingResponse.fileUrls,
              metadata: {
                ...((existingResponse.metadata as object) || {}),
                ...response.metadata,
              },
              instanceIndex: response.instanceIndex ?? 0,
            };
          } else {
            // No file URLs involved
            return {
              fieldId: response.fieldId,
              fieldName: response.fieldName,
              value: response.value,
              fileUrls: response.fileUrls || [],
              metadata: response.metadata,
              instanceIndex: response.instanceIndex ?? 0,
            };
          }
        });

        // Update existing draft within transaction
        updatedSubmission = await tx.formSubmission.update({
          where: { id: submission.id },
          data: {
            status: SubmissionStatus.PENDING_PAYMENT,
            submittedAt: new Date(),
            metadata: {
              ...((submission.metadata as object) || {}),
              ...metadata,
              submittedAt: new Date().toISOString(),
            },
            responses: {
              deleteMany: {}, // Clear existing responses
              create: mergedResponses,
            },
          },
          include: this.getSubmissionInclude(),
        });
      } else {
        // Create new submission within transaction
        updatedSubmission = await tx.formSubmission.create({
          data: {
            userId,
            formId,
            status: SubmissionStatus.PENDING_PAYMENT,
            submittedAt: new Date(),
            metadata: {
              ...metadata,
              submittedAt: new Date().toISOString(),
            },
            responses: {
              create: responses.map((response) => ({
                fieldId: response.fieldId,
                fieldName: response.fieldName,
                value: response.value,
                fileUrls: response.fileUrls || [],
                metadata: response.metadata,
                instanceIndex: response.instanceIndex ?? 0,
              })),
            },
          },
          include: this.getSubmissionInclude(),
        });
      }

      // Create biometric appointment within the same transaction
      if (biometricAppointment) {
        await this.createBiometricAppointmentInTransaction(
          tx,
          updatedSubmission.id,
          biometricAppointment,
          userId,
        );
      }

      return updatedSubmission;
    });

    return this.mapToSubmissionDto(submission);
  }

  /**
   * Create biometric appointment for a form submission (within transaction)
   */
  private async createBiometricAppointmentInTransaction(
    tx: any,
    submissionId: string,
    appointmentData: any,
    userId: string,
  ): Promise<void> {
    // Use upsert to atomically create or update the appointment within transaction
    await tx.biometricAppointment.upsert({
      where: { submissionId },
      update: {
        // If appointment exists, only update non-status fields
        // This preserves the current status (e.g., ACTIVE from payment webhook)
        centerId: appointmentData.centerId,
        appointmentClass: appointmentData.appointmentClass || 'REGULAR',
        appointmentDate: new Date(appointmentData.appointmentDate),
        appointmentTime: new Date(appointmentData.appointmentTime),
        specialRequirements: appointmentData.specialRequirements,
        confirmationAcknowledged: appointmentData.confirmationAcknowledged,
        consentAcknowledged: appointmentData.consentAcknowledged,
        termsAcknowledged: appointmentData.termsAcknowledged,
        // Don't update status - preserve existing status
      },
      create: {
        userId,
        submissionId,
        centerId: appointmentData.centerId,
        appointmentClass: appointmentData.appointmentClass || 'REGULAR',
        appointmentDate: new Date(appointmentData.appointmentDate),
        appointmentTime: new Date(appointmentData.appointmentTime),
        specialRequirements: appointmentData.specialRequirements,
        confirmationAcknowledged: appointmentData.confirmationAcknowledged,
        consentAcknowledged: appointmentData.consentAcknowledged,
        termsAcknowledged: appointmentData.termsAcknowledged,
        status: 'PENDING',
      },
    });

    console.log(
      `Biometric appointment upserted successfully for submission ${submissionId}`,
    );
  }

  /**
   * Delete submission and clean up associated files
   */
  async deleteSubmission(userId: string, submissionId: string): Promise<void> {
    // Verify ownership and get submission with responses
    const submission = await this.prisma.formSubmission.findFirst({
      where: {
        id: submissionId,
        userId,
        isCancelled: false,
      },
      include: {
        responses: true,
        appointment: true,
        payment: true,
        biometricData: true,
        statusLogs: true,
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found or not accessible');
    }

    // Check if submission can be permanently deleted
    // if (submission.status !== 'DRAFT') {
    //   throw new BadRequestException(
    //     'Only DRAFT submissions can be permanently deleted. Use the cancel endpoint for submitted applications.',
    //   );
    // }

    // Use transaction to ensure atomic deletion
    await this.prisma.$transaction(async (tx) => {
      // Collect all file URLs for cleanup
      const fileUrls = submission.responses
        .filter((r) => r.fileUrls && r.fileUrls.length > 0)
        .flatMap((r) => r.fileUrls);

      // Delete files from storage
      if (fileUrls.length > 0) {
        await this.cleanupFiles(fileUrls);
      }

      // Delete all associated data in the correct order (due to foreign key constraints)

      // 1. Delete status logs first
      if (submission.statusLogs && submission.statusLogs.length > 0) {
        await tx.submissionStatusLog.deleteMany({
          where: { submissionId },
        });
      }

      // 2. Delete field responses
      if (submission.responses && submission.responses.length > 0) {
        await tx.fieldResponse.deleteMany({
          where: { submissionId },
        });
      }

      // 3. Delete biometric data if exists
      if (submission.biometricData) {
        await tx.biometricData.delete({
          where: { submissionId },
        });
      }

      // 4. Delete payment if exists
      if (submission.payment) {
        await tx.payment.delete({
          where: { submissionId },
        });
      }

      // 5. Delete appointment if exists
      if (submission.appointment) {
        await tx.biometricAppointment.delete({
          where: { submissionId },
        });
      }

      // 6. Finally, delete the submission itself
      await tx.formSubmission.delete({
        where: { id: submissionId },
      });
    });
  }

  /**
   * Clean up files from storage
   */
  private async cleanupFiles(fileUrls: string[]): Promise<void> {
    try {
      // For local storage, delete files from filesystem
      if (process.env.NODE_ENV !== 'production') {
        const fs = await import('fs');
        const path = await import('path');

        for (const fileUrl of fileUrls) {
          try {
            // Remove /uploads/ prefix and construct full path
            const relativePath = fileUrl.replace('/uploads/', '');
            const fullPath = path.join(process.cwd(), 'uploads', relativePath);

            if (fs.existsSync(fullPath)) {
              fs.unlinkSync(fullPath);
            }
          } catch (error) {
            console.error(`Failed to delete file ${fileUrl}:`, error);
            // Continue with other files even if one fails
          }
        }
      } else {
        // For production, use storage service (S3, etc.)
        // This would integrate with your storage provider
        console.log(`Files to be cleaned up: ${fileUrls.join(', ')}`);
        // TODO: Implement production file cleanup
      }
    } catch (error) {
      console.error('File cleanup failed:', error);
      // Don't throw - file cleanup failure shouldn't prevent submission deletion
    }
  }

  async saveDraft(
    userId: string,
    draftDto: SaveDraftDto,
  ): Promise<FormSubmissionDto> {
    const { formId, submissionId, responses, metadata } = draftDto;

    // Verify form exists
    const form = await this.prisma.dynamicForm.findUnique({
      where: { id: formId },
    });

    if (!form) {
      throw new NotFoundException(FORM_NOT_FOUND);
    }

    // Find the submission to work with (either by submissionId or existing draft)
    let submission: any = null;

    if (submissionId) {
      // User provided a specific submission ID (likely from file uploads)
      submission = await this.prisma.formSubmission.findFirst({
        where: {
          id: submissionId,
          userId,
          formId,
          status: SubmissionStatus.DRAFT,
        },
      });

      if (!submission) {
        throw new NotFoundException(
          `Draft submission with ID ${submissionId} not found or not accessible`,
        );
      }
    } else {
      // Look for existing draft submission
      submission = await this.prisma.formSubmission.findFirst({
        where: {
          userId,
          formId,
          status: SubmissionStatus.DRAFT,
        },
      });
    }

    // Use database transaction for atomic operations
    submission = await this.prisma.$transaction(async (tx) => {
      if (submission) {
        // Get existing responses to preserve file uploads
        const existingResponses = await tx.fieldResponse.findMany({
          where: { submissionId: submission.id },
        });

        // Create a map of existing responses by fieldId
        const existingResponseMap = new Map(
          existingResponses.map((r) => [
            `${r.fieldId}:${(r as any).instanceIndex ?? 0}`,
            r,
          ]),
        );

        // Merge new responses with existing ones, preserving file uploads
        const mergedResponses = responses.map((response) => {
          const key = `${response.fieldId}:${response.instanceIndex ?? 0}`;
          const existingResponse = existingResponseMap.get(key);

          // For file fields, preserve existing fileUrls if no new ones provided
          if (response.fileUrls && response.fileUrls.length > 0) {
            // New file URLs provided, use them
            return {
              fieldId: response.fieldId,
              fieldName: response.fieldName,
              value: response.value,
              fileUrls: response.fileUrls,
              metadata: response.metadata,
              instanceIndex: response.instanceIndex ?? 0,
            };
          } else if (
            existingResponse &&
            existingResponse.fileUrls &&
            existingResponse.fileUrls.length > 0
          ) {
            // No new file URLs, but existing ones exist - preserve them
            return {
              fieldId: response.fieldId,
              fieldName: response.fieldName,
              value: response.value,
              fileUrls: existingResponse.fileUrls,
              metadata: {
                ...((existingResponse.metadata as object) || {}),
                ...response.metadata,
              },
              instanceIndex: response.instanceIndex ?? 0,
            };
          } else {
            // No file URLs involved
            return {
              fieldId: response.fieldId,
              fieldName: response.fieldName,
              value: response.value,
              fileUrls: response.fileUrls || [],
              metadata: response.metadata,
              instanceIndex: response.instanceIndex ?? 0,
            };
          }
        });

        // Update existing draft - preserve file uploads within transaction
        // First, update existing responses
        for (const response of mergedResponses) {
          await tx.fieldResponse.updateMany({
            where: {
              submissionId: submission.id,
              fieldId: response.fieldId,
            },
            data: {
              fieldName: response.fieldName,
              value: response.value,
              fileUrls: response.fileUrls,
              metadata: response.metadata,
            },
          });
        }

        // Then, create any new responses that don't exist
        const existingFieldIds = existingResponses.map((r) => r.fieldId);
        const newResponses = mergedResponses.filter(
          (r) => !existingFieldIds.includes(r.fieldId),
        );

        if (newResponses.length > 0) {
          await tx.fieldResponse.createMany({
            data: newResponses.map((response) => ({
              submissionId: submission.id,
              fieldId: response.fieldId,
              fieldName: response.fieldName,
              value: response.value,
              fileUrls: response.fileUrls,
              metadata: response.metadata,
            })),
          });
        }

        // Update submission metadata
        return await tx.formSubmission.update({
          where: { id: submission.id },
          data: {
            metadata: {
              ...((submission.metadata as object) || {}),
              ...metadata,
              lastSaved: new Date().toISOString(),
            },
          },
          include: this.getSubmissionInclude(),
        });
      } else {
        // Create new draft within transaction
        return await tx.formSubmission.create({
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
                fieldId: response.fieldId,
                fieldName: response.fieldName,
                value: response.value,
                fileUrls: response.fileUrls || [],
                metadata: response.metadata,
                instanceIndex: response.instanceIndex ?? 0,
              })),
            },
          },
          include: this.getSubmissionInclude(),
        });
      }
    });

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
      isCancelled: false, // 🔑 Hide cancelled submissions from user view
      ...(formId && { formId }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { referenceNumber: { contains: search, mode: 'insensitive' } },
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
        include: this.getSubmissionListInclude(),
      }),
      this.prisma.formSubmission.count({ where }),
    ]);

    // Calculate form progress for each submission
    const submissionsWithProgress = await Promise.all(
      submissions.map(async (submission) => {
        const submissionDto = this.mapToSubmissionDto(submission);

        try {
          // Get form progress for this submission
          const formProgress = await this.getFormProgress(
            userId,
            submission.formId,
          );

          // Add progress information to the submission
          submissionDto.progress = {
            progressPercentage: formProgress.overallProgress,
            nextAction: formProgress.canSubmit
              ? 'Ready to submit'
              : 'Complete required fields',
          };
        } catch (error) {
          // If progress calculation fails, set default values
          submissionDto.progress = {
            progressPercentage: 0,
            nextAction: 'Unable to calculate progress',
          };
        }

        return submissionDto;
      }),
    );

    return {
      submissions: submissionsWithProgress,
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

  /**
   * Update and resubmit a queried application
   * This allows applicants to respond to verification officer queries
   */
  async updateQueriedSubmission(
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

    if (existingSubmission.status !== SubmissionStatus.QUERIED) {
      throw new BadRequestException(
        'Only queried submissions can be updated and resubmitted',
      );
    }

    if (!existingSubmission.isQueried) {
      throw new BadRequestException('Submission is not marked as queried');
    }

    const { responses, ...submissionData } = updateDto;

    // Update the submission with new responses and mark as resubmitted
    const submission = await this.prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        ...submissionData,
        status: SubmissionStatus.SUBMITTED, // Change back to submitted for review
        isQueried: false, // Mark as no longer queried
        queryResponse: `Application updated and resubmitted on ${new Date().toISOString()}`,
        queryResponseAt: new Date(),
        submittedAt: new Date(), // Update submission date
        responses: responses
          ? {
            deleteMany: {},
            create: responses.map((response) => ({
              fieldId: response.fieldId,
              fieldName: response.fieldName,
              value: response.value,
              fileUrls: response.fileUrls || [],
              metadata: response.metadata,
            })),
          }
          : undefined,
        statusLogs: {
          create: {
            fromStatus: SubmissionStatus.QUERIED,
            toStatus: SubmissionStatus.SUBMITTED,
            reason: 'Application updated and resubmitted after query',
            notes:
              'Applicant responded to verification officer query and resubmitted application',
            changedBy: userId,
          },
        },
      },
      include: this.getSubmissionInclude(),
    });

    return this.mapToSubmissionDto(submission);
  }

  /**
   * Get queried applications for a user
   * These are applications that need additional information or documents
   */
  async getQueriedSubmissions(userId: string): Promise<FormSubmissionDto[]> {
    const submissions = await this.prisma.formSubmission.findMany({
      where: {
        userId,
        status: SubmissionStatus.QUERIED,
        isQueried: true,
      },
      include: this.getSubmissionInclude(),
      orderBy: { queriedAt: 'desc' },
    });

    return submissions.map((submission) => this.mapToSubmissionDto(submission));
  }

  async cancelSubmission(
    userId: string,
    submissionId: string,
    cancelDto: CancelSubmissionDto,
  ): Promise<FormSubmissionDto> {
    const submission = await this.prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: {
        appointment: true,
        payment: true,
      },
    });

    if (!submission) {
      throw new NotFoundException(FORM_SUBMISSION_NOT_FOUND);
    }

    if (submission.userId !== userId) {
      throw new ForbiddenException(FORBIDDEN_RESOURCE);
    }

    if (submission.isCancelled) {
      throw new BadRequestException('Submission is already cancelled');
    }

    // Business rules for what can be cancelled
    const cancellableStatuses: SubmissionStatus[] = [
      SubmissionStatus.SUBMITTED,
      SubmissionStatus.UNDER_REVIEW,
      SubmissionStatus.FLAGGED,
      SubmissionStatus.QUERIED,
    ];

    if (!cancellableStatuses.includes(submission.status)) {
      throw new BadRequestException(
        `Cannot cancel application in ${submission.status} status. Only SUBMITTED, UNDER_REVIEW, FLAGGED, or QUERIED applications can be cancelled.`,
      );
    }

    // Cancel the submission (soft delete)
    const cancelledSubmission = await this.prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.CANCELLED,
        previousStatus: submission.status,
        isCancelled: true,
        cancelledAt: new Date(),
        cancelledBy: userId,
        cancellationReason: cancelDto.reason,
      },
      include: {
        form: true,
        user: true,
        responses: {
          include: { field: true },
        },
        appointment: true,
        payment: true,
      },
    });

    // Cancel related appointments if they exist
    if (submission.appointment) {
      await this.prisma.biometricAppointment.update({
        where: { id: submission.appointment.id },
        data: {
          status: 'CANCELLED', // Assuming AppointmentStatus.CANCELLED exists
        },
      });
    }

    // Log the status change
    await this.prisma.submissionStatusLog.create({
      data: {
        submissionId,
        fromStatus: submission.status,
        toStatus: SubmissionStatus.CANCELLED,
        reason: `Cancelled by user: ${cancelDto.reason}`,
        changedBy: userId,
      },
    });

    // TODO: Add notification to admins if submission was under review
    // TODO: Handle payment refund logic if needed

    return this.mapToSubmissionDto(cancelledSubmission);
  }

  async restoreSubmission(submissionId: string): Promise<FormSubmissionDto> {
    const submission = await this.prisma.formSubmission.findUnique({
      where: { id: submissionId },
    });

    if (!submission) {
      throw new NotFoundException(FORM_SUBMISSION_NOT_FOUND);
    }

    if (!submission.isCancelled) {
      throw new BadRequestException('Submission is not cancelled');
    }

    if (!submission.previousStatus) {
      throw new BadRequestException('Cannot restore: no previous status found');
    }

    // Restore the submission
    const restoredSubmission = await this.prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        status: submission.previousStatus,
        previousStatus: SubmissionStatus.CANCELLED,
        isCancelled: false,
        cancelledAt: null,
        cancelledBy: null,
        cancellationReason: null,
      },
      include: {
        form: true,
        user: true,
        responses: {
          include: { field: true },
        },
        appointment: true,
        payment: true,
      },
    });

    // Log the status change
    await this.prisma.submissionStatusLog.create({
      data: {
        submissionId,
        fromStatus: SubmissionStatus.CANCELLED,
        toStatus: submission.previousStatus,
        reason: 'Restored by admin',
        changedBy: 'admin', // TODO: Pass actual admin user ID
      },
    });

    return this.mapToSubmissionDto(restoredSubmission);
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
      isCancelled,
    } = queryDto;
    const skip = (page - 1) * limit;

    const where: Prisma.FormSubmissionWhereInput = {
      ...(formId && { formId }),
      ...(userId && { userId }),
      ...(status && { status }),
      ...(isCancelled !== undefined && { isCancelled }), // Allow admin to filter by cancellation status
      ...(search && {
        OR: [
          { referenceNumber: { contains: search, mode: 'insensitive' } },
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
    existingResponses?: any[],
  ): Promise<void> {
    const allFields = this.getAllFormFields(form);
    const responseMap = new Map(responses.map((r) => [r.fieldId, r]));
    const existingResponseMap = existingResponses
      ? new Map(existingResponses.map((r) => [r.fieldId, r]))
      : new Map();

    for (const field of allFields) {
      const response = responseMap.get(field.id);
      const existingResponse = existingResponseMap.get(field.id);

      // For FILE fields, check if files were uploaded (either in current submission or existing)
      if (field.type === FieldType.FILE) {
        const hasCurrentFiles =
          response?.fileUrls && response.fileUrls.length > 0;
        const hasExistingFiles =
          existingResponse?.fileUrls && existingResponse.fileUrls.length > 0;

        if (field.required && !hasCurrentFiles && !hasExistingFiles) {
          throw this.createUserFriendlyError(field, 'REQUIRED_FILE');
        }
        continue; // Skip other validation for FILE fields
      }

      // Check required fields for non-FILE fields
      if (field.required && (!response || this.isEmpty(response.value))) {
        throw this.createUserFriendlyError(field, 'REQUIRED_FIELD');
      }

      // Validate field type and format
      if (response && !this.isEmpty(response.value)) {
        await this.validateFieldValue(field, response.value);
      }
    }
  }

  /**
   * Create user-friendly error messages with actionable guidance
   */
  private createUserFriendlyError(
    field: any,
    errorType: string,
  ): BadRequestException {
    const fieldName = field.label || field.name;

    switch (errorType) {
      case 'REQUIRED_FILE':
        return new BadRequestException(
          `The field '${fieldName}' requires a file upload. ` +
          `Please upload a file or contact support if you need help. ` +
          `Supported formats: ${this.getSupportedFileTypes(field)}`,
        );

      case 'REQUIRED_FIELD':
        return new BadRequestException(
          `The field '${fieldName}' is required to complete your submission. ` +
          `Please fill in this information before proceeding.`,
        );

      case 'INVALID_FILE_TYPE':
        const allowedTypes = this.getSupportedFileTypes(field);
        return new BadRequestException(
          `The file type for '${fieldName}' is not supported. ` +
          `Allowed types: ${allowedTypes}. Please try uploading a different file.`,
        );

      case 'FILE_TOO_LARGE':
        const maxSize = field.fileTypes?.maxSize || '10MB';
        return new BadRequestException(
          `The file for '${fieldName}' is too large. ` +
          `Maximum size allowed: ${maxSize}. Please compress or resize your file.`,
        );

      case 'MULTIPLE_FILES_NOT_ALLOWED':
        return new BadRequestException(
          `The field '${fieldName}' only accepts a single file. ` +
          `Please upload only one file for this field.`,
        );

      default:
        return new BadRequestException(
          `There's an issue with the field '${fieldName}'. ` +
          `Please check your input and try again. If the problem persists, contact support.`,
        );
    }
  }

  /**
   * Get supported file types for a field in user-friendly format
   */
  private getSupportedFileTypes(field: any): string {
    if (!field.fileTypes?.accept) return 'any file type';

    const types = field.fileTypes.accept.map((type: string) => {
      if (type === '*/*') return 'any file type';
      if (type.includes('/*')) return type.split('/')[0] + ' files';
      if (type.startsWith('.')) return type.toUpperCase() + ' files';
      return type;
    });

    return types.join(', ');
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
        // Skip validation for select fields with empty options (frontend handles them)
        if (field.options && field.options.length > 0) {
          if (!this.isValidOption(field, value)) {
            throw new BadRequestException(
              `Invalid option for field '${field.label}'`,
            );
          }
        }
        break;
      case FieldType.EMAIL:
        if (!this.isValidEmail(value)) {
          throw new BadRequestException(
            `Field '${field.label}' must be a valid email address`,
          );
        }
        break;
      case FieldType.PHONE:
        if (!this.isValidPhone(value)) {
          throw new BadRequestException(
            `Field '${field.label}' must be a valid phone number`,
          );
        }
        break;
      case FieldType.INFO:
      case FieldType.AGREEMENT:
        // These are display-only fields, no validation needed
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

  private isValidEmail(value: any): boolean {
    if (typeof value !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  private isValidPhone(value: any): boolean {
    if (typeof value !== 'string') return false;
    // Basic phone validation - allows international format
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ''));
  }

  private isValidOption(field: any, value: any): boolean {
    // Safety check: if no options, validation should be skipped
    if (!field.options || field.options.length === 0) {
      return true; // Skip validation for fields with no options
    }

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
          country: {
            select: {
              id: true,
              name: true,
              isoCode2: true,
              isoCode3: true,
              flag: true,
              logoUrl: true,
            },
          },
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

  private getSubmissionListInclude() {
    return {
      form: {
        select: {
          id: true,
          name: true,
          description: true,
          applicationType: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
            },
          },
          country: {
            select: {
              id: true,
              name: true,
              isoCode2: true,
              isoCode3: true,
              flag: true,
              logoUrl: true,
            },
          },
          serviceFees: {
            select: {
              id: true,
              name: true,
              description: true,
              amount: true,
              currency: true,
              isOptional: true,
              isActive: true,
              feeType: true,
            },
            where: {
              isActive: true,
            },
          },
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
      payment: {
        select: {
          id: true,
          status: true,
          amount: true,
          currency: true,
          paidAt: true,
        },
      },
      appointment: {
        select: {
          id: true,
          status: true,
          appointmentDate: true,
          appointmentTime: true,
          queueEntry: {
            select: {
              id: true,
              status: true,
              queueNumber: true,
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
      previousStatus: submission.previousStatus,

      // Biometric tracking
      biometricRequired: submission.biometricRequired || false,
      biometricCompleted: submission.biometricCompleted || false,
      biometricCompletedAt: submission.biometricCompletedAt,

      // Flag management
      isFlagged: submission.isFlagged || false,
      flagReason: submission.flagReason,
      flaggedAt: submission.flaggedAt,
      flaggedBy: submission.flaggedBy,

      // Query management
      isQueried: submission.isQueried || false,
      queryMessage: submission.queryMessage,
      queryResponse: submission.queryResponse,
      queriedAt: submission.queriedAt,
      queryResponseAt: submission.queryResponseAt,
      queriedBy: submission.queriedBy,

      // Payment tracking
      paymentRequired: submission.paymentRequired || false,
      paymentCompleted: submission.paymentCompleted || false,
      paymentCompletedAt: submission.paymentCompletedAt,

      // Cancellation tracking
      isCancelled: submission.isCancelled || false,
      cancelledAt: submission.cancelledAt,
      cancelledBy: submission.cancelledBy,
      cancellationReason: submission.cancellationReason,

      // Include responses if they exist (for detailed views)
      ...(submission.responses && {
        responses: submission.responses.map((response: any) => ({
          id: response.id,
          fieldId: response.fieldId,
          fieldName: response.fieldName,
          value: response.value,
          fileUrls: response.fileUrls,
          metadata: response.metadata,
          createdAt: response.createdAt,
          updatedAt: response.updatedAt,
          instanceIndex: response.instanceIndex ?? 0,
        })),
      }),

      metadata: submission.metadata,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
      submittedAt: submission.submittedAt,
      reviewedAt: submission.reviewedAt,
      reviewedBy: submission.reviewedBy,
      reviewNotes: submission.reviewNotes,
      form: {
        id: submission.form.id,
        name: submission.form.name,
        description: submission.form.description,
        applicationType: submission.form.applicationType
          ? {
              id: submission.form.applicationType.id,
              code: submission.form.applicationType.code,
              name: submission.form.applicationType.name,
              description: submission.form.applicationType.description,
            }
          : undefined,
        country: submission.form.country,
        availableServiceFees:
          submission.form.serviceFees?.map((serviceFee: any) => ({
            id: serviceFee.id,
            name: serviceFee.name,
            description: serviceFee.description,
            amount: serviceFee.amount,
            currency: serviceFee.currency,
            isOptional: serviceFee.isOptional,
            feeType: serviceFee.feeType,
          })) || [],
      },
      user: submission.user,
      referenceNumber: submission.referenceNumber,
      // Progress information - will be calculated separately for each submission
      progress: undefined,
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
                logoUrl: true,
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
        ninVerified: submission.user.ninVerified,
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
            logoUrl: submission.form.country.logoUrl,
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

  /**
   * Upload single file with field validation and submission update
   */
  async uploadSingleFile(
    userId: string,
    file: Express.Multer.File,
    uploadDto: FileUploadDto,
  ): Promise<{
    fileUrl: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    fieldId: string;
    submissionUpdated: boolean;
  }> {
    // 1. Get field configuration for validation with submission context
    const { field, submission } = await this.getFormFieldForUpload(
      uploadDto.fieldId,
      uploadDto.submissionId,
      userId,
    );

    // 2. Validate file against field configuration
    await this.validateFileAgainstField(file, field);

    // 3. Upload file to storage
    const fileUrl = await this.saveFileToStorage(
      file,
      userId,
      uploadDto.fieldId,
    );

    // 4. Update submission with the file URL
    let submissionUpdated = false;
    if (submission) {
      await this.updateSubmissionWithFile(
        submission.id,
        uploadDto.fieldId,
        field.name,
        [fileUrl],
        uploadDto.metadata,
      );
      submissionUpdated = true;
    }

    return {
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      fieldId: uploadDto.fieldId,
      submissionUpdated,
    };
  }

  /**
   * Upload multiple files with field validation and submission update
   */
  async uploadMultipleFiles(
    userId: string,
    files: Express.Multer.File[],
    uploadDto: FileUploadDto,
  ): Promise<{
    files: Array<{
      fileUrl: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      metadata?: any;
    }>;
    fieldId: string;
    totalFiles: number;
    totalSize: number;
    submissionUpdated: boolean;
    validationSummary: {
      totalFiles: number;
      validFiles: number;
      invalidFiles: number;
      errors: Array<{
        fileName: string;
        error: string;
      }>;
    };
  }> {
    // 1. Get field configuration for validation with submission context
    const { field, submission } = await this.getFormFieldForUpload(
      uploadDto.fieldId,
      uploadDto.submissionId,
      userId,
    );

    // 2. Validate that multiple files are allowed
    const fileConfig = field.fileTypes as any;
    if (!fileConfig?.multiple && files.length > 1) {
      throw new BadRequestException(
        'Multiple files not allowed for this field',
      );
    }

    // 3. Validate total file count if specified
    if (fileConfig?.maxFiles && files.length > fileConfig.maxFiles) {
      throw new BadRequestException(
        `Maximum ${fileConfig.maxFiles} files allowed, but ${files.length} files were uploaded`,
      );
    }

    // 4. Validate each file and collect errors
    const validationErrors: Array<{ fileName: string; error: string }> = [];
    const validFiles: Express.Multer.File[] = [];

    for (const file of files) {
      try {
        await this.validateFileAgainstField(file, field);
        validFiles.push(file);
      } catch (error) {
        validationErrors.push({
          fileName: file.originalname,
          error: error.message,
        });
      }
    }

    // 5. If any files failed validation, throw error with details
    if (validationErrors.length > 0) {
      throw new BadRequestException({
        message: 'Some files failed validation',
        errors: validationErrors,
        validFiles: validFiles.length,
        invalidFiles: validationErrors.length,
      });
    }

    // 6. Upload all valid files to storage with metadata
    const uploadedFiles = await Promise.all(
      files.map(async (file, index) => {
        const fileUrl = await this.saveFileToStorage(
          file,
          userId,
          uploadDto.fieldId,
        );

        // Get individual file metadata if provided
        const fileMetadata = uploadDto.fileMetadata?.[index] || {};

        return {
          fileUrl,
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
          metadata: {
            ...fileMetadata,
            uploadedAt: new Date().toISOString(),
            fieldId: uploadDto.fieldId,
            submissionId: uploadDto.submissionId,
          },
        };
      }),
    );

    const totalSize = files.reduce((sum, file) => sum + file.size, 0);

    // 7. Update submission with all file URLs
    let submissionUpdated = false;
    if (submission) {
      const fileUrls = uploadedFiles.map((file) => file.fileUrl);
      await this.updateSubmissionWithFile(
        submission.id,
        uploadDto.fieldId,
        field.name,
        fileUrls,
        uploadDto.metadata,
      );
      submissionUpdated = true;
    }

    return {
      files: uploadedFiles,
      fieldId: uploadDto.fieldId,
      totalFiles: files.length,
      totalSize,
      submissionUpdated,
      validationSummary: {
        totalFiles: files.length,
        validFiles: files.length,
        invalidFiles: 0,
        errors: [],
      },
    };
  }

  /**
   * Get form field for upload validation with submission context
   */
  private async getFormFieldForUpload(
    fieldId: string,
    submissionId?: string,
    userId?: string,
  ): Promise<{ field: any; submission?: any; form?: any }> {
    // Get the field with its form context
    const field = await this.prisma.formField.findUnique({
      where: { id: fieldId },
      include: {
        group: {
          include: {
            section: {
              include: {
                form: true,
              },
            },
          },
        },
      },
    });

    if (!field) {
      throw new NotFoundException(`Form field with ID ${fieldId} not found`);
    }

    if (field.type !== 'FILE') {
      throw new BadRequestException('Field is not a file upload field');
    }

    // If submissionId is provided, validate submission context
    let submission = null;
    let form = null;

    if (submissionId) {
      submission = await this.prisma.formSubmission.findUnique({
        where: { id: submissionId },
        include: {
          form: true,
        },
      });

      if (!submission) {
        throw new NotFoundException(
          `Submission with ID ${submissionId} not found`,
        );
      }

      // Validate user ownership
      if (userId && submission.userId !== userId) {
        throw new ForbiddenException(
          'You can only upload files to your own submissions',
        );
      }

      // Validate that the field belongs to the submission's form
      if (field.group.section.form.id !== submission.formId) {
        throw new BadRequestException(
          `Field ${fieldId} does not belong to the form associated with submission ${submissionId}`,
        );
      }

      form = submission.form;
    } else {
      // If no submissionId, get form from field context
      form = field.group.section.form;
    }

    return { field, submission, form };
  }

  /**
   * Validate file against field configuration
   */
  private async validateFileAgainstField(
    file: Express.Multer.File,
    field: any,
  ): Promise<void> {
    const fileConfig = field.fileTypes as any;

    if (!fileConfig) {
      throw new BadRequestException(
        'File upload configuration not found for field',
      );
    }

    // 1. Validate file size
    const maxSize = this.parseFileSize(fileConfig.maxSize || '10MB');
    if (file.size > maxSize) {
      throw this.createUserFriendlyError(field, 'FILE_TOO_LARGE');
    }

    // 2. Validate file type
    const allowedTypes = fileConfig.accept || ['*/*'];
    const isValidType = this.validateFileType(file, allowedTypes);
    if (!isValidType) {
      throw this.createUserFriendlyError(field, 'INVALID_FILE_TYPE');
    }
  }

  /**
   * Validate file type against allowed types
   */
  private validateFileType(
    file: Express.Multer.File,
    allowedTypes: string[],
  ): boolean {
    for (const allowedType of allowedTypes) {
      if (allowedType === '*/*') return true;

      // Check MIME type
      if (file.mimetype === allowedType) return true;

      // Check wildcard MIME types (e.g., 'image/*')
      if (allowedType.includes('/*')) {
        const baseType = allowedType.split('/')[0];
        if (file.mimetype.startsWith(baseType + '/')) return true;
      }

      // Check file extensions (with or without dot)
      const fileExt = file.originalname.split('.').pop()?.toLowerCase();
      const allowedExt = allowedType.startsWith('.')
        ? allowedType.substring(1).toLowerCase()
        : allowedType.toLowerCase();

      if (fileExt === allowedExt) return true;

      // Map common file extensions to MIME types
      const extensionToMimeType: { [key: string]: string } = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        pdf: 'application/pdf',
        doc: 'application/msword',
        docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        txt: 'text/plain',
      };

      if (extensionToMimeType[allowedExt] === file.mimetype) return true;
    }

    return false;
  }

  /**
   * Parse file size string to bytes
   */
  private parseFileSize(sizeString: string): number {
    const units = { KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
    const match = sizeString.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB)$/i);

    if (!match) return 10 * 1024 * 1024; // Default 10MB

    const [, size, unit] = match;
    return parseFloat(size) * units[unit.toUpperCase() as keyof typeof units];
  }

  /**
   * Format file size for display
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Update submission with file URLs
   */
  private async updateSubmissionWithFile(
    submissionId: string,
    fieldId: string,
    fieldName: string,
    fileUrls: string[],
    metadata?: any,
  ): Promise<void> {
    // Check if there's already a response for this field
    const existingResponse = await this.prisma.fieldResponse.findFirst({
      where: {
        submissionId,
        fieldId,
      },
    });

    if (existingResponse) {
      // Update existing response with new file URLs
      await this.prisma.fieldResponse.update({
        where: { id: existingResponse.id },
        data: {
          fileUrls: fileUrls,
          metadata: {
            ...((existingResponse.metadata as object) || {}),
            ...metadata,
            lastUpdated: new Date().toISOString(),
          },
        },
      });
    } else {
      // Create new response for this field
      await this.prisma.fieldResponse.create({
        data: {
          submissionId,
          fieldId,
          fieldName,
          value: null, // File fields don't have a text value
          fileUrls: fileUrls,
          metadata: {
            ...metadata,
            uploadedAt: new Date().toISOString(),
          },
        },
      });
    }
  }

  /**
   * Save file to storage (local filesystem)
   */
  private async saveFileToStorage(
    file: Express.Multer.File,
    userId: string,
    fieldId: string,
  ): Promise<string> {
    const fs = await import('fs');
    const path = await import('path');

    // Create uploads directory if it doesn't exist
    // Use /app/uploads for Docker containers, fallback to local uploads
    const uploadsDir =
      process.env.NODE_ENV === 'production'
        ? '/app/uploads'
        : path.join(process.cwd(), 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });

    // Create user-specific directory
    const userDir = path.join(uploadsDir, userId);
    fs.mkdirSync(userDir, { recursive: true });

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${fieldId}_${timestamp}_${sanitizedFileName}`;

    // Full path for the file
    const filePath = path.join(userDir, fileName);

    // Move the file from temp location to permanent location
    fs.writeFileSync(filePath, file.buffer as unknown as Uint8Array);

    // Return the URL that will be served by static middleware
    return `/uploads/${userId}/${fileName}`;
  }

  /**
   * Generate reference number for a submission that doesn't have one
   * This is useful for fixing existing submissions or manual generation
   */
  async generateReferenceNumberForSubmission(
    submissionId: string,
  ): Promise<string> {
    try {
      // Get the submission with form and country info
      const submission = await this.prisma.formSubmission.findUnique({
        where: { id: submissionId },
        include: {
          form: {
            include: {
              country: {
                select: { id: true, isoCode2: true },
              },
            },
          },
        },
      });

      if (!submission) {
        throw new NotFoundException('Form submission not found');
      }

      if (submission.referenceNumber) {
        throw new BadRequestException(
          'Submission already has a reference number',
        );
      }

      if (!submission.form.country || !submission.form.country.isoCode2) {
        throw new BadRequestException(
          'Form submission has no associated country',
        );
      }

      // Reference number generation is now handled by middleware
      // This method is kept for backward compatibility but no longer generates numbers
      throw new Error(
        'Reference number generation is now handled automatically by middleware when form status changes to SUBMITTED',
      );
    } catch (error) {
      console.error(
        `Failed to generate reference number for submission ${submissionId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get all submissions that don't have reference numbers
   * Useful for identifying and fixing submissions
   */
  async getSubmissionsWithoutReferenceNumbers(
    pagination: PaginationQueryDto = {},
  ): Promise<{ submissions: any[]; total: number }> {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [submissions, total] = await Promise.all([
      this.prisma.formSubmission.findMany({
        where: {
          referenceNumber: null,
          status: SubmissionStatus.SUBMITTED,
        },
        include: {
          form: {
            include: {
              country: {
                select: { id: true, name: true, isoCode2: true },
              },
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
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.formSubmission.count({
        where: {
          referenceNumber: null,
          status: SubmissionStatus.SUBMITTED,
        },
      }),
    ]);

    return {
      submissions,
      total,
    };
  }
}
