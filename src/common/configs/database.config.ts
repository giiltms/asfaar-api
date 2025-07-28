import { registerAs } from '@nestjs/config';
import { IsString, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';

class DatabaseConfigValidation {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  @IsOptional()
  DATABASE_HOST: string = 'localhost';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  DATABASE_PORT: number = 5432;

  @IsString()
  @IsOptional()
  DATABASE_NAME: string = 'nestjs_boilerplate';

  @IsString()
  @IsOptional()
  DATABASE_USERNAME: string = 'postgres';

  @IsString()
  @IsOptional()
  DATABASE_PASSWORD: string = 'password';

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  DATABASE_SYNC: boolean = false;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  @IsOptional()
  DATABASE_LOGGING: boolean = false;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  DATABASE_MAX_CONNECTIONS: number = 100;

  @IsString()
  @IsOptional()
  DATABASE_SSL_MODE: string = 'prefer';
}

export default registerAs('database', (): DatabaseConfigValidation => {
  const config = new DatabaseConfigValidation();

  config.DATABASE_URL = process.env.DATABASE_URL || `postgresql://${process.env.DATABASE_USERNAME || 'postgres'}:${process.env.DATABASE_PASSWORD || 'password'}@${process.env.DATABASE_HOST || 'localhost'}:${process.env.DATABASE_PORT || 5432}/${process.env.DATABASE_NAME || 'nestjs_boilerplate'}`;
  config.DATABASE_HOST = process.env.DATABASE_HOST || 'localhost';
  config.DATABASE_PORT = parseInt(process.env.DATABASE_PORT, 10) || 5432;
  config.DATABASE_NAME = process.env.DATABASE_NAME || 'nestjs_boilerplate';
  config.DATABASE_USERNAME = process.env.DATABASE_USERNAME || 'postgres';
  config.DATABASE_PASSWORD = process.env.DATABASE_PASSWORD || 'password';
  config.DATABASE_SYNC = process.env.DATABASE_SYNC === 'true';
  config.DATABASE_LOGGING = process.env.DATABASE_LOGGING === 'true';
  config.DATABASE_MAX_CONNECTIONS = parseInt(process.env.DATABASE_MAX_CONNECTIONS, 10) || 100;
  config.DATABASE_SSL_MODE = process.env.DATABASE_SSL_MODE || 'prefer';

  return config;
}); 