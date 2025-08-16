import { PaymentStatus } from '@prisma/client';

export interface WebhookEvent {
  event: string;
  data: Record<string, any>;
  reference?: string;
  status?: PaymentStatus;
  amount?: number;
  currency?: string;
  customerId?: string;
  metadata?: Record<string, any>;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  event?: WebhookEvent;
  rawData?: Record<string, any>;
}

export interface WebhookHandlerInterface {
  /**
   * Verify webhook signature
   */
  verifySignature(payload: string, signature: string): Promise<boolean>;

  /**
   * Parse webhook payload into standardized event
   */
  parseEvent(payload: any): Promise<WebhookEvent>;

  /**
   * Process the webhook event
   */
  processEvent(event: WebhookEvent): Promise<void>;

  /**
   * Get provider name
   */
  getProviderName(): string;
}

export interface WebhookProcessingResult {
  success: boolean;
  message: string;
  eventType?: string;
  reference?: string;
  error?: string;
}
