import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import {
  NinVerificationProviderInterface,
  NinVerificationRequest,
  NinVerificationResponse,
  NinVerificationData,
} from '../interfaces/nin-verification.interface';

@Injectable()
export class YouVerifyProvider implements NinVerificationProviderInterface {
  private readonly logger = new Logger(YouVerifyProvider.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly isTestMode: boolean;

  constructor(private readonly configService: ConfigService) {
    const youverifyConfig = this.configService.get('youverify') || {};

    this.apiKey = youverifyConfig.API_KEY || process.env.YOUVERIFY_API_KEY;
    this.isTestMode = youverifyConfig.TEST_MODE === 'true' || process.env.YOUVERIFY_TEST_MODE === 'true';
    this.baseUrl = this.isTestMode
      ? 'https://api.staging.youverify.co'
      : 'https://api.youverify.co';

    if (!this.apiKey) {
      throw new Error('YouVerify API key is required');
    }
  }

  async verifyNin(request: NinVerificationRequest): Promise<NinVerificationResponse> {
    try {
      this.logger.log(`🔍 Starting NIN verification for: ${request.nin}`);

      const response = await axios.post(
        `${this.baseUrl}/v2/api/identity/ng/nin`,
        {
          id: request.nin,
          metadata: {
            requestId: request.reference || `nin-${Date.now()}`,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Token': this.apiKey,
          },
          timeout: 30000, // 30 seconds timeout
        }
      );

      const { data } = response.data;

      if (!data || !data.nin) {
        return {
          success: false,
          error: 'Invalid response from YouVerify - missing NIN data',
        };
      }

      this.logger.log(`✅ YouVerify NIN verification successful for: ${request.nin}`);

      const verificationData: NinVerificationData = {
        nin: data.nin,
        firstName: data.firstName || data.firstname,
        middleName: data.middleName || data.middlename,
        lastName: data.lastName || data.lastname || data.surname,
        fullName: data.fullName || `${data.firstName || ''} ${data.middleName || ''} ${data.lastName || ''}`.trim(),
        dateOfBirth: data.dateOfBirth || data.birthDate,
        gender: data.gender,
        phoneNumber: data.mobile || data.phoneNumber,
        photo: data.image || data.photo,
        address: {
          line1: data.address?.addressLine || data.residentialAddress,
          city: data.address?.city,
          state: data.address?.state || data.birthState,
          lga: data.address?.lga || data.birthLGA,
          country: data.birthCountry || 'Nigeria',
        },
        birthPlace: {
          state: data.birthState,
          lga: data.birthLGA,
        },
      };

      return {
        success: true,
        data: verificationData,
        verificationId: data.id || data.verificationId,
        reference: request.reference,
      };

    } catch (err) {
      this.logger.error(`❌ YouVerify NIN verification failed: ${err.message}`);

      const axiosError = err as AxiosError;
      const message =
        (axiosError?.response?.data as any)?.message ||
        axiosError?.message ||
        'Unknown error during NIN verification';

      return {
        success: false,
        error: message,
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Simple health check - just verify we can reach the API
      const response = await axios.get(`${this.baseUrl}/health`, {
        headers: { 'Token': this.apiKey },
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      this.logger.error(`YouVerify health check failed: ${error.message}`);
      return false;
    }
  }
} 