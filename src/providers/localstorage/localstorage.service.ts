import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parse } from 'csv-parse';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LocalStorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly uploadPath: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadPath = path.join(process.cwd(), 'uploads');
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  async upload(
    file: Express.Multer.File,
    destination?: string,
  ): Promise<string> {
    try {
      const uploadDir = destination
        ? path.join(this.uploadPath, destination)
        : this.uploadPath;

      // Ensure destination directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filename = `${Date.now()}-${file.originalname}`;
      const filePath = path.join(uploadDir, filename);

      await fs.promises.writeFile(filePath, file.buffer);

      const relativePath = path.relative(this.uploadPath, filePath);
      this.logger.log(`File uploaded: ${relativePath}`);

      return `/uploads/${relativePath.replace(/\\/g, '/')}`;
    } catch (error) {
      this.logger.error('Error uploading file:', error);
      throw error;
    }
  }

  async delete(filePath: string): Promise<boolean> {
    try {
      const fullPath = path.join(
        this.uploadPath,
        filePath.replace('/uploads/', ''),
      );

      if (fs.existsSync(fullPath)) {
        await fs.promises.unlink(fullPath);
        this.logger.log(`File deleted: ${filePath}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error('Error deleting file:', error);
      return false;
    }
  }
}
