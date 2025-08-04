import { 
  Injectable, 
  Logger, 
  NotFoundException, 
  ConflictException,
  BadRequestException,
  HttpException,
  HttpStatus 
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { 
  YouVerifyService, 
  YouVerifyVerificationData, 
  YouVerifyResponse 
} from '@providers/youverify/youverify.service';

import { 
  NinVerification, 
  VerificationStatus, 
  VerificationMethod 
} from './entities/nin.entity';
import { 
  VerifyNinDto, 
  NinVerificationResponseDto,
  GetNinVerificationDto,
  NinVerificationHistoryDto 
} from './dtos/nin.dto';
import { AuthenticatedUser } from './nin.permissions';
import { NinRepository } from './nin.repository';

export interface VerificationContext {
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  forceVerification?: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class NinService {
  private readonly logger = new Logger(NinService.name);

  constructor(
     private readonly ninRepository: NinRepository,
    private readonly youVerifyService: YouVerifyService,
  ) {}

  async verifyNin(
    verifyNinDto: VerifyNinDto, 
    context: VerificationContext = {}
  ): Promise<NinVerificationResponseDto> {

    const { nin, forceVerification } = verifyNinDto;
    const { userId, ipAddress, userAgent } = context;

    this.logger.log(`Starting NIN verification for: ${nin}`);

    try {
     

      // Check if NIN already exists and is verified
      const existingVerification = await this.findByNin(nin);
      
      if (existingVerification && existingVerification.isVerified && !forceVerification) {
        this.logger.log(`NIN ${nin} already verified, returning existing data`);
        
        // Update last verification attempt
        await this.ninRepository.update(nin,
          { 
            lastVerificationAttempt: new Date(),
            verificationAttempts: existingVerification.verificationAttempts + 1,
          }
        );

        return this.mapToResponseDto(existingVerification);
      }

      // Perform verification using YouVerify service
      const youVerifyResponse = await this.youVerifyService.verifyNin({ nin });
      console.log("nin.service->data: ",youVerifyResponse)
      
      if (!youVerifyResponse.success) {
        
        this.logger.error(`NIN verification failed for ${nin}:`);
        
        throw new HttpException(
          'NIN verification failed. Please try again later.',
          HttpStatus.BAD_REQUEST
        );
      }

      // Save or update verification data
      const savedVerification = await this.saveVerificationData(
        youVerifyResponse.data,
        youVerifyResponse.metadata,
        userId,
        ipAddress,
        userAgent
      );

      this.logger.log(`NIN verification completed successfully for: ${nin}`);
      
      return this.mapToResponseDto(savedVerification, youVerifyResponse.metadata);

    } catch (error) {
      this.logger.error(`NIN verification failed for ${nin}:`, error.message);
      
      
      // Re-throw the error to be handled by the controller
      throw error;
    }
  }

  async getNinVerification(
    getNinDto: GetNinVerificationDto,
    user: AuthenticatedUser
  ): Promise<NinVerificationResponseDto> {
    const { nin } = getNinDto;
    
    this.logger.log(`Retrieving NIN verification for: ${nin}`);

    const verification = await this.findByNin(nin);
    
    if (!verification) {
      throw new NotFoundException(`NIN verification not found: ${nin}`);
    }

    // Check if user can access this NIN data
    if (verification.userId && verification.userId !== user.id && !['admin', 'moderator'].includes(user.role)) {
      throw new NotFoundException(`NIN verification not found: ${nin}`);
    }

    return this.mapToResponseDto(verification);
  }



  async deleteNinVerification(nin: string, user: AuthenticatedUser): Promise<void> {
    this.logger.log(`Deleting NIN verification for: ${nin}`);

    const verification = await this.findByNin(nin);
    
    if (!verification) {
      throw new NotFoundException(`NIN verification not found: ${nin}`);
    }

    // Check permissions
    if (verification.userId && verification.userId !== user.id && user.role !== 'admin') {
      throw new NotFoundException(`NIN verification not found: ${nin}`);
    }

    await this.ninRepository.delete(nin);
    
    this.logger.log(`NIN verification deleted successfully for: ${nin}`);
  }

  async updateNinVerification(
    nin: string,
    updateData: Partial<YouVerifyVerificationData>,
    user: AuthenticatedUser
  ): Promise<NinVerificationResponseDto> {
    this.logger.log(`Updating NIN verification for: ${nin}`);

    const verification = await this.findByNin(nin);
    
    if (!verification) {
      throw new NotFoundException(`NIN verification not found: ${nin}`);
    }

    // Check permissions
    if (verification.userId && verification.userId !== user.id && !['admin', 'moderator'].includes(user.role)) {
      throw new NotFoundException(`NIN verification not found: ${nin}`);
    }

    const previousData = { ...verification };
    
    // Update verification data
    const updatedVerification = await this.updateVerificationData(verification, updateData);

   

    return this.mapToResponseDto(updatedVerification);
  }


  // Private helper methods
  private async findByNin(nin: string): Promise<any| null> {
    return await this.ninRepository.findByNin(nin);
  }

  private async saveVerificationData(
    verificationData: any, // YouVerifyVerificationData
    metadata: any,
    userId?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<any> {
    const nin = verificationData.idNumber;
    const existingVerification = await this.findByNin(nin);

    const verificationEntity = {
      nin,
      firstName: verificationData.firstName,
      middleName: verificationData.middleName,
      lastName: verificationData.lastName,
      fullName: `${verificationData.firstName ?? ''} ${verificationData.middleName ?? ''} ${verificationData.lastName ?? ''}`.trim(),
      dateOfBirth: verificationData.dateOfBirth,
      gender: verificationData.gender?.toLowerCase() === 'male' ? 'MALE' : 'FEMALE',
      phoneNumber: verificationData.mobile || null,
      verifiedPhoneNumber: null, // YouVerify doesn't provide this, set to null or implement later
      photo: verificationData.image || null,

      // Address mapping
      addressLine1: verificationData.address?.addressLine || null,
      addressLine2: null,
      city: verificationData.address?.city || null,
      state: verificationData.address?.state || null,
      lga: verificationData.address?.lga || null,
      postalCode: null, // Not provided
      country: verificationData.birthCountry || 'Nigeria',

      // Birthplace fields (inferred from birthState/birthLGA)
      birthState: verificationData.birthState || null,
      birthLga: verificationData.birthLGA || null,

      verificationStatus: VerificationStatus.VERIFIED,
      verificationMethod: this.mapVerificationMethod('youverify'),
      verificationId: verificationData.id,
      trackingId: null, // Not in YouVerify response
      verificationDate: new Date(),
      rawData: verificationData,
      userId,
      verificationAttempts: existingVerification ? existingVerification.verificationAttempts + 1 : 1,
    };

    if (existingVerification) {
      await this.ninRepository.update(nin, verificationEntity);
      return await this.findByNin(nin) as NinVerification;
    } else {
      return await this.ninRepository.create(verificationEntity);
    }
  }


  private async updateVerificationData(
    verification: NinVerification,
    updateData: Partial<YouVerifyVerificationData>
  ): Promise<any> {
    const updateEntity: Partial<NinVerification> = {};

    if (updateData.firstName) updateEntity.firstName = updateData.firstName;
    if (updateData.middleName) updateEntity.middleName = updateData.middleName;
    if (updateData.lastName) updateEntity.lastName = updateData.lastName;
    if (updateData.fullName) updateEntity.fullName = updateData.fullName;
    if (updateData.dateOfBirth) updateEntity.dateOfBirth = updateData.dateOfBirth;
    if (updateData.gender) updateEntity.gender = updateData.gender as any;
    if (updateData.phoneNumber) updateEntity.phoneNumber = updateData.phoneNumber;
    if (updateData.photo) updateEntity.photo = updateData.photo;

    if (updateData.address) {
      if (updateData.address.line1) updateEntity.addressLine1 = updateData.address.line1;
      if (updateData.address.line2) updateEntity.addressLine2 = updateData.address.line2;
      if (updateData.address.city) updateEntity.city = updateData.address.city;
      if (updateData.address.state) updateEntity.state = updateData.address.state;
      if (updateData.address.lga) updateEntity.lga = updateData.address.lga;
      if (updateData.address.postalCode) updateEntity.postalCode = updateData.address.postalCode;
    }

    if (updateData.birthPlace) {
      if (updateData.birthPlace.state) updateEntity.birthState = updateData.birthPlace.state;
      if (updateData.birthPlace.lga) updateEntity.birthLga = updateData.birthPlace.lga;
    }

    await this.ninRepository.update(verification.nin, updateEntity);
    return await this.ninRepository.findByNin(verification.id);
  }

  private mapVerificationMethod(method: string): VerificationMethod {
    switch (method.toLowerCase()) {
      case 'youverify':
        return VerificationMethod.YOUVERIFY;
      case 'test_mode':
        return VerificationMethod.TEST_MODE;
      case 'manual':
        return VerificationMethod.MANUAL;
      case 'api':
        return VerificationMethod.API;
      default:
        return VerificationMethod.YOUVERIFY;
    }
  }

  private mapToResponseDto(
    verification: NinVerification,
    metadata?: any
  ): NinVerificationResponseDto {
    return {
      success: true,
      data: {
        nin: verification.nin,
        firstName: verification.firstName || '',
        middleName: verification.middleName || '',
        lastName: verification.lastName || '',
        fullName: verification.fullName || '',
        dateOfBirth: verification.dateOfBirth || '',
        gender: verification.gender || 'male',
        phoneNumber: verification.phoneNumber || '',
        verified: verification.isVerified,
        verificationId: verification.verificationId || '',
        verificationStatus: verification.verificationStatus,
        verificationDate: verification.verificationDate?.toISOString() || '',
        verificationMethod: verification.verificationMethod,
        photo: verification.photo,
        address: {
          line1: verification.addressLine1 || '',
          line2: verification.addressLine2 || '',
          city: verification.city || '',
          state: verification.state || '',
          lga: verification.lga || '',
          postalCode: verification.postalCode || '',
          country: verification.country,
        },
        birthPlace: {
          state: verification.birthState || '',
          lga: verification.birthLga || '',
        },
        trackingId: verification.trackingId || '',
        verifiedPhoneNumber: verification.verifiedPhoneNumber || '',
      },
      metadata: metadata || {
        verificationMethod: verification.verificationMethod,
        timestamp: verification.updatedAt.toISOString(),
        verificationAttempts: verification.verificationAttempts,
      },
    };
  }
}