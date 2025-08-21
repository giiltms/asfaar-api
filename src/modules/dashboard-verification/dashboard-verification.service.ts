import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { SubmissionStatus } from '@prisma/client';
import {
  MailService,
  ApplicationQueryData,
} from '@modules/mail/services/mail.service';
import {
  ApplicationReviewDto,
  FlagApplicationDto,
  QueryApplicationDto,
  ProcessApplicationDto,
  VerificationReviewListDto,
  VerificationStatsDto,
} from './dto/verification-review.dto';

@Injectable()
export class DashboardVerificationService {
  private readonly logger = new Logger(DashboardVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Transform flat form responses into hierarchical structure for frontend
   */
  private transformFormResponses(responses: any[]): any {
    if (!responses || responses.length === 0) {
      return {
        sections: [],
        summary: {
          totalFields: 0,
          completedFields: 0,
          requiredFields: 0,
          completedRequiredFields: 0,
          completionPercentage: 0,
          sections: [],
        },
      };
    }

    // Group responses by section and group
    const sectionsMap = new Map<string, any>();
    let totalFields = 0;
    let completedFields = 0;
    let requiredFields = 0;
    let completedRequiredFields = 0;

    responses.forEach((response) => {
      const sectionName = response.field.group.section.title;
      const groupName = response.field.group.title || 'Default Group';
      const sectionOrder = response.field.group.section.order;
      const groupOrder = response.field.group.order;

      // Initialize section if not exists
      if (!sectionsMap.has(sectionName)) {
        sectionsMap.set(sectionName, {
          sectionName,
          sectionOrder,
          groups: new Map<string, any>(),
        });
      }

      const section = sectionsMap.get(sectionName)!;

      // Initialize group if not exists
      if (!section.groups.has(groupName)) {
        section.groups.set(groupName, {
          groupName,
          groupOrder,
          fields: [],
        });
      }

      const group = section.groups.get(groupName)!;

      // Create field object with frontend-friendly metadata
      const field = {
        fieldId: response.fieldId,
        fieldName: response.fieldName,
        fieldLabel: response.field.label,
        fieldType: response.field.type,
        value: response.value,
        fileUrls: response.fileUrls || [],
        isRequired: response.field.required,
        displayOrder: response.field.order,
        isCompleted: this.isFieldCompleted(response),
        validationStatus: this.getFieldValidationStatus(response),
        displayValue: this.getFieldDisplayValue(response),
      };

      group.fields.push(field);

      // Update summary statistics
      totalFields++;
      if (field.isCompleted) {
        completedFields++;
      }
      if (field.isRequired) {
        requiredFields++;
        if (field.isCompleted) {
          completedRequiredFields++;
        }
      }
    });

    // Convert maps to arrays and sort
    const sections = Array.from(sectionsMap.values())
      .sort((a, b) => a.sectionOrder - b.sectionOrder)
      .map((section) => ({
        ...section,
        groups: Array.from(section.groups.values())
          .sort((a: any, b: any) => a.groupOrder - b.groupOrder)
          .map((group: any) => ({
            ...group,
            fields: group.fields.sort(
              (a: any, b: any) => a.displayOrder - b.displayOrder,
            ),
          })),
      }));

    // Calculate section-level statistics
    const sectionStats = sections.map((section) => {
      const sectionFields = section.groups.reduce(
        (total, group) => total + group.fields.length,
        0,
      );
      const sectionCompleted = section.groups.reduce(
        (total, group) =>
          total + group.fields.filter((field) => field.isCompleted).length,
        0,
      );
      return {
        sectionName: section.sectionName,
        totalFields: sectionFields,
        completedFields: sectionCompleted,
        completionPercentage:
          sectionFields > 0
            ? Math.round((sectionCompleted / sectionFields) * 100)
            : 0,
      };
    });

    return {
      sections,
      summary: {
        totalFields,
        completedFields,
        requiredFields,
        completedRequiredFields,
        completionPercentage:
          totalFields > 0
            ? Math.round((completedFields / totalFields) * 100)
            : 0,
        sections: sectionStats,
      },
    };
  }

  /**
   * Check if a field is completed (has a value)
   */
  private isFieldCompleted(response: any): boolean {
    if (response.fileUrls && response.fileUrls.length > 0) {
      return true;
    }
    if (response.value === null || response.value === undefined) {
      return false;
    }
    if (typeof response.value === 'string') {
      return response.value.trim().length > 0;
    }
    if (Array.isArray(response.value)) {
      return response.value.length > 0;
    }
    return true;
  }

  /**
   * Get validation status for a field
   */
  private getFieldValidationStatus(
    response: any,
  ): 'valid' | 'invalid' | 'missing' | 'optional' {
    const isCompleted = this.isFieldCompleted(response);

    if (!response.field.required) {
      return 'optional';
    }

    if (!isCompleted) {
      return 'missing';
    }

    // Basic validation - can be extended with more complex rules
    if (response.field.type === 'EMAIL' && response.value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(response.value) ? 'valid' : 'invalid';
    }

    return 'valid';
  }

  /**
   * Get human-readable display value for a field
   */
  private getFieldDisplayValue(response: any): string {
    if (response.fileUrls && response.fileUrls.length > 0) {
      return `${response.fileUrls.length} file(s) uploaded`;
    }

    if (response.value === null || response.value === undefined) {
      return 'Not provided';
    }

    if (typeof response.value === 'string') {
      return response.value;
    }

    if (Array.isArray(response.value)) {
      return response.value.join(', ');
    }

    if (typeof response.value === 'boolean') {
      return response.value ? 'Yes' : 'No';
    }

    return String(response.value);
  }

  /**
   * Get applications with biometric data for verification officer review
   */
  async getApplicationsForReview(
    page = 1,
    limit = 10,
    status?: string,
  ): Promise<VerificationReviewListDto> {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      biometricCompleted: true, // Only applications with completed biometrics
      status: {
        in: [
          SubmissionStatus.SUBMITTED,
          SubmissionStatus.UNDER_REVIEW,
          SubmissionStatus.PENDING_BIOMETRICS,
        ],
      },
    };

    if (status) {
      where.status = status;
    }

    // Get applications with all related data
    const [applications, total] = await Promise.all([
      this.prisma.formSubmission.findMany({
        where,
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
          biometricData: {
            include: {
              fingerprintFingers: {
                orderBy: {
                  fingerPosition: 'asc',
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
                },
              },
            },
          },
          responses: {
            include: {
              field: {
                include: {
                  group: {
                    include: {
                      section: {
                        select: {
                          title: true,
                          order: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: [
              {
                field: {
                  group: {
                    section: {
                      order: 'asc',
                    },
                  },
                },
              },
              {
                field: {
                  group: {
                    order: 'asc',
                  },
                },
              },
              {
                field: {
                  order: 'asc',
                },
              },
            ],
          },
        },
        orderBy: {
          submittedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.formSubmission.count({ where }),
    ]);

    // Map to DTO
    const mappedApplications: ApplicationReviewDto[] = applications.map(
      (submission) => {
        const ninVerification = submission.user.ninVerifications?.[0];
        const biometricData = submission.biometricData?.[0];

        return {
          referenceNumber: submission.referenceNumber,
          submissionId: submission.id,
          status: submission.status,
          submittedAt: submission.submittedAt?.toISOString(),
          applicant: {
            id: submission.user.id,
            firstName: submission.user.firstName,
            lastName: submission.user.lastName,
            email: submission.user.email,
            phone: submission.user.phone,
            nin: submission.user.nin,
            dateOfBirth: submission.user.dateOfBirth?.toISOString(),
            gender: submission.user.gender,
            state: submission.user.state,
            lga: submission.user.lga,
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
          formResponses: this.transformFormResponses(
            submission.responses || [],
          ),
          ninVerification: ninVerification
            ? {
                id: ninVerification.id,
                nin: ninVerification.nin,
                firstName: ninVerification.firstName,
                lastName: ninVerification.lastName,
                fullName: ninVerification.fullName,
                dateOfBirth: ninVerification.dateOfBirth?.toISOString(),
                gender: ninVerification.gender,
                phoneNumber: ninVerification.phoneNumber,
                photo: ninVerification.photo,
                verificationStatus: ninVerification.verificationStatus,
                verificationDate:
                  ninVerification.verificationDate?.toISOString(),
                address: {
                  line1: ninVerification.addressLine1,
                  city: ninVerification.city,
                  state: ninVerification.state,
                  lga: ninVerification.lga,
                  country: ninVerification.country,
                },
              }
            : null,
          biometricData: biometricData
            ? {
                id: biometricData.id,
                photoUrl: biometricData.photoUrl,
                photoQualityScore: biometricData.photoQualityScore,
                fingerprintQualityScore: biometricData.fingerprintQualityScore,
                overallQualityScore: biometricData.overallQualityScore,
                isVerified: biometricData.isVerified,
                verificationStatus: biometricData.verificationStatus,
                capturedAt: biometricData.capturedAt?.toISOString(),
                capturedBy: biometricData.capturedBy,
                captureDevice: biometricData.captureDevice,
                fingerprintFingers:
                  biometricData.fingerprintFingers?.map((finger) => ({
                    fingerPosition: finger.fingerPosition,
                    fingerName: finger.fingerName,
                    qualityScore: finger.qualityScore,
                    isAcceptable: finger.isAcceptable,
                    capturedAt: finger.capturedAt?.toISOString(),
                  })) || [],
              }
            : null,
          userProfilePhoto: submission.user.avatar,
          appointment: submission.appointment
            ? {
                id: submission.appointment.id,
                appointmentDate:
                  submission.appointment.appointmentDate?.toISOString(),
                center: {
                  name: submission.appointment.center.name,
                  address: submission.appointment.center.address,
                  city: submission.appointment.center.city,
                  state: submission.appointment.center.state,
                },
                status: submission.appointment.status,
              }
            : null,
        };
      },
    );

    return {
      applications: mappedApplications,
      total,
      page,
      limit,
    };
  }

  /**
   * Get detailed application for review by submission ID
   */
  async getApplicationForReview(
    submissionId: string,
  ): Promise<ApplicationReviewDto> {
    const submission = await this.prisma.formSubmission.findUnique({
      where: { id: submissionId },
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
        biometricData: {
          include: {
            fingerprintFingers: {
              orderBy: {
                fingerPosition: 'asc',
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
              },
            },
          },
        },
        responses: {
          include: {
            field: {
              include: {
                group: {
                  include: {
                    section: {
                      select: {
                        title: true,
                        order: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: [
            {
              field: {
                group: {
                  section: {
                    order: 'asc',
                  },
                },
              },
            },
            {
              field: {
                group: {
                  order: 'asc',
                },
              },
            },
            {
              field: {
                order: 'asc',
              },
            },
          ],
        },
      },
    });

    if (!submission) {
      throw new Error('Application not found');
    }

    const ninVerification = submission.user.ninVerifications?.[0];
    const biometricData = submission.biometricData?.[0];

    return {
      referenceNumber: submission.referenceNumber,
      submissionId: submission.id,
      status: submission.status,
      submittedAt: submission.submittedAt?.toISOString(),
      applicant: {
        id: submission.user.id,
        firstName: submission.user.firstName,
        lastName: submission.user.lastName,
        email: submission.user.email,
        phone: submission.user.phone,
        nin: submission.user.nin,
        dateOfBirth: submission.user.dateOfBirth?.toISOString(),
        gender: submission.user.gender,
        state: submission.user.state,
        lga: submission.user.lga,
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
      formResponses: this.transformFormResponses(submission.responses || []),
      ninVerification: ninVerification
        ? {
            id: ninVerification.id,
            nin: ninVerification.nin,
            firstName: ninVerification.firstName,
            lastName: ninVerification.lastName,
            fullName: ninVerification.fullName,
            dateOfBirth: ninVerification.dateOfBirth?.toISOString(),
            gender: ninVerification.gender,
            phoneNumber: ninVerification.phoneNumber,
            photo: ninVerification.photo,
            verificationStatus: ninVerification.verificationStatus,
            verificationDate: ninVerification.verificationDate?.toISOString(),
            address: {
              line1: ninVerification.addressLine1,
              city: ninVerification.city,
              state: ninVerification.state,
              lga: ninVerification.lga,
              country: ninVerification.country,
            },
          }
        : null,
      biometricData: biometricData
        ? {
            id: biometricData.id,
            photoUrl: biometricData.photoUrl,
            photoQualityScore: biometricData.photoQualityScore,
            fingerprintQualityScore: biometricData.fingerprintQualityScore,
            overallQualityScore: biometricData.overallQualityScore,
            isVerified: biometricData.isVerified,
            verificationStatus: biometricData.verificationStatus,
            capturedAt: biometricData.capturedAt?.toISOString(),
            capturedBy: biometricData.capturedBy,
            captureDevice: biometricData.captureDevice,
            fingerprintFingers:
              biometricData.fingerprintFingers?.map((finger) => ({
                fingerPosition: finger.fingerPosition,
                fingerName: finger.fingerName,
                qualityScore: finger.qualityScore,
                isAcceptable: finger.isAcceptable,
                capturedAt: finger.capturedAt?.toISOString(),
              })) || [],
          }
        : null,
      userProfilePhoto: submission.user.avatar,
      appointment: submission.appointment
        ? {
            id: submission.appointment.id,
            appointmentDate:
              submission.appointment.appointmentDate?.toISOString(),
            center: {
              name: submission.appointment.center.name,
              address: submission.appointment.center.address,
              city: submission.appointment.center.city,
              state: submission.appointment.center.state,
            },
            status: submission.appointment.status,
          }
        : null,
    };
  }

  /**
   * Flag application and send to security department
   */
  async flagApplication(
    flagDto: FlagApplicationDto,
    reviewerId: string,
  ): Promise<{ success: boolean; message: string }> {
    const { submissionId, targetDepartment, flagReason, notes } = flagDto;

    // Update submission with flagged status
    await this.prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.FLAGGED,
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        reviewNotes: notes,
        metadata: {
          action: 'FLAGGED',
          targetDepartment,
          flagReason,
          reviewedBy: reviewerId,
          reviewedAt: new Date().toISOString(),
          ...(notes && { notes }),
        },
        statusLogs: {
          create: {
            fromStatus: SubmissionStatus.UNDER_REVIEW, // Assuming it was under review
            toStatus: SubmissionStatus.FLAGGED,
            reason: 'Application flagged for security review',
            notes: `Flagged to ${targetDepartment}: ${flagReason}`,
            changedBy: reviewerId,
          },
        },
      },
    });

    // Update biometric data verification status if exists
    const biometricData = await this.prisma.biometricData.findFirst({
      where: { submissionId },
    });

    if (biometricData) {
      await this.prisma.biometricData.update({
        where: { id: biometricData.id },
        data: {
          verificationStatus: 'FLAGGED',
          verificationNotes: `Flagged to ${targetDepartment}: ${flagReason}`,
          lastModifiedBy: reviewerId,
        },
      });
    }

    this.logger.log(
      `Application ${submissionId} flagged to ${targetDepartment} by ${reviewerId}`,
    );

    return {
      success: true,
      message: `Application flagged and sent to ${targetDepartment} successfully`,
    };
  }

  /**
   * Query application and request more information
   */
  async queryApplication(
    queryDto: QueryApplicationDto,
    reviewerId: string,
  ): Promise<{ success: boolean; message: string }> {
    const { submissionId, queryMessage, requiredDocuments, notes } = queryDto;

    // Get submission with user details for email notification
    const submission = await this.prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        form: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!submission?.user) {
      throw new Error('Submission or user not found');
    }

    // Update submission with queried status
    await this.prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.QUERIED,
        isQueried: true,
        queryMessage,
        queriedAt: new Date(),
        queriedBy: reviewerId,
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        reviewNotes: notes,
        metadata: {
          action: 'QUERIED',
          requiredDocuments: requiredDocuments || [],
          reviewedAt: new Date().toISOString(),
        },
        statusLogs: {
          create: {
            fromStatus: submission.status,
            toStatus: SubmissionStatus.QUERIED,
            reason: 'Application queried for additional information',
            notes: `Query: ${queryMessage}${
              requiredDocuments && requiredDocuments.length > 0
                ? ` - Required documents: ${requiredDocuments.join(', ')}`
                : ''
            }`,
            changedBy: reviewerId,
          },
        },
      },
    });

    // Update biometric data verification status if exists
    const biometricData = await this.prisma.biometricData.findFirst({
      where: { submissionId },
    });

    if (biometricData) {
      await this.prisma.biometricData.update({
        where: { id: biometricData.id },
        data: {
          verificationStatus: 'NEEDS_REVIEW',
          verificationNotes: `Query: ${queryMessage}${
            requiredDocuments && requiredDocuments.length > 0
              ? ` - Required: ${requiredDocuments.join(', ')}`
              : ''
          }`,
          lastModifiedBy: reviewerId,
        },
      });
    }

    // Send email notification to applicant
    try {
      const userName =
        submission.user.firstName && submission.user.lastName
          ? `${submission.user.firstName} ${submission.user.lastName}`
          : submission.user.firstName || submission.user.email.split('@')[0];

      const siteUrl = process.env.SITE_URL || 'http://localhost:3000';
      const applicationUrl = `${siteUrl}/applications/${submissionId}/edit`;

      const emailData: ApplicationQueryData = {
        userName,
        userEmail: submission.user.email,
        referenceNumber: submission.referenceNumber || 'N/A',
        queryMessage,
        requiredDocuments: requiredDocuments || [],
        queryDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        applicationUrl,
      };

      await this.mailService.sendApplicationQueryNotification(emailData);
      this.logger.log(
        `Application query email sent to ${submission.user.email}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send application query email: ${error.message}`,
      );
      // Don't fail the entire operation if email fails
    }

    this.logger.log(
      `Application ${submissionId} queried by ${reviewerId}: ${queryMessage}`,
    );

    return {
      success: true,
      message: 'Application queried and notification sent to applicant',
    };
  }

  /**
   * Send application to embassy for processing
   */
  async processApplication(
    processDto: ProcessApplicationDto,
    reviewerId: string,
  ): Promise<{ success: boolean; message: string }> {
    const { submissionId, processingNotes, priority = 'NORMAL' } = processDto;

    // Update submission with processing status
    await this.prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        status: SubmissionStatus.PROCESSING,
        reviewedAt: new Date(),
        reviewedBy: reviewerId,
        reviewNotes: processingNotes,
        metadata: {
          action: 'PROCESSING',
          priority,
          reviewedBy: reviewerId,
          reviewedAt: new Date().toISOString(),
          sentToEmbassy: true,
          ...(processingNotes && { processingNotes }),
        },
        statusLogs: {
          create: {
            fromStatus: SubmissionStatus.UNDER_REVIEW, // Assuming it was under review
            toStatus: SubmissionStatus.PROCESSING,
            reason: 'Application verified and sent to embassy for processing',
            notes: `Priority: ${priority}${
              processingNotes ? ` - ${processingNotes}` : ''
            }`,
            changedBy: reviewerId,
          },
        },
      },
    });

    // Update biometric data verification status if exists
    const biometricData = await this.prisma.biometricData.findFirst({
      where: { submissionId },
    });

    if (biometricData) {
      await this.prisma.biometricData.update({
        where: { id: biometricData.id },
        data: {
          isVerified: true,
          verificationStatus: 'VERIFIED',
          verificationNotes: `Verified and sent to embassy for processing (Priority: ${priority})`,
          lastModifiedBy: reviewerId,
        },
      });
    }

    this.logger.log(
      `Application ${submissionId} sent to embassy by ${reviewerId} (Priority: ${priority})`,
    );

    return {
      success: true,
      message: `Application verified and sent to embassy for processing (Priority: ${priority})`,
    };
  }

  /**
   * Get verification statistics
   */
  async getVerificationStats(): Promise<VerificationStatsDto> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingReview, flaggedToday, queriedToday, processingToday] =
      await Promise.all([
        // Pending review count
        this.prisma.formSubmission.count({
          where: {
            biometricCompleted: true,
            status: {
              in: [
                SubmissionStatus.SUBMITTED,
                SubmissionStatus.UNDER_REVIEW,
                SubmissionStatus.PENDING_BIOMETRICS,
              ],
            },
          },
        }),

        // Flagged today count
        this.prisma.formSubmission.count({
          where: {
            biometricCompleted: true,
            reviewedAt: {
              gte: today,
            },
            status: SubmissionStatus.FLAGGED,
          },
        }),

        // Queried today count
        this.prisma.formSubmission.count({
          where: {
            biometricCompleted: true,
            reviewedAt: {
              gte: today,
            },
            status: SubmissionStatus.QUERIED,
          },
        }),

        // Processing today count
        this.prisma.formSubmission.count({
          where: {
            biometricCompleted: true,
            reviewedAt: {
              gte: today,
            },
            status: SubmissionStatus.PROCESSING,
          },
        }),
      ]);

    // Calculate average verification time (simplified)
    const averageVerificationTime = 15; // Placeholder - would need more complex calculation

    return {
      pendingReview,
      flaggedToday,
      queriedToday,
      processingToday,
      averageVerificationTime,
    };
  }
}
