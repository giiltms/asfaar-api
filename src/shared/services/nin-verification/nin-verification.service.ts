import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { YouVerifyProvider } from './providers/youverify.provider';
import { TempNINData, Gender } from '@prisma/client';

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

      // Check if NIN already exists in temp data
      const existingTemp = await this.prisma.tempNINData.findUnique({
        where: { nin: normalizedNin }
      });

      if (existingTemp) {
        throw new ConflictException('NIN verification already in progress. Please use confirm-nin endpoint.');
      }

      // Verify with YouVerify
      const verificationResponse = await this.youVerifyProvider.verifyNin({
        nin: normalizedNin,
        reference: `nin-verify-${Date.now()}`
      });

      if (!verificationResponse.success || !verificationResponse.data) {
        return {
          success: false,
          error: verificationResponse.error || 'NIN verification failed'
        };
      }

      const verifiedData = verificationResponse.data;

      // Validate date of birth matches
      if (verifiedData.dateOfBirth) {
        const verifiedDob = new Date(verifiedData.dateOfBirth).toISOString().split('T')[0];
        const providedDob = new Date(request.dateOfBirth).toISOString().split('T')[0];

        if (verifiedDob !== providedDob) {
          return {
            success: false,
            error: 'Date of birth does not match NIN records'
          };
        }
      }

      // Save to temp schema
      const tempNinData = await this.prisma.tempNINData.create({
        data: {
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
        }
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
        }
      };

    } catch (error) {
      this.logger.error(`NIN verification failed: ${error.message}`);

      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }

      return {
        success: false,
        error: 'Internal server error during NIN verification'
      };
    }
  }

  async confirmNin(request: ConfirmNinDto, userId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get temp NIN data
      const tempNinData = await this.prisma.tempNINData.findUnique({
        where: { id: request.tempNinId }
      });

      if (!tempNinData) {
        throw new BadRequestException('Invalid or expired NIN verification');
      }

      // Check if user already has NIN
      const existingUser = await this.prisma.user.findUnique({
        where: { id: userId }
      });

      if (existingUser?.nin) {
        throw new ConflictException('User already has a verified NIN');
      }

      // Update user with NIN data
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          nin: tempNinData.nin,
          firstName: tempNinData.firstName || existingUser?.firstName,
          middleName: tempNinData.middleName || existingUser?.middleName,
          lastName: tempNinData.lastName || existingUser?.lastName,
          dateOfBirth: new Date(tempNinData.dateOfBirth),
          gender: tempNinData.gender as Gender,
          state: tempNinData.state || existingUser?.state,
          lga: tempNinData.lga || existingUser?.lga,
        }
      });

      // Delete temp data
      await this.prisma.tempNINData.delete({
        where: { id: request.tempNinId }
      });

      return {
        success: true,
        message: 'NIN verified and linked to user successfully'
      };

    } catch (error) {
      this.logger.error(`NIN confirmation failed: ${error.message}`);

      if (error instanceof BadRequestException || error instanceof ConflictException) {
        throw error;
      }

      throw new BadRequestException('Failed to confirm NIN verification');
    }
  }
} 