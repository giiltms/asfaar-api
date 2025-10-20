import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { PaymentsService } from '@modules/payments/payments.service';
import {
  UploadUpgradeDocumentDto,
  UpgradeDocumentType,
} from './dto/upgrade.dto';
import {
  FeeType,
  PaymentStatus,
  Roles,
  UpgradeApplicationStatus,
  Currency,
  TravelAgentLicenseStatus,
} from '@prisma/client';

export interface CreateUpgradeApplicationInput {
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

  async getMyApplication(userId: string) {
    const app = await this.prisma.travelAgentUpgradeApplication.findUnique({
      where: { userId },
      include: { bankDetails: true, directors: true, payment: true },
    });
    return { application: app };
  }

  async updateMyApplication(
    userId: string,
    body: Partial<CreateUpgradeApplicationInput>,
  ) {
    const app = await this.prisma.travelAgentUpgradeApplication.findUnique({
      where: { userId },
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
    if (body.nahconLicenseNumber) data.nahconLicenseNumber = body.nahconLicenseNumber;
    if (body.dssClearanceNumber) data.dssClearanceNumber = body.dssClearanceNumber;
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
      await this.prisma.travelAgentUpgradeApplication.update({ where: { id: app.id }, data });
    }
    return this.getMyApplication(userId);
  }

  async cancelMyApplication(userId: string) {
    const app = await this.prisma.travelAgentUpgradeApplication.findUnique({ where: { userId } });
    if (!app) throw new NotFoundException('Application not found');
    if (
      app.status === UpgradeApplicationStatus.APPROVED ||
      app.status === UpgradeApplicationStatus.REJECTED
    )
      throw new BadRequestException('Cannot cancel finalized application');
    await this.prisma.travelAgentUpgradeApplication.update({
      where: { id: app.id },
      data: { status: UpgradeApplicationStatus.CANCELLED },
    });
    return { success: true };
  }

  async retryInitialPayment(userId: string, serviceFeeId: string) {
    const app = await this.prisma.travelAgentUpgradeApplication.findUnique({ where: { userId } });
    if (!app) throw new NotFoundException('Application not found');
    const fee = await this.prisma.serviceFee.findUnique({ where: { id: serviceFeeId } });
    if (!fee || fee.feeType !== FeeType.UPGRADE)
      throw new BadRequestException('Invalid upgrade fee');

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        amount: fee.amount,
        currency: Currency.NGN,
        status: PaymentStatus.PENDING,
        description: `Travel Agent Upgrade Application - ${fee.name}`,
        serviceFees: {
          create: [
            { serviceFeeId, amount: fee.amount, currency: 'NGN', feeType: FeeType.UPGRADE },
          ],
        },
      },
    });
    await this.prisma.travelAgentUpgradeApplication.update({
      where: { id: app.id },
      data: { paymentId: payment.id },
    });
    return { paymentId: payment.id };
  }

  async listUpgradeFees() {
    const fees = await this.prisma.serviceFee.findMany({
      where: { feeType: FeeType.UPGRADE, isActive: true },
      orderBy: { createdAt: 'desc' },
    });
    return { fees };
  }

  async listApplications(params: { status?: string; page: number; limit: number }) {
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
      include: { user: true, bankDetails: true, directors: true, payment: true },
    });
    if (!app) throw new NotFoundException('Application not found');
    return { application: app };
  }

  async markUnderReview(id: string, reviewerId: string, reviewNotes?: string) {
    const app = await this.prisma.travelAgentUpgradeApplication.findUnique({ where: { id } });
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
  async attachDocument(userId: string, dto: UploadUpgradeDocumentDto) {
    const app = await this.prisma.travelAgentUpgradeApplication.findUnique({
      where: { userId },
    });
    if (!app) throw new NotFoundException('Upgrade application not found');

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
      where: { id: app.id },
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
}
