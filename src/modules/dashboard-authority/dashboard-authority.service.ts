import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { SubmissionStatus, TravelAgentLicenseStatus, TravelAgentApplicationType } from '@prisma/client';
import { PrivacyService } from '@common/services/privacy.service';
import {
  AuthorityApplicationListDto,
  AuthorityApplicationDetailDto,
  AuthorityStatsDto,
  AuthorityApplicationFiltersDto,
  AuthorityApplicationQueryDto,
} from './dto/authority-dashboard.dto';

@Injectable()
export class DashboardAuthorityService {
  private readonly logger = new Logger(DashboardAuthorityService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all applications in the system with filtering and pagination
   */
  async getAllApplications(
    filters: AuthorityApplicationFiltersDto,
    query: AuthorityApplicationQueryDto,
  ): Promise<AuthorityApplicationListDto> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'submittedAt',
      sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    // CRITICAL: Apply privacy protection - exclude private statuses
    // Authorities should never see draft, pending payment, or cancelled applications
    const privacyWhere = PrivacyService.createPrivacyProtectedWhereClause(
      filters.status,
    );
    Object.assign(where, privacyWhere);

    if (filters.countryId || filters.formType) {
      where.form = {};
      if (filters.countryId) {
        where.form.countryId = filters.countryId;
      }
      if (filters.formType) {
        where.form.name = { contains: filters.formType, mode: 'insensitive' };
      }
    }

    if (filters.startDate || filters.endDate) {
      where.submittedAt = {};
      if (filters.startDate) {
        // Start of day for start date
        const startDate = new Date(filters.startDate);
        if (!isNaN(startDate.getTime())) {
          startDate.setHours(0, 0, 0, 0);
          where.submittedAt.gte = startDate;
        }
      }
      if (filters.endDate) {
        // End of day for end date to include the entire day
        const endDate = new Date(filters.endDate);
        if (!isNaN(endDate.getTime())) {
          endDate.setHours(23, 59, 59, 999);
          where.submittedAt.lte = endDate;
        }
      }
    }

    if (filters.search) {
      where.OR = [
        { referenceNumber: { contains: filters.search, mode: 'insensitive' } },
        {
          user: {
            firstName: { contains: filters.search, mode: 'insensitive' },
          },
        },
        {
          user: { lastName: { contains: filters.search, mode: 'insensitive' } },
        },
        { user: { email: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    // Get applications with all related data
    const [applications, total] = await Promise.all([
      this.prisma.formSubmission.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              nin: true,
              country: {
                select: {
                  name: true,
                  isoCode2: true,
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
                },
              },
            },
          },
          payment: {
            select: {
              amount: true,
              currency: true,
              status: true,
            },
          },
          appointment: {
            include: {
              center: {
                select: {
                  name: true,
                },
              },
            },
          },
          biometricData: {
            select: {
              isVerified: true,
              capturedAt: true,
            },
          },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.formSubmission.count({ where }),
    ]);

    // Map to DTO
    const mappedApplications = applications.map((submission) => ({
      referenceNumber: submission.referenceNumber,
      submissionId: submission.id,
      status: submission.status,
      submittedAt: submission.submittedAt?.toISOString(),
      applicant: {
        id: submission.user.id,
        firstName: submission.user.firstName,
        lastName: submission.user.lastName,
        email: submission.user.email,
        nin: submission.user.nin,
        country: submission.user.country?.name || 'Unknown',
      },
      form: {
        id: submission.form.id,
        name: submission.form.name,
        country: {
          name: submission.form.country.name,
          isoCode2: submission.form.country.isoCode2,
          isoCode3: submission.form.country.isoCode3,
        },
      },
      payment: {
        amount: submission.payment?.amount || 0,
        currency: submission.payment?.currency || 'NGN',
        status: submission.payment?.status || 'PENDING',
      },
      appointment: submission.appointment
        ? {
          appointmentTime:
            submission.appointment.appointmentTime?.toISOString(),
          center: submission.appointment.center.name,
          status: submission.appointment.status,
        }
        : null,
      biometrics: {
        captured: !!submission.biometricData,
        capturedAt: submission.biometricData?.capturedAt?.toISOString() || null,
        verified: submission.biometricData?.isVerified || false,
      },
    }));

    return {
      applications: mappedApplications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get detailed application information
   */
  async getApplicationDetail(
    submissionId: string,
  ): Promise<AuthorityApplicationDetailDto> {
    const submission = await this.prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: {
          include: {
            country: {
              select: {
                name: true,
                isoCode2: true,
              },
            },
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
              },
            },
          },
        },
        payment: {
          select: {
            amount: true,
            currency: true,
            status: true,
          },
        },
        appointment: {
          include: {
            center: {
              select: {
                name: true,
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
        statusLogs: {
          orderBy: {
            changedAt: 'desc',
          },
        },
        flags: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!submission) {
      throw new Error('Application not found');
    }

    const ninVerification = submission.user.ninVerifications?.[0];

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
        nin: submission.user.nin,
        country: submission.user.country?.name || 'Unknown',
      },
      form: {
        id: submission.form.id,
        name: submission.form.name,
        country: {
          name: submission.form.country.name,
          isoCode2: submission.form.country.isoCode2,
          isoCode3: submission.form.country.isoCode3,
        },
      },
      payment: {
        amount: submission.payment?.amount || 0,
        currency: submission.payment?.currency || 'NGN',
        status: submission.payment?.status || 'PENDING',
      },
      appointment: submission.appointment
        ? {
          appointmentTime:
            submission.appointment.appointmentTime?.toISOString(),
          center: submission.appointment.center.name,
          status: submission.appointment.status,
        }
        : null,
      biometrics: {
        captured: !!submission.biometricData,
        capturedAt: submission.biometricData?.capturedAt?.toISOString() || null,
        verified: submission.biometricData?.isVerified || false,
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
      biometricData: submission.biometricData
        ? {
          id: submission.biometricData.id,
          photoUrl: submission.biometricData.photoUrl,
          photoQualityScore: submission.biometricData.photoQualityScore,
          isVerified: submission.biometricData.isVerified,
          verificationStatus: submission.biometricData.verificationStatus,
          capturedAt: submission.biometricData.capturedAt?.toISOString(),
          capturedBy: submission.biometricData.capturedBy,
          captureDevice: submission.biometricData.captureDevice,
          fingerprintCount:
            submission.biometricData.fingerprintFingers?.length || 0,
          fingerprintQualitySummary: this.calculateFingerprintQualitySummary(
            submission.biometricData.fingerprintFingers || [],
          ),
        }
        : null,
      statusHistory: submission.statusLogs.map((log) => ({
        fromStatus: log.fromStatus,
        toStatus: log.toStatus,
        changedAt: log.changedAt.toISOString(),
        changedBy: log.changedBy,
        reason: log.reason,
        notes: log.notes,
      })),
      flags: submission.flags.map((flag) => ({
        flagType: flag.flagType,
        priority: flag.priorityLevel,
        reason: flag.reason,
        status: flag.status,
        createdAt: flag.createdAt.toISOString(),
        createdBy: flag.createdById,
      })),
      queries: [], // TODO: Implement queries if needed
    };
  }

  /**
   * Get comprehensive analytics and statistics
   */
  async getAnalyticsStats(): Promise<AuthorityStatsDto> {
    const [
      totalApplications,
      applicationsByStatus,
      applicationsByCountry,
      applicationsByVisaType,
      applicationsByYear,
      applicationsByMonth,
      revenueStats,
      processingStats,
      travelAgentStats,
    ] = await Promise.all([
      this.getTotalApplications(),
      this.getApplicationsByStatus(),
      this.getApplicationsByCountry(),
      this.getApplicationsByVisaType(),
      this.getApplicationsByYear(),
      this.getApplicationsByMonth(),
      this.getRevenueStats(),
      this.getProcessingStats(),
      this.getTravelAgentStats(),
    ]);

    return {
      totalApplications,
      applicationsByStatus,
      applicationsByCountry,
      applicationsByVisaType,
      applicationsByYear,
      applicationsByMonth,
      revenue: revenueStats,
      processing: processingStats,
      travelAgents: travelAgentStats,
    };
  }

  private async getTotalApplications(): Promise<number> {
    return this.prisma.formSubmission.count();
  }

  private async getApplicationsByStatus(): Promise<Record<string, number>> {
    const results = await this.prisma.formSubmission.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    return results.reduce((acc, item) => {
      acc[item.status] = item._count.status;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getApplicationsByCountry(): Promise<
    Array<{
      country: string;
      countryCode: string;
      count: number;
      percentage: number;
    }>
  > {
    const results = await this.prisma.formSubmission.groupBy({
      by: ['formId'],
      _count: { formId: true },
    });

    const total = await this.prisma.formSubmission.count();

    const countryStats = await Promise.all(
      results.map(async (result) => {
        const form = await this.prisma.dynamicForm.findUnique({
          where: { id: result.formId },
          include: {
            country: {
              select: {
                name: true,
                isoCode2: true,
              },
            },
          },
        });

        return {
          country: form?.country?.name || 'Unknown',
          countryCode: form?.country?.isoCode2 || 'XX',
          count: result._count.formId,
          percentage: Math.round((result._count.formId / total) * 100),
        };
      }),
    );

    return countryStats.sort((a, b) => b.count - a.count);
  }

  private async getApplicationsByVisaType(): Promise<
    Array<{ visaType: string; count: number; percentage: number }>
  > {
    const results = await this.prisma.formSubmission.groupBy({
      by: ['formId'],
      _count: { formId: true },
    });

    const total = await this.prisma.formSubmission.count();

    const visaTypeStats = await Promise.all(
      results.map(async (result) => {
        const form = await this.prisma.dynamicForm.findUnique({
          where: { id: result.formId },
          select: { name: true },
        });

        return {
          visaType: form?.name || 'Unknown',
          count: result._count.formId,
          percentage: Math.round((result._count.formId / total) * 100),
        };
      }),
    );

    return visaTypeStats.sort((a, b) => b.count - a.count);
  }

  private async getApplicationsByYear(): Promise<
    Array<{ year: number; count: number; percentage: number }>
  > {
    const results = await this.prisma.$queryRaw<
      Array<{ year: number; count: bigint }>
    >`
      SELECT 
        EXTRACT(YEAR FROM "submittedAt") as year,
        COUNT(*) as count
      FROM "form_submissions"
      WHERE "submittedAt" IS NOT NULL
      GROUP BY EXTRACT(YEAR FROM "submittedAt")
      ORDER BY year DESC
    `;

    const total = await this.prisma.formSubmission.count();

    return results.map((result) => ({
      year: result.year,
      count: Number(result.count),
      percentage: Math.round((Number(result.count) / total) * 100),
    }));
  }

  private async getApplicationsByMonth(): Promise<
    Array<{ month: string; monthNumber: number; count: number }>
  > {
    const currentYear = new Date().getFullYear();
    const results = await this.prisma.$queryRaw<
      Array<{ month: number; count: bigint }>
    >`
      SELECT 
        EXTRACT(MONTH FROM "submittedAt") as month,
        COUNT(*) as count
      FROM "form_submissions"
      WHERE "submittedAt" IS NOT NULL
        AND EXTRACT(YEAR FROM "submittedAt") = ${currentYear}
      GROUP BY EXTRACT(MONTH FROM "submittedAt")
      ORDER BY month ASC
    `;

    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    return results.map((result) => ({
      month: monthNames[result.month - 1],
      monthNumber: result.month,
      count: Number(result.count),
    }));
  }

  private async getRevenueStats(): Promise<{
    totalRevenue: number;
    currency: string;
    averageApplicationValue: number;
    revenueByCountry: Array<{
      country: string;
      countryCode: string;
      revenue: number;
      percentage: number;
    }>;
  }> {
    const paymentStats = await this.prisma.payment.aggregate({
      _sum: { amount: true },
      _avg: { amount: true },
      where: { status: 'COMPLETED' },
    });

    const totalRevenue = Number(paymentStats._sum.amount || 0);
    const averageApplicationValue = Number(paymentStats._avg.amount || 0);

    // Get revenue by country
    const revenueByCountry = await this.prisma.$queryRaw<
      Array<{
        country: string;
        countryCode: string;
        revenue: bigint;
      }>
    >`
      SELECT 
        c.name as country,
        c."isoCode2" as "countryCode",
        SUM(p.amount) as revenue
      FROM "payments" p
      JOIN "form_submissions" fs ON p."submissionId" = fs.id
      JOIN "dynamic_forms" f ON fs."formId" = f.id
      JOIN "countries" c ON f."countryId" = c.id
      WHERE p.status = 'COMPLETED'
      GROUP BY c.id, c.name, c."isoCode2"
      ORDER BY revenue DESC
    `;

    const revenueByCountryWithPercentage = revenueByCountry.map((item) => ({
      country: item.country,
      countryCode: item.countryCode,
      revenue: Number(item.revenue),
      percentage:
        totalRevenue > 0
          ? Math.round((Number(item.revenue) / totalRevenue) * 100)
          : 0,
    }));

    return {
      totalRevenue,
      currency: 'NGN', // Default currency
      averageApplicationValue,
      revenueByCountry: revenueByCountryWithPercentage,
    };
  }

  private async getProcessingStats(): Promise<{
    averageProcessingTime: number;
    completionRate: number;
    rejectionRate: number;
  }> {
    // Calculate average processing time (simplified)
    const completedApplications = await this.prisma.formSubmission.count({
      where: {
        status: { in: [SubmissionStatus.APPROVED, SubmissionStatus.REJECTED] },
      },
    });

    const totalApplications = await this.prisma.formSubmission.count();
    const approvedApplications = await this.prisma.formSubmission.count({
      where: { status: SubmissionStatus.APPROVED },
    });
    const rejectedApplications = await this.prisma.formSubmission.count({
      where: { status: SubmissionStatus.REJECTED },
    });

    return {
      averageProcessingTime: 15, // Placeholder - would need more complex calculation
      completionRate:
        totalApplications > 0
          ? Math.round((completedApplications / totalApplications) * 100)
          : 0,
      rejectionRate:
        totalApplications > 0
          ? Math.round((rejectedApplications / totalApplications) * 100)
          : 0,
    };
  }

  /**
   * Transform form responses into hierarchical structure
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

      // Create field object
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

    if (response.field.type === 'EMAIL' && response.value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(response.value) ? 'valid' : 'invalid';
    }

    return 'valid';
  }

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

  private calculateFingerprintQualitySummary(fingerprintFingers: any[]): {
    averageQuality: number;
    acceptableFingers: number;
    totalFingers: number;
  } {
    if (!fingerprintFingers || fingerprintFingers.length === 0) {
      return {
        averageQuality: 0,
        acceptableFingers: 0,
        totalFingers: 0,
      };
    }

    const totalFingers = fingerprintFingers.length;
    const acceptableFingers = fingerprintFingers.filter(
      (finger) => finger.isAcceptable,
    ).length;
    const averageQuality =
      fingerprintFingers.reduce(
        (sum, finger) => sum + (finger.qualityScore || 0),
        0,
      ) / totalFingers;

    return {
      averageQuality: Math.round(averageQuality),
      acceptableFingers,
      totalFingers,
    };
  }

  /**
   * Get travel agent statistics
   */
  private async getTravelAgentStats(): Promise<{
    nahconRegistered: number;
    regularTravelAgent: number;
    total: number;
  }> {
    // Count NAHCON registered agents (users with active licenses and NAHCON license type)
    const nahconRegistered = await this.prisma.travelAgentLicense.count({
      where: {
        status: TravelAgentLicenseStatus.ACTIVE,
        licenseType: TravelAgentApplicationType.NAHCON_REGISTERED_AGENT,
      },
    });

    // Count regular travel agents (users with active licenses and regular license type)
    const regularTravelAgent = await this.prisma.travelAgentLicense.count({
      where: {
        status: TravelAgentLicenseStatus.ACTIVE,
        licenseType: TravelAgentApplicationType.REGULAR_TRAVEL_AGENT,
      },
    });

    return {
      nahconRegistered,
      regularTravelAgent,
      total: nahconRegistered + regularTravelAgent,
    };
  }
}
