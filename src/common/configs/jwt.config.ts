import { registerAs } from '@nestjs/config';
import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

class JwtConfigValidation {
  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_TOKEN_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_REFRESH_TOKEN_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_ACCESS_TOKEN_EXPIRATION = '15m';

  @IsString()
  @IsOptional()
  JWT_REFRESH_TOKEN_EXPIRATION = '7d';

  @IsString()
  @IsOptional()
  JWT_ISSUER = 'nestjs-boilerplate';

  @IsString()
  @IsOptional()
  JWT_AUDIENCE = 'nestjs-boilerplate-users';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  JWT_ACCESS_TOKEN_TTL = 900; // 15 minutes in seconds

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  JWT_REFRESH_TOKEN_TTL = 604800; // 7 days in seconds
}

export default registerAs('jwt', (): JwtConfigValidation => {
  const config = new JwtConfigValidation();

  config.JWT_SECRET =
    process.env.JWT_SECRET || 'fallback-secret-key-change-in-production';
  config.JWT_ACCESS_TOKEN_SECRET =
    process.env.JWT_ACCESS_TOKEN_SECRET || config.JWT_SECRET;
  config.JWT_REFRESH_TOKEN_SECRET =
    process.env.JWT_REFRESH_TOKEN_SECRET || config.JWT_SECRET;
  config.JWT_ACCESS_TOKEN_EXPIRATION =
    process.env.JWT_ACCESS_TOKEN_EXPIRATION || '15m';
  config.JWT_REFRESH_TOKEN_EXPIRATION =
    process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d';
  config.JWT_ISSUER = process.env.JWT_ISSUER || 'nestjs-boilerplate';
  config.JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'nestjs-boilerplate-users';
  config.JWT_ACCESS_TOKEN_TTL =
    parseInt(process.env.JWT_ACCESS_TOKEN_TTL, 10) || 900;
  config.JWT_REFRESH_TOKEN_TTL =
    parseInt(process.env.JWT_REFRESH_TOKEN_TTL, 10) || 604800;

  return config;
});
