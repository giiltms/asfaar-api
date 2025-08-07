import { Global, Module } from '@nestjs/common';
import { MailModule } from '@modules/mail/mail.module';
import { PaymentService } from './services/payment/payment.service';
import { PaystackProvider } from './services/payment/providers/paystack.provider';
import { FlutterwaveProvider } from './services/payment/providers/flutterwave.provider';
import { FincraProvider } from './services/payment/providers/fincra.provider';
import { NinVerificationService } from './services/nin-verification/nin-verification.service';
import { YouVerifyProvider } from './services/nin-verification/providers/youverify.provider';
import { ReferenceNumberService } from './services/reference-number/reference-number.service';

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
    ReferenceNumberService,
  ],
  exports: [PaymentService, NinVerificationService, ReferenceNumberService],
})
export class SharedModule {}
