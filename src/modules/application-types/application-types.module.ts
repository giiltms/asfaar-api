import { Module } from '@nestjs/common';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { ApplicationTypesController } from './application-types.controller';
import { ApplicationTypesService } from './application-types.service';
import { AuthModule } from '@modules/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ApplicationTypesController],
  providers: [ApplicationTypesService],
  exports: [ApplicationTypesService],
})
export class ApplicationTypesModule {}
