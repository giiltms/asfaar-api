import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import {
  CreateClientDto,
  CreateClientByNinDto,
  UpdateClientDto,
  ClientProfileDto,
  ClientAnalyticsDto,
  ClientFiltersDto,
} from './dto/travel-agent.dto';
import { PaginationUtils } from '@common/utils/pagination.utils';
import {
  SubmissionStatus,
  PaymentStatus,
  Gender,
  Roles,
  VerificationStatus,
} from '@prisma/client';
import { NinVerificationService } from '@shared/services/nin-verification/nin-verification.service';
import { UserService } from '@modules/user/user.service';
import * as bcrypt from 'bcrypt';

/**
 * Service for managing travel agent client operations
 * Handles client management, profiles, and communications
 */
@Injectable()
export class TravelAgentClientsService {
  private readonly logger = new Logger(TravelAgentClientsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ninVerificationService: NinVerificationService,
    private readonly userService: UserService,
  ) {}

  /**
   * Create a client by NIN and date of birth
   * If client already exists, just add them to agent's client list
   * If client doesn't exist, verify NIN, create account, then add to list
   */
  async createClient(
    agentId: string,
    createDto: CreateClientByNinDto,
  ): Promise<ClientProfileDto> {
    try {
      // Normalize NIN
      const normalizedNin = createDto.nin.replace(/\D/g, '');

      if (normalizedNin.length !== 11) {
        throw new BadRequestException('NIN must be 11 digits');
      }

      // Check if user with this NIN already exists
      const existingUser = await this.prisma.user.findFirst({
        where: { nin: normalizedNin },
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          avatar: true,
          isVerified: true,
          dateOfBirth: true,
          roles: true, // Include roles for validation
          createdAt: true,
        },
      });

      let clientId: string;

      if (existingUser) {
        // User already exists - validate date of birth matches before proceeding
        const existingDob = new Date(existingUser.dateOfBirth)
          .toISOString()
          .split('T')[0];
        const providedDob = new Date(createDto.dateOfBirth)
          .toISOString()
          .split('T')[0];

        if (existingDob !== providedDob) {
          throw new BadRequestException(
            'Date of birth does not match the existing user record',
          );
        }

        // Prevent agent from adding themselves
        if (existingUser.id === agentId) {
          throw new BadRequestException(
            'You cannot add yourself to your client list',
          );
        }

        // Check if existing user is an agent
        if (existingUser.roles.includes(Roles.AGENCY)) {
          throw new BadRequestException(
            'You can only add applicants to your client list, not other travel agents',
          );
        }

        // NIN exists and DOB is correct - just add to agent's list
        this.logger.log(
          `User with NIN ${normalizedNin} already exists: ${existingUser.id}. Adding to agent's client list.`,
        );
        clientId = existingUser.id;
      } else {
        // User doesn't exist, verify NIN and create account
        this.logger.log(
          `User with NIN ${normalizedNin} does not exist. Verifying NIN and creating account...`,
        );

        // Verify NIN with API
        const verificationResult = await this.ninVerificationService.verifyNin({
          nin: normalizedNin,
          dateOfBirth: createDto.dateOfBirth,
        });

        if (!verificationResult.success || !verificationResult.data) {
          throw new BadRequestException(
            verificationResult.error || 'NIN verification failed',
          );
        }

        const verifiedData = verificationResult.data;

        // Generate a random password for the user (they'll need to set it later)
        const tempPassword = await bcrypt.hash(
          `Temp${normalizedNin}${Date.now()}`,
          10,
        );

        // Parse date of birth
        let dateOfBirthValue: Date;
        if (verifiedData.dateOfBirth) {
          dateOfBirthValue = new Date(verifiedData.dateOfBirth);
        } else {
          dateOfBirthValue = new Date(createDto.dateOfBirth);
        }

        // Create user account with verified NIN data
        try {
          const newUser = await this.userService.createUser({
            email: createDto.email,
            nin: normalizedNin,
            ninVerified: true,
            firstName: verifiedData.firstName || '',
            middleName: verifiedData.middleName,
            lastName: verifiedData.lastName || '',
            phone: verifiedData.phoneNumber,
            password: tempPassword,
            dateOfBirth: dateOfBirthValue,
            gender: verifiedData.gender
              ? (verifiedData.gender.toUpperCase() as Gender)
              : undefined,
            state: verifiedData.address?.state,
            lga: verifiedData.address?.lga,
            avatar: verifiedData.photo,
            roles: [Roles.APPLICANT],
            isVerified: false, // Will need to verify email later
            isActive: true,
          });

          clientId = newUser.id;
          this.logger.log(
            `Created new user account for NIN ${normalizedNin}: ${clientId}`,
          );
        } catch (error: any) {
          // Handle unique constraint violations (email, phone, etc.)
          if (error.code === 'P2002') {
            const field = error.meta?.target?.[0] || 'data';
            let message = '';

            switch (field) {
              case 'email':
                message = 'Email address is already in use';
                break;
              case 'phone':
                message = 'Phone number is already in use';
                break;
              case 'nin':
                message = 'NIN is already registered';
                break;
              default:
                message = 'User could not be created due to data conflict';
            }

            throw new ConflictException(message);
          }
          throw error;
        }
      }

      // Check if client is already in agent's client list
      const existingRelationship =
        await this.prisma.travelAgentClient.findUnique({
          where: {
            agentId_clientId: {
              agentId,
              clientId,
            },
          },
        });

      if (existingRelationship) {
        throw new ConflictException(
          'This client is already in your client list',
        );
      }

      // Add client to agent's client list
      await this.prisma.travelAgentClient.create({
        data: {
          agentId,
          clientId,
          addedBy: agentId,
          notes: createDto.notes,
        },
      });

      this.logger.log(
        `Added client ${clientId} to agent ${agentId}'s client list`,
      );

      // Return client profile
      return this.getClient(agentId, clientId);
    } catch (error) {
      this.logger.error(
        `Failed to create client: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to create client: ${error.message}`,
      );
    }
  }

  /**
   * Get all clients for a travel agent
   */
  async getClients(
    agentId: string,
    filters: ClientFiltersDto,
  ): Promise<{
    data: ClientProfileDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      // Build where clause for TravelAgentClient relationships
      const whereClause: any = {
        agentId,
      };

      // If search filter is provided, we need to filter by client details
      if (filters.search) {
        // First, find matching users
        const matchingUsers = await this.prisma.user.findMany({
          where: {
            OR: [
              { firstName: { contains: filters.search, mode: 'insensitive' } },
              { lastName: { contains: filters.search, mode: 'insensitive' } },
              { email: { contains: filters.search, mode: 'insensitive' } },
            ],
          },
          select: { id: true },
        });

        const matchingClientIds = matchingUsers.map((u) => u.id);
        whereClause.clientId = { in: matchingClientIds };
      }

      const paginationOptions =
        PaginationUtils.normalizePaginationOptions(filters);
      const { skip, take } = PaginationUtils.getPrismaQuery(filters);

      // Get paginated client relationships
      const clientRelationships = await this.prisma.travelAgentClient.findMany({
        where: whereClause,
        include: {
          client: {
            include: {
              formSubmissions: {
                where: { travelAgentId: agentId },
                select: {
                  id: true,
                  status: true,
                  createdAt: true,
                },
              },
            },
          },
        },
        orderBy: { addedAt: 'desc' },
        skip,
        take,
      });

      // Get total count
      const total = await this.prisma.travelAgentClient.count({
        where: whereClause,
      });

      // Build client profiles
      const data = await Promise.all(
        clientRelationships.map(async (relationship) => {
          const client = relationship.client;

          // Get client statistics
          const totalApplications = client.formSubmissions.length;
          const successfulApplications = client.formSubmissions.filter(
            (app) => app.status === SubmissionStatus.APPROVED,
          ).length;

          // Get last application date
          const lastApplication = client.formSubmissions.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
          )[0];

          return {
            id: client.id,
            email: client.email,
            phone: client.phone,
            fullName:
              `${client.firstName || ''} ${client.lastName || ''}`.trim() ||
              client.email,
            avatar: client.avatar,
            isVerified: client.isVerified,
            createdAt: client.createdAt,
            totalApplications,
            successfulApplications,
            lastApplicationDate: lastApplication?.createdAt,
          };
        }),
      );

      return {
        data,
        total,
        page: paginationOptions.page,
        limit: paginationOptions.limit,
      };
    } catch (error) {
      this.logger.error(`Failed to get clients: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Get client by ID
   */
  async getClient(
    agentId: string,
    clientId: string,
  ): Promise<ClientProfileDto> {
    try {
      // Verify client is in agent's client list and fetch client data with optimized queries
      const [clientRelationship, submissionStats, lastApplication] =
        await Promise.all([
          this.prisma.travelAgentClient.findUnique({
            where: {
              agentId_clientId: {
                agentId,
                clientId,
              },
            },
            include: {
              client: {
                select: {
                  id: true,
                  email: true,
                  phone: true,
                  firstName: true,
                  middleName: true,
                  lastName: true,
                  avatar: true,
                  isVerified: true,
                  nin: true,
                  ninVerified: true,
                  dateOfBirth: true,
                  gender: true,
                  createdAt: true,
                  updatedAt: true,
                  ninVerifications: {
                    where: {
                      verificationStatus: VerificationStatus.VERIFIED,
                    },
                    orderBy: {
                      verificationDate: 'desc',
                    },
                    take: 1,
                    select: {
                      id: true,
                      nin: true,
                      firstName: true,
                      middleName: true,
                      lastName: true,
                      fullName: true,
                      dateOfBirth: true,
                      gender: true,
                      phoneNumber: true,
                      verifiedPhoneNumber: true,
                      photo: true,
                      addressLine1: true,
                      addressLine2: true,
                      city: true,
                      state: true,
                      lga: true,
                      postalCode: true,
                      country: true,
                      birthState: true,
                      birthLga: true,
                      verificationStatus: true,
                      verificationDate: true,
                      createdAt: true,
                      updatedAt: true,
                    },
                  },
                },
              },
            },
          }),
          // Get submission statistics using aggregation (more efficient)
          this.prisma.formSubmission.groupBy({
            by: ['status'],
            where: {
              userId: clientId,
              travelAgentId: agentId,
            },
            _count: {
              id: true,
            },
          }),
          // Get last application date (only fetch the most recent one)
          this.prisma.formSubmission.findFirst({
            where: {
              userId: clientId,
              travelAgentId: agentId,
            },
            orderBy: {
              createdAt: 'desc',
            },
            select: {
              createdAt: true,
            },
          }),
        ]);

      if (!clientRelationship) {
        throw new NotFoundException(
          `Client with ID ${clientId} not found or not in your client list`,
        );
      }

      const client = clientRelationship.client;

      // Calculate statistics from aggregated data
      const totalApplications = submissionStats.reduce(
        (sum, stat) => sum + stat._count.id,
        0,
      );
      const successfulApplications =
        submissionStats.find(
          (stat) => stat.status === SubmissionStatus.APPROVED,
        )?._count.id || 0;

      // Compute fullName to match UserEntity format
      const fullName =
        `${client.firstName || ''} ${client.lastName || ''}`.trim() ||
        client.email;

      // Format response to match /me endpoint structure
      return {
        id: client.id,
        email: client.email,
        phone: client.phone,
        firstName: client.firstName,
        middleName: client.middleName,
        lastName: client.lastName,
        fullName, // Computed property like UserEntity
        avatar: client.avatar,
        isVerified: client.isVerified,
        dateOfBirth: client.dateOfBirth,
        gender: client.gender,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        nin: client.nin,
        ninVerified: client.ninVerified,
        currentNinVerification: client.ninVerifications?.[0] || null,
        // Agent-specific fields
        addedAt: clientRelationship.addedAt,
        relationshipNotes: clientRelationship.notes,
        totalApplications,
        successfulApplications,
        lastApplicationDate: lastApplication?.createdAt,
      };
    } catch (error) {
      this.logger.error(`Failed to get client: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Create or update client profile
   * TODO: Implement when ClientProfile model is added to schema
   */
  async createOrUpdateClientProfile(
    agentId: string,
    clientId: string,
    createDto: CreateClientDto,
  ): Promise<ClientProfileDto> {
    // Placeholder implementation - will be implemented when ClientProfile model is added
    return this.getClient(agentId, clientId);
  }

  /**
   * Get client analytics
   */
  async getClientAnalytics(
    agentId: string,
    clientId: string,
  ): Promise<ClientAnalyticsDto> {
    try {
      // Verify client is in agent's client list
      const clientRelationship = await this.prisma.travelAgentClient.findUnique(
        {
          where: {
            agentId_clientId: {
              agentId,
              clientId,
            },
          },
          include: {
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      );

      if (!clientRelationship) {
        throw new NotFoundException(
          `Client with ID ${clientId} not found or not in your client list`,
        );
      }

      // Get client submissions
      const submissions = await this.prisma.formSubmission.findMany({
        where: {
          userId: clientId,
          travelAgentId: agentId,
        },
        include: {
          payment: {
            select: {
              amount: true,
              status: true,
            },
          },
        },
      });

      const totalApplications = submissions.length;
      const successfulApplications = submissions.filter(
        (app) => app.status === SubmissionStatus.APPROVED,
      ).length;

      const successRate =
        totalApplications > 0
          ? (successfulApplications / totalApplications) * 100
          : 0;

      // Calculate total revenue
      const totalRevenue = submissions
        .filter((app) => app.payment?.status === PaymentStatus.COMPLETED)
        .reduce((sum, app) => sum + (app.payment?.amount || 0), 0);

      // Get last application date
      const lastApplication = submissions.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
      )[0];

      // Calculate average processing time
      const approvedSubmissions = submissions.filter(
        (app) => app.status === SubmissionStatus.APPROVED,
      );
      const averageProcessingTime =
        approvedSubmissions.length > 0
          ? approvedSubmissions.reduce((sum, submission) => {
              const days = Math.ceil(
                (submission.updatedAt.getTime() -
                  submission.submittedAt.getTime()) /
                  (1000 * 60 * 60 * 24),
              );
              return sum + days;
            }, 0) / approvedSubmissions.length
          : 0;

      const clientName =
        `${clientRelationship.client.firstName || ''} ${
          clientRelationship.client.lastName || ''
        }`.trim() || clientRelationship.client.email;

      return {
        clientId,
        clientName,
        totalApplications,
        successfulApplications,
        successRate: Math.round(successRate * 100) / 100,
        totalRevenue,
        lastApplicationDate: lastApplication?.createdAt,
        averageProcessingTime: Math.round(averageProcessingTime),
      };
    } catch (error) {
      this.logger.error(
        `Failed to get client analytics: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // Communication methods - TODO: Implement when ClientCommunication model is added to schema
}
