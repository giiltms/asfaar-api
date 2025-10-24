import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { PaymentsService } from '@modules/payments/payments.service';
import { LicenseNumberService } from '@common/services/license-number.service';
import { TravelAgentLicenseService } from './travel-agent-license.service';
import { UploadUpgradeDocumentDto } from './dto/upgrade.dto';
import {
  UpgradeApplicationStatus,
  TravelAgentApplicationType,
  FeeType,
  PaymentStatus,
  Roles,
  Currency,
  TravelAgentLicenseStatus,
} from '@prisma/client';

export interface CreateDraftApplicationInput {
  applicationType: TravelAgentApplicationType;
  companyName?: string;
  companyEmail?: string;
  companyPhone?: string;
  cacNumber?: string;
  tinNumber?: string;
  nahconLicenseNumber?: string;
  dssClearanceNumber?: string;
  efccScumlNumber?: string;
  iataAccreditationNumber?: string;
  nantaMembershipNumber?: string;
}

export interface CompleteApplicationInput {
  applicationType: TravelAgentApplicationType;
  cacNumber: string;
  tinNumber: string;
  nahconLicenseNumber?: string;
  dssClearanceNumber: string;
  efccScumlNumber: string;
  iataAccreditationNumber?: string;
  nantaMembershipNumber?: string;
  bankDetails: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
  };
  directors: Array<{
    nin: string;
    dateOfBirth: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    phoneNumber?: string;
    email?: string;
  }>;
}

export interface CreateUpgradeApplicationInput {
  applicationType: TravelAgentApplicationType;
  companyName: string;
  companyEmail: string;
  companyPhone: string;
  cacNumber: string;
  tinNumber: string;
  nahconLicenseNumber?: string;
  dssClearanceNumber: string;
  efccScumlNumber: string;
  iataAccreditationNumber?: string;
  nantaMembershipNumber?: string;
  bankDetails: {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
  };
  directors: Array<{
    nin: string;
    dateOfBirth: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    phoneNumber?: string;
    email?: string;
  }>;
  serviceFeeId: string;
  paymentMethodId: string;
}

@Injectable()
export class TravelAgentUpgradeService {
  constructor(private readonly prisma: PrismaService) {}

  async createDraftApplication(
    userId: string,
    input: CreateDraftApplicationInput,
  ) {
    // Check if user has an active application with the same application type
    const activeStatuses = [
      UpgradeApplicationStatus.DRAFT,
      UpgradeApplicationStatus.PENDING,
      UpgradeApplicationStatus.PENDING_PAYMENT,
      UpgradeApplicationStatus.PENDING_REVIEW,
      UpgradeApplicationStatus.UNDER_REVIEW,
    ];

    const existingActiveApp =
      await this.prisma.travelAgentUpgradeApplication.findFirst({
        where: {
          userId,
          applicationType: input.applicationType,
          status: { in: activeStatuses },
        },
        include: {
          bankDetails: true,
          directors: true,
          payment: true,
        },
      });

    if (existingActiveApp) {
      // Return existing active application of the same type for continuation
      return {
        application: existingActiveApp,
        isExisting: true,
        message: `Existing ${input.applicationType
          .toLowerCase()
          .replace('_', ' ')} application retrieved`,
      };
    }

    const application = await this.prisma.travelAgentUpgradeApplication.create({
      data: {
        userId,
        status: UpgradeApplicationStatus.DRAFT,
        applicationType: input.applicationType,
        companyName: input.companyName || '',
        companyEmail: input.companyEmail || '',
        companyPhone: input.companyPhone || '',
        cacNumber: input.cacNumber || '',
        tinNumber: input.tinNumber || '',
        nahconLicenseNumber: input.nahconLicenseNumber || '',
        dssClearanceNumber: input.dssClearanceNumber || '',
        efccScumlNumber: input.efccScumlNumber || '',
        iataAccreditationNumber: input.iataAccreditationNumber,
        nantaMembershipNumber: input.nantaMembershipNumber,
      },
    });

    return {
      application,
      isExisting: false,
      message: 'Draft application created successfully',
    };
  }

