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
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { UserService } from './user.service';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { SetUserRoleDto } from './dto/set-user-role.dto';
import { ListUsersDTO, UpdateUserDto } from './dto/users.dto';
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
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile', type: UserEntity })
  @UseInterceptors(ClassSerializerInterceptor) // Serialize single user entity
  async getProfile(@Request() req: any): Promise<{ success: boolean; data: UserEntity }> {
    const userId = req.user.id;
    const user = await this.userService.findById(userId);

    return {
      success: true,
      data: user, // UserEntity instance with proper serialization
    };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully', type: UserEntity })
  @UseInterceptors(ClassSerializerInterceptor) // Serialize updated user entity
  async updateProfile(@Request() req: any, @Body() updateData: UpdateUserDto): Promise<{ success: boolean; data: UserEntity; message: string }> {
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
  @ApiResponse({ status: 200, description: 'User updated successfully', type: UserEntity })
  @UseInterceptors(ClassSerializerInterceptor) // Serialize updated user entity
  async updateUser(@Param('id') id: string, @Body() updateData: UpdateUserDto): Promise<UserEntity> {
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
  @ApiResponse({ status: 200, description: 'User role updated successfully', type: UserEntity })
  @UseInterceptors(ClassSerializerInterceptor) // Serialize user entity with updated role
  async setUserRole(
    @Param('id') id: string,
    @Body() setUserRoleDto: SetUserRoleDto,
  ): Promise<UserEntity> {
    return this.userService.setUserRole(id, setUserRoleDto.role);
  }
}
