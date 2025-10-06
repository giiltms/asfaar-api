import {
  Injectable,
  Logger,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { YouVerifyProvider } from './providers/youverify.provider';
import { Gender } from '@prisma/client';

export interface VerifyNinDto {
  nin: string;
  dateOfBirth: string;
}

export interface ConfirmNinDto {
  tempNinId: string;
}

export interface NinVerificationResult {
  success: boolean;
  tempNinId?: string;
  data?: {
    nin: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    fullName: string;
    dateOfBirth: string;
    gender: string;
    phoneNumber?: string;
    photo?: string;
    address?: {
      line1?: string;
      city?: string;
      state?: string;
      lga?: string;
      country?: string;
    };
    birthPlace?: {
      state?: string;
      lga?: string;
    };
  };
  error?: string;
}

@Injectable()
export class NinVerificationService {
  private readonly logger = new Logger(NinVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly youVerifyProvider: YouVerifyProvider,
  ) {}

  async verifyNin(request: VerifyNinDto): Promise<NinVerificationResult> {
    try {
      // Normalize NIN
      const normalizedNin = request.nin.replace(/\D/g, '');

      if (normalizedNin.length !== 11) {
        throw new BadRequestException('NIN must be 11 digits');
      }

      // Check if NIN already exists in temp data - we'll upsert instead of throwing error
      const existingTemp = await this.prisma.tempNINData.findUnique({
        where: { nin: normalizedNin },
      });

      // Check if NIN has already been used by any user
      const existingUser = await this.prisma.user.findFirst({
        where: { nin: normalizedNin },
      });

      if (existingUser) {
        throw new ConflictException(
          'This NIN has already been used by another user and cannot be verified again.',
        );
      }

      // Check if NIN exists in verified NIN verifications
      const existingVerification = await this.prisma.ninVerification.findFirst({
        where: {
          nin: normalizedNin,
          verificationStatus: 'VERIFIED',
        },
      });

      if (existingVerification) {
        throw new ConflictException(
          'This NIN has already been verified and cannot be used again.',
        );
      }

      // Verify with YouVerify
      const verificationResponse = await this.youVerifyProvider.verifyNin({
        nin: normalizedNin,
        reference: `nin-verify-${Date.now()}`,
      });

      if (!verificationResponse.success || !verificationResponse.data) {
        return {
          success: false,
          error: verificationResponse.error || 'NIN verification failed',
        };
      }

      const verifiedData = verificationResponse.data;

      // Validate date of birth matches
      if (verifiedData.dateOfBirth) {
        const verifiedDob = new Date(verifiedData.dateOfBirth)
          .toISOString()
          .split('T')[0];
        const providedDob = new Date(request.dateOfBirth)
          .toISOString()
          .split('T')[0];

        if (verifiedDob !== providedDob) {
          return {
            success: false,
            error: 'Date of birth does not match NIN records',
          };
        }
      }

      // Upsert to temp schema - update existing or create new
      const tempNinData = await this.prisma.tempNINData.upsert({
        where: { nin: normalizedNin },
        update: {
          firstName: verifiedData.firstName || '',
          middleName: verifiedData.middleName,
          lastName: verifiedData.lastName || '',
          fullName: verifiedData.fullName,
          dateOfBirth: request.dateOfBirth,
          gender: verifiedData.gender || 'MALE',
          phoneNumber: verifiedData.phoneNumber,
          photo: verifiedData.photo,
          addressLine1: verifiedData.address?.line1 || '',
          city: verifiedData.address?.city,
          state: verifiedData.address?.state || '',
          lga: verifiedData.address?.lga || '',
          country: verifiedData.address?.country || 'Nigeria',
          birthState: verifiedData.birthPlace?.state,
          birthLga: verifiedData.birthPlace?.lga,
          verificationId: verificationResponse.verificationId,
          verified: true,
          verificationStatus: 'VERIFIED',
          verificationMethod: 'YOUVERIFY',
          verificationDate: new Date(),
          verificationAttempts: existingTemp
            ? existingTemp.verificationAttempts + 1
            : 1,
          lastVerificationAttempt: new Date(),
        },
        create: {
          nin: normalizedNin,
          firstName: verifiedData.firstName || '',
          middleName: verifiedData.middleName,
          lastName: verifiedData.lastName || '',
          fullName: verifiedData.fullName,
          dateOfBirth: request.dateOfBirth,
          gender: verifiedData.gender || 'MALE',
          phoneNumber: verifiedData.phoneNumber,
          photo: verifiedData.photo,
          addressLine1: verifiedData.address?.line1 || '',
          city: verifiedData.address?.city,
          state: verifiedData.address?.state || '',
          lga: verifiedData.address?.lga || '',
          country: verifiedData.address?.country || 'Nigeria',
          birthState: verifiedData.birthPlace?.state,
          birthLga: verifiedData.birthPlace?.lga,
          verificationId: verificationResponse.verificationId,
          verified: true,
          verificationStatus: 'VERIFIED',
          verificationMethod: 'YOUVERIFY',
          verificationDate: new Date(),
          verificationAttempts: 1,
          lastVerificationAttempt: new Date(),
        },
      });

      return {
        success: true,
        tempNinId: tempNinData.id,
        data: {
          nin: tempNinData.nin,
          firstName: tempNinData.firstName,
          middleName: tempNinData.middleName,
          lastName: tempNinData.lastName,
          fullName: tempNinData.fullName,
          dateOfBirth: tempNinData.dateOfBirth,
          gender: tempNinData.gender,
          phoneNumber: tempNinData.phoneNumber,
          photo: tempNinData.photo,
          address: {
            line1: tempNinData.addressLine1,
            city: tempNinData.city,
            state: tempNinData.state,
            lga: tempNinData.lga,
            country: tempNinData.country,
          },
          birthPlace: {
            state: tempNinData.birthState,
            lga: tempNinData.birthLga,
          },
        },
      };
    } catch (error) {
      this.logger.error(`NIN verification failed: ${error.message}`);

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      return {
        success: false,
        error: 'Internal server error during NIN verification',
      };
    }
  }

  async confirmNin(
    request: ConfirmNinDto,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Get temp NIN data
      const tempNinData = await this.prisma.tempNINData.findUnique({
        where: { id: request.tempNinId },
      });

      if (!tempNinData) {
        throw new BadRequestException('Invalid or expired NIN verification');
      }

      // Check if user already has NIN
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (existingUser?.nin) {
        throw new ConflictException('User already has a verified NIN');
      }

      // Update user with NIN data
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          nin: tempNinData.nin,
          ninVerified: true, // Set NIN verification status to true
          firstName: tempNinData.firstName || existingUser?.firstName,
          middleName: tempNinData.middleName || existingUser?.middleName,
          lastName: tempNinData.lastName || existingUser?.lastName,
          dateOfBirth: new Date(tempNinData.dateOfBirth),
          gender: tempNinData.gender as Gender,
          state: tempNinData.state || existingUser?.state,
          lga: tempNinData.lga || existingUser?.lga,
        },
      });

      // Save to NinVerification model
      await this.prisma.ninVerification.create({
        data: {
          nin: tempNinData.nin,
          firstName: tempNinData.firstName,
          middleName: tempNinData.middleName,
          lastName: tempNinData.lastName,
          fullName: tempNinData.fullName,
          dateOfBirth: new Date(tempNinData.dateOfBirth),
          gender: tempNinData.gender as Gender,
          phoneNumber: tempNinData.phoneNumber,
          verifiedPhoneNumber: tempNinData.verifiedPhoneNumber,
          photo: tempNinData.photo,
          addressLine1: tempNinData.addressLine1,
          addressLine2: tempNinData.addressLine2,
          city: tempNinData.city,
          state: tempNinData.state,
          lga: tempNinData.lga,
          postalCode: tempNinData.postalCode,
          country: tempNinData.country,
          birthState: tempNinData.birthState,
          birthLga: tempNinData.birthLga,
          verificationStatus: 'VERIFIED',
          verificationMethod: 'YOUVERIFY',
          verificationId: tempNinData.verificationId,
          trackingId: tempNinData.trackingId,
          verificationDate: tempNinData.verificationDate || new Date(),
          rawData: tempNinData.rawData,
          userId: userId,
        },
      });

      // Delete temp data
      await this.prisma.tempNINData.delete({
        where: { id: request.tempNinId },
      });

      return {
        success: true,
        message: 'NIN verified and linked to user successfully',
      };
    } catch (error) {
      this.logger.error(`NIN confirmation failed: ${error.message}`);

      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      throw new BadRequestException('Failed to confirm NIN verification');
    }
  }

  /**
   * Check if a NIN is available for verification
   * This method can be used by the frontend to check NIN availability before initiating verification
   */
  async checkNinAvailability(nin: string): Promise<{
    available: boolean;
    reason?: string;
    existingUser?: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
    };
  }> {
    try {
      // Normalize NIN
      const normalizedNin = nin.replace(/\D/g, '');

      if (normalizedNin.length !== 11) {
        return {
          available: false,
          reason: 'NIN must be 11 digits',
        };
      }

      // Check if NIN already exists in temp data - now we allow re-verification
      // We'll just update the existing record instead of creating a new one

      // Check if NIN has already been used by any user
      const existingUser = await this.prisma.user.findFirst({
        where: { nin: normalizedNin },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      });

      if (existingUser) {
        return {
          available: false,
          reason: 'This NIN has already been used by another user',
          existingUser,
        };
      }

      // Check if NIN exists in verified NIN verifications
      const existingVerification = await this.prisma.ninVerification.findFirst({
        where: {
          nin: normalizedNin,
          verificationStatus: 'VERIFIED',
        },
      });

      if (existingVerification) {
        return {
          available: false,
          reason: 'This NIN has already been verified and cannot be used again',
        };
      }

      return {
        available: true,
      };
    } catch (error) {
      this.logger.error(`Error checking NIN availability: ${error.message}`);
      return {
        available: false,
        reason: 'Error checking NIN availability',
      };
    }
  }
}
