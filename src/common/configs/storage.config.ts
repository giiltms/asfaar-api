import { registerAs } from '@nestjs/config';
import { IsString, IsNumber, IsOptional, IsEnum, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

export enum StorageProvider {
  LOCAL = 'local',
  S3 = 's3',
  CLOUDINARY = 'cloudinary',
}

class StorageConfigValidation {
  @IsEnum(StorageProvider)
  @IsOptional()
  STORAGE_PROVIDER: StorageProvider = StorageProvider.LOCAL;

  @IsString()
  @IsOptional()
  STORAGE_LOCAL_PATH: string = './uploads';

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  @IsOptional()
  STORAGE_MAX_FILE_SIZE: number = 10485760; // 10MB

  @IsArray()
  @Transform(({ value }) => value.split(',').map((ext: string) => ext.trim()))
  @IsOptional()
  STORAGE_ALLOWED_EXTENSIONS: string[] = ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];

  // S3 Configuration
  @IsString()
  @IsOptional()
  AWS_ACCESS_KEY_ID: string;

  @IsString()
  @IsOptional()
  AWS_SECRET_ACCESS_KEY: string;

  @IsString()
  @IsOptional()
  AWS_S3_REGION: string = 'us-east-1';

  @IsString()
  @IsOptional()
  AWS_S3_BUCKET: string;

  @IsString()
  @IsOptional()
  AWS_S3_ENDPOINT: string;

  // Cloudinary Configuration
  @IsString()
  @IsOptional()
  CLOUDINARY_CLOUD_NAME: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_API_KEY: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_API_SECRET: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_FOLDER: string = 'nestjs-boilerplate';
}

export default registerAs('storage', (): StorageConfigValidation => {
  const config = new StorageConfigValidation();

  config.STORAGE_PROVIDER = process.env.STORAGE_PROVIDER as StorageProvider || StorageProvider.LOCAL;
  config.STORAGE_LOCAL_PATH = process.env.STORAGE_LOCAL_PATH || './uploads';
  config.STORAGE_MAX_FILE_SIZE = parseInt(process.env.STORAGE_MAX_FILE_SIZE, 10) || 10485760;
  config.STORAGE_ALLOWED_EXTENSIONS = process.env.STORAGE_ALLOWED_EXTENSIONS?.split(',').map(ext => ext.trim()) || ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'];

  // S3
  config.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
  config.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
  config.AWS_S3_REGION = process.env.AWS_S3_REGION || 'us-east-1';
  config.AWS_S3_BUCKET = process.env.AWS_S3_BUCKET;
  config.AWS_S3_ENDPOINT = process.env.AWS_S3_ENDPOINT;

  // Cloudinary
  config.CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
  config.CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY;
  config.CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET;
  config.CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER || 'nestjs-boilerplate';

  return config;
}); 