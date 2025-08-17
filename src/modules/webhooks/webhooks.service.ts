import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { FlutterwaveWebhookHandler } from './handlers/flutterwave-webhook.handler';
import { PaystackWebhookHandler } from './handlers/paystack-webhook.handler';
import { FincraWebhookHandler } from './handlers/fincra-webhook.handler';
import {
  WebhookProcessingResult,
  WebhookHandlerInterface,
} from './interfaces/webhook-handler.interface';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly handlers: Map<string, WebhookHandlerInterface> = new Map();

  constructor(
    private readonly flutterwaveHandler: FlutterwaveWebhookHandler,
    private readonly paystackHandler: PaystackWebhookHandler,
    private readonly fincraHandler: FincraWebhookHandler,
  ) {
    // Register webhook handlers
    this.handlers.set('FLUTTERWAVE', this.flutterwaveHandler);
    this.handlers.set('PAYSTACK', this.paystackHandler);
    this.handlers.set('FINCRA', this.fincraHandler);
  }

  /**
   * Process webhook from any provider
   */
  async processWebhook(
    provider: string,
    payload: any,
    signature: string,
  ): Promise<WebhookProcessingResult> {
    const startTime = Date.now();
    this.logger.log(`Processing ${provider} webhook`);

    try {
      // Get the appropriate handler
      const handler = this.getHandler(provider);

      // Verify webhook signature
      const rawPayload =
        typeof payload === 'string' ? payload : JSON.stringify(payload);
      const isValid = await handler.verifySignature(rawPayload, signature);

      if (!isValid) {
        this.logger.error(`Invalid signature for ${provider} webhook`);
        throw new BadRequestException('Invalid webhook signature');
      }

      // Parse the webhook event
      const webhookEvent = await handler.parseEvent(payload);
      this.logger.log(
        `Parsed ${provider} webhook event: ${webhookEvent.event} for reference: ${webhookEvent.reference}`,
      );

      // Process the event
      await handler.processEvent(webhookEvent);

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `Successfully processed ${provider} webhook in ${processingTime}ms`,
      );

      return {
        success: true,
        message: `${provider} webhook processed successfully`,
        eventType: webhookEvent.event,
        reference: webhookEvent.reference,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.error(
        `Failed to process ${provider} webhook in ${processingTime}ms: ${error.message}`,
        error.stack,
      );

      return {
        success: false,
        message: `Failed to process ${provider} webhook`,
        error: error.message,
      };
    }
  }

  /**
   * Get webhook handler for provider
   */
  private getHandler(provider: string): WebhookHandlerInterface {
    const normalizedProvider = provider.toUpperCase();
    const handler = this.handlers.get(normalizedProvider);

    if (!handler) {
      this.logger.error(`No webhook handler found for provider: ${provider}`);
      throw new BadRequestException(
        `Unsupported webhook provider: ${provider}`,
      );
    }

    return handler;
  }

  /**
   * Get supported providers
   */
  getSupportedProviders(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Health check for webhook service
   */
  async healthCheck(): Promise<{
    status: string;
    providers: string[];
    timestamp: string;
  }> {
    return {
      status: 'healthy',
      providers: this.getSupportedProviders(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get webhook statistics
   */
  async getWebhookStats(): Promise<{
    totalProviders: number;
    supportedProviders: string[];
    lastHealthCheck: string;
  }> {
    return {
      totalProviders: this.handlers.size,
      supportedProviders: this.getSupportedProviders(),
      lastHealthCheck: new Date().toISOString(),
    };
  }
}