  async completeApplication(
    userId: string,
    applicationId: string,
    input: CompleteApplicationInput,
  ) {
    // Verify user owns the application and it's in DRAFT status
    const application =
      await this.prisma.travelAgentUpgradeApplication.findFirst({
        where: {
          id: applicationId,
          userId,
          status: UpgradeApplicationStatus.DRAFT,
        },
      });

    if (!application) {
      throw new NotFoundException('Draft application not found');
    }

    // Validate NAHCON license number is provided for NAHCON applications
    if (
      input.applicationType ===
      TravelAgentApplicationType.NAHCON_REGISTERED_AGENT &&
      !input.nahconLicenseNumber
    ) {
      throw new BadRequestException(
        'NAHCON license number is required for NAHCON registered agent applications',
      );
    }

    // Validate required documents are uploaded
    const uploadedDocuments =
      await this.prisma.travelAgentUpgradeApplication.findUnique({
        where: { id: applicationId },
        select: {
          cacDocumentUrl: true,
          taxClearanceDocumentUrl: true,
          nahconDocumentUrl: true,
          efccScumlDocumentUrl: true,
        },
      });

    const missingDocuments = [];
    if (!uploadedDocuments.cacDocumentUrl)
      missingDocuments.push('CAC Document');
    if (!uploadedDocuments.taxClearanceDocumentUrl)
      missingDocuments.push('Tax Clearance Certificate');

    // NAHCON document only required for NAHCON registered agents
    if (
      input.applicationType ===
      TravelAgentApplicationType.NAHCON_REGISTERED_AGENT &&
      !uploadedDocuments.nahconDocumentUrl
    )
      missingDocuments.push('NAHCON Document');

    if (!uploadedDocuments.efccScumlDocumentUrl)
      missingDocuments.push('EFCC SCUML Document');

    if (missingDocuments.length > 0) {
      throw new BadRequestException(
        `Missing required documents: ${missingDocuments.join(', ')}`,
      );
    }

    // Update application with complete information
    const updatedApplication =
      await this.prisma.travelAgentUpgradeApplication.update({
        where: { id: applicationId },
        data: {
          status: UpgradeApplicationStatus.PENDING,
          applicationType: input.applicationType,
          cacNumber: input.cacNumber,
          tinNumber: input.tinNumber,
          nahconLicenseNumber: input.nahconLicenseNumber || '',
          dssClearanceNumber: input.dssClearanceNumber,
          efccScumlNumber: input.efccScumlNumber,
          iataAccreditationNumber: input.iataAccreditationNumber,
          nantaMembershipNumber: input.nantaMembershipNumber,
          bankDetails: {
            create: {
              bankName: input.bankDetails.bankName,
              bankCode: input.bankDetails.bankCode,
              accountNumber: input.bankDetails.accountNumber,
              accountName: input.bankDetails.accountName,
            },
          },
          directors: {
            createMany: {
              data: input.directors.map((d) => ({
                nin: d.nin,
                dateOfBirth: new Date(d.dateOfBirth),
                firstName: d.firstName,
                lastName: d.lastName,
                middleName: d.middleName,
                phoneNumber: d.phoneNumber,
                email: d.email,
              })),
            },
          },
        },
        include: { bankDetails: true, directors: true },
      });

    return { application: updatedApplication };
  }

  /**
   * Handle payment webhook for travel agent upgrade applications
   * Called by the main payments webhook when payment is successful
   */
  async handlePaymentWebhook(
    paymentId: string,
    paymentStatus: PaymentStatus,
    metadata: any,
  ) {
    // Extract application ID from metadata
    const applicationId =
      metadata?.upgradeApplicationId || metadata?.applicationId;

    if (!applicationId) {
      throw new BadRequestException(
        'Application ID not found in payment metadata',
      );
    }

    // Find the application
    const application =
      await this.prisma.travelAgentUpgradeApplication.findUnique({
        where: { id: applicationId },
        include: { user: true },
      });

    if (!application) {
      throw new NotFoundException('Travel agent upgrade application not found');
    }

    // Update application based on payment status
    let newStatus: UpgradeApplicationStatus;

    switch (paymentStatus) {
      case PaymentStatus.COMPLETED:
        newStatus = UpgradeApplicationStatus.PENDING_REVIEW;
        break;
      case PaymentStatus.FAILED:
      case PaymentStatus.CANCELLED:
        newStatus = UpgradeApplicationStatus.PENDING; // Allow retry
        break;
      default:
        newStatus = UpgradeApplicationStatus.PENDING_PAYMENT;
    }

    // Update application with payment ID and status
    const updatedApplication =
      await this.prisma.travelAgentUpgradeApplication.update({
        where: { id: applicationId },
        data: {
          paymentId: paymentId,
          status: newStatus,
        },
        include: {
          user: true,
          payment: true,
          bankDetails: true,
          directors: true,
        },
      });

    // If payment is successful, we could trigger additional logic here:
    // - Send notification to admin for review
    // - Send confirmation email to user
    // - Log the payment completion

    return {
      success: true,
      application: updatedApplication,
      message: `Application status updated to ${newStatus}`,
    };
  }

