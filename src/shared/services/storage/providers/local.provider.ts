import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuid } from 'uuid';
import {
  StorageProviderInterface,
  UploadOptions,
  UploadResult,
  DeleteOptions,
} from '../interfaces/storage.interface';

export class LocalStorageProvider implements StorageProviderInterface {
  private readonly basePath: string;

  constructor(private readonly config: any) {
    this.basePath = path.resolve(config.STORAGE_LOCAL_PATH);
    this.ensureDirectoryExists(this.basePath);
  }

  async upload(
    file: Express.Multer.File,
    options?: UploadOptions,
  ): Promise<UploadResult> {
    const fileName =
      options?.fileName || this.generateFileName(file.originalname);
    const folder = options?.folder || 'default';
    const fullPath = path.join(this.basePath, folder);

    this.ensureDirectoryExists(fullPath);

    const filePath = path.join(fullPath, fileName);
    const key = path.join(folder, fileName);

    await fs.promises.writeFile(filePath, file.buffer);

    return {
      filename: key,
      originalName: file.originalname,
      path: key,
      url: `/uploads/${key}`,
      size: file.size,
      mimetype: file.mimetype,
      metadata: options?.metadata,
    };
  }

  async delete(key: string, options?: DeleteOptions): Promise<boolean> {
    try {
      const filePath = path.join(this.basePath, key);
      await fs.promises.unlink(filePath);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getUrl(key: string, expiresIn?: number): Promise<string> {
    // For local storage, URLs don't expire
    return `/uploads/${key}`;
  }

  async exists(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.basePath, key);
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async getMetadata(key: string): Promise<any> {
    try {
      const filePath = path.join(this.basePath, key);
      const stats = await fs.promises.stat(filePath);
      return {
        size: stats.size,
        lastModified: stats.mtime,
        created: stats.birthtime,
      };
    } catch {
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await fs.promises.access(this.basePath);
      return true;
    } catch {
      return false;
    }
  }

  private generateFileName(originalName: string): string {
    const extension = path.extname(originalName);
    return `${uuid()}${extension}`;
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}
