import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { YouVerifyService } from './youverify.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000, // 30 seconds timeout
      maxRedirects: 5,
      //retries: 3,
    }),
    ConfigModule, // Make sure ConfigModule is imported in your root module
  ],
  providers: [YouVerifyService],
  exports: [YouVerifyService],
})
export class YouVerifyModule {}