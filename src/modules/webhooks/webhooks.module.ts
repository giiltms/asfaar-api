import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { PaymentsModule } from '@modules/payments/payments.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';
import { BaseWebhookHandler } from './handlers/base-webhook.handler';
import { FlutterwaveWebhookHandler } from './handlers/flutterwave-webhook.handler';
import { PaystackWebhookHandler } from './handlers/paystack-webhook.handler';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    PaymentsModule, // Import to access PaymentsService
  ],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    WebhookSignatureGuard,
    FlutterwaveWebhookHandler,
    PaystackWebhookHandler,
    // Add other handlers here as they're implemented:
    // StripeWebhookHandler,
    // FincraWebhookHandler,
  ],
  exports: [WebhooksService],
})
export class WebhooksModule {} 