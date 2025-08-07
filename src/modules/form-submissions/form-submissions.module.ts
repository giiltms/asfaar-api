import { Module } from '@nestjs/common';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { FormSubmissionsService } from './services/form-submissions.service';
import { FormSubmissionsController } from './form-submissions.controller';
import { AdminSubmissionsController } from './admin-submissions.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    FormSubmissionsController,
    AdminSubmissionsController,
  ],
  providers: [FormSubmissionsService],
  exports: [FormSubmissionsService],
})
export class FormSubmissionsModule {}
