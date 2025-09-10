import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface EncryptionResult {
  encryptedData: Buffer;
  iv: Buffer;
  tag: Buffer;
  keyVersion: string;
  algorithm: string;
}

export interface DecryptionResult {
  decryptedData: Buffer;
  isValid: boolean;
}

@Injectable()
export class BiometricEncryptionService {
  private readonly logger = new Logger(BiometricEncryptionService.name);
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyVersion: string;
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    // Get encryption key from environment variables
    const keyString = this.configService.get<string>(
      'BIOMETRIC_ENCRYPTION_KEY',
    );
    if (!keyString) {
      throw new Error(
        'BIOMETRIC_ENCRYPTION_KEY environment variable is required',
      );
    }

    // Convert hex string to buffer (key should be 32 bytes for AES-256)
    this.encryptionKey = Buffer.from(keyString, 'hex');
    if (this.encryptionKey.length !== 32) {
      throw new Error(
        'BIOMETRIC_ENCRYPTION_KEY must be 64 hex characters (32 bytes)',
      );
    }

    this.keyVersion = this.configService.get<string>(
      'BIOMETRIC_KEY_VERSION',
      '1.0',
    );

    this.logger.log('BiometricEncryptionService initialized with AES-256-GCM');
  }

  /**
   * Encrypt biometric data using AES-256-GCM
   * @param data - The biometric data to encrypt
   * @param additionalData - Additional authenticated data (optional)
   * @returns Encryption result with encrypted data, IV, and authentication tag
   */
  async encryptBiometricData(
    data: Buffer,
    additionalData?: string,
  ): Promise<EncryptionResult> {
    try {
      // Generate random IV (12 bytes for GCM)
      const iv = crypto.randomBytes(12);

      // Create cipher
      const cipher = crypto.createCipher(this.algorithm, this.encryptionKey);
      cipher.setAAD(Buffer.from(additionalData || '', 'utf8'));

      // Encrypt data
      const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);

      // Get authentication tag
      const tag = cipher.getAuthTag();

      this.logger.debug(
        `Encrypted biometric data: ${data.length} bytes -> ${encrypted.length} bytes`,
      );

      return {
        encryptedData: encrypted,
        iv,
        tag,
        keyVersion: this.keyVersion,
        algorithm: this.algorithm,
      };
    } catch (error) {
      this.logger.error('Failed to encrypt biometric data', error.stack);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt biometric data using AES-256-GCM
   * @param encryptedData - The encrypted data
   * @param iv - Initialization vector
   * @param tag - Authentication tag
   * @param additionalData - Additional authenticated data (optional)
   * @returns Decryption result with decrypted data and validation status
   */
  async decryptBiometricData(
    encryptedData: Buffer,
    iv: Buffer,
    tag: Buffer,
    additionalData?: string,
  ): Promise<DecryptionResult> {
    try {
      // Create decipher
      const decipher = crypto.createDecipher(
        this.algorithm,
        this.encryptionKey,
      );
      decipher.setAAD(Buffer.from(additionalData || '', 'utf8'));
      decipher.setAuthTag(tag);

      // Decrypt data
      const decrypted = Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
      ]);

      this.logger.debug(
        `Decrypted biometric data: ${encryptedData.length} bytes -> ${decrypted.length} bytes`,
      );

      return {
        decryptedData: decrypted,
        isValid: true,
      };
    } catch (error) {
      this.logger.error('Failed to decrypt biometric data', error.stack);
      return {
        decryptedData: Buffer.alloc(0),
        isValid: false,
      };
    }
  }

  /**
   * Generate SHA-256 hash for data integrity verification
   * @param data - The data to hash
   * @returns SHA-256 hash as hex string
   */
  generateHash(data: Buffer): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Verify data integrity using hash
   * @param data - The data to verify
   * @param expectedHash - The expected hash
   * @returns True if hash matches
   */
  verifyHash(data: Buffer, expectedHash: string): boolean {
    const actualHash = this.generateHash(data);
    return actualHash === expectedHash;
  }

  /**
   * Generate a secure random key for encryption
   * @returns 32-byte random key as hex string
   */
  generateEncryptionKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get current key version
   * @returns Current key version
   */
  getKeyVersion(): string {
    return this.keyVersion;
  }

  /**
   * Get encryption algorithm
   * @returns Encryption algorithm name
   */
  getAlgorithm(): string {
    return this.algorithm;
  }
}
