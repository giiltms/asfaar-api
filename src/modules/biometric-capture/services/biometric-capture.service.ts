import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { BiometricEncryptionService } from '@common/services/biometric-encryption.service';
import {
  BiometricValidationService,
  TemplateValidationResult,
} from '@common/services/biometric-validation.service';
import { FingerPosition } from '@prisma/client';
import { LocalStorageService } from '@providers/localstorage/localstorage.service';
import * as crypto from 'crypto';

export interface CaptureRequest {
  userId: string;
  submissionId?: string;
  captureDevice: string;
  captureLocation: string;
  captureMethod: 'SLAP' | 'INDIVIDUAL';
  fingers: {
    position: FingerPosition;
    templateData: Buffer;
    wsqImageData?: Buffer;
  }[];
  capturedBy: string;
}

export interface CaptureResult {
  biometricDataId: string;
  fingerprintDataIds: string[];
  validationResults: TemplateValidationResult[];
  overallSuccess: boolean;
  errors: string[];
}

@Injectable()
export class BiometricCaptureService {
  private readonly logger = new Logger(BiometricCaptureService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryptionService: BiometricEncryptionService,
    private readonly validationService: BiometricValidationService,
    private readonly localStorageService: LocalStorageService,
  ) {}

  /**
   * Capture and store fingerprint data for a user
   * @param request - Capture request with fingerprint data
   * @returns Capture result with validation status
   */
  async captureFingerprints(request: CaptureRequest): Promise<CaptureResult> {
    this.logger.log(`Starting fingerprint capture for user ${request.userId}`);

    const validationResults: TemplateValidationResult[] = [];
    const errors: string[] = [];
    let overallSuccess = true;

    try {
      // Validate all templates before storing
      for (const finger of request.fingers) {
        const validation = await this.validationService.validateTemplate(
          finger.templateData,
          finger.wsqImageData,
        );
        validationResults.push(validation);

        if (!validation.isValid) {
          overallSuccess = false;
          errors.push(
            `Invalid template for ${finger.position}: ${validation.errors.join(
              ', ',
            )}`,
          );
        }
      }

      // If any template is invalid, reject the entire capture
      if (!overallSuccess) {
        throw new BadRequestException(
          `Fingerprint capture failed: ${errors.join('; ')}`,
        );
      }

      // Create or update biometric data record
      this.logger.log(
        `Creating or updating biometric data for submission ${request.submissionId}`,
      );
      const biometricData = await this.prisma.biometricData.upsert({
        where: {
          submissionId: request.submissionId,
        },
        update: {
          capturedBy: request.capturedBy,
          capturedAt: new Date(),
          captureDevice: request.captureDevice,
          captureLocation: request.captureLocation,
          templateStandard: 'ISO/IEC 19794-2:2005',
          captureStandard: 'ISO/IEC 19794-4:2005',
          dataClassification: 'CONFIDENTIAL',
          encryptionAlgorithm: this.encryptionService.getAlgorithm(),
          keyVersion: this.encryptionService.getKeyVersion(),
          isEncrypted: true,
          lastModifiedBy: request.capturedBy,
        },
        create: {
          userId: request.userId,
          submissionId: request.submissionId,
          capturedBy: request.capturedBy,
          capturedAt: new Date(),
          captureDevice: request.captureDevice,
          captureLocation: request.captureLocation,
          templateStandard: 'ISO/IEC 19794-2:2005',
          captureStandard: 'ISO/IEC 19794-4:2005',
          dataClassification: 'CONFIDENTIAL',
          encryptionAlgorithm: this.encryptionService.getAlgorithm(),
          keyVersion: this.encryptionService.getKeyVersion(),
          isEncrypted: true,
          createdBy: request.capturedBy,
        },
      });

      // Process each finger
      const fingerprintDataIds: string[] = [];

      for (let i = 0; i < request.fingers.length; i++) {
        const finger = request.fingers[i];
        const validation = validationResults[i];

        try {
          // Encrypt template data
          const templateEncryption =
            await this.encryptionService.encryptBiometricData(
              finger.templateData,
              `template_${finger.position}`,
            );

          // Encrypt WSQ image if provided
          let wsqEncryption = null;
          if (finger.wsqImageData) {
            wsqEncryption = await this.encryptionService.encryptBiometricData(
              finger.wsqImageData,
              `wsq_${finger.position}`,
            );
          }

          // Create or update fingerprint data record
          this.logger.log(
            `Creating or updating fingerprint data for ${finger.position}`,
          );
          const fingerprintData = await this.prisma.fingerprintData.upsert({
            where: {
              biometricDataId_fingerPosition: {
                biometricDataId: biometricData.id,
                fingerPosition: finger.position,
              },
            },
            update: {
              fingerName: this.getFingerName(finger.position),
              templateData: templateEncryption.encryptedData,
              templateHash: this.encryptionService.generateHash(
                finger.templateData,
              ),
              templateFormat: 'ISO19794-2:2005',
              wsqImageData: wsqEncryption?.encryptedData,
              wsqImageHash: finger.wsqImageData
                ? this.encryptionService.generateHash(finger.wsqImageData)
                : null,
              wsqImageSize: finger.wsqImageData?.length,
              nfiqScore: validation.nfiqScore,
              qualityScore: validation.qualityScore,
              isAcceptable: validation.isValid,
              isTemplateValid: validation.isValid,
              capturedAt: new Date(),
              captureDevice: request.captureDevice,
              captureMethod: request.captureMethod,
              captureLocation: request.captureLocation,
              isEncrypted: true,
              encryptionKey: templateEncryption.keyVersion,
              metadata: {
                templateSize: finger.templateData.length,
                wsqImageSize: finger.wsqImageData?.length,
                validationWarnings: validation.warnings,
                encryptionAlgorithm: templateEncryption.algorithm,
                templateIV: templateEncryption.iv.toString('base64'),
                templateTag: templateEncryption.tag.toString('base64'),
                wsqIV: wsqEncryption?.iv.toString('base64'),
                wsqTag: wsqEncryption?.tag.toString('base64'),
              },
              lastModifiedBy: request.capturedBy,
            },
            create: {
              biometricDataId: biometricData.id,
              fingerPosition: finger.position,
              fingerName: this.getFingerName(finger.position),
              templateData: templateEncryption.encryptedData,
              templateHash: this.encryptionService.generateHash(
                finger.templateData,
              ),
              templateFormat: 'ISO19794-2:2005',
              wsqImageData: wsqEncryption?.encryptedData,
              wsqImageHash: finger.wsqImageData
                ? this.encryptionService.generateHash(finger.wsqImageData)
                : null,
              wsqImageSize: finger.wsqImageData?.length,
              nfiqScore: validation.nfiqScore,
              qualityScore: validation.qualityScore,
              isAcceptable: validation.isValid,
              isTemplateValid: validation.isValid,
              capturedAt: new Date(),
              captureDevice: request.captureDevice,
              captureMethod: request.captureMethod,
              captureLocation: request.captureLocation,
              isEncrypted: true,
              encryptionKey: templateEncryption.keyVersion,
              metadata: {
                templateSize: finger.templateData.length,
                wsqImageSize: finger.wsqImageData?.length,
                validationWarnings: validation.warnings,
                encryptionAlgorithm: templateEncryption.algorithm,
                templateIV: templateEncryption.iv.toString('base64'),
                templateTag: templateEncryption.tag.toString('base64'),
                wsqIV: wsqEncryption?.iv.toString('base64'),
                wsqTag: wsqEncryption?.tag.toString('base64'),
              },
              createdBy: request.capturedBy,
            },
          });

          fingerprintDataIds.push(fingerprintData.id);

          this.logger.log(
            `Stored fingerprint data for ${finger.position}: ID ${fingerprintData.id}, NFIQ: ${validation.nfiqScore}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to store fingerprint data for ${finger.position}`,
            error.stack,
          );
          errors.push(`Failed to store ${finger.position}: ${error.message}`);
          overallSuccess = false;
        }
      }

      // Update biometric data with overall status
      await this.prisma.biometricData.update({
        where: { id: biometricData.id },
        data: {
          isVerified: overallSuccess,
          verificationStatus: overallSuccess ? 'VERIFIED' : 'NEEDS_RETAKES',
        },
      });

      // Update biometric session fingerprints capture status
      try {
        if (request.submissionId) {
          const appointment = await this.prisma.biometricAppointment.findUnique(
            {
              where: { submissionId: request.submissionId },
              select: { id: true },
            },
          );

          if (appointment && overallSuccess) {
            await this.prisma.biometricSession.updateMany({
              where: { appointmentId: appointment.id },
              data: {
                fingerprintsCaptured: true,
                fingerprintQualityScore: Math.round(
                  validationResults.reduce(
                    (sum, v) => sum + (v.qualityScore || 0),
                    0,
                  ) / validationResults.length,
                ),
              },
            });

            this.logger.log(
              `Biometric session fingerprint capture status updated for appointment ${appointment.id}`,
            );
          }
        }
      } catch (error) {
        // Don't fail fingerprint capture if session update fails
        this.logger.warn(
          `Failed to update biometric session for fingerprint capture: ${error.message}`,
        );
      }

      // Workflow transitions are handled by the appointment completion endpoint.

      this.logger.log(
        `Fingerprint capture completed for user ${request.userId}. Success: ${overallSuccess}, Fingers: ${fingerprintDataIds.length}`,
      );

      return {
        biometricDataId: biometricData.id,
        fingerprintDataIds,
        validationResults,
        overallSuccess,
        errors,
      };
    } catch (error) {
      this.logger.error('Fingerprint capture failed', error.stack);
      throw error;
    }
  }

