import { registerAs } from '@nestjs/config';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Staging = 'staging',
}

export enum LogLevel {
  Error = 'error',
  Warn = 'warn',
  Log = 'log',
  Verbose = 'verbose',
  Debug = 'debug',
}

class AppConfigValidation {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  APP_NAME: string = 'NestJS Boilerplate';

  @IsString()
  @IsOptional()
  APP_DESCRIPTION: string = 'A comprehensive NestJS boilerplate';

  @IsString()
  @IsOptional()
  APP_VERSION: string = '1.0.0';

  @IsString()
  @IsOptional()
  APP_URL: string = 'http://localhost:3000';

  @IsEnum(LogLevel)
  @IsOptional()
  LOG_LEVEL: LogLevel = LogLevel.Log;

  @IsString()
  @IsOptional()
  API_PREFIX: string = 'api';

  @IsString()
  @IsOptional()
  API_VERSION: string = '1';
}

export default registerAs('app', (): AppConfigValidation => {
  const config = new AppConfigValidation();

  config.NODE_ENV = process.env.NODE_ENV as Environment || Environment.Development;
  config.PORT = parseInt(process.env.PORT, 10) || 3000;
  config.APP_NAME = process.env.APP_NAME || 'NestJS Boilerplate';
  config.APP_DESCRIPTION = process.env.APP_DESCRIPTION || 'A comprehensive NestJS boilerplate';
  config.APP_VERSION = process.env.APP_VERSION || '1.0.0';
  config.APP_URL = process.env.APP_URL || 'http://localhost:3000';
  config.LOG_LEVEL = process.env.LOG_LEVEL as LogLevel || LogLevel.Log;
  config.API_PREFIX = process.env.API_PREFIX || 'api';
  config.API_VERSION = process.env.API_VERSION || '1';

  return config;
}); 