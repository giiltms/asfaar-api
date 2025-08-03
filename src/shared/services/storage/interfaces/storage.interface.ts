export interface UploadFileOptions {
  buffer: Buffer;
  filename: string;
  mimetype: string;
  destination?: string;
  isPublic?: boolean;
  metadata?: Record<string, any>;
  tags?: Record<string, string>;
}

export interface UploadOptions {
  fileName?: string;
  folder?: string;
  isPublic?: boolean;
  metadata?: Record<string, any>;
  tags?: Record<string, string>;
}

export interface UploadResult {
  filename: string;
  originalName: string;
  path: string;
  url: string;
  size: number;
  mimetype: string;
  metadata?: Record<string, any>;
}

export interface DeleteOptions {
  force?: boolean;
}

export interface StorageProvider {
  uploadFile(options: UploadFileOptions): Promise<UploadResult>;
  deleteFile(filePath: string): Promise<void>;
  getFileUrl(filePath: string): Promise<string>;
}

export interface StorageProviderInterface {
  upload(
    file: Express.Multer.File,
    options?: UploadOptions,
  ): Promise<UploadResult>;
  delete(key: string, options?: DeleteOptions): Promise<boolean>;
  getUrl(key: string, expiresIn?: number): Promise<string>;
  exists(key: string): Promise<boolean>;
  getMetadata(key: string): Promise<any>;
  healthCheck(): Promise<boolean>;
}
