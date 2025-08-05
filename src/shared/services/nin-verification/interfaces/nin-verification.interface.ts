export interface NinVerificationData {
  nin: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  fullName?: string;
  dateOfBirth?: string;
  gender?: string;
  phoneNumber?: string;
  photo?: string;
  address?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    lga?: string;
    country?: string;
  };
  birthPlace?: {
    state?: string;
    lga?: string;
  };
}

export interface NinVerificationResponse {
  success: boolean;
  data?: NinVerificationData;
  error?: string;
  verificationId?: string;
  reference?: string;
}

export interface NinVerificationRequest {
  nin: string;
  reference?: string;
}

export interface NinVerificationProviderInterface {
  /**
   * Verify a NIN with the verification provider
   */
  verifyNin(request: NinVerificationRequest): Promise<NinVerificationResponse>;

  /**
   * Health check for the verification provider
   */
  healthCheck(): Promise<boolean>;
}
