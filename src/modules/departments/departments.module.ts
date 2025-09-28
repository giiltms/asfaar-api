import { Module } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { DepartmentsController } from './departments.controller';
import { PrismaService } from '@providers/prisma/prisma.service';
import { LocalStorageService } from '@providers/localstorage/localstorage.service';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [DepartmentsController],
  providers: [DepartmentsService, PrismaService, LocalStorageService],
  exports: [DepartmentsService],
})
export class DepartmentsModule {}