  /**
   * Retrieve fingerprint data for a user
   * @param userId - User ID
   * @param submissionId - Optional submission ID
   * @returns Decrypted fingerprint data
   */
  async getFingerprintData(userId: string, submissionId?: string) {
    const biometricData = await this.prisma.biometricData.findFirst({
      where: {
        userId,
        ...(submissionId && { submissionId }),
      },
      include: {
        fingerprintFingers: {
          orderBy: { fingerPosition: 'asc' },
        },
      },
    });

    if (!biometricData) {
      throw new NotFoundException('Fingerprint data not found');
    }

    // Decrypt fingerprint data
    const decryptedFingers = await Promise.all(
      biometricData.fingerprintFingers.map(async (finger) => {
        try {
          // Decrypt template data
          const metadata = finger.metadata as any;
          const templateDecryption =
            await this.encryptionService.decryptBiometricData(
              finger.templateData,
              Buffer.from(metadata.templateIV, 'base64'),
              Buffer.from(metadata.templateTag, 'base64'),
              `template_${finger.fingerPosition}`,
            );

          // Decrypt WSQ image if available
          let wsqImageData = null;
          if (finger.wsqImageData) {
            const wsqDecryption =
              await this.encryptionService.decryptBiometricData(
                finger.wsqImageData,
                Buffer.from(metadata.wsqIV, 'base64'),
                Buffer.from(metadata.wsqTag, 'base64'),
                `wsq_${finger.fingerPosition}`,
              );
            wsqImageData = wsqDecryption.decryptedData;
          }

          return {
            id: finger.id,
            fingerPosition: finger.fingerPosition,
            fingerName: finger.fingerName,
            templateData: templateDecryption.decryptedData,
            wsqImageData,
            nfiqScore: finger.nfiqScore,
            qualityScore: finger.qualityScore,
            isAcceptable: finger.isAcceptable,
            isTemplateValid: finger.isTemplateValid,
            capturedAt: finger.capturedAt,
            captureDevice: finger.captureDevice,
            captureMethod: finger.captureMethod,
          };
        } catch (error) {
          this.logger.error(
            `Failed to decrypt fingerprint data for ${finger.fingerPosition}`,
            error.stack,
          );
          return null;
        }
      }),
    );

    return {
      id: biometricData.id,
      userId: biometricData.userId,
      submissionId: biometricData.submissionId,
      capturedAt: biometricData.capturedAt,
      captureDevice: biometricData.captureDevice,
      captureLocation: biometricData.captureLocation,
      fingers: decryptedFingers.filter(Boolean),
    };
  }

