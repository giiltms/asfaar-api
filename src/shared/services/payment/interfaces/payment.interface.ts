export interface PaymentInitializationData {
  email: string;
  amount: number;
  currency: string;
  reference: string;
  callbackUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, any>;
  paymentMethods?: string[];
  customFields?: Record<string, string>;
  customerName?: string;
}

export interface PaymentInitializationResponse {
  success: boolean;
  authorizationUrl?: string;
  reference: string;
  accessCode?: string;
  metadata?: Record<string, any>;
  providerData?: Record<string, any>;
}

export interface PaymentVerificationResponse {
  success: boolean;
  reference: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'abandoned' | 'pending';
  gatewayResponse?: string;
  paidAt?: Date;
  channel?: string;
  fees?: number;
  providerData?: Record<string, any>;
  customer?: {
    email: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  };
}

export interface PaymentRefundData {
  transactionReference: string;
  amount?: number;
  reason?: string;
  merchantNote?: string;
}

export interface PaymentRefundResponse {
  success: boolean;
  refundReference: string;
  amount: number;
  status: 'pending' | 'processing' | 'success' | 'failed';
  providerData?: Record<string, any>;
}

export interface TransferRecipientData {
  type: 'nuban' | 'mobile_money' | 'basa';
  name: string;
  accountNumber: string;
  bankCode: string;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface TransferRecipientResponse {
  success: boolean;
  recipientCode: string;
  providerData?: Record<string, any>;
}

export interface TransferData {
  source: 'balance';
  amount: number;
  recipientCode: string;
  reason?: string;
  currency?: string;
  reference?: string;
}

export interface TransferResponse {
  success: boolean;
  reference: string;
  transferCode?: string;
  amount: number;
  status: 'success' | 'pending' | 'failed' | 'reversed';
  providerData?: Record<string, any>;
}

export interface WebhookData {
  event: string;
  data: Record<string, any>;
  signature?: string;
  timestamp?: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  event: string;
  data: Record<string, any>;
}

export interface PaymentProviderInterface {
  /**
   * Initialize a payment transaction
   */
  initializePayment(
    data: PaymentInitializationData,
  ): Promise<PaymentInitializationResponse>;

  /**
   * Verify a payment transaction
   */
  verifyPayment(reference: string): Promise<PaymentVerificationResponse>;

  /**
   * Refund a payment
   */
  refundPayment(data: PaymentRefundData): Promise<PaymentRefundResponse>;

  /**
   * Create a transfer recipient
   */
  createTransferRecipient(
    data: TransferRecipientData,
  ): Promise<TransferRecipientResponse>;

  /**
   * Initiate a transfer
   */
  initiateTransfer(data: TransferData): Promise<TransferResponse>;

  /**
   * Verify webhook signature and parse data
   */
  verifyWebhook(
    payload: string,
    signature: string,
  ): Promise<WebhookVerificationResult>;

  /**
   * Get list of supported banks
   */
  getBanks(
    country?: string,
  ): Promise<Array<{ name: string; code: string; country?: string }>>;

  /**
   * Resolve account name from account number and bank code
   */
  resolveAccountName(
    accountNumber: string,
    bankCode: string,
  ): Promise<{ accountName: string; accountNumber: string }>;

  /**
   * Health check for the payment provider
   */
  healthCheck(): Promise<boolean>;
}
