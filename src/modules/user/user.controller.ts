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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { UserService } from './user.service';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto';
import { SetUserRoleDto } from './dto/set-user-role.dto';
import { ListUsersDTO } from './dto/users.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users with pagination and filters' })
  async getUsers(@Query() query: ListUsersDTO) {
    return this.userService.getUsers(query);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req: any) {
    const userId = req.user.id;
    const user = await this.userService.findById(userId);

    // Remove sensitive information before returning
    const { password, ...userProfile } = user;

    return {
      success: true,
      data: userProfile,
    };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@Request() req: any, @Body() updateData: any) {
    const userId = req.user.id;
    const updatedUser = await this.userService.updateUser(userId, updateData);

    // Remove sensitive information before returning
    const { password, ...userProfile } = updatedUser;

    return {
      success: true,
      data: userProfile,
      message: 'Profile updated successfully',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  async getUserById(@Param('id') id: string) {
    return this.userService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user by ID' })
  async updateUser(@Param('id') id: string, @Body() updateData: any) {
    return this.userService.updateUser(id, updateData);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete user by ID' })
  async deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }

  @Post(':id/roles')
  @ApiOperation({ summary: 'Set user role' })
  async setUserRole(
    @Param('id') id: string,
    @Body() setUserRoleDto: SetUserRoleDto,
  ) {
    return this.userService.setUserRole(id, setUserRoleDto.role);
  }
}
