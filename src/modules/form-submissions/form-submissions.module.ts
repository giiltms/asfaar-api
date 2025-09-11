import { Module } from '@nestjs/common';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { FormSubmissionsService } from './services/form-submissions.service';
import { SubmissionProgressService } from '@common/services/submission-progress.service';
import { FormSubmissionsController } from './form-submissions.controller';
import { AdminSubmissionsController } from './admin-submissions.controller';
import { ApplicationsController } from './applications.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    FormSubmissionsController,
    AdminSubmissionsController,
    ApplicationsController,
  ],
  providers: [FormSubmissionsService, SubmissionProgressService],
  exports: [FormSubmissionsService, SubmissionProgressService],
})
export class FormSubmissionsModule {}
