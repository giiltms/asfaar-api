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
    this.isTestMode =
      youverifyConfig.TEST_MODE === 'true' ||
      process.env.YOUVERIFY_TEST_MODE === 'true';
    this.baseUrl = this.isTestMode
      ? 'https://api.staging.youverify.co'
      : 'https://api.youverify.co';

    if (!this.apiKey) {
      throw new Error('YouVerify API key is required');
    }
  }

  async verifyNin(
    request: NinVerificationRequest,
  ): Promise<NinVerificationResponse> {
    try {
      this.logger.log(`🔍 Starting NIN verification for: ${request.nin}`);

      const response = await axios.post(
        `${this.baseUrl}/v2/api/identity/ng/nin`,
        {
          id: request.nin,
          isSubjectConsent: true,
          metadata: {
            requestId: request.reference || `nin-verify-${Date.now()}`,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Token: this.apiKey,
          },
          timeout: 30000,
        },
      );

      // Get actual data from the response
      const data = response.data.data;
      this.logger.debug('YouVerify response:', JSON.stringify(data, null, 2));

      // Check if the verification was successful
      if (!data || data.status !== 'found' || !data.idNumber) {
        return {
          success: false,
          error: data?.reason || 'NIN not found or verification failed',
        };
      }

      this.logger.log(
        `✅ YouVerify NIN verification successful for: ${request.nin}`,
      );

      // Map gender from YouVerify format to our enum format
      let gender: string | undefined;
      if (data.gender) {
        gender =
          data.gender.toLowerCase() === 'male'
            ? 'MALE'
            : data.gender.toLowerCase() === 'female'
              ? 'FEMALE'
              : data.gender.toUpperCase();
      }

      const verificationData: NinVerificationData = {
        nin: data.idNumber,
        firstName: data.firstName,
        middleName: data.middleName,
        lastName: data.lastName,
        fullName: `${data.firstName || ''} ${data.middleName || ''} ${data.lastName || ''
          }`.trim(),
        dateOfBirth: data.dateOfBirth, // Already in YYYY-MM-DD format
        gender: gender,
        phoneNumber: data.mobile,
        photo: data.image,
        address: {
          line1: data.address?.addressLine,
          city: data.address?.city || data.address?.town,
          state: data.address?.state,
          lga: data.address?.lga,
          country:
            data.country === 'NG' ? 'Nigeria' : data.birthCountry || 'Nigeria',
        },
        birthPlace: {
          state: data.birthState,
          lga: data.birthLGA,
        },
      };

      return {
        success: true,
        data: verificationData,
        verificationId: data.id,
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
        headers: { Token: this.apiKey },
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      this.logger.error(`YouVerify health check failed: ${error.message}`);
      return false;
    }
  }
}