  async createUpgradeApplication(
    userId: string,
    input: CreateUpgradeApplicationInput,
  ) {
    const serviceFee = await this.prisma.serviceFee.findUnique({
      where: { id: input.serviceFeeId },
    });
    if (!serviceFee || serviceFee.feeType !== FeeType.UPGRADE) {
      throw new BadRequestException(
        'Invalid service fee for travel agent upgrade',
      );
    }

    const application = await this.prisma.travelAgentUpgradeApplication.create({
      data: {
        userId,
        status: UpgradeApplicationStatus.PENDING,
        applicationType: input.applicationType,
        companyName: input.companyName,
        companyEmail: input.companyEmail,
        companyPhone: input.companyPhone,
        cacNumber: input.cacNumber,
        tinNumber: input.tinNumber,
        nahconLicenseNumber: input.nahconLicenseNumber,
        dssClearanceNumber: input.dssClearanceNumber,
        efccScumlNumber: input.efccScumlNumber,
        iataAccreditationNumber: input.iataAccreditationNumber,
        nantaMembershipNumber: input.nantaMembershipNumber,
        bankDetails: {
          create: {
            bankName: input.bankDetails.bankName,
            bankCode: input.bankDetails.bankCode,
            accountNumber: input.bankDetails.accountNumber,
            accountName: input.bankDetails.accountName,
          },
        },
        directors: {
          createMany: {
            data: input.directors.map((d) => ({
              nin: d.nin,
              dateOfBirth: new Date(d.dateOfBirth),
              firstName: d.firstName,
              lastName: d.lastName,
              middleName: d.middleName,
              phoneNumber: d.phoneNumber,
              email: d.email,
            })),
          },
        },
      },
      include: { bankDetails: true, directors: true },
    });

    return { application };
  }

  async approveApplication(
    applicationId: string,
    reviewerId: string,
    notes?: string,
  ) {
    const application =
      await this.prisma.travelAgentUpgradeApplication.findUnique({
        where: { id: applicationId },
        include: { user: true, bankDetails: true, directors: true },
      });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status !== UpgradeApplicationStatus.UNDER_REVIEW) {
      throw new BadRequestException('Application is not under review');
    }

    // Generate unique license number
    const licenseNumber = await this.generateLicenseNumber();

    // Create travel agent license
    const license = await this.prisma.travelAgentLicense.create({
      data: {
        userId: application.userId,
        licenseNumber,
        status: TravelAgentLicenseStatus.ACTIVE,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      },
    });

    // Update user role to AGENCY
    await this.prisma.user.update({
      where: { id: application.userId },
      data: { roles: { push: Roles.AGENCY } },
    });

    // Update application status
    const updatedApplication =
      await this.prisma.travelAgentUpgradeApplication.update({
        where: { id: applicationId },
        data: {
          status: UpgradeApplicationStatus.APPROVED,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewNotes: notes,
        },
        include: { user: true },
      });

