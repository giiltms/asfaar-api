import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpStatus,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import {
  FlutterwaveWebhookGuard,
  PaystackWebhookGuard,
  FincraWebhookGuard,
  StripeWebhookGuard,
  WebhookSignatureGuard,
} from './guards/webhook-signature.guard';
import {
  WebhookResponseDto,
  FlutterwaveWebhookDto,
  PaystackWebhookDto,
  StripeWebhookDto,
  FincraWebhookDto,
} from './dto/webhook-event.dto';

@ApiTags('Payment Webhooks')
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('flutterwave')
  @FlutterwaveWebhookGuard()
  @UseGuards(WebhookSignatureGuard)
  @ApiOperation({
    summary: 'Flutterwave webhook endpoint',
    description: 'Handle Flutterwave payment webhook events',
  })
  @ApiHeader({
    name: 'flutterwave-signature',
    description: 'Flutterwave webhook signature',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid webhook signature or payload',
  })
  async handleFlutterwaveWebhook(
    @Body() payload: FlutterwaveWebhookDto,
    @Req() request: any,
  ): Promise<WebhookResponseDto> {
    this.logger.log('Received Flutterwave webhook');

    const result = await this.webhooksService.processWebhook(
      'FLUTTERWAVE',
      payload,
      request.webhookSignature,
    );

    return {
      success: result.success,
      message: result.message,
      eventType: result.eventType,
      reference: result.reference,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('paystack')
  @PaystackWebhookGuard()
  @UseGuards(WebhookSignatureGuard)
  @ApiOperation({
    summary: 'Paystack webhook endpoint',
    description: 'Handle Paystack payment webhook events',
  })
  @ApiHeader({
    name: 'x-paystack-signature',
    description: 'Paystack webhook signature',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid webhook signature or payload',
  })
  async handlePaystackWebhook(
    @Body() payload: PaystackWebhookDto,
    @Req() request: any,
  ): Promise<WebhookResponseDto> {
    this.logger.log('Received Paystack webhook');

    const result = await this.webhooksService.processWebhook(
      'PAYSTACK',
      payload,
      request.webhookSignature,
    );

    return {
      success: result.success,
      message: result.message,
      eventType: result.eventType,
      reference: result.reference,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('stripe')
  @StripeWebhookGuard()
  @UseGuards(WebhookSignatureGuard)
  @ApiOperation({
    summary: 'Stripe webhook endpoint',
    description: 'Handle Stripe payment webhook events',
  })
  @ApiHeader({
    name: 'stripe-signature',
    description: 'Stripe webhook signature',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Webhook processed successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid webhook signature or payload',
  })
  async handleStripeWebhook(
    @Body() payload: StripeWebhookDto,
    @Req() request: any,
  ): Promise<WebhookResponseDto> {
    this.logger.log('Received Stripe webhook');

    const result = await this.webhooksService.processWebhook(
      'STRIPE',
      payload,
      request.webhookSignature,
    );

    return {
      success: result.success,
      message: result.message,
      eventType: result.eventType,
      reference: result.reference,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Fincra Webhook Endpoint
   * Receives webhook notifications from Fincra payment gateway
   * Documentation: https://docs.fincra.com/docs/setup-webhook
   */
  @Post('fincra')
  @ApiOperation({
    summary: 'Fincra Payment Webhook',
    description: 'Receives webhook notifications from Fincra payment gateway',
  })
  @ApiHeader({
    name: 'signature',
    description: 'HMAC SHA512 signature for webhook verification',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook processed successfully',
    type: WebhookResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid signature',
  })
  @FincraWebhookGuard()
  @UseGuards(WebhookSignatureGuard)
  async handleFincraWebhook(
    @Body() payload: FincraWebhookDto,
    @Req() request: any,
  ): Promise<WebhookResponseDto> {
    const result = await this.webhooksService.processWebhook(
      'FINCRA',
      payload,
      request.webhookSignature,
    );

    return {
      success: result.success,
      message: result.message,
      eventType: result.eventType,
      reference: result.reference,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health')
  @ApiExcludeEndpoint() // Hide from Swagger docs
  async healthCheck() {
    return this.webhooksService.healthCheck();
  }

  @Get('stats')
  @ApiExcludeEndpoint() // Hide from Swagger docs
  async getStats() {
    return this.webhooksService.getWebhookStats();
  }
}
