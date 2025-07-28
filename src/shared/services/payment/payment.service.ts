import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentProvider } from '../../../common/configs/payment.config';
import { PaystackProvider } from './providers/paystack.provider';
import { FlutterwaveProvider } from './providers/flutterwave.provider';
import { FincraProvider } from './providers/fincra.provider';
import {
  PaymentProviderInterface,
  PaymentInitializationData,
  PaymentInitializationResponse,
  PaymentVerificationResponse,
  PaymentRefundData,
  PaymentRefundResponse,
  TransferRecipientData,
  TransferRecipientResponse,
  TransferData,
  TransferResponse,
  WebhookVerificationResult,
} from './interfaces/payment.interface';

export interface InitiatePaymentDto {
  email: string;
  amount: number;
  currency?: string;
  description?: string;
  metadata?: Record<string, any>;
  paymentMethods?: string[];
  customFields?: Record<string, string>;
}

export interface PaymentSummary {
  total: number;
  successful: number;
  failed: number;
  pending: number;
  totalAmount: number;
  currency: string;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);
  private readonly provider: PaymentProviderInterface;
  private readonly callbackUrl: string;
  private readonly cancelUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly paystackProvider: PaystackProvider,
    private readonly flutterwaveProvider: FlutterwaveProvider,
    private readonly fincraProvider: FincraProvider,
  ) {
    const paymentConfig = this.configService.get('payment');
    this.provider = this.createProvider(paymentConfig);
    this.callbackUrl = paymentConfig.PAYMENT_CALLBACK_URL;
    this.cancelUrl = paymentConfig.PAYMENT_CANCEL_URL;
  }

  private createProvider(paymentConfig: any): PaymentProviderInterface {
    switch (paymentConfig.PAYMENT_PROVIDER) {
      case PaymentProvider.FLUTTERWAVE:
        return this.flutterwaveProvider;
      case PaymentProvider.FINCRA:
        return this.fincraProvider;
      case PaymentProvider.PAYSTACK:
      default:
        return this.paystackProvider;
    }
  }

  /**
   * Initialize a payment transaction
   */
  async initiatePayment(data: InitiatePaymentDto): Promise<PaymentInitializationResponse> {
    try {
      const reference = this.generateReference();

      const paymentData: PaymentInitializationData = {
        ...data,
        currency: data.currency || 'NGN',
        reference,
        callbackUrl: this.callbackUrl,
        cancelUrl: this.cancelUrl,
      };

      this.logger.log(`Initiating payment: ${reference} for ${data.email}`);

      const result = await this.provider.initializePayment(paymentData);

      if (result.success) {
        this.logger.log(`Payment initialized successfully: ${reference}`);
      } else {
        this.logger.error(`Payment initialization failed: ${reference}`);
      }

      return result;
    } catch (error) {
      this.logger.error('Payment initiation failed', error);
      throw error;
    }
  }

  /**
   * Verify a payment transaction
   */
  async verifyPayment(reference: string): Promise<PaymentVerificationResponse> {
    try {
      this.logger.log(`Verifying payment: ${reference}`);

      const result = await this.provider.verifyPayment(reference);

      if (result.success) {
        this.logger.log(`Payment verified successfully: ${reference} - Status: ${result.status}`);
      } else {
        this.logger.error(`Payment verification failed: ${reference}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Payment verification error for ${reference}`, error);
      throw error;
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(data: PaymentRefundData): Promise<PaymentRefundResponse> {
    try {
      this.logger.log(`Processing refund for transaction: ${data.transactionReference}`);

      const result = await this.provider.refundPayment(data);

      if (result.success) {
        this.logger.log(`Refund processed successfully: ${result.refundReference}`);
      } else {
        this.logger.error(`Refund failed for transaction: ${data.transactionReference}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Refund error for ${data.transactionReference}`, error);
      throw error;
    }
  }

  /**
   * Create a transfer recipient
   */
  async createTransferRecipient(data: TransferRecipientData): Promise<TransferRecipientResponse> {
    try {
      this.logger.log(`Creating transfer recipient: ${data.name} - ${data.accountNumber}`);

      const result = await this.provider.createTransferRecipient(data);

      if (result.success) {
        this.logger.log(`Transfer recipient created: ${result.recipientCode}`);
      } else {
        this.logger.error(`Failed to create transfer recipient for: ${data.name}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Transfer recipient creation error for ${data.name}`, error);
      throw error;
    }
  }

  /**
   * Initiate a transfer
   */
  async initiateTransfer(data: TransferData): Promise<TransferResponse> {
    try {
      this.logger.log(`Initiating transfer: ${data.amount} to ${data.recipientCode}`);

      const result = await this.provider.initiateTransfer(data);

      if (result.success) {
        this.logger.log(`Transfer initiated successfully: ${result.reference}`);
      } else {
        this.logger.error(`Transfer initiation failed for recipient: ${data.recipientCode}`);
      }

      return result;
    } catch (error) {
      this.logger.error(`Transfer initiation error for ${data.recipientCode}`, error);
      throw error;
    }
  }

  /**
   * Verify webhook signature and parse data
   */
  async verifyWebhook(payload: string, signature: string): Promise<WebhookVerificationResult> {
    try {
      this.logger.log('Verifying webhook signature');

      const result = await this.provider.verifyWebhook(payload, signature);

      if (result.isValid) {
        this.logger.log(`Webhook verified successfully for event: ${result.event}`);
      } else {
        this.logger.warn('Invalid webhook signature received');
      }

      return result;
    } catch (error) {
      this.logger.error('Webhook verification error', error);
      return { isValid: false, event: '', data: {} };
    }
  }

  /**
   * Get list of supported banks
   */
  async getBanks(country?: string): Promise<Array<{ name: string; code: string; country?: string }>> {
    try {
      this.logger.log(`Fetching banks for country: ${country || 'default'}`);

      const banks = await this.provider.getBanks(country);

      this.logger.log(`Retrieved ${banks.length} banks`);

      return banks;
    } catch (error) {
      this.logger.error('Error fetching banks', error);
      return [];
    }
  }

  /**
   * Resolve account name from account number and bank code
   */
  async resolveAccountName(accountNumber: string, bankCode: string): Promise<{ accountName: string; accountNumber: string }> {
    try {
      this.logger.log(`Resolving account: ${accountNumber} for bank: ${bankCode}`);

      const result = await this.provider.resolveAccountName(accountNumber, bankCode);

      this.logger.log(`Account resolved: ${result.accountName}`);

      return result;
    } catch (error) {
      this.logger.error(`Account resolution error for ${accountNumber}`, error);
      throw error;
    }
  }

  /**
   * Health check for the payment service
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.provider.healthCheck();
    } catch (error) {
      this.logger.error('Payment service health check failed', error);
      return false;
    }
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(userId?: string): Promise<PaymentSummary> {
    // This would typically query your database for transaction statistics
    // For now, returning a placeholder
    return {
      total: 0,
      successful: 0,
      failed: 0,
      pending: 0,
      totalAmount: 0,
      currency: 'NGN',
    };
  }

  /**
   * Generate a unique payment reference
   */
  private generateReference(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `PAY_${timestamp}_${random}`.toUpperCase();
  }

  /**
   * Validate payment amount
   */
  validateAmount(amount: number): boolean {
    const paymentConfig = this.configService.get('payment');
    const minAmount = paymentConfig.PAYMENT_MIN_AMOUNT || 100;
    const maxAmount = paymentConfig.PAYMENT_MAX_AMOUNT || 10000000;

    return amount >= minAmount && amount <= maxAmount;
  }

  /**
   * Format amount for display
   */
  formatAmount(amount: number, currency = 'NGN'): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Calculate fees (this would be provider-specific)
   */
  calculateFees(amount: number, provider?: string): number {
    // Placeholder implementation - actual fees would depend on provider and amount
    const feePercentage = 0.015; // 1.5%
    const fixedFee = 100; // ₦1.00

    return Math.max(amount * feePercentage, fixedFee);
  }
} 