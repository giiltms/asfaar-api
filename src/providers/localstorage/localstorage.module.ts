import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import LocalStorageService from './localstorage.service';

/**
 * @desc LocalStorage module for uploading files to the file system
 * @tutorial before use check configuration in `src/config/localstorage.config.ts`
 * and initialize the module in `src/app.module.ts`
 * @module LocalStorageModule
 * @public
 * @example
 *  await this.localStorageService.upload(file);
 */
@Module({
  imports: [ConfigModule],
  providers: [LocalStorageService],
  exports: [LocalStorageService],
})
export default class LocalStorageModule {}
