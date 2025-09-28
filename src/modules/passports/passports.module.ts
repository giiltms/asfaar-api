import { Module } from '@nestjs/common';
import { PassportsService } from './passports.service';
import { PassportsController } from './passports.controller';
import { PrismaService } from '@providers/prisma/prisma.service';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [PassportsController],
  providers: [PassportsService, PrismaService],
  exports: [PassportsService],
})
export class PassportsModule {}
