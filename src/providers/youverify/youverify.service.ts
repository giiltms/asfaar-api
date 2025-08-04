import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

export interface YouVerifyVerificationData {
  nin: string;
  firstName: string;
  middleName: string;
  lastName: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phoneNumber: string;
  verified: boolean;
  verificationId: string;
  verificationStatus: string;
  verificationDate: string;
  verificationMethod: string;
  photo?: string | null;
  address: {
    line1: string;
    line2: string;
    city: string;
    state: string;
    lga: string;
    postalCode: string;
    country: string;
  };
  birthPlace: {
    state: string;
    lga: string;
  };
  trackingId: string;
  verifiedPhoneNumber: string;
  rawData?: any;
}


export interface YouVerifyRequest {
  nin: string;
}



export interface YouVerifyResponse {
  success: boolean;
  data?: any;
  metadata?: Record<string, any>;
  error?: string;
}

@Injectable()
export class YouVerifyService {
  private readonly logger = new Logger(YouVerifyService.name);

  private readonly youverifyApiKey: string;

  private readonly youverifyEndpoint: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {

    this.youverifyEndpoint = configService.get<string>('YOUVERIFY_ENDPOINT') || 'https://api.youverify.co/v2/api/identity/ng/nin'

    this.youverifyApiKey = configService.get<string>('YOUVERIFY_TOKEN');

    if (!this.youverifyApiKey || this.youverifyApiKey.length < 10) {
      throw new Error('❌ Missing or invalid YouVerify API key');
    }

    this.logger.log('✅ YouVerify API key loaded successfully');
  }

  async verifyNin(request: YouVerifyRequest): Promise<YouVerifyResponse> {
    const { nin } = request;

    if (!nin || !/^\d{11}$/.test(nin)) {
      throw new HttpException({
        success: false,
        error: 'NIN must be exactly 11 digits',
        details: { type: 'validation_error' }
      }, HttpStatus.BAD_REQUEST);
    }


    try {
      const response = await firstValueFrom(
        this.httpService.post(
          this.youverifyEndpoint,
          {
            id: nin,
            isSubjectConsent: true,
          },
          {
            headers: {
              token: this.youverifyApiKey,
              'Content-Type': 'application/json',
            },
          }
        )
      );

      const data = response.data;

      console.log("youverify->data: ", data)

      if (data.success) {
        return {
          success: true,
          data: data.data,
          metadata: {
            verificationMethod: 'youverify',
            timestamp: new Date().toISOString(),
            liveVerification: true,
            apiResponse: 'success',
          },
        };
      }

      this.logger.error(`❌ YouVerify NIN verification failed: ${data?.message}`);

      return {
        success: false,
        error: data?.message || 'Verification failed',
      };

    } catch (err) {
    
        console.log(err)
      const axiosError = err as AxiosError;
      //@ts-ignore
      const message = axiosError?.response?.data?.message || axiosError?.message || 'Unknown error during NIN verification';

      this.logger.error(`❌ YouVerify NIN verification failed: ${message}`);

      return {
        success: false,
        error: message,
      };
    }
  }
}

