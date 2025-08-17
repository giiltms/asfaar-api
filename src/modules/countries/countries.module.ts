import { Module } from '@nestjs/common';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { LocalStorageModule } from '@providers/localstorage/localstorage.module';
import { CountriesService } from './countries.service';
import {
  CountriesController,
  AdminCountriesController,
} from './countries.controller';

@Module({
  imports: [PrismaModule, AuthModule, LocalStorageModule],
  controllers: [CountriesController, AdminCountriesController],
  providers: [CountriesService],
  exports: [CountriesService],
})
export class CountriesModule {}
