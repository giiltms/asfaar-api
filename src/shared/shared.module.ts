import { Global, Module } from '@nestjs/common';
import { MailModule } from '@modules/mail/mail.module';
import { PaymentService } from './services/payment/payment.service';
import { PaystackProvider } from './services/payment/providers/paystack.provider';
import { FlutterwaveProvider } from './services/payment/providers/flutterwave.provider';
import { FincraProvider } from './services/payment/providers/fincra.provider';
import { NinVerificationService } from './services/nin-verification/nin-verification.service';
import { YouVerifyProvider } from './services/nin-verification/providers/youverify.provider';

@Global()
@Module({
  imports: [MailModule],
  providers: [
    PaymentService,
    PaystackProvider,
    FlutterwaveProvider,
    FincraProvider,
    NinVerificationService,
    YouVerifyProvider,
  ],
  exports: [
    PaymentService,
    NinVerificationService,
  ],
})
export class SharedModule {}
