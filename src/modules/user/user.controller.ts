import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Roles as UserRoles } from '@common/constants/roles.constants';
import {
  CurrentUser,
  JwtUserPayload,
} from '@common/decorators/current-user.decorator';
import { UserService } from './user.service';
import { SetUserRoleDto } from './dto/set-user-role.dto';
import {
  ListUsersDTO,
  UpdateUserDto,
  CreateUserDto,
  UpdateUserCountryDto,
} from './dto/users.dto';
import { UpdateUserCentersDto } from './dto/update-user-centers.dto';
import { UpdateUserDepartmentsDto } from './dto/update-user-departments.dto';
import { UserCentersResponseDto } from './dto/user-centers-response.dto';
import UserEntity from './entities/user.entity';
import Serialize from '@common/decorators/serialize.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination and filters' })
  @UseInterceptors(ClassSerializerInterceptor) // Handle pagination + serialization
  async getUsers(@Query() query: ListUsersDTO) {
    return this.userService.getUsers(query);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  @Serialize(UserEntity)
  @ApiOperation({
    summary: 'Create a new user (Admin only)',
    description:
      'Create a new user account with specified roles and center assignments. Only accessible by ADMIN and SUPER_ADMIN roles.',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserEntity,
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async createUser(@Body() createUserDto: CreateUserDto): Promise<UserEntity> {
    return this.userService.createUserWithCenters(
      createUserDto,
      createUserDto.centerIds,
    );
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      "Get the authenticated user's profile including addresses, NIN verification details, and personal information. For travel agents, includes company profile and license information.",
  })
  @ApiResponse({
    status: 200,
    description:
      'Current user profile retrieved successfully. For travel agents, includes travelAgentProfile and travelAgentLicense.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          allOf: [
            { $ref: '#/components/schemas/UserEntity' },
            {
              type: 'object',
              example: {
                id: '123e4567-e89b-12d3-a456-426614174000',
                email: 'agent@example.com',
                firstName: 'John',
                lastName: 'Doe',
                fullName: 'John Doe',
                roles: ['AGENCY'],
                isVerified: true,
                onboardingPaid: true,
                addresses: [
                  {
                    id: 'addr123-456',
                    type: 'HOME',
                    addressLine1: '123 Main Street',
                    city: 'Lagos',
                    state: 'Lagos',
                    country: 'Nigeria',
                    isDefault: true,
                  },
                ],
                defaultAddress: {
                  id: 'addr123-456',
                  type: 'HOME',
                  addressLine1: '123 Main Street',
                  city: 'Lagos',
                  isDefault: true,
                },
                currentNinVerification: {
                  id: 'nin123-456',
                  nin: '12345678901',
                  firstName: 'John',
                  lastName: 'Doe',
                  dateOfBirth: '1990-01-15T00:00:00Z',
                  gender: 'MALE',
                  phoneNumber: '+2349012345678',
                  verificationStatus: 'VERIFIED',
                  verificationDate: '2024-01-15T10:30:00Z',
                  city: 'Lagos',
                  state: 'Lagos',
                  country: 'Nigeria',
                },
                travelAgentProfile: {
                  id: 'profile-uuid',
                  userId: '123e4567-e89b-12d3-a456-426614174000',
                  sourceApplicationId: 'application-uuid',
                  company: {
                    companyName: 'ABC Travel Agency Ltd',
                    companyEmail: 'info@abctravel.com',
                    companyPhone: '+2349012345678',
                  },
                  registration: {
                    cacNumber: 'RC123456',
                    cacDocumentUrl: 'https://example.com/cac-document.pdf',
                    tinNumber: '12345678-0001',
                    taxClearanceDocumentUrl:
                      'https://example.com/tax-clearance.pdf',
                  },
                  compliance: {
                    nahconLicenseNumber: 'NAHCON-2024-001',
                    nahconDocumentUrl: 'https://example.com/nahcon-license.pdf',
                    dssClearanceNumber: 'DSS-2024-001',
                    dssDocumentUrl: 'https://example.com/dss-clearance.pdf',
                    efccScumlNumber: 'EFCC-2024-001',
                    efccScumlDocumentUrl: 'https://example.com/efcc-scuml.pdf',
                  },
                  certifications: {
                    iataAccreditationNumber: 'IATA-2024-001',
                    iataDocumentUrl: 'https://example.com/iata-certificate.pdf',
                    nantaMembershipNumber: 'NANTA-2024-001',
                    nantaDocumentUrl:
                      'https://example.com/nanta-membership.pdf',
                  },
                  bankAccount: {
                    bankName: 'Access Bank',
                    bankCode: '044',
                    accountNumber: '1234567890',
                    accountName: 'ABC Travel Agency Ltd',
                    isVerified: true,
                    verifiedAt: '2024-01-15T10:00:00Z',
                  },
                },
                travelAgentLicense: {
                  id: 'license-uuid',
                  licenseNumber: 'AGT-2025-000001',
                  licenseType: 'REGULAR_TRAVEL_AGENT',
                  status: 'ACTIVE',
                  issuedAt: '2024-01-15T10:00:00Z',
                  expiresAt: '2025-01-15T10:00:00Z',
                  application: {
                    id: 'application-uuid',
                    applicationType: 'REGULAR_TRAVEL_AGENT',
                    companyName: 'ABC Travel Agency Ltd',
                  },
                },
              },
            },
          ],
        },
      },
    },
  })
  @UseInterceptors(ClassSerializerInterceptor) // Serialize single user entity
  async getProfile(
    @CurrentUser() currentUser: JwtUserPayload,
  ): Promise<{ success: boolean; data: UserEntity }> {
    const userId = currentUser.id;
    const user = await this.userService.findById(userId);

    return {
      success: true,
      data: user, // UserEntity instance with proper serialization
    };
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update current user profile',
    description:
      "Update the authenticated user's profile information (addresses are managed separately via address endpoints)",
  })
  @ApiResponse({
    status: 200,
    description:
      'Profile updated successfully, includes updated user data with addresses',
    type: UserEntity,
  })
  @UseInterceptors(ClassSerializerInterceptor) // Serialize updated user entity
  async updateProfile(
    @CurrentUser() currentUser: JwtUserPayload,
    @Body() updateData: UpdateUserDto,
  ): Promise<{ success: boolean; data: UserEntity; message: string }> {
    const userId = currentUser.id;
    const updatedUser = await this.userService.updateUser(userId, updateData);

    return {
      success: true,
      data: updatedUser, // UserEntity instance with proper serialization
      message: 'Profile updated successfully',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details', type: UserEntity })
  @UseInterceptors(ClassSerializerInterceptor) // Serialize single user entity
  async getUserById(@Param('id') id: string): Promise<UserEntity> {
    return this.userService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserEntity,
  })
  @UseInterceptors(ClassSerializerInterceptor) // Serialize updated user entity
  async updateUser(
    @Param('id') id: string,
    @Body() updateData: UpdateUserDto,
  ): Promise<UserEntity> {
    return this.userService.updateUser(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user by ID' })
  @UseInterceptors(ClassSerializerInterceptor) // Serialize deleted user entity
  async deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }

  @Post(':id/roles')
  @ApiOperation({ summary: 'Set user role' })
  @ApiResponse({
    status: 200,
    description: 'User role updated successfully',
    type: UserEntity,
  })
  @UseInterceptors(ClassSerializerInterceptor) // Serialize user entity with updated role
  async setUserRole(
    @Param('id') id: string,
    @Body() setUserRoleDto: SetUserRoleDto,
  ): Promise<UserEntity> {
    return this.userService.setUserRole(id, setUserRoleDto.role);
  }

  @Patch(':id/centers')
  @ApiOperation({
    summary: 'Update user centers',
    description: 'Assign or update the centers that a user can work at',
  })
  @ApiResponse({
    status: 200,
    description: 'User centers updated successfully',
    type: UserEntity,
  })
  @UseInterceptors(ClassSerializerInterceptor)
  async updateUserCenters(
    @Param('id') id: string,
    @Body() updateCentersDto: UpdateUserCentersDto,
    @CurrentUser() actor: JwtUserPayload,
  ): Promise<UserEntity> {
    return this.userService.updateUserCenters(
      id,
      updateCentersDto.centerIds,
      actor?.id,
    );
  }

  @Patch(':id/departments')
  @Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.CENTER_MANAGER)
  @ApiOperation({
    summary: 'Update user departments',
    description:
      'Assign or update the departments that a user belongs to. Only accessible by Admin, Super Admin, and Center Manager roles.',
  })
  @ApiResponse({
    status: 200,
    description: 'User departments updated successfully',
    type: UserEntity,
  })
  @ApiResponse({
    status: 403,
    description:
      'Insufficient permissions. Only Admin, Super Admin, and Center Manager roles can update user departments.',
  })
  @UseInterceptors(ClassSerializerInterceptor)
  async updateUserDepartments(
    @Param('id') id: string,
    @Body() updateDepartmentsDto: UpdateUserDepartmentsDto,
    @CurrentUser() actor: JwtUserPayload,
  ): Promise<UserEntity> {
    return this.userService.updateUserDepartments(
      id,
      updateDepartmentsDto.departmentIds,
      actor?.id,
    );
  }

  @Get(':id/departments')
  @Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.CENTER_MANAGER)
  @ApiOperation({
    summary: 'Get user departments',
    description:
      'Retrieve all departments assigned to a specific user. Only accessible by Admin, Super Admin, and Center Manager roles.',
  })
  @ApiResponse({
    status: 200,
    description: 'User departments retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description:
      'Insufficient permissions. Only Admin, Super Admin, and Center Manager roles can view user departments.',
  })
  @UseInterceptors(ClassSerializerInterceptor)
  async getUserDepartments(@Param('id') id: string): Promise<any> {
    return this.userService.getUserDepartments(id);
  }

  @Get(':id/centers')
  @ApiOperation({
    summary: 'Get user centers',
    description: 'Retrieve all centers assigned to a specific user',
  })
  @ApiResponse({
    status: 200,
    description: 'User centers retrieved successfully',
    type: UserCentersResponseDto,
  })
  async getUserCenters(
    @Param('id') id: string,
  ): Promise<UserCentersResponseDto> {
    return this.userService.getUserCenters(id);
  }

  @Patch(':id/country')
  @Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Update user country assignment',
    description:
      'Assign or update the country that an embassy officer is responsible for',
  })
  @ApiResponse({
    status: 200,
    description: 'User country assignment updated successfully',
    type: UserEntity,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid country ID or country not found',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  @UseInterceptors(ClassSerializerInterceptor)
  async updateUserCountry(
    @Param('id') id: string,
    @Body() updateCountryDto: UpdateUserCountryDto,
    @CurrentUser() actor: JwtUserPayload,
  ): Promise<UserEntity> {
    return this.userService.updateUserCountry(
      id,
      updateCountryDto.countryId,
      actor?.id,
    );
  }
}
