import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { PaymentsModule } from '@modules/payments/payments.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';
import { FlutterwaveWebhookHandler } from './handlers/flutterwave-webhook.handler';
import { PaystackWebhookHandler } from './handlers/paystack-webhook.handler';
import { FincraWebhookHandler } from './handlers/fincra-webhook.handler';

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
    FincraWebhookHandler,
  ],
  exports: [WebhooksService],
})
export class WebhooksModule {}
