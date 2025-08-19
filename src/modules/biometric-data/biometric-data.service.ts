import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import {
  CreateBiometricDataDto,
  UpdateBiometricDataDto,
  BiometricDataResponseDto,
} from './dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class BiometricDataService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create new biometric data record
   */
  async createBiometricData(
    createBiometricDataDto: CreateBiometricDataDto,
    createdBy?: string,
  ): Promise<BiometricDataResponseDto> {
    const { userId, submissionId } = createBiometricDataDto;

    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // If submissionId is provided, check if it exists and belongs to the user
    if (submissionId) {
      const submission = await this.prisma.formSubmission.findFirst({
        where: {
          id: submissionId,
          userId: userId,
        },
      });

      if (!submission) {
        throw new NotFoundException(
          `Form submission with ID ${submissionId} not found for user ${userId}`,
        );
      }
    }

    // Check if biometric data already exists for this submission
    const existingData = submissionId
      ? await this.prisma.biometricData.findUnique({
          where: { submissionId },
        })
      : null;

    if (existingData) {
      throw new BadRequestException(
        'Biometric data already exists for this user and submission',
      );
    }

    const biometricData = await this.prisma.biometricData.create({
      data: {
        ...createBiometricDataDto,
        capturedAt: createBiometricDataDto.capturedBy ? new Date() : null,
        createdBy,
        lastModifiedBy: createdBy,
      },
    });

    return this.mapToResponseDto(biometricData);
  }

  /**
   * Resolve a submission by reference number and return minimal info
   */
  private async resolveSubmissionByReference(
    referenceNumber: string,
  ): Promise<{ id: string; userId: string }> {
    const submission = await this.prisma.formSubmission.findFirst({
      where: { referenceNumber },
      select: { id: true, userId: true },
    });
    if (!submission) {
      throw new NotFoundException(
        `Form submission with reference ${referenceNumber} not found`,
      );
    }
    return submission;
  }

  /**
   * Create or update BiometricData using a submission reference number
   */
  async createOrUpdateByReferenceNumber(
    referenceNumber: string,
    dto: Partial<CreateBiometricDataDto>,
    actorUserId?: string,
  ): Promise<BiometricDataResponseDto> {
    const { id: submissionId, userId } =
      await this.resolveSubmissionByReference(referenceNumber);

    const existing = await this.prisma.biometricData.findUnique({
      where: { submissionId },
    });

    const data:
      | Prisma.BiometricDataUncheckedCreateInput
      | Prisma.BiometricDataUncheckedUpdateInput = {
      userId,
      submissionId,
      ...(dto.photoUrl !== undefined ? { photoUrl: dto.photoUrl } : {}),
      ...(dto.photoHash !== undefined ? { photoHash: dto.photoHash } : {}),
      ...(dto.photoMetadata !== undefined
        ? {
            photoMetadata:
              dto.photoMetadata as unknown as Prisma.InputJsonValue,
          }
        : {}),
      ...(dto.fingerprintData !== undefined
        ? {
            fingerprintData:
              dto.fingerprintData as unknown as Prisma.InputJsonValue,
          }
        : {}),
      ...(dto.fingerprintHash !== undefined
        ? { fingerprintHash: dto.fingerprintHash }
        : {}),
      ...(dto.fingerprintMetadata !== undefined
        ? {
            fingerprintMetadata:
              dto.fingerprintMetadata as unknown as Prisma.InputJsonValue,
          }
        : {}),
      ...(dto.signatureUrl !== undefined
        ? { signatureUrl: dto.signatureUrl }
        : {}),
      ...(dto.signatureHash !== undefined
        ? { signatureHash: dto.signatureHash }
        : {}),
      ...(dto.signatureMetadata !== undefined
        ? {
            signatureMetadata:
              dto.signatureMetadata as unknown as Prisma.InputJsonValue,
          }
        : {}),
      ...(dto.photoQualityScore !== undefined
        ? { photoQualityScore: dto.photoQualityScore }
        : {}),
      ...(dto.fingerprintQualityScore !== undefined
        ? { fingerprintQualityScore: dto.fingerprintQualityScore }
        : {}),
      ...(dto.overallQualityScore !== undefined
        ? { overallQualityScore: dto.overallQualityScore }
        : {}),
      ...(dto.capturedBy !== undefined ? { capturedBy: dto.capturedBy } : {}),
      ...(dto.captureDevice !== undefined
        ? { captureDevice: dto.captureDevice }
        : {}),
      ...(dto.captureLocation !== undefined
        ? { captureLocation: dto.captureLocation }
        : {}),
      ...(dto.isEncrypted !== undefined
        ? { isEncrypted: dto.isEncrypted }
        : {}),
      ...(dto.encryptionKey !== undefined
        ? { encryptionKey: dto.encryptionKey }
        : {}),
      ...(dto.dataRetentionPolicy !== undefined
        ? { dataRetentionPolicy: dto.dataRetentionPolicy }
        : {}),
      ...(actorUserId ? { lastModifiedBy: actorUserId } : {}),
      ...(actorUserId && !existing ? { createdBy: actorUserId } : {}),
      ...(dto.capturedBy ? { capturedAt: new Date() } : {}),
    };

    const record = existing
      ? await this.prisma.biometricData.update({
          where: { id: existing.id },
          data,
        })
      : await this.prisma.biometricData.create({
          data: data as Prisma.BiometricDataUncheckedCreateInput,
        });

    return this.mapToResponseDto(record);
  }

  /**
   * Create 442 fingers by submission reference number
   */
  async createFingersByReferenceNumber(
    referenceNumber: string,
    fingerprintFingers: Array<{
      fingerPosition: string;
      fingerName?: string;
      templateData?: Record<string, unknown>;
      templateHash?: string;
      templateFormat?: string;
      qualityScore?: number;
      captureAttempts?: number;
      isAcceptable?: boolean;
      captureDevice?: string;
      captureMethod?: string;
      metadata?: Record<string, unknown>;
    }>,
  ): Promise<{ biometricDataId: string }> {
    const { id: submissionId } = await this.resolveSubmissionByReference(
      referenceNumber,
    );
    const biometricData = await this.prisma.biometricData.findUnique({
      where: { submissionId },
    });
    if (!biometricData) {
      throw new NotFoundException(
        `Biometric data not created yet for submission with reference ${referenceNumber}`,
      );
    }
    await this.createFingerprintFingers(biometricData.id, fingerprintFingers);
    return { biometricDataId: biometricData.id };
  }

  /**
   * Get biometric data by ID
   */
  async getBiometricDataById(id: string): Promise<BiometricDataResponseDto> {
    const biometricData = await this.prisma.biometricData.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        submission: {
          select: {
            id: true,
            status: true,
          },
        },
        fingerprintFingers: true,
      },
    });

    if (!biometricData) {
      throw new NotFoundException(`Biometric data with ID ${id} not found`);
    }

    return this.mapToResponseDto(biometricData);
  }

  /**
   * Get biometric data by user ID
   */
  async getBiometricDataByUserId(
    userId: string,
  ): Promise<BiometricDataResponseDto[]> {
    const biometricData = await this.prisma.biometricData.findMany({
      where: { userId },
      include: {
        submission: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return biometricData.map((data) => this.mapToResponseDto(data));
  }

  /**
   * Get biometric data by submission ID
   */
  async getBiometricDataBySubmissionId(
    submissionId: string,
  ): Promise<BiometricDataResponseDto | null> {
    const biometricData = await this.prisma.biometricData.findUnique({
      where: { submissionId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        submission: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    return biometricData ? this.mapToResponseDto(biometricData) : null;
  }

  /**
   * Update biometric data
   */
  async updateBiometricData(
    id: string,
    updateBiometricDataDto: UpdateBiometricDataDto,
    lastModifiedBy?: string,
  ): Promise<BiometricDataResponseDto> {
    const biometricData = await this.prisma.biometricData.findUnique({
      where: { id },
    });

    if (!biometricData) {
      throw new NotFoundException(`Biometric data with ID ${id} not found`);
    }

    const updatedData = await this.prisma.biometricData.update({
      where: { id },
      data: {
        ...updateBiometricDataDto,
        lastModifiedBy,
        updatedAt: new Date(),
      },
    });

    return this.mapToResponseDto(updatedData);
  }

  /**
   * Delete biometric data
   */
  async deleteBiometricData(id: string): Promise<void> {
    const biometricData = await this.prisma.biometricData.findUnique({
      where: { id },
    });

    if (!biometricData) {
      throw new NotFoundException(`Biometric data with ID ${id} not found`);
    }

    await this.prisma.biometricData.delete({
      where: { id },
    });
  }

  /**
   * Verify biometric data
   */
  async verifyBiometricData(
    id: string,
    verificationStatus: string,
    verificationNotes?: string,
    verifiedBy?: string,
  ): Promise<BiometricDataResponseDto> {
    const biometricData = await this.prisma.biometricData.findUnique({
      where: { id },
    });

    if (!biometricData) {
      throw new NotFoundException(`Biometric data with ID ${id} not found`);
    }

    const updatedData = await this.prisma.biometricData.update({
      where: { id },
      data: {
        isVerified: true,
        verificationStatus,
        verificationNotes,
        lastModifiedBy: verifiedBy,
        updatedAt: new Date(),
      },
    });

    return this.mapToResponseDto(updatedData);
  }

  /**
   * Get biometric data statistics
   */
  async getBiometricDataStats() {
    const totalRecords = await this.prisma.biometricData.count();
    const verifiedRecords = await this.prisma.biometricData.count({
      where: { isVerified: true },
    });
    const pendingVerification = await this.prisma.biometricData.count({
      where: { isVerified: false },
    });

    const qualityStats = await this.prisma.biometricData.aggregate({
      _avg: {
        photoQualityScore: true,
        fingerprintQualityScore: true,
        overallQualityScore: true,
      },
      _min: {
        photoQualityScore: true,
        fingerprintQualityScore: true,
        overallQualityScore: true,
      },
      _max: {
        photoQualityScore: true,
        fingerprintQualityScore: true,
        overallQualityScore: true,
      },
    });

    return {
      totalRecords,
      verifiedRecords,
      pendingVerification,
      qualityStats: {
        average: {
          photo: qualityStats._avg.photoQualityScore,
          fingerprint: qualityStats._avg.fingerprintQualityScore,
          overall: qualityStats._avg.overallQualityScore,
        },
        minimum: {
          photo: qualityStats._min.photoQualityScore,
          fingerprint: qualityStats._min.fingerprintQualityScore,
          overall: qualityStats._min.overallQualityScore,
        },
        maximum: {
          photo: qualityStats._max.photoQualityScore,
          fingerprint: qualityStats._max.fingerprintQualityScore,
          overall: qualityStats._max.overallQualityScore,
        },
      },
    };
  }

  /**
   * Create 442 fingerprint fingers for a biometric data record
   */
  async createFingerprintFingers(
    biometricDataId: string,
    fingerprintFingers: Array<{
      fingerPosition: string;
      fingerName?: string;
      templateData?: Record<string, unknown>;
      templateHash?: string;
      templateFormat?: string;
      qualityScore?: number;
      captureAttempts?: number;
      isAcceptable?: boolean;
      captureDevice?: string;
      captureMethod?: string;
      metadata?: Record<string, unknown>;
    }>,
  ): Promise<void> {
    if (!fingerprintFingers || fingerprintFingers.length === 0) {
      return;
    }
    // Upsert each finger to avoid silent skip and ensure idempotency
    await this.prisma.$transaction(
      fingerprintFingers.map((f) =>
        this.prisma.fingerprintData.upsert({
          where: {
            biometricDataId_fingerPosition: {
              biometricDataId,
              fingerPosition: f.fingerPosition as any,
            },
          },
          update: {
            fingerName: f.fingerName ?? this.getFingerName(f.fingerPosition),
            templateData: f.templateData as unknown as Prisma.InputJsonValue,
            templateHash: f.templateHash,
            templateFormat: f.templateFormat ?? 'ISO-19794-2',
            qualityScore: f.qualityScore,
            captureAttempts: f.captureAttempts ?? 1,
            isAcceptable: f.isAcceptable ?? false,
            captureDevice: f.captureDevice,
            captureMethod: f.captureMethod ?? 'optical',
            metadata: f.metadata as unknown as Prisma.InputJsonValue,
            capturedAt: new Date(),
          },
          create: {
            biometricDataId,
            fingerPosition: f.fingerPosition as any,
            fingerName: f.fingerName ?? this.getFingerName(f.fingerPosition),
            templateData: f.templateData as unknown as Prisma.InputJsonValue,
            templateHash: f.templateHash,
            templateFormat: f.templateFormat ?? 'ISO-19794-2',
            qualityScore: f.qualityScore,
            captureAttempts: f.captureAttempts ?? 1,
            isAcceptable: f.isAcceptable ?? false,
            captureDevice: f.captureDevice,
            captureMethod: f.captureMethod ?? 'optical',
            metadata: f.metadata as unknown as Prisma.InputJsonValue,
            capturedAt: new Date(),
          },
        }),
      ),
    );
  }

  /**
   * Update a specific finger in 442 set
   */
  async updateFinger(
    biometricDataId: string,
    fingerPosition: string,
    update: Partial<{
      templateData: Record<string, unknown>;
      templateHash: string;
      templateFormat: string;
      qualityScore: number;
      captureAttempts: number;
      isAcceptable: boolean;
      captureDevice: string;
      captureMethod: string;
      metadata: Record<string, unknown>;
    }>,
  ) {
    const existing = await this.prisma.fingerprintData.findUnique({
      where: {
        biometricDataId_fingerPosition: {
          biometricDataId,
          fingerPosition: fingerPosition as any,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(
        `Finger ${fingerPosition} not found for biometricData ${biometricDataId}`,
      );
    }

    const data: Prisma.FingerprintDataUpdateInput = {
      ...(update.templateData !== undefined
        ? {
            templateData:
              update.templateData as unknown as Prisma.InputJsonValue,
          }
        : {}),
      ...(update.metadata !== undefined
        ? { metadata: update.metadata as unknown as Prisma.InputJsonValue }
        : {}),
      ...(update.templateHash !== undefined
        ? { templateHash: update.templateHash }
        : {}),
      ...(update.templateFormat !== undefined
        ? { templateFormat: update.templateFormat }
        : {}),
      ...(update.qualityScore !== undefined
        ? { qualityScore: update.qualityScore }
        : {}),
      ...(update.captureAttempts !== undefined
        ? { captureAttempts: update.captureAttempts }
        : {}),
      ...(update.isAcceptable !== undefined
        ? { isAcceptable: update.isAcceptable }
        : {}),
      ...(update.captureDevice !== undefined
        ? { captureDevice: update.captureDevice }
        : {}),
      ...(update.captureMethod !== undefined
        ? { captureMethod: update.captureMethod }
        : {}),
      // updatedAt is auto via @updatedAt
    };

    return this.prisma.fingerprintData.update({
      where: { id: existing.id },
      data,
    });
  }

  /**
   * Helper: map finger enum to human-readable name
   */
  private getFingerName(position: string): string {
    const map: Record<string, string> = {
      LEFT_THUMB: 'Left Thumb',
      LEFT_INDEX: 'Left Index',
      LEFT_MIDDLE: 'Left Middle',
      LEFT_RING: 'Left Ring',
      LEFT_LITTLE: 'Left Little',
      RIGHT_THUMB: 'Right Thumb',
      RIGHT_INDEX: 'Right Index',
      RIGHT_MIDDLE: 'Right Middle',
      RIGHT_RING: 'Right Ring',
      RIGHT_LITTLE: 'Right Little',
    };
    return map[position] ?? position;
  }

  /**
   * Map database model to response DTO
   */
  private mapToResponseDto(biometricData: any): BiometricDataResponseDto {
    return {
      id: biometricData.id,
      userId: biometricData.userId,
      submissionId: biometricData.submissionId,
      photoUrl: biometricData.photoUrl,
      photoHash: biometricData.photoHash,
      photoMetadata: biometricData.photoMetadata,
      fingerprintData: biometricData.fingerprintData,
      fingerprintHash: biometricData.fingerprintHash,
      fingerprintMetadata: biometricData.fingerprintMetadata,
      fingerprintFingers: biometricData.fingerprintFingers,
      signatureUrl: biometricData.signatureUrl,
      signatureHash: biometricData.signatureHash,
      signatureMetadata: biometricData.signatureMetadata,
      photoQualityScore: biometricData.photoQualityScore,
      fingerprintQualityScore: biometricData.fingerprintQualityScore,
      overallQualityScore: biometricData.overallQualityScore,
      isVerified: biometricData.isVerified,
      verificationStatus: biometricData.verificationStatus,
      verificationNotes: biometricData.verificationNotes,
      capturedBy: biometricData.capturedBy,
      capturedAt: biometricData.capturedAt,
      captureDevice: biometricData.captureDevice,
      captureLocation: biometricData.captureLocation,
      isEncrypted: biometricData.isEncrypted,
      encryptionKey: biometricData.encryptionKey,
      dataRetentionPolicy: biometricData.dataRetentionPolicy,
      createdAt: biometricData.createdAt,
      updatedAt: biometricData.updatedAt,
      createdBy: biometricData.createdBy,
      lastModifiedBy: biometricData.lastModifiedBy,
    };
  }
}
