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
  Request,
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
import { UserService } from './user.service';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { SetUserRoleDto } from './dto/set-user-role.dto';
import { ListUsersDTO, UpdateUserDto } from './dto/users.dto';
import { UpdateUserCentersDto } from './dto/update-user-centers.dto';
import { UserCentersResponseDto } from './dto/user-centers-response.dto';
import UserEntity from './entities/user.entity';

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

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      "Get the authenticated user's profile including addresses, NIN verification details, and personal information",
  })
  @ApiResponse({
    status: 200,
    description:
      'Current user profile retrieved successfully including addresses and NIN verification',
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
                email: 'john.doe@example.com',
                firstName: 'John',
                lastName: 'Doe',
                fullName: 'John Doe',
                roles: ['APPLICANT'],
                isVerified: true,
                onboardingPaid: false,
                addresses: [
                  {
                    id: 'addr123-456',
                    type: 'HOME',
                    addressLine1: '123 Main Street',
                    city: 'New York',
                    state: 'NY',
                    country: 'United States',
                    isDefault: true,
                  },
                ],
                defaultAddress: {
                  id: 'addr123-456',
                  type: 'HOME',
                  addressLine1: '123 Main Street',
                  city: 'New York',
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
                ninVerifications: [
                  {
                    id: 'nin123-456',
                    nin: '12345678901',
                    verificationStatus: 'VERIFIED',
                    verificationDate: '2024-01-15T10:30:00Z',
                    createdAt: '2024-01-15T10:00:00Z',
                  },
                ],
              },
            },
          ],
        },
      },
    },
  })
  @UseInterceptors(ClassSerializerInterceptor) // Serialize single user entity
  async getProfile(
    @Request() req: any,
  ): Promise<{ success: boolean; data: UserEntity }> {
    const userId = req.user.id;
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
    @Request() req: any,
    @Body() updateData: UpdateUserDto,
  ): Promise<{ success: boolean; data: UserEntity; message: string }> {
    const userId = req.user.id;
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
  ): Promise<UserEntity> {
    return this.userService.updateUserCenters(id, updateCentersDto.centerIds);
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
}
