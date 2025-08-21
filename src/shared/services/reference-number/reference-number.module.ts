import { Module } from '@nestjs/common';
import { ReferenceNumberService } from './reference-number.service';
import { PrismaModule } from '@providers/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ReferenceNumberService],
  exports: [ReferenceNumberService],
})
export class ReferenceNumberModule {}
