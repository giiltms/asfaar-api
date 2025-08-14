import { Module } from '@nestjs/common';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { BoothsController } from './booths.controller';
import { BoothsService } from './booths.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [BoothsController],
  providers: [BoothsService],
  exports: [BoothsService],
})
export class BoothsModule {}
