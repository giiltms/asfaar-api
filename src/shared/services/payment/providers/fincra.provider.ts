import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
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
} from '../interfaces/payment.interface';

@Injectable()
export class FincraProvider implements PaymentProviderInterface {
  private readonly logger = new Logger(FincraProvider.name);
  private readonly baseUrl: string;
  private readonly secretKey: string;
  private readonly publicKey: string;
  private readonly merchantId: string;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    const paymentConfig = this.configService.get('payment');
    const isSandbox = paymentConfig.PAYMENT_SANDBOX_MODE;

    this.baseUrl = isSandbox
      ? 'https://sandboxapi.fincra.com'
      : 'https://api.fincra.com';

    this.secretKey = paymentConfig.FINCRA_SECRET_KEY;
    this.publicKey = paymentConfig.FINCRA_PUBLIC_KEY;
    this.merchantId = paymentConfig.FINCRA_MERCHANT_ID;
    this.webhookSecret = paymentConfig.FINCRA_WEBHOOK_SECRET;

    if (!this.secretKey || !this.publicKey) {
      throw new Error('Fincra API keys are required');
    }
  }

  async initializePayment(
    data: PaymentInitializationData,
  ): Promise<PaymentInitializationResponse> {
    try {
      const payload = {
        amount: data.amount,
        currency: data.currency.toUpperCase(),
        customer: {
          name: 'Customer',
          email: data.email,
        },
        reference: data.reference,
        merchant: this.merchantId,
        redirectUrl: data.callbackUrl,
        paymentMethods: data.paymentMethods || ['card', 'bank_transfer'],
        metadata: data.metadata,
        feeBearer: 'customer',
      };

      const response = await this.makeRequest(
        'POST',
        '/checkout/payments',
        payload,
      );

      if (response.success) {
        return {
          success: true,
          authorizationUrl: response.data.link,
          reference: data.reference,
          providerData: response.data,
        };
      }

      return {
        success: false,
        reference: data.reference,
        providerData: response,
      };
    } catch (error) {
      this.logger.error('Fincra payment initialization failed', error);
      return {
        success: false,
        reference: data.reference,
        providerData: { error: error.message },
      };
    }
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResponse> {
    try {
      const response = await this.makeRequest(
        'GET',
        `/checkout/payments/${reference}`,
      );

      if (response.success && response.data) {
        const { data } = response;

        return {
          success: data.status === 'successful',
          reference: data.reference,
          amount: parseFloat(data.amount),
          currency: data.currency,
          status:
            data.status === 'successful'
              ? 'success'
              : data.status === 'failed'
              ? 'failed'
              : data.status === 'cancelled'
              ? 'abandoned'
              : 'pending',
          gatewayResponse: data.gatewayMessage,
          paidAt: data.dateCreated ? new Date(data.dateCreated) : undefined,
          channel: data.paymentMethod,
          fees: data.fee ? parseFloat(data.fee) : undefined,
          providerData: data,
          customer: {
            email: data.customer?.email,
            firstName: data.customer?.name?.split(' ')[0],
            lastName: data.customer?.name?.split(' ').slice(1).join(' '),
          },
        };
      }

      return {
        success: false,
        reference,
        amount: 0,
        currency: 'NGN',
        status: 'failed',
        providerData: response,
      };
    } catch (error) {
      this.logger.error('Fincra payment verification failed', error);
      return {
        success: false,
        reference,
        amount: 0,
        currency: 'NGN',
        status: 'failed',
        providerData: { error: error.message },
      };
    }
  }

  async refundPayment(data: PaymentRefundData): Promise<PaymentRefundResponse> {
    try {
      // Note: Fincra's refund API might be different, this is a placeholder implementation
      const payload = {
        reason: data.reason || 'Refund requested',
        amount: data.amount,
      };

      const response = await this.makeRequest(
        'POST',
        `/checkout/payments/${data.transactionReference}/refund`,
        payload,
      );

      if (response.success) {
        return {
          success: true,
          refundReference: response.data.reference || '',
          amount: response.data.amount || 0,
          status: 'pending',
          providerData: response.data,
        };
      }

      return {
        success: false,
        refundReference: '',
        amount: 0,
        status: 'failed',
        providerData: response,
      };
    } catch (error) {
      this.logger.error('Fincra refund failed', error);
      return {
        success: false,
        refundReference: '',
        amount: 0,
        status: 'failed',
        providerData: { error: error.message },
      };
    }
  }

  async createTransferRecipient(
    data: TransferRecipientData,
  ): Promise<TransferRecipientResponse> {
    try {
      const payload = {
        name: data.name,
        accountNumber: data.accountNumber,
        bankCode: data.bankCode,
        type: data.type,
        currency: data.currency || 'NGN',
        metadata: data.metadata,
      };

      const response = await this.makeRequest(
        'POST',
        '/payouts/beneficiaries',
        payload,
      );

      if (response.success) {
        return {
          success: true,
          recipientCode: response.data.id || response.data._id,
          providerData: response.data,
        };
      }

      return {
        success: false,
        recipientCode: '',
        providerData: response,
      };
    } catch (error) {
      this.logger.error('Fincra transfer recipient creation failed', error);
      return {
        success: false,
        recipientCode: '',
        providerData: { error: error.message },
      };
    }
  }

  async initiateTransfer(data: TransferData): Promise<TransferResponse> {
    try {
      const payload = {
        beneficiary: data.recipientCode,
        amount: data.amount,
        description: data.reason || 'Transfer',
        currency: data.currency || 'NGN',
        customerReference: data.reference || `FINCRA_${Date.now()}`,
      };

      const response = await this.makeRequest(
        'POST',
        '/payouts/disbursements',
        payload,
      );

      if (response.success) {
        return {
          success: true,
          reference: response.data.customerReference,
          amount: parseFloat(response.data.amount),
          status:
            response.data.status === 'successful'
              ? 'success'
              : response.data.status === 'pending'
              ? 'pending'
              : 'failed',
          providerData: response.data,
        };
      }

      return {
        success: false,
        reference: data.reference || '',
        amount: 0,
        status: 'failed',
        providerData: response,
      };
    } catch (error) {
      this.logger.error('Fincra transfer initiation failed', error);
      return {
        success: false,
        reference: data.reference || '',
        amount: 0,
        status: 'failed',
        providerData: { error: error.message },
      };
    }
  }

  async verifyWebhook(
    payload: string,
    signature: string,
  ): Promise<WebhookVerificationResult> {
    try {
      if (!this.webhookSecret) {
        this.logger.error('Webhook secret not configured');
        return { isValid: false, event: '', data: {} };
      }

      const hash = createHmac('sha512', this.webhookSecret)
        .update(payload)
        .digest('hex');

      const isValid = hash === signature;

      if (!isValid) {
        return { isValid: false, event: '', data: {} };
      }

      const webhookData = JSON.parse(payload);

      return {
        isValid: true,
        event: webhookData.event || webhookData.eventType,
        data: webhookData.data || webhookData,
      };
    } catch (error) {
      this.logger.error('Fincra webhook verification failed', error);
      return { isValid: false, event: '', data: {} };
    }
  }

  async getBanks(
    country = 'nigeria',
  ): Promise<Array<{ name: string; code: string; country?: string }>> {
    try {
      const response = await this.makeRequest(
        'GET',
        `/profile/merchants/settlement-banks?country=${country}`,
      );

      if (response.success && response.data) {
        return response.data.map((bank: any) => ({
          name: bank.name,
          code: bank.code,
          country: bank.country,
        }));
      }

      return [];
    } catch (error) {
      this.logger.error('Failed to fetch banks from Fincra', error);
      return [];
    }
  }

  async resolveAccountName(
    accountNumber: string,
    bankCode: string,
  ): Promise<{ accountName: string; accountNumber: string }> {
    try {
      const response = await this.makeRequest(
        'GET',
        `/profile/merchants/settlement-banks/resolve?accountNumber=${accountNumber}&bankCode=${bankCode}`,
      );

      if (response.success && response.data) {
        return {
          accountName: response.data.accountName,
          accountNumber: response.data.accountNumber,
        };
      }

      throw new Error('Account resolution failed');
    } catch (error) {
      this.logger.error('Fincra account resolution failed', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest(
        'GET',
        '/profile/merchants/settlement-banks?country=nigeria',
      );
      return response.success === true;
    } catch (error) {
      this.logger.error('Fincra health check failed', error);
      return false;
    }
  }

  private async makeRequest(
    method: 'GET' | 'POST',
    endpoint: string,
    data?: any,
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
      'api-key': this.publicKey,
    };

    const config: RequestInit = {
      method,
      headers,
    };

    if (data && method === 'POST') {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    return response.json();
  }
}
