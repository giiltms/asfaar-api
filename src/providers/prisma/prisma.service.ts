import {
  INestApplication,
  INestMicroservice,
  Inject,
  Injectable,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaServiceOptions } from './interfaces';
import { PRISMA_SERVICE_OPTIONS } from './prisma.constants';
import { formSubmissionReferenceMiddleware } from './middlewares/form-submission-reference.middleware';
import { biometricCenterNumberMiddleware } from './middlewares/biometric-center-number.middleware';
import { embassySubmissionEmailMiddleware } from './middlewares/embassy-submission-email.middleware';
import { paymentEmailMiddleware } from './middlewares/payment-email.middleware';
import { biometricCaptureEmailMiddleware } from './middlewares/biometric-capture-email.middleware';
import { referenceNumberMiddleware } from './middlewares/reference-number.middleware';
import { travelAgentUpgradePaymentEmailMiddleware } from './middlewares/travel-agent-upgrade-payment-email.middleware';
import { travelAgentUpgradeDecisionEmailMiddleware } from './middlewares/travel-agent-upgrade-decision-email.middleware';
import { licenseStatusChangeEmailMiddleware } from './middlewares/license-status-change-email.middleware';

@Injectable()
export class PrismaService
  extends PrismaClient<
    Prisma.PrismaClientOptions,
    'query' | 'info' | 'warn' | 'error' | 'beforeExit'
  >
  implements OnModuleInit
{
  constructor(
    @Optional()
    @Inject(PRISMA_SERVICE_OPTIONS)
    private readonly prismaServiceOptions: PrismaServiceOptions = {},
  ) {
    super(prismaServiceOptions.prismaOptions);

    if (this.prismaServiceOptions.middlewares) {
      this.prismaServiceOptions.middlewares.forEach((middleware) =>
        this.$use(middleware),
      );
    }

    this.$use(formSubmissionReferenceMiddleware());
    this.$use(biometricCenterNumberMiddleware());
    this.$use(embassySubmissionEmailMiddleware());
    this.$use(paymentEmailMiddleware());
    this.$use(biometricCaptureEmailMiddleware());
    this.$use(referenceNumberMiddleware());
    this.$use(travelAgentUpgradePaymentEmailMiddleware());
    this.$use(travelAgentUpgradeDecisionEmailMiddleware());
    this.$use(licenseStatusChangeEmailMiddleware());
  }

  async onModuleInit() {
    if (this.prismaServiceOptions.explicitConnect) {
      await this.$connect();
    }
  }

  async enableShutdownHooks(app: INestApplication | INestMicroservice) {
    this.$on('beforeExit', async () => {
      await app.close();
    });
  }
}
