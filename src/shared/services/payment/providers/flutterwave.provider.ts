import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
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
export class FlutterwaveProvider implements PaymentProviderInterface {
  private readonly logger = new Logger(FlutterwaveProvider.name);
  private readonly baseUrl: string;
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    const paymentConfig = this.configService.get('payment');

    this.baseUrl =
      paymentConfig.FLUTTERWAVE_BASE_URL || 'https://api.flutterwave.com/v3';
    this.secretKey = paymentConfig.FLUTTERWAVE_SECRET_KEY;
    this.webhookSecret = paymentConfig.FLUTTERWAVE_WEBHOOK_SECRET;

    if (!this.secretKey) {
      throw new Error('Flutterwave secret key is required');
    }
  }

  async initializePayment(
    data: PaymentInitializationData,
  ): Promise<PaymentInitializationResponse> {
    try {
      const payload = {
        tx_ref: data.reference,
        amount: data.amount,
        currency: data.currency.toUpperCase(),
        redirect_url: data.callbackUrl,
        customer: {
          email: data.email,
          name: data.customerName || data.email.split('@')[0],
          phone: data.customerPhone,
        },
        customizations: {
          title: 'Payment',
          description: 'Payment for order',
          logo: '',
        },
        meta: data.metadata,
        payment_options:
          data.paymentMethods?.join(',') || 'card,banktransfer,ussd',
      };

      const response = await this.makeRequest('POST', '/payments', payload);

      if (response.status === 'success') {
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
      this.logger.error('Flutterwave payment initialization failed', error);
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
        `/transactions/verify_by_reference?tx_ref=${reference}`,
      );

      if (response.status === 'success' && response.data) {
        const { data } = response;

        return {
          success: data.status === 'successful',
          reference: data.tx_ref,
          amount: data.amount,
          currency: data.currency,
          status:
            data.status === 'successful'
              ? 'success'
              : data.status === 'failed'
              ? 'failed'
              : data.status === 'cancelled'
              ? 'abandoned'
              : 'pending',
          gatewayResponse: data.processor_response,
          paidAt: data.created_at ? new Date(data.created_at) : undefined,
          channel: data.payment_type,
          fees: data.app_fee,
          providerData: data,
          customer: {
            email: data.customer?.email,
            firstName: data.customer?.name?.split(' ')[0],
            lastName: data.customer?.name?.split(' ').slice(1).join(' '),
            phone: data.customer?.phone_number,
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
      this.logger.error('Flutterwave payment verification failed', error);
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
      // First, get the transaction ID from the reference
      const verifyResponse = await this.makeRequest(
        'GET',
        `/transactions/verify_by_reference?tx_ref=${data.transactionReference}`,
      );

      if (verifyResponse.status !== 'success' || !verifyResponse.data?.id) {
        throw new Error('Transaction not found');
      }

      const payload = {
        amount: data.amount,
        comments: data.reason,
      };

      const response = await this.makeRequest(
        'POST',
        `/transactions/${verifyResponse.data.id}/refund`,
        payload,
      );

      if (response.status === 'success') {
        return {
          success: true,
          refundReference: response.data.tx_ref || '',
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
      this.logger.error('Flutterwave refund failed', error);
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
        account_bank: data.bankCode,
        account_number: data.accountNumber,
        beneficiary_name: data.name,
      };

      const response = await this.makeRequest(
        'POST',
        '/beneficiaries',
        payload,
      );

      if (response.status === 'success') {
        return {
          success: true,
          recipientCode: response.data.id.toString(),
          providerData: response.data,
        };
      }

      return {
        success: false,
        recipientCode: '',
        providerData: response,
      };
    } catch (error) {
      this.logger.error(
        'Flutterwave transfer recipient creation failed',
        error,
      );
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
        account_bank: 'MPS', // This would need to be mapped from recipient code
        account_number: '', // This would need to be retrieved from recipient
        amount: data.amount,
        narration: data.reason || 'Transfer',
        currency: data.currency || 'NGN',
        reference: data.reference || `FLW_${Date.now()}`,
        beneficiary_name: '', // This would need to be retrieved from recipient
      };

      const response = await this.makeRequest('POST', '/transfers', payload);

      if (response.status === 'success') {
        return {
          success: true,
          reference: response.data.reference,
          amount: response.data.amount,
          status:
            response.data.status === 'SUCCESSFUL'
              ? 'success'
              : response.data.status === 'PENDING'
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
      this.logger.error('Flutterwave transfer initiation failed', error);
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

      const hash = createHash('sha256')
        .update(payload + this.webhookSecret)
        .digest('hex');

      const isValid = hash === signature;

      if (!isValid) {
        return { isValid: false, event: '', data: {} };
      }

      const webhookData = JSON.parse(payload);

      return {
        isValid: true,
        event: webhookData.event,
        data: webhookData.data,
      };
    } catch (error) {
      this.logger.error('Flutterwave webhook verification failed', error);
      return { isValid: false, event: '', data: {} };
    }
  }

  async getBanks(
    country = 'NG',
  ): Promise<Array<{ name: string; code: string; country?: string }>> {
    try {
      const response = await this.makeRequest('GET', `/banks/${country}`);

      if (response.status === 'success' && response.data) {
        return response.data.map((bank: any) => ({
          name: bank.name,
          code: bank.code,
          country: bank.country,
        }));
      }

      return [];
    } catch (error) {
      this.logger.error('Failed to fetch banks from Flutterwave', error);
      return [];
    }
  }

  async resolveAccountName(
    accountNumber: string,
    bankCode: string,
  ): Promise<{ accountName: string; accountNumber: string }> {
    try {
      const payload = {
        account_number: accountNumber,
        account_bank: bankCode,
      };

      const response = await this.makeRequest(
        'POST',
        '/accounts/resolve',
        payload,
      );

      if (response.status === 'success' && response.data) {
        return {
          accountName: response.data.account_name,
          accountNumber: response.data.account_number,
        };
      }

      throw new Error('Account resolution failed');
    } catch (error) {
      this.logger.error('Flutterwave account resolution failed', error);
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', '/banks/NG');
      return response.status === 'success';
    } catch (error) {
      this.logger.error('Flutterwave health check failed', error);
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
