import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';

export interface BiometricAuditLog {
  action:
    | 'CREATE'
    | 'READ'
    | 'UPDATE'
    | 'DELETE'
    | 'CAPTURE'
    | 'VALIDATE'
    | 'ENCRYPT'
    | 'DECRYPT';
  resourceType:
    | 'BIOMETRIC_DATA'
    | 'FINGERPRINT_DATA'
    | 'TEMPLATE'
    | 'WSQ_IMAGE';
  resourceId: string;
  userId: string;
  actorId: string;
  purpose: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

@Injectable()
export class BiometricAuditService {
  private readonly logger = new Logger(BiometricAuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log biometric operation for audit purposes
   * @param auditLog - Audit log data
   */
  async logBiometricOperation(auditLog: BiometricAuditLog): Promise<void> {
    try {
      // Store in database
      await this.prisma.auditLog.create({
        data: {
          action: auditLog.action,
          resource: auditLog.resourceType,
          resourceId: auditLog.resourceId,
          userId: auditLog.userId,
          oldValues: {
            actorId: auditLog.actorId,
            purpose: auditLog.purpose,
            details: auditLog.details,
            success: auditLog.success,
            errorMessage: auditLog.errorMessage,
          },
          ipAddress: auditLog.ipAddress,
          userAgent: auditLog.userAgent,
          timestamp: new Date(),
        },
      });

      // Also log to application logs
      const logLevel = auditLog.success ? 'log' : 'error';
      this.logger[logLevel](
        `Biometric ${auditLog.action} ${auditLog.resourceType} ${
          auditLog.resourceId
        } by ${auditLog.actorId} - ${auditLog.success ? 'SUCCESS' : 'FAILED'}`,
        {
          purpose: auditLog.purpose,
          details: auditLog.details,
          error: auditLog.errorMessage,
        },
      );
    } catch (error) {
      this.logger.error('Failed to log biometric audit operation', error.stack);
      // Don't throw error to avoid breaking the main operation
    }
  }

  /**
   * Log fingerprint capture operation
   * @param biometricDataId - Biometric data ID
   * @param userId - User ID
   * @param actorId - Actor ID
   * @param details - Capture details
   * @param success - Whether operation was successful
   * @param errorMessage - Error message if failed
   */
  async logCaptureOperation(
    biometricDataId: string,
    userId: string,
    actorId: string,
    details: {
      device: string;
      location: string;
      method: string;
      fingerCount: number;
      qualityScores: number[];
      nfiqScores: number[];
    },
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    await this.logBiometricOperation({
      action: 'CAPTURE',
      resourceType: 'BIOMETRIC_DATA',
      resourceId: biometricDataId,
      userId,
      actorId,
      purpose: 'Fingerprint capture for visa application',
      details: {
        captureDevice: details.device,
        captureLocation: details.location,
        captureMethod: details.method,
        fingerCount: details.fingerCount,
        averageQualityScore:
          details.qualityScores.reduce((a, b) => a + b, 0) /
          details.qualityScores.length,
        averageNfiqScore:
          details.nfiqScores.reduce((a, b) => a + b, 0) /
          details.nfiqScores.length,
        qualityScores: details.qualityScores,
        nfiqScores: details.nfiqScores,
      },
      success,
      errorMessage,
    });
  }

  /**
   * Log fingerprint data access operation
   * @param biometricDataId - Biometric data ID
   * @param userId - User ID
   * @param actorId - Actor ID
   * @param purpose - Purpose of access
   * @param success - Whether operation was successful
   * @param errorMessage - Error message if failed
   */
  async logAccessOperation(
    biometricDataId: string,
    userId: string,
    actorId: string,
    purpose: string,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    await this.logBiometricOperation({
      action: 'READ',
      resourceType: 'BIOMETRIC_DATA',
      resourceId: biometricDataId,
      userId,
      actorId,
      purpose,
      details: {
        accessType: 'FINGERPRINT_DATA_RETRIEVAL',
        timestamp: new Date().toISOString(),
      },
      success,
      errorMessage,
    });
  }

  /**
   * Log template validation operation
   * @param fingerprintDataId - Fingerprint data ID
   * @param userId - User ID
   * @param actorId - Actor ID
   * @param validationResult - Validation result
   * @param success - Whether operation was successful
   */
  async logValidationOperation(
    fingerprintDataId: string,
    userId: string,
    actorId: string,
    validationResult: {
      isValid: boolean;
      qualityScore: number;
      nfiqScore: number;
      errors: string[];
      warnings: string[];
    },
    success: boolean,
  ): Promise<void> {
    await this.logBiometricOperation({
      action: 'VALIDATE',
      resourceType: 'TEMPLATE',
      resourceId: fingerprintDataId,
      userId,
      actorId,
      purpose: 'Template validation for ISO/IEC 19794-2:2005 compliance',
      details: {
        isValid: validationResult.isValid,
        qualityScore: validationResult.qualityScore,
        nfiqScore: validationResult.nfiqScore,
        errorCount: validationResult.errors.length,
        warningCount: validationResult.warnings.length,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
      },
      success,
    });
  }

  /**
   * Log encryption/decryption operation
   * @param resourceId - Resource ID
   * @param userId - User ID
   * @param actorId - Actor ID
   * @param operation - Encryption or decryption
   * @param resourceType - Type of resource being encrypted/decrypted
   * @param success - Whether operation was successful
   * @param errorMessage - Error message if failed
   */
  async logEncryptionOperation(
    resourceId: string,
    userId: string,
    actorId: string,
    operation: 'ENCRYPT' | 'DECRYPT',
    resourceType: 'TEMPLATE' | 'WSQ_IMAGE',
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    await this.logBiometricOperation({
      action: operation,
      resourceType,
      resourceId,
      userId,
      actorId,
      purpose: `Biometric data ${operation.toLowerCase()}ion for security`,
      details: {
        operation,
        resourceType,
        timestamp: new Date().toISOString(),
      },
      success,
      errorMessage,
    });
  }

  /**
   * Log deletion operation
   * @param biometricDataId - Biometric data ID
   * @param userId - User ID
   * @param actorId - Actor ID
   * @param reason - Reason for deletion
   * @param success - Whether operation was successful
   * @param errorMessage - Error message if failed
   */
  async logDeletionOperation(
    biometricDataId: string,
    userId: string,
    actorId: string,
    reason: string,
    success: boolean,
    errorMessage?: string,
  ): Promise<void> {
    await this.logBiometricOperation({
      action: 'DELETE',
      resourceType: 'BIOMETRIC_DATA',
      resourceId: biometricDataId,
      userId,
      actorId,
      purpose: `Biometric data deletion: ${reason}`,
      details: {
        deletionReason: reason,
        deletionType: 'SOFT_DELETE',
        timestamp: new Date().toISOString(),
      },
      success,
      errorMessage,
    });
  }

  /**
   * Get audit logs for a specific resource
   * @param resourceId - Resource ID
   * @param resourceType - Resource type
   * @param limit - Maximum number of logs to return
   * @returns Audit logs
   */
  async getAuditLogs(resourceId: string, resourceType: string, limit = 50) {
    return await this.prisma.auditLog.findMany({
      where: {
        resourceId,
        resource: resourceType,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Get audit logs for a specific user
   * @param userId - User ID
   * @param limit - Maximum number of logs to return
   * @returns Audit logs
   */
  async getUserAuditLogs(userId: string, limit = 50) {
    return await this.prisma.auditLog.findMany({
      where: {
        userId,
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: limit,
    });
  }
}
