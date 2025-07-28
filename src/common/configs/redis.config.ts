import { registerAs } from '@nestjs/config';
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

class RedisConfigValidation {
  @IsString()
  @IsOptional()
  REDIS_HOST: string = 'localhost';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  REDIS_PORT: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  REDIS_DB: number = 0;

  @IsString()
  @IsOptional()
  REDIS_URL: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  REDIS_TTL: number = 3600; // 1 hour in seconds

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  REDIS_MAX_RETRIES: number = 3;
}

export default registerAs('redis', (): RedisConfigValidation => {
  const config = new RedisConfigValidation();

  config.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
  config.REDIS_PORT = parseInt(process.env.REDIS_PORT, 10) || 6379;
  config.REDIS_PASSWORD = process.env.REDIS_PASSWORD;
  config.REDIS_DB = parseInt(process.env.REDIS_DB, 10) || 0;
  config.REDIS_URL = process.env.REDIS_URL;
  config.REDIS_TTL = parseInt(process.env.REDIS_TTL, 10) || 3600;
  config.REDIS_MAX_RETRIES = parseInt(process.env.REDIS_MAX_RETRIES, 10) || 3;

  return config;
}); 