  /**
   * Delete fingerprint data (soft delete for audit purposes)
   * @param biometricDataId - Biometric data ID
   * @param deletedBy - User who deleted the data
   */
  async deleteFingerprintData(
    biometricDataId: string,
    deletedBy: string,
  ): Promise<void> {
    const biometricData = await this.prisma.biometricData.findUnique({
      where: { id: biometricDataId },
    });

    if (!biometricData) {
      throw new NotFoundException('Fingerprint data not found');
    }

    // Soft delete by updating metadata
    const currentMetadata = (biometricData.photoMetadata as any) || {};
    await this.prisma.biometricData.update({
      where: { id: biometricDataId },
      data: {
        lastModifiedBy: deletedBy,
        photoMetadata: {
          ...currentMetadata,
          deletedAt: new Date().toISOString(),
          deletedBy,
          deletionReason: 'User request',
        },
      },
    });

    this.logger.log(
      `Fingerprint data ${biometricDataId} soft deleted by ${deletedBy}`,
    );
  }

  /**
   * Get finger name from position
   * @param position - Finger position
   * @returns Human-readable finger name
   */
  private getFingerName(position: FingerPosition): string {
    const names = {
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
    return names[position] || position;
  }

  /**
   * List fingerprint data with pagination and filtering
   * @param options - Query options
   * @returns Paginated list of fingerprint data
   */
  async listFingerprintData(options: {
    page: number;
    limit: number;
    userId?: string;
    submissionId?: string;
  }) {
    const { page, limit, userId, submissionId } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (submissionId) where.submissionId = submissionId;

    const [biometricData, total] = await Promise.all([
      this.prisma.biometricData.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          fingerprintFingers: {
            select: {
              id: true,
              fingerPosition: true,
              fingerName: true,
              nfiqScore: true,
              qualityScore: true,
              isAcceptable: true,
              isTemplateValid: true,
              capturedAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.biometricData.count({ where }),
    ]);

    return {
      data: biometricData,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get fingerprint data by submission ID
   * @param submissionId - Submission ID
   * @returns Fingerprint data for the submission
   */
  async getFingerprintDataBySubmissionId(submissionId: string) {
    const biometricData = await this.prisma.biometricData.findFirst({
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
        fingerprintFingers: {
          orderBy: { fingerPosition: 'asc' },
        },
      },
    });

    if (!biometricData) {
      throw new NotFoundException(
        'Fingerprint data not found for this submission',
      );
    }

    // Decrypt fingerprint data
    const decryptedFingers = await Promise.all(
      biometricData.fingerprintFingers.map(async (finger) => {
        try {
          // Decrypt template data
          const metadata = finger.metadata as any;
          const templateDecryption =
            await this.encryptionService.decryptBiometricData(
              finger.templateData,
              Buffer.from(metadata.templateIV, 'base64'),
              Buffer.from(metadata.templateTag, 'base64'),
              `template_${finger.fingerPosition}`,
            );

          // Decrypt WSQ image if available
          let wsqImageData = null;
          if (finger.wsqImageData) {
            const wsqDecryption =
              await this.encryptionService.decryptBiometricData(
                finger.wsqImageData,
                Buffer.from(metadata.wsqIV, 'base64'),
                Buffer.from(metadata.wsqTag, 'base64'),
                `wsq_${finger.fingerPosition}`,
              );
            wsqImageData = wsqDecryption.decryptedData;
          }

          return {
            id: finger.id,
            fingerPosition: finger.fingerPosition,
            fingerName: finger.fingerName,
            templateData: templateDecryption.decryptedData,
            wsqImageData,
            nfiqScore: finger.nfiqScore,
            qualityScore: finger.qualityScore,
            isAcceptable: finger.isAcceptable,
            isTemplateValid: finger.isTemplateValid,
            capturedAt: finger.capturedAt,
            captureDevice: finger.captureDevice,
            captureMethod: finger.captureMethod,
          };
        } catch (error) {
          this.logger.error(
            `Failed to decrypt fingerprint data for ${finger.fingerPosition}`,
            error.stack,
          );
          return null;
        }
      }),
    );

    return {
      id: biometricData.id,
      userId: biometricData.userId,
      submissionId: biometricData.submissionId,
      user: biometricData.user,
      capturedAt: biometricData.capturedAt,
      captureDevice: biometricData.captureDevice,
      captureLocation: biometricData.captureLocation,
      isVerified: biometricData.isVerified,
      verificationStatus: biometricData.verificationStatus,
      fingers: decryptedFingers.filter(Boolean),
    };
  }

  /**
   * Upload photo for an applicant using submission id
   * @param submissionId - Form submission id
   * @param photo - Photo file from multer
   * @param uploadedBy - User ID who uploaded the photo
   * @param userContext - User's booth and center context
   * @returns Photo upload result
   */
  async uploadPhoto(
    submissionId: string,
    photo: Express.Multer.File,
    uploadedBy: string,
    userContext: any,
  ): Promise<{
    photoUrl: string;
    photoHash: string;
    photoQualityScore: number;
    photoSize: number;
    photoMimeType: string;
    referenceNumber: string;
    uploadedAt: string;
  }> {
    this.logger.log(`Uploading photo for submission ${submissionId}`);

    // Find the submission by id
    const submission = await this.prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: true,
        form: {
          include: {
            country: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException(
        `Application with id "${submissionId}" not found`,
      );
    }

    // Generate photo hash for integrity verification
    const photoHash = crypto
      .createHash('sha256')
      .update(photo.buffer as any)
      .digest('hex');

    // Calculate photo quality score
    const photoQualityScore = this.calculatePhotoQuality(photo);

    // Upload photo to storage
    const photoUrl = await this.localStorageService.upload(
      photo,
      'biometric-photos',
    );

    // Generate capture location and device info
    const captureLocation = `${userContext.centerName} - Booth ${userContext.boothNumber}`;
    const captureDevice = `Photo Capture - ${userContext.centerName}`;

    // Create or update biometric data record
    const biometricData = await this.prisma.biometricData.upsert({
      where: {
        submissionId: submission.id,
      },
      update: {
        photoUrl,
        photoHash,
        photoQualityScore,
        photoMetadata: {
          originalName: photo.originalname,
          mimeType: photo.mimetype,
          size: photo.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy,
          captureLocation,
          captureDevice,
        },
        capturedBy: uploadedBy,
        capturedAt: new Date(),
        captureDevice,
        captureLocation,
      },
      create: {
        userId: submission.userId,
        submissionId: submission.id,
        photoUrl,
        photoHash,
        photoQualityScore,
        photoMetadata: {
          originalName: photo.originalname,
          mimeType: photo.mimetype,
          size: photo.size,
          uploadedAt: new Date().toISOString(),
          uploadedBy,
          captureLocation,
          captureDevice,
        },
        capturedBy: uploadedBy,
        capturedAt: new Date(),
        captureDevice,
        captureLocation,
        isEncrypted: true,
        encryptionAlgorithm: 'AES-256-GCM',
      },
    });

    // Update biometric session photo capture status
    try {
      const appointment = await this.prisma.biometricAppointment.findUnique({
        where: { submissionId: submission.id },
        select: { id: true },
      });

      if (appointment) {
        await this.prisma.biometricSession.updateMany({
          where: { appointmentId: appointment.id },
          data: {
            photoCaptured: true,
            photoUrl,
            photoQualityScore,
          },
        });

        this.logger.log(
          `Biometric session photo capture status updated for appointment ${appointment.id}`,
        );
      }
    } catch (error) {
      // Don't fail photo upload if session update fails
      this.logger.warn(
        `Failed to update biometric session for photo upload: ${error.message}`,
      );
    }

    this.logger.log(
      `Photo uploaded successfully for submission ${submissionId}, biometric data ID: ${biometricData.id}`,
    );

    return {
      photoUrl,
      photoHash,
      photoQualityScore,
      photoSize: photo.size,
      photoMimeType: photo.mimetype,
      referenceNumber: submission.referenceNumber || 'N/A',
      uploadedAt: new Date().toISOString(),
    };
  }

  /**
   * Calculate photo quality score based on various factors
   * @param photo - The uploaded photo file
   * @returns Quality score (0-100)
   */
  private calculatePhotoQuality(photo: Express.Multer.File): number {
    let qualityScore = 0;

    // File size factor (larger files generally have better quality)
    const sizeFactor = Math.min(100, (photo.size / (2 * 1024 * 1024)) * 100); // 2MB = 100%

    // MIME type factor (JPEG and PNG are preferred)
    let mimeTypeFactor = 0;
    switch (photo.mimetype) {
      case 'image/jpeg':
      case 'image/jpg':
        mimeTypeFactor = 100;
        break;
      case 'image/png':
        mimeTypeFactor = 95;
        break;
      case 'image/webp':
        mimeTypeFactor = 90;
        break;
      case 'image/gif':
        mimeTypeFactor = 70;
        break;
      default:
        mimeTypeFactor = 50;
    }

    // Filename factor (proper naming indicates better capture process)
    const filenameFactor =
      photo.originalname && photo.originalname.length > 5 ? 100 : 80;

    // Calculate weighted average
    qualityScore =
      sizeFactor * 0.4 + mimeTypeFactor * 0.4 + filenameFactor * 0.2;

    // Ensure score is within bounds
    return Math.round(Math.max(0, Math.min(100, qualityScore)));
  }

  /**
   * Get capture status for an applicant by submission ID
   * @param submissionId - Form submission ID
   * @returns Detailed capture status
   */
  async getCaptureStatus(submissionId: string) {
    // Get submission with user info and basic application details
    const submission = await this.prisma.formSubmission.findUnique({
      where: { id: submissionId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        form: {
          select: {
            name: true,
            country: {
              select: { name: true },
            },
          },
        },
        appointment: {
          select: {
            status: true,
            appointmentClass: true,
            appointmentTime: true,
          },
        },
      },
    });

    if (!submission) {
      throw new NotFoundException('Submission not found');
    }

    // Get biometric data if it exists
    const biometricData = await this.prisma.biometricData.findFirst({
      where: { submissionId },
      include: {
        fingerprintFingers: {
          orderBy: { fingerPosition: 'asc' },
        },
      },
    });

    // Define all required fingers
    const allFingers: FingerPosition[] = [
      'LEFT_THUMB',
      'LEFT_INDEX',
      'LEFT_MIDDLE',
      'LEFT_RING',
      'LEFT_LITTLE',
      'RIGHT_THUMB',
      'RIGHT_INDEX',
      'RIGHT_MIDDLE',
      'RIGHT_RING',
      'RIGHT_LITTLE',
    ];

    // Map fingerprint status
    const fingerprintStatus = allFingers.map((position) => {
      const finger = biometricData?.fingerprintFingers?.find(
        (f) => f.fingerPosition === position,
      );

      return {
        position,
        fingerName: this.getFingerName(position),
        isCaptured: !!finger,
        qualityScore: finger?.qualityScore || undefined,
        nfiqScore: finger?.nfiqScore || undefined,
        isAcceptable: finger?.isAcceptable || undefined,
        capturedAt: finger?.capturedAt?.toISOString() || undefined,
        captureAttempts: finger?.captureAttempts || undefined,
        capturedBy: finger?.createdBy || undefined,
      };
    });

    // Calculate completion status
    const capturedCount = fingerprintStatus.filter((f) => f.isCaptured).length;
    const photoCaptured = !!biometricData?.photoUrl;
    const totalItems = allFingers.length + 1; // 10 fingers + 1 photo
    const completedItems = capturedCount + (photoCaptured ? 1 : 0);
    const completionPercentage = Math.round(
      (completedItems / totalItems) * 100,
    );

    const missingItems: string[] = [];
    if (!photoCaptured) {
      missingItems.push('PHOTO');
    }
    fingerprintStatus.forEach((f) => {
      if (!f.isCaptured) {
        missingItems.push(f.position);
      }
    });

    return {
      submissionId: submission.id,
      application: {
        referenceNumber: submission.referenceNumber ?? null,
        formName: submission.form?.name ?? null,
        country: submission.form?.country?.name ?? null,
        appointmentStatus: submission.appointment?.status ?? null,
        appointmentClass: submission.appointment?.appointmentClass ?? null,
        appointmentTime:
          submission.appointment?.appointmentTime?.toISOString() ?? null,
      },
      applicant: {
        id: (submission as any).user.id,
        firstName: (submission as any).user.firstName || '',
        lastName: (submission as any).user.lastName || '',
        email: (submission as any).user.email || '',
      },
      photo: {
        isCaptured: photoCaptured,
        qualityScore: biometricData?.photoQualityScore || undefined,
        capturedAt: biometricData?.capturedAt?.toISOString() || undefined,
        photoUrl: biometricData?.photoUrl || undefined,
        capturedBy: biometricData?.capturedBy || undefined,
      },
      fingerprints: fingerprintStatus,
      overallStatus: {
        isComplete: completedItems === totalItems,
        completionPercentage,
        missingItems,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get biometric officer statistics
   */
  async getOfficerStats(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [
      totalApplicantsCaptured,
      applicantsCapturedToday,
      activeSessions,
      sessionsCompletedToday,
    ] = await Promise.all([
      // Applicants captured = distinct submissions with any fingerprints or photo captured by this user
      this.prisma.biometricData.count({ where: { capturedBy: userId } }),
      this.prisma.biometricData.count({
        where: {
          capturedBy: userId,
          capturedAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
      this.prisma.biometricSession.count({
        where: { agentId: userId, completedAt: null },
      }),
      this.prisma.biometricSession.count({
        where: {
          agentId: userId,
          completedAt: { gte: startOfDay, lte: endOfDay },
        },
      }),
    ]);

    return {
      totalApplicantsCaptured,
      applicantsCapturedToday,
      activeSessions,
      sessionsCompletedToday,
    };
  }

  /**
   * Get biometric officer capture history
   */
  async getOfficerHistory(
    userId: string,
    filters: {
      fromDate?: string;
      toDate?: string;
      page: number;
      pageSize: number;
    },
  ) {
    const { page, pageSize } = filters;
    const whereDate: any = {};
    if (filters.fromDate) {
      const start = new Date(filters.fromDate);
      start.setHours(0, 0, 0, 0);
      whereDate.gte = start;
    }
    if (filters.toDate) {
      const end = new Date(filters.toDate);
      end.setHours(23, 59, 59, 999);
      whereDate.lte = end;
    }

    const whereBiometricData: any = {
      capturedBy: userId,
      ...(filters.fromDate || filters.toDate ? { capturedAt: whereDate } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.biometricData.findMany({
        where: whereBiometricData,
        orderBy: { capturedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          submission: {
            select: {
              id: true,
              referenceNumber: true,
              user: { select: { firstName: true, lastName: true } },
              form: {
                select: { name: true, country: { select: { name: true } } },
              },
            },
          },
          fingerprintFingers: { select: { id: true } },
        },
      }),
      this.prisma.biometricData.count({ where: whereBiometricData }),
    ]);

    const mapped = items.map((bd) => ({
      submissionId: bd.submission?.id ?? '',
      referenceNumber: bd.submission?.referenceNumber ?? null,
      capturedAt: bd.capturedAt?.toISOString() ?? '',
      applicantName: `${bd.submission?.user?.firstName ?? ''} ${bd.submission?.user?.lastName ?? ''
        }`.trim(),
      formName: bd.submission?.form?.name ?? '',
      country: bd.submission?.form?.country?.name ?? '',
      center: bd.captureLocation?.split(' - Booth ')[0] ?? '',
      booth: bd.captureLocation?.split(' - Booth ')[1] ?? '',
      fingersCaptured: bd.fingerprintFingers.length,
      photoUploaded: !!bd.photoUrl,
    }));

    return { items: mapped, page, pageSize, total };
  }
}
