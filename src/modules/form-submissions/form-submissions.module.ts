import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { PrismaModule } from '@providers/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { CaslModule } from '@modules/casl/casl.module';
import { FormSubmissionsController } from './form-submissions.controller';
import { PublicFormsController } from './public-forms.controller';
import { AdminSubmissionsController } from './admin-submissions.controller';
import { FormSubmissionsService } from './services/form-submissions.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
  imports: [
    PrismaModule,
    ConfigModule,
    CaslModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_TOKEN_EXPIRATION_TIME', '15m'),
        },
      }),
      inject: [ConfigService],
    }),
    AuthModule, // Import AuthModule for authentication services
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        storage: diskStorage({
          destination: './uploads/form-submissions',
          filename: (req, file, callback) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
            const ext = extname(file.originalname);
            const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
            callback(null, filename);
          },
        }),
        fileFilter: (req, file, callback) => {
          // Allow images, PDFs, and common document formats
          const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/csv',
          ];

          if (allowedTypes.includes(file.mimetype)) {
            callback(null, true);
          } else {
            callback(new Error('File type not allowed'), false);
          }
        },
        limits: {
          fileSize: 10 * 1024 * 1024, // 10MB limit
          files: 10, // Maximum 10 files
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    FormSubmissionsController,
    PublicFormsController,
    AdminSubmissionsController,
  ],
  providers: [FormSubmissionsService],
  exports: [FormSubmissionsService],
})
export class FormSubmissionsModule {} 