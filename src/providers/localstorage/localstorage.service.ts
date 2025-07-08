import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { uploadStaticPath } from '@modules/app/app.module';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';

@Injectable()
export default class LocalStorageService {
  config;

  private logger = new Logger(LocalStorageService.name);

  constructor(private configService: ConfigService) {
    this.config = this.configService.get('localstorage');
  }
  private getRandomString(length: number): string {
    return Math.random().toString(36).substring(2, length);
  }

  private getFileFormat(fileName: string): string {
    const fileNameArray: string[] = fileName.split('.');
    return fileNameArray[fileNameArray.length - 1];
  }

  private createNewFileName(oldFileName?: string) {
    const fileFormat: string = oldFileName
      ? this.getFileFormat(oldFileName)
      : '';
    const randomSymbols: string = this.getRandomString(15);

    return `${Date.now()}-${randomSymbols}${
      fileFormat ? '.' : ''
    }${fileFormat}`;
  }

  /**
   * @desc Upload file to LocalStorage
   * @param file - file to upload
   * @param filePath - secondary path to upload files within the uploads directory
   * @returns {Promise<string>} - Uploaded file url
   * @example
   *  const file = {
   *    originalname: 'image.png',
   *    buffer: Buffer,
   *    mimetype: 'image/png',
   *  };
   *  await this.localStorage.upload(file, 'pictures/applications');
   */
  async upload(
    file: Express.Multer.File,
    filePath?: string,
    isAbsolute?: boolean,
  ): Promise<string> {
    try {
      // Save the file if it exists
      let uploadedFileUrl: string | undefined = undefined;
      let rootPath = uploadStaticPath;

      if (filePath) {
        if (isAbsolute) {
          rootPath = filePath;
        } else {
          rootPath = path.join(uploadStaticPath, filePath);
        }
      }

      if (file) {
        const newFileName = this.createNewFileName(file.originalname);
        fs.mkdirSync(rootPath, { recursive: true });
        fs.writeFileSync(path.join(rootPath, newFileName), file.buffer as any);
        if (isAbsolute) {
          uploadedFileUrl = `${filePath ? filePath + '/' : ''}${newFileName}`;
        } else {
          uploadedFileUrl = path.join(
            '/uploads',
            `${filePath ? filePath + '/' : ''}${newFileName}`,
          );
        }
      } else {
        throw new Error('No file provided');
      }
      return uploadedFileUrl;
    } catch (error) {
      this.logger.error('Error uploading file:', error);
      throw new Error('Error uploading file');
    }
  }

  async readCsv(filePath: string): Promise<any[]> {
    const results = [];
    console.log(results);

    return new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(parse())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          console.log('parcer ended');
          resolve(results);
        })
        .on('error', (error) => reject(error));
    });
  }
}
