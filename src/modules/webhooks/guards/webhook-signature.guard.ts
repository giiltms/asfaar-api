import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const WEBHOOK_PROVIDER_KEY = 'webhook_provider';
export const WebhookProvider = (provider: string) =>
  Reflector.createDecorator<string>({
    key: WEBHOOK_PROVIDER_KEY,
    transform: () => provider,
  });

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const provider = this.reflector.get<string>(
      WEBHOOK_PROVIDER_KEY,
      context.getHandler(),
    );

    if (!provider) {
      this.logger.warn(
        'No webhook provider specified for signature verification',
      );
      return true; // Let it pass if no provider is specified
    }

    try {
      // Get the raw body and signature from request
      const rawBody = this.getRawBody(request);
      const signature = this.getSignature(request, provider);

      if (!signature) {
        this.logger.error(`No signature found for ${provider} webhook`);
        throw new BadRequestException('Missing webhook signature');
      }

      if (!rawBody) {
        this.logger.error(`No raw body found for ${provider} webhook`);
        throw new BadRequestException('Missing webhook payload');
      }

      // Store raw body and signature for handler to use
      request.webhookPayload = rawBody;
      request.webhookSignature = signature;
      request.webhookProvider = provider;

      this.logger.log(`Webhook signature validation passed for ${provider}`);
      return true;
    } catch (error) {
      this.logger.error(
        `Webhook signature validation failed for ${provider}: ${error.message}`,
      );
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  private getRawBody(request: any): string {
    // NestJS should provide raw body via rawBody property
    if (request.rawBody) {
      return request.rawBody.toString();
    }

    // Fallback to body if rawBody is not available
    if (typeof request.body === 'string') {
      return request.body;
    }

    // If body is an object, stringify it
    if (typeof request.body === 'object') {
      return JSON.stringify(request.body);
    }

    return '';
  }

  private getSignature(request: any, provider: string): string | null {
    const headers = request.headers;

    switch (provider.toUpperCase()) {
      case 'FLUTTERWAVE':
        return headers['flutterwave-signature'];

      case 'PAYSTACK':
        return headers['x-paystack-signature'];

      case 'STRIPE':
        return headers['stripe-signature'];

      case 'FINCRA':
        return headers['x-fincra-signature'] || headers['signature'];

      default:
        this.logger.warn(`Unknown webhook provider: ${provider}`);
        return null;
    }
  }
}

// Provider-specific guard decorators
export const FlutterwaveWebhookGuard = WebhookProvider('FLUTTERWAVE');
export const PaystackWebhookGuard = WebhookProvider('PAYSTACK');
export const StripeWebhookGuard = WebhookProvider('STRIPE');
export const FincraWebhookGuard = WebhookProvider('FINCRA');
