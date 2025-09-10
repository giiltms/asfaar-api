import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';

export interface UserBoothContext {
  boothId: string;
  boothNumber: string;
  centerId: string;
  centerName: string;
  centerCode: string;
  centerAddress: string;
  centerCity: string;
  centerState: string;
  appointmentClass: string;
}

@Injectable()
export class UserContextService {
  private readonly logger = new Logger(UserContextService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get current user's booth and center assignment
   * @param userId - User ID
   * @returns User's booth and center context
   */
  async getUserBoothContext(userId: string): Promise<UserBoothContext | null> {
    try {
      const booth = await this.prisma.booth.findFirst({
        where: {
          agentId: userId,
          isActive: true,
        },
        include: {
          center: {
            select: {
              id: true,
              name: true,
              code: true,
              address: true,
              city: true,
              state: true,
            },
          },
        },
      });

      if (!booth) {
        this.logger.warn(`No active booth assignment found for user ${userId}`);
        return null;
      }

      return {
        boothId: booth.id,
        boothNumber: booth.boothNumber,
        centerId: booth.center.id,
        centerName: booth.center.name,
        centerCode: booth.center.code,
        centerAddress: booth.center.address,
        centerCity: booth.center.city,
        centerState: booth.center.state,
        appointmentClass: booth.appointmentClass,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get user booth context for user ${userId}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Get user's center assignments (for center managers)
   * @param userId - User ID
   * @returns Array of centers the user manages
   */
  async getUserCenterContext(userId: string): Promise<Array<{
    centerId: string;
    centerName: string;
    centerCode: string;
    centerAddress: string;
    centerCity: string;
    centerState: string;
  }> | null> {
    try {
      const centers = await this.prisma.biometricCenter.findMany({
        where: {
          managerId: userId,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          code: true,
          address: true,
          city: true,
          state: true,
        },
      });

      if (centers.length === 0) {
        this.logger.warn(
          `No center management assignment found for user ${userId}`,
        );
        return null;
      }

      return centers.map(center => ({
        centerId: center.id,
        centerName: center.name,
        centerCode: center.code,
        centerAddress: center.address,
        centerCity: center.city,
        centerState: center.state,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to get user center context for user ${userId}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Get user's current active booth or first available booth in their center
   * @param userId - User ID
   * @returns Booth context or null
   */
  async getUserActiveBoothContext(
    userId: string,
  ): Promise<UserBoothContext | null> {
    // First try to get user's assigned booth
    const assignedBooth = await this.getUserBoothContext(userId);
    if (assignedBooth) {
      return assignedBooth;
    }

    // If no assigned booth, try to get first available booth from user's managed centers
    try {
      const centers = await this.getUserCenterContext(userId);
      if (!centers || centers.length === 0) {
        return null;
      }

      // Get first available booth from any of the user's managed centers
      const booth = await this.prisma.booth.findFirst({
        where: {
          centerId: { in: centers.map((c) => c.centerId) },
          isActive: true,
          isOccupied: false,
        },
        include: {
          center: {
            select: {
              id: true,
              name: true,
              code: true,
              address: true,
              city: true,
              state: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (!booth) {
        this.logger.warn(
          `No available booths found in user ${userId}'s managed centers`,
        );
        return null;
      }

      return {
        boothId: booth.id,
        boothNumber: booth.boothNumber,
        centerId: booth.center.id,
        centerName: booth.center.name,
        centerCode: booth.center.code,
        centerAddress: booth.center.address,
        centerCity: booth.center.city,
        centerState: booth.center.state,
        appointmentClass: booth.appointmentClass,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get user active booth context for user ${userId}`,
        error.stack,
      );
      return null;
    }
  }

  /**
   * Format location string from booth context
   * @param context - Booth context
   * @returns Formatted location string
   */
  formatLocationString(context: UserBoothContext): string {
    return `${context.centerName} - Booth ${context.boothNumber}`;
  }

  /**
   * Get device information from booth context
   * @param context - Booth context
   * @returns Device information string
   */
  getDeviceInfo(context: UserBoothContext): string {
    return `Suprema RealScan-G10 - ${context.centerCode}-${context.boothNumber}`;
  }
}
