import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { PaymentsService } from '@modules/payments/payments.service';
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
  cacNumber: string;
  tinNumber: string;
  nahconLicenseNumber: string;
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
  nahconLicenseNumber: string;
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

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
        message: `Existing ${input.applicationType.toLowerCase().replace('_', ' ')} application retrieved`,
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
    if (!uploadedDocuments.nahconDocumentUrl)
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

    return { application: updatedApplication };
  }

  async initiatePayment(
    userId: string,
    applicationId: string,
    dto: { serviceFeeId: string; paymentMethodId: string },
  ) {
    // Verify user owns the application and it's in PENDING status
    const application =
      await this.prisma.travelAgentUpgradeApplication.findFirst({
        where: {
          id: applicationId,
          userId,
          status: UpgradeApplicationStatus.PENDING,
        },
      });

    if (!application) {
      throw new NotFoundException(
        'Application not found or not ready for payment',
      );
    }

    const serviceFee = await this.prisma.serviceFee.findUnique({
      where: { id: dto.serviceFeeId },
    });

    if (!serviceFee || serviceFee.feeType !== FeeType.UPGRADE) {
      throw new BadRequestException(
        'Invalid service fee for travel agent upgrade',
      );
    }

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount: serviceFee.amount,
        currency: Currency.NGN,
        description: `Travel Agent Upgrade Application - ${serviceFee.name}`,
        status: PaymentStatus.PENDING,
        serviceFees: {
          create: [
            {
              serviceFeeId: dto.serviceFeeId,
              amount: serviceFee.amount,
              currency: 'NGN',
              feeType: FeeType.UPGRADE,
            },
          ],
        },
      },
    });

    // Update application with payment and status
    const updatedApplication =
      await this.prisma.travelAgentUpgradeApplication.update({
        where: { id: applicationId },
        data: {
          paymentId: payment.id,
          status: UpgradeApplicationStatus.PENDING_PAYMENT,
        },
        include: { payment: true },
      });

    return { application: updatedApplication, payment };
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

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount: serviceFee.amount,
        currency: Currency.NGN,
        description: `Travel Agent Upgrade Application - ${serviceFee.name}`,
        status: PaymentStatus.PENDING,
        serviceFees: {
          create: [
            {
              serviceFeeId: input.serviceFeeId,
              amount: serviceFee.amount,
              currency: 'NGN',
              feeType: FeeType.UPGRADE,
            },
          ],
        },
      },
    });

    const application = await this.prisma.travelAgentUpgradeApplication.create({
      data: {
        userId,
        paymentId: payment.id,
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
      include: { payment: true, bankDetails: true, directors: true },
    });

    return { application };
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
    const applications = await this.prisma.travelAgentUpgradeApplication.findMany({
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
    if (app.status !== UpgradeApplicationStatus.PENDING)
      throw new BadRequestException('Only pending applications can be updated');

    const data: any = {};
    if (body.companyName) data.companyName = body.companyName;
    if (body.companyEmail) data.companyEmail = body.companyEmail;
    if (body.companyPhone) data.companyPhone = body.companyPhone;
    if (body.cacNumber) data.cacNumber = body.cacNumber;
    if (body.tinNumber) data.tinNumber = body.tinNumber;
    if (body.nahconLicenseNumber)
      data.nahconLicenseNumber = body.nahconLicenseNumber;
    if (body.dssClearanceNumber)
      data.dssClearanceNumber = body.dssClearanceNumber;
    if (body.efccScumlNumber) data.efccScumlNumber = body.efccScumlNumber;
    if (body.iataAccreditationNumber !== undefined)
      data.iataAccreditationNumber = body.iataAccreditationNumber;
    if (body.nantaMembershipNumber !== undefined)
      data.nantaMembershipNumber = body.nantaMembershipNumber;

    if (body.bankDetails) {
      await this.prisma.travelAgentBankDetails.upsert({
        where: { applicationId: app.id },
        update: {
          bankName: body.bankDetails.bankName,
          bankCode: body.bankDetails.bankCode,
          accountNumber: body.bankDetails.accountNumber,
          accountName: body.bankDetails.accountName,
        },
        create: {
          applicationId: app.id,
          bankName: body.bankDetails.bankName,
          bankCode: body.bankDetails.bankCode,
          accountNumber: body.bankDetails.accountNumber,
          accountName: body.bankDetails.accountName,
        },
      });
    }

    if (Object.keys(data).length) {
      await this.prisma.travelAgentUpgradeApplication.update({
        where: { id: app.id },
        data,
      });
    }
    return this.getMyApplication(userId);
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
        orderBy: { submittedAt: 'desc' },
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
    ];
    if (!allowedDocumentTypes.includes(documentType)) {
      throw new BadRequestException(
        'Invalid document type. Allowed types: CAC_DOCUMENT, TAX_CLEARANCE_CERTIFICATE, NAHCON_DOCUMENT, EFCC_SCUML_DOCUMENT, IATA_DOCUMENT',
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
      default:
        throw new BadRequestException('Unsupported document type');
    }

    await this.prisma.travelAgentUpgradeApplication.update({
      where: { id: applicationId },
      data,
    });
    return { success: true };
  }

  async approveApplication(
    adminId: string,
    applicationId: string,
    reviewNotes?: string,
  ) {
    const application =
      await this.prisma.travelAgentUpgradeApplication.findUnique({
        where: { id: applicationId },
      });
    if (!application) throw new NotFoundException('Application not found');

    // Ensure payment is completed
    const payment = await this.prisma.payment.findUnique({
      where: { id: application.paymentId ?? '' },
    });
    if (!payment || payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Payment not completed');
    }

    const licenseNumber = await this.generateLicenseNumber();
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setFullYear(now.getFullYear() + 1);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.travelAgentUpgradeApplication.update({
        where: { id: applicationId },
        data: {
          status: UpgradeApplicationStatus.APPROVED,
          reviewedAt: now,
          reviewedBy: adminId,
          reviewNotes,
        },
      });

      await tx.user.update({
        where: { id: application.userId },
        data: { roles: { push: Roles.AGENCY } },
      });

      const license = await tx.travelAgentLicense.upsert({
        where: { userId: application.userId },
        update: {
          licenseNumber,
          issuedAt: now,
          expiresAt,
          status: TravelAgentLicenseStatus.ACTIVE,
        },
        create: {
          userId: application.userId,
          licenseNumber,
          issuedAt: now,
          expiresAt,
          status: TravelAgentLicenseStatus.ACTIVE,
        },
      });

      return { license };
    });

    return result;
  }

  async rejectApplication(
    adminId: string,
    applicationId: string,
    rejectionReason?: string,
    reviewNotes?: string,
  ) {
    const application =
      await this.prisma.travelAgentUpgradeApplication.findUnique({
        where: { id: applicationId },
      });
    if (!application) throw new NotFoundException('Application not found');

    const now = new Date();
    await this.prisma.travelAgentUpgradeApplication.update({
      where: { id: applicationId },
      data: {
        status: UpgradeApplicationStatus.REJECTED,
        reviewedAt: now,
        reviewedBy: adminId,
        rejectionReason,
        reviewNotes,
      },
    });

    return { success: true };
  }

  async renewLicense(userId: string, serviceFeeId: string) {
    const fee = await this.prisma.serviceFee.findUnique({
      where: { id: serviceFeeId },
    });
    if (!fee || fee.feeType !== FeeType.UPGRADE)
      throw new BadRequestException('Invalid renewal fee');

    const license = await this.prisma.travelAgentLicense.findUnique({
      where: { userId },
    });
    if (!license) throw new NotFoundException('License not found');

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount: fee.amount,
        currency: Currency.NGN,
        description: `Travel Agent License Renewal - ${fee.name}`,
        status: PaymentStatus.PENDING,
        serviceFees: {
          create: [
            {
              serviceFeeId,
              amount: fee.amount,
              currency: 'NGN',
              feeType: FeeType.UPGRADE,
            },
          ],
        },
      },
    });

    return { paymentId: payment.id };
  }

  async onRenewalPaymentSuccess(paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { licenseRenewal: true },
    });
    if (!payment || payment.status !== PaymentStatus.COMPLETED)
      throw new BadRequestException('Invalid payment');

    const license = await this.prisma.travelAgentLicense.findUnique({
      where: { userId: payment.userId },
    });
    if (!license) throw new NotFoundException('License not found');

    const now = new Date();
    const newExpiry = new Date(
      license.expiresAt > now ? license.expiresAt : now,
    );
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);

    await this.prisma.$transaction(async (tx) => {
      await tx.travelAgentLicenseRenewal.create({
        data: {
          licenseId: license.id,
          paymentId: payment.id,
          renewedAt: now,
          newExpiry,
          reference: `REN-${now.getFullYear()}-${payment.id.slice(0, 8)}`,
        },
      });

      await tx.travelAgentLicense.update({
        where: { id: license.id },
        data: { expiresAt: newExpiry, status: 'ACTIVE' },
      });
    });

    return { success: true };
  }

  private async generateLicenseNumber(): Promise<string> {
    const now = new Date();
    const yearKey = String(now.getFullYear());
    const counter = await this.prisma.$transaction(async (tx) => {
      const row = await tx.travelAgentLicenseCounter.upsert({
        where: { yearKey },
        update: { counter: { increment: 1 } },
        create: { yearKey, counter: 1 },
        select: { counter: true },
      });
      return row.counter;
    });
    const padded = counter.toString().padStart(6, '0');
    return `AGT-${yearKey}-${padded}`;
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
}