    return { application: updatedApplication, license };
  }

  async rejectApplication(
    applicationId: string,
    reviewerId: string,
    reason: string,
  ) {
    const application =
      await this.prisma.travelAgentUpgradeApplication.findUnique({
        where: { id: applicationId },
      });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.status !== UpgradeApplicationStatus.UNDER_REVIEW) {
      throw new BadRequestException('Application is not under review');
    }

    const updatedApplication =
      await this.prisma.travelAgentUpgradeApplication.update({
        where: { id: applicationId },
        data: {
          status: UpgradeApplicationStatus.REJECTED,
          reviewedBy: reviewerId,
          reviewedAt: new Date(),
          reviewNotes: reason,
        },
      });

    return { application: updatedApplication };
  }

  async renewLicense(userId: string, licenseId: string, serviceFeeId: string) {
    const license = await this.prisma.travelAgentLicense.findFirst({
      where: { id: licenseId, userId },
    });

    if (!license) {
      throw new NotFoundException('License not found');
    }

    if (license.status !== TravelAgentLicenseStatus.ACTIVE) {
      throw new BadRequestException('License is not active');
    }

    const serviceFee = await this.prisma.serviceFee.findUnique({
      where: { id: serviceFeeId },
    });

    if (!serviceFee || serviceFee.feeType !== FeeType.UPGRADE) {
      throw new BadRequestException('Invalid service fee for license renewal');
    }

    // Create renewal record
    const renewal = await this.prisma.travelAgentLicenseRenewal.create({
      data: {
        licenseId: license.id,
        renewedAt: new Date(),
        newExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        reference: `REN-${Date.now()}`,
      },
    });

    return { renewal };
  }

  async onRenewalPaymentSuccess(renewalId: string) {
    const renewal = await this.prisma.travelAgentLicenseRenewal.findUnique({
      where: { id: renewalId },
      include: { license: true },
    });

    if (!renewal) {
      throw new NotFoundException('Renewal not found');
    }

    // Update renewal with payment ID
    await this.prisma.travelAgentLicenseRenewal.update({
      where: { id: renewalId },
      data: { paymentId: renewal.paymentId },
    });

    // Extend license expiry
    const newExpiryDate = new Date(renewal.license.expiresAt);
    newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);

    const updatedLicense = await this.prisma.travelAgentLicense.update({
      where: { id: renewal.licenseId },
      data: { expiresAt: newExpiryDate },
    });

    return { license: updatedLicense };
  }

  async attachDocument(applicationId: string, dto: UploadUpgradeDocumentDto) {
    const app = await this.prisma.travelAgentUpgradeApplication.findUnique({
      where: { id: applicationId },
    });
    if (!app) throw new NotFoundException('Upgrade application not found');

    // Verify application is in DRAFT status (can upload documents)
    if (app.status !== UpgradeApplicationStatus.DRAFT) {
      throw new BadRequestException(
        'Documents can only be uploaded for draft applications',
      );
    }

    const data: Record<string, any> = {};
    switch (dto.documentType) {
      case 'CAC_DOCUMENT':
        data.cacDocumentUrl = dto.fileUrl;
        break;
      case 'TAX_CLEARANCE_CERTIFICATE':
        data.taxClearanceDocumentUrl = dto.fileUrl;
        break;
      case 'NAHCON_DOCUMENT':
        data.nahconDocumentUrl = dto.fileUrl;
        break;
      case 'EFCC_SCUML_DOCUMENT':
        data.efccScumlDocumentUrl = dto.fileUrl;
        break;
      case 'IATA_DOCUMENT':
        data.iataDocumentUrl = dto.fileUrl;
        break;
      case 'DSS_DOCUMENT':
        data.dssDocumentUrl = dto.fileUrl;
        break;
      case 'NANTA_DOCUMENT':
        data.nantaDocumentUrl = dto.fileUrl;
        break;
      default:
        throw new BadRequestException('Unsupported document type');
    }

    await this.prisma.travelAgentUpgradeApplication.update({
      where: { id: applicationId },
      data,
    });
    return { success: true };
  }

  async uploadDocumentFile(
    userId: string,
    applicationId: string,
    documentType: string,
    file: Express.Multer.File,
  ) {
    // Verify user owns the application
    const app = await this.prisma.travelAgentUpgradeApplication.findFirst({
      where: { id: applicationId, userId },
    });
    if (!app) throw new NotFoundException('Upgrade application not found');

    // Verify application is in DRAFT status (can upload documents)
    if (app.status !== UpgradeApplicationStatus.DRAFT) {
      throw new BadRequestException(
        'Documents can only be uploaded for draft applications',
      );
    }

    // Validate document type
    const allowedDocumentTypes = [
      'CAC_DOCUMENT',
      'TAX_CLEARANCE_CERTIFICATE',
      'NAHCON_DOCUMENT',
      'EFCC_SCUML_DOCUMENT',
      'IATA_DOCUMENT',
      'DSS_DOCUMENT',
      'NANTA_DOCUMENT',
    ];
    if (!allowedDocumentTypes.includes(documentType)) {
      throw new BadRequestException(
        'Invalid document type. Allowed types: CAC_DOCUMENT, TAX_CLEARANCE_CERTIFICATE, NAHCON_DOCUMENT, EFCC_SCUML_DOCUMENT, IATA_DOCUMENT, DSS_DOCUMENT, NANTA_DOCUMENT',
      );
    }

    // Validate file type
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF, JPEG, and PNG files are allowed',
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException(
        'File size too large. Maximum size is 10MB',
      );
    }

    // Use the same file storage pattern as FormSubmissionsService
    const fileUrl = await this.saveFileToStorage(
      file,
      userId,
      `travel-agent-${documentType.toLowerCase()}`,
    );

    // Update application with document URL
    const data: Record<string, any> = {};
    switch (documentType) {
      case 'CAC_DOCUMENT':
        data.cacDocumentUrl = fileUrl;
        break;
      case 'TAX_CLEARANCE_CERTIFICATE':
        data.taxClearanceDocumentUrl = fileUrl;
        break;
      case 'NAHCON_DOCUMENT':
        data.nahconDocumentUrl = fileUrl;
        break;
      case 'EFCC_SCUML_DOCUMENT':
        data.efccScumlDocumentUrl = fileUrl;
        break;
      case 'IATA_DOCUMENT':
        data.iataDocumentUrl = fileUrl;
        break;
      case 'DSS_DOCUMENT':
        data.dssDocumentUrl = fileUrl;
        break;
      case 'NANTA_DOCUMENT':
        data.nantaDocumentUrl = fileUrl;
        break;
      default:
        throw new BadRequestException('Unsupported document type');
    }

    await this.prisma.travelAgentUpgradeApplication.update({
      where: { id: applicationId },
      data,
    });

    return {
      success: true,
      message: 'Document uploaded successfully',
      data: {
        documentType,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileUrl,
      },
    };
  }

  /**
   * Save file to storage (same pattern as FormSubmissionsService)
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

  async cancelMyApplication(userId: string, applicationId?: string) {
    let app;

    if (applicationId) {
      // Cancel specific application
      app = await this.prisma.travelAgentUpgradeApplication.findFirst({
        where: { id: applicationId, userId },
      });
    } else {
      // Cancel the most recent active application
      app = await this.prisma.travelAgentUpgradeApplication.findFirst({
        where: {
          userId,
          status: {
            in: [
              UpgradeApplicationStatus.DRAFT,
              UpgradeApplicationStatus.PENDING,
              UpgradeApplicationStatus.PENDING_PAYMENT,
              UpgradeApplicationStatus.PENDING_REVIEW,
              UpgradeApplicationStatus.UNDER_REVIEW,
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    if (!app) throw new NotFoundException('Application not found');
    if (
      app.status === UpgradeApplicationStatus.APPROVED ||
      app.status === UpgradeApplicationStatus.REJECTED
    )
      throw new BadRequestException('Cannot cancel finalized application');

    // Delete the application to allow user to reapply
    // This will cascade delete related bank details and directors
    await this.prisma.travelAgentUpgradeApplication.delete({
      where: { id: app.id },
    });

    return { success: true };
  }

  async getMyApplication(userId: string, applicationId?: string) {
    let app;

    if (applicationId) {
      // Get specific application
      app = await this.prisma.travelAgentUpgradeApplication.findFirst({
        where: { id: applicationId, userId },
        include: { bankDetails: true, directors: true, payment: true },
      });
    } else {
      // Get the most recent application
      app = await this.prisma.travelAgentUpgradeApplication.findFirst({
        where: { userId },
        include: { bankDetails: true, directors: true, payment: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    return { application: app };
  }

  async getMyApplications(userId: string) {
    const applications =
      await this.prisma.travelAgentUpgradeApplication.findMany({
        where: { userId },
        include: { bankDetails: true, directors: true, payment: true },
        orderBy: { createdAt: 'desc' },
      });
    return { applications };
  }

  async updateMyApplication(
    userId: string,
    body: Partial<CreateUpgradeApplicationInput>,
  ) {
    const app = await this.prisma.travelAgentUpgradeApplication.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!app) throw new NotFoundException('Application not found');

    if (app.status !== UpgradeApplicationStatus.DRAFT) {
      throw new BadRequestException('Can only update draft applications');
    }

    const updatedApp = await this.prisma.travelAgentUpgradeApplication.update({
      where: { id: app.id },
      data: {
        ...(body.companyName && { companyName: body.companyName }),
        ...(body.companyEmail && { companyEmail: body.companyEmail }),
        ...(body.companyPhone && { companyPhone: body.companyPhone }),
        ...(body.cacNumber && { cacNumber: body.cacNumber }),
        ...(body.tinNumber && { tinNumber: body.tinNumber }),
        ...(body.nahconLicenseNumber && {
          nahconLicenseNumber: body.nahconLicenseNumber,
        }),
        ...(body.dssClearanceNumber && {
          dssClearanceNumber: body.dssClearanceNumber,
        }),
        ...(body.efccScumlNumber && { efccScumlNumber: body.efccScumlNumber }),
        ...(body.iataAccreditationNumber && {
          iataAccreditationNumber: body.iataAccreditationNumber,
        }),
        ...(body.nantaMembershipNumber && {
          nantaMembershipNumber: body.nantaMembershipNumber,
        }),
      },
    });

    return { application: updatedApp };
  }

  async generateLicenseNumber(): Promise<string> {
    const currentYear = new Date().getFullYear();

    // Get or create counter for current year
    let counter = await this.prisma.travelAgentLicenseCounter.findUnique({
      where: { yearKey: currentYear.toString() },
    });

    if (!counter) {
      counter = await this.prisma.travelAgentLicenseCounter.create({
        data: { yearKey: currentYear.toString(), counter: 0 },
      });
    }

    // Increment counter
    const updatedCounter = await this.prisma.travelAgentLicenseCounter.update({
      where: { yearKey: currentYear.toString() },
      data: { counter: counter.counter + 1 },
    });

    // Generate license number: TA-YYYY-NNNNNN
    return `TA-${currentYear}-${updatedCounter.counter
      .toString()
      .padStart(6, '0')}`;
  }

  // Admin methods
  async listApplications(params: {
    status?: string;
    page: number;
    limit: number;
  }) {
    const where: any = {};
    if (params.status) where.status = params.status as UpgradeApplicationStatus;
    const skip = (params.page - 1) * params.limit;
    const [items, total] = await Promise.all([
      this.prisma.travelAgentUpgradeApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: params.limit,
        include: { user: true },
      }),
      this.prisma.travelAgentUpgradeApplication.count({ where }),
    ]);
    return {
      applications: items,
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    };
  }

  async getApplicationById(id: string) {
    const app = await this.prisma.travelAgentUpgradeApplication.findUnique({
      where: { id },
      include: {
        user: true,
        bankDetails: true,
        directors: true,
        payment: true,
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    return { application: app };
  }

  async markUnderReview(id: string, reviewerId: string, reviewNotes?: string) {
    const app = await this.prisma.travelAgentUpgradeApplication.findUnique({
      where: { id },
    });
    if (!app) throw new NotFoundException('Application not found');
    const updated = await this.prisma.travelAgentUpgradeApplication.update({
      where: { id },
      data: {
        status: UpgradeApplicationStatus.UNDER_REVIEW,
        reviewedBy: reviewerId,
        reviewNotes,
      },
    });
    return { application: updated };
  }

  async listUpgradeFees() {
    const fees = await this.prisma.serviceFee.findMany({
      where: { feeType: FeeType.UPGRADE, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return { fees };
  }

  async getLicenseInfo(userId: string) {
    const license = await this.prisma.travelAgentLicense.findUnique({
      where: { userId },
    });
    return { license };
  }
}
