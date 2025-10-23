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
export class PaystackProvider implements PaymentProviderInterface {
  private readonly logger = new Logger(PaystackProvider.name);
  private readonly baseUrl: string;
  private readonly secretKey: string;
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    const paymentConfig = this.configService.get('payment');
    const isSandbox = paymentConfig.PAYMENT_SANDBOX_MODE;

    this.baseUrl = isSandbox
      ? 'https://api.paystack.co'
      : 'https://api.paystack.co';

    this.secretKey = paymentConfig.PAYSTACK_SECRET_KEY;
    this.webhookSecret = paymentConfig.PAYSTACK_WEBHOOK_SECRET;

    if (!this.secretKey) {
      throw new Error('Paystack secret key is required');
    }
  }

  async initializePayment(
    data: PaymentInitializationData,
  ): Promise<PaymentInitializationResponse> {
    try {
      const payload = {
        email: data.email,
        amount: Math.round(data.amount * 100), // Convert to kobo
        currency: data.currency.toUpperCase(),
        reference: data.reference,
        callback_url: data.callbackUrl,
        cancel_url: data.cancelUrl,
        metadata: {
          ...data.metadata,
          customer_name: data.customerName || data.email.split('@')[0],
          customer_phone: data.customerPhone,
        },
        channels: data.paymentMethods,
        custom_fields: data.customFields
          ? Object.entries(data.customFields).map(([key, value]) => ({
            display_name: key,
            variable_name: key.toLowerCase().replace(/\s+/g, '_'),
            value,
          }))
          : undefined,
      };

      const response = await this.makeRequest(
        'POST',
        '/transaction/initialize',
        payload,
      );

      if (response.status) {
        return {
          success: true,
          authorizationUrl: response.data.authorization_url,
          reference: response.data.reference,
          accessCode: response.data.access_code,
          providerData: response.data,
        };
      }

      return {
        success: false,
        reference: data.reference,
        providerData: response,
      };
    } catch (error) {
      this.logger.error('Paystack payment initialization failed', error);
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
        `/transaction/verify/${reference}`,
      );

      if (response.status && response.data) {
        const { data } = response;

        return {
          success: data.status === 'success',
          reference: data.reference,
          amount: data.amount / 100, // Convert from kobo
          currency: data.currency,
          status:
            data.status === 'success'
              ? 'success'
              : data.status === 'failed'
                ? 'failed'
                : data.status === 'abandoned'
                  ? 'abandoned'
                  : 'pending',
          gatewayResponse: data.gateway_response,
          paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
          channel: data.channel,
          fees: data.fees ? data.fees / 100 : undefined,
          providerData: data,
          customer: {
            email: data.customer?.email,
            firstName: data.customer?.first_name,
            lastName: data.customer?.last_name,
            phone: data.customer?.phone,
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
      this.logger.error('Paystack payment verification failed', error);
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
      const payload = {
        transaction: data.transactionReference,
        amount: data.amount ? Math.round(data.amount * 100) : undefined,
        merchant_note: data.merchantNote,
        customer_note: data.reason,
      };

      const response = await this.makeRequest('POST', '/refund', payload);

      if (response.status) {
        return {
          success: true,
          refundReference: response.data.transaction?.reference || '',
          amount: response.data.amount ? response.data.amount / 100 : 0,
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
      this.logger.error('Paystack refund failed', error);
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
        type: data.type,
        name: data.name,
        account_number: data.accountNumber,
        bank_code: data.bankCode,
        currency: data.currency || 'NGN',
        metadata: data.metadata,
      };

      const response = await this.makeRequest(
        'POST',
        '/transferrecipient',
        payload,
      );

      if (response.status) {
        return {
          success: true,
          recipientCode: response.data.recipient_code,
          providerData: response.data,
        };
      }

      return {
        success: false,
        recipientCode: '',
        providerData: response,
      };
    } catch (error) {
      this.logger.error('Paystack transfer recipient creation failed', error);
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
        source: data.source,
        amount: Math.round(data.amount * 100),
        recipient: data.recipientCode,
        reason: data.reason,
        currency: data.currency || 'NGN',
        reference: data.reference,
      };

      const response = await this.makeRequest('POST', '/transfer', payload);

      if (response.status) {
        return {
          success: true,
          reference: response.data.reference,
          transferCode: response.data.transfer_code,
          amount: response.data.amount / 100,
          status:
            response.data.status === 'success'
              ? 'success'
              : response.data.status === 'pending'
                ? 'pending'
                : response.data.status === 'reversed'
                  ? 'reversed'
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
      this.logger.error('Paystack transfer initiation failed', error);
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
        event: webhookData.event,
        data: webhookData.data,
      };
    } catch (error) {
      this.logger.error('Paystack webhook verification failed', error);
      return { isValid: false, event: '', data: {} };
    }
  }

  async getBanks(
    country = 'nigeria',
  ): Promise<Array<{ name: string; code: string; country?: string }>> {
    try {
      const response = await this.makeRequest(
        'GET',
        `/bank?country=${country}`,
      );

      if (response.status && response.data && Array.isArray(response.data)) {
        return response.data
          .filter((bank: any) => bank.name && bank.code) // Filter out invalid banks
          .map((bank: any) => ({
            name: bank.name,
            code: bank.code,
            country: bank.country || country,
          }));
      }

      this.logger.warn('No banks data received from Paystack');
      return [];
    } catch (error) {
      this.logger.error('Failed to fetch banks from Paystack', {
        country,
        error: error.message,
      });
      return [];
    }
  }

  async resolveAccountName(
    accountNumber: string,
    bankCode: string,
  ): Promise<{ accountName: string; accountNumber: string; bankName: string; bankCode: string }> {
    try {
      // Validate inputs
      if (!accountNumber || !bankCode) {
        throw new Error('Account number and bank code are required');
      }

      if (!/^\d{10}$/.test(accountNumber)) {
        throw new Error('Account number must be exactly 10 digits');
      }

      if (!/^\d{3}$/.test(bankCode)) {
        throw new Error('Bank code must be exactly 3 digits');
      }

      const response = await this.makeRequest(
        'GET',
        `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
      );

      if (response.status && response.data) {
        const { account_name, account_number } = response.data;

        if (!account_name || !account_number) {
          throw new Error('Invalid response from bank verification service');
        }

        // Get bank name from the banks list
        const banks = await this.getBanks();
        const bank = banks.find(b => b.code === bankCode);
        const bankName = bank ? bank.name : 'Unknown Bank';

        return {
          accountName: account_name,
          accountNumber: account_number,
          bankName: bankName,
          bankCode: bankCode,
        };
      }

      // Handle Paystack error response
      const errorMessage = response.message || 'Account resolution failed';
      throw new Error(errorMessage);
    } catch (error) {
      this.logger.error('Paystack account resolution failed', {
        accountNumber,
        bankCode,
        error: error.message,
      });

      // Re-throw with more specific error messages
      if (error.message.includes('Account number')) {
        throw new Error('Invalid account number format');
      } else if (error.message.includes('Bank code')) {
        throw new Error('Invalid bank code format');
      } else if (error.message.includes('not found') || error.message.includes('invalid')) {
        throw new Error('Account not found or invalid bank code');
      } else {
        throw new Error(error.message || 'Account verification failed');
      }
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest(
        'GET',
        '/bank?country=nigeria&perPage=1',
      );
      return response.status === true;
    } catch (error) {
      this.logger.error('Paystack health check failed', error);
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
