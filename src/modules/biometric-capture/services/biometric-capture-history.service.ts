import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { PaginationQueryDto } from '@common/dtos';
import { PaginationUtils } from '@common/utils/pagination.utils';
import { BiometricCaptureHistoryFiltersDto } from '../dto/biometric-capture-history.dto';

/**
 * Service for managing biometric capture history for center managers
 * Provides access to capture history for centers they manage
 */
@Injectable()
export class BiometricCaptureHistoryService {
  private readonly logger = new Logger(BiometricCaptureHistoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get biometric capture history for centers managed by the user
   */
  async getCaptureHistory(
    managerId: string,
    filters: BiometricCaptureHistoryFiltersDto = {},
    pagination: PaginationQueryDto = { page: 1, limit: 10 },
  ) {
    try {
      // First, get the centers the manager has access to
      const manager = await this.prisma.user.findUnique({
        where: { id: managerId },
        include: {
          biometricCenters: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      });

      if (!manager) {
        throw new NotFoundException('Manager not found');
      }

      // Check if manager has access to any centers
      if (!manager.biometricCenters || manager.biometricCenters.length === 0) {
        throw new ForbiddenException('No centers assigned to this manager');
      }

      const managerCenterIds = manager.biometricCenters.map(
        (center) => center.id,
      );

      // Build where clause
      const where: any = {
        // Only include captures from centers the manager has access to
        OR: [
          // Direct capture location filter (if capture location contains center info)
          {
            captureLocation: {
              contains: manager.biometricCenters
                .map((center) => center.name)
                .join('|'),
              mode: 'insensitive',
            },
          },
          // Or filter by appointment center (through submission -> appointment)
          {
            submission: {
              appointment: {
                centerId: {
                  in: managerCenterIds,
                },
              },
            },
          },
        ],
      };

      // Apply additional filters
      if (filters.centerId) {
        // Verify the manager has access to this specific center
        if (!managerCenterIds.includes(filters.centerId)) {
          throw new ForbiddenException('Access denied to the specified center');
        }
        where.OR = [
          {
            captureLocation: {
              contains: manager.biometricCenters.find(
                (c) => c.id === filters.centerId,
              )?.name,
              mode: 'insensitive',
            },
          },
          {
            submission: {
              appointment: {
                centerId: filters.centerId,
              },
            },
          },
        ];
      }

      if (filters.userId) {
        where.userId = filters.userId;
      }

      if (filters.submissionId) {
        where.submissionId = filters.submissionId;
      }

      if (filters.capturedBy) {
        where.capturedBy = filters.capturedBy;
      }

      if (filters.verificationStatus) {
        where.verificationStatus = filters.verificationStatus;
      }

      if (filters.isVerified !== undefined) {
        where.isVerified = filters.isVerified;
      }

      if (filters.fromDate || filters.toDate) {
        where.capturedAt = {};
        if (filters.fromDate) {
          where.capturedAt.gte = new Date(filters.fromDate);
        }
        if (filters.toDate) {
          where.capturedAt.lte = new Date(filters.toDate);
        }
      }

      if (filters.captureDevice) {
        where.captureDevice = {
          contains: filters.captureDevice,
          mode: 'insensitive',
        };
      }

      if (filters.captureLocation) {
        where.captureLocation = {
          contains: filters.captureLocation,
          mode: 'insensitive',
        };
      }

      // Calculate pagination
      const skip = (pagination.page - 1) * pagination.limit;

      // Execute queries
      const [captures, totalCount] = await Promise.all([
        this.prisma.biometricData.findMany({
          where,
          skip,
          take: pagination.limit,
          orderBy: { capturedAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                nin: true,
                phone: true,
              },
            },
            submission: {
              select: {
                id: true,
                referenceNumber: true,
                status: true,
                submittedAt: true,
                appointment: {
                  select: {
                    id: true,
                    appointmentTime: true,
                    center: {
                      select: {
                        id: true,
                        name: true,
                        code: true,
                        city: true,
                        state: true,
                      },
                    },
                  },
                },
              },
            },
            fingerprintFingers: {
              select: {
                id: true,
                fingerPosition: true,
                fingerName: true,
                nfiqScore: true,
                qualityScore: true,
                isAcceptable: true,
                isTemplateValid: true,
                capturedAt: true,
                captureDevice: true,
                captureMethod: true,
              },
              orderBy: { fingerPosition: 'asc' },
            },
          },
        }),
        this.prisma.biometricData.count({ where }),
      ]);

      const meta = PaginationUtils.createPaginationMeta(
        pagination.page,
        pagination.limit,
        totalCount,
        'capturedAt',
        'desc',
      );

      // Transform the data to include center information
      const transformedCaptures = captures.map((capture) => {
        const centerInfo = capture.submission?.appointment?.center;
        return {
          ...capture,
          centerInfo,
          fingerprintCount: capture.fingerprintFingers.length,
          acceptableFingerprints: capture.fingerprintFingers.filter(
            (f) => f.isAcceptable,
          ).length,
          totalFingerprints: capture.fingerprintFingers.length,
        };
      });

      return {
        data: transformedCaptures,
        meta,
        managerCenters: manager.biometricCenters,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch biometric capture history: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get capture statistics for centers managed by the user
   */
  async getCaptureStatistics(
    managerId: string,
    filters: BiometricCaptureHistoryFiltersDto = {},
  ) {
    try {
      // Get manager's centers
      const manager = await this.prisma.user.findUnique({
        where: { id: managerId },
        include: {
          biometricCenters: {
            select: { id: true, name: true, code: true },
          },
        },
      });

      if (!manager || !manager.biometricCenters.length) {
        throw new ForbiddenException('No centers assigned to this manager');
      }

      const managerCenterIds = manager.biometricCenters.map(
        (center) => center.id,
      );

      // Build base where clause
      const baseWhere: any = {
        OR: [
          {
            submission: {
              appointment: {
                centerId: { in: managerCenterIds },
              },
            },
          },
        ],
      };

      // Apply date filters if provided
      if (filters.fromDate || filters.toDate) {
        baseWhere.capturedAt = {};
        if (filters.fromDate) {
          baseWhere.capturedAt.gte = new Date(filters.fromDate);
        }
        if (filters.toDate) {
          baseWhere.capturedAt.lte = new Date(filters.toDate);
        }
      }

      // Get statistics
      const [
        totalCaptures,
        verifiedCaptures,
        pendingCaptures,
        rejectedCaptures,
        capturesByDate,
      ] = await Promise.all([
        // Total captures
        this.prisma.biometricData.count({ where: baseWhere }),

        // Verified captures
        this.prisma.biometricData.count({
          where: { ...baseWhere, isVerified: true },
        }),

        // Pending captures
        this.prisma.biometricData.count({
          where: { ...baseWhere, verificationStatus: 'PENDING' },
        }),

        // Rejected captures
        this.prisma.biometricData.count({
          where: { ...baseWhere, verificationStatus: 'REJECTED' },
        }),

        // Captures by date (last 30 days)
        this.prisma.$queryRaw<Array<{ date: string; count: number }>>`
          SELECT 
            DATE(captured_at) as date,
            COUNT(*) as count
          FROM biometric_data bd
          JOIN form_submissions fs ON bd.submission_id = fs.id
          JOIN biometric_appointments ba ON fs.id = ba.submission_id
          WHERE ba.center_id = ANY(${managerCenterIds})
            AND bd.captured_at >= NOW() - INTERVAL '30 days'
          GROUP BY DATE(captured_at)
          ORDER BY date DESC
        `,
      ]);

      return {
        totalCaptures,
        verifiedCaptures,
        pendingCaptures,
        rejectedCaptures,
        verificationRate:
          totalCaptures > 0 ? (verifiedCaptures / totalCaptures) * 100 : 0,
        capturesByDate,
        managerCenters: manager.biometricCenters,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch capture statistics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get detailed capture information for a specific capture
   */
  async getCaptureDetails(managerId: string, captureId: string) {
    try {
      // Get manager's centers
      const manager = await this.prisma.user.findUnique({
        where: { id: managerId },
        include: {
          biometricCenters: {
            select: { id: true },
          },
        },
      });

      if (!manager || !manager.biometricCenters.length) {
        throw new ForbiddenException('No centers assigned to this manager');
      }

      const managerCenterIds = manager.biometricCenters.map(
        (center) => center.id,
      );

      // Get capture details
      const capture = await this.prisma.biometricData.findUnique({
        where: { id: captureId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              nin: true,
              phone: true,
            },
          },
          submission: {
            select: {
              id: true,
              referenceNumber: true,
              status: true,
              submittedAt: true,
              appointment: {
                select: {
                  id: true,
                  appointmentTime: true,
                  center: {
                    select: {
                      id: true,
                      name: true,
                      code: true,
                      city: true,
                      state: true,
                    },
                  },
                },
              },
            },
          },
          fingerprintFingers: {
            select: {
              id: true,
              fingerPosition: true,
              fingerName: true,
              nfiqScore: true,
              qualityScore: true,
              isAcceptable: true,
              isTemplateValid: true,
              capturedAt: true,
              captureDevice: true,
              captureMethod: true,
              captureAttempts: true,
            },
            orderBy: { fingerPosition: 'asc' },
          },
        },
      });

      if (!capture) {
        throw new NotFoundException('Capture not found');
      }

      // Check if manager has access to this capture's center
      const centerId = capture.submission?.appointment?.center?.id;
      if (centerId && !managerCenterIds.includes(centerId)) {
        throw new ForbiddenException('Access denied to this capture');
      }

      return capture;
    } catch (error) {
      this.logger.error(
        `Failed to fetch capture details: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
