import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  Patch,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import ApiBaseResponses from '@decorators/api-base-response.decorator';
import {
  AccessGuard,
  Actions,
  CaslConditions,
  CaslSubject,
  CaslUser,
  ConditionsProxy,
  SubjectProxy,
  UseAbility,
  UserProxy,
} from '@modules/casl';
import UserEntity from '@modules/user/entities/user.entity';
import Serialize from '@decorators/serialize.decorator';
import { OrderByPipe, WherePipe } from '@nodeteam/nestjs-pipes';
import { Prisma, User } from '@prisma/client';
import { PaginatorTypes } from '@nodeteam/nestjs-prisma-pagination';
import UserBaseEntity from '@modules/user/entities/user-base.entity';
import { UserHook } from '@modules/user/user.hook';
import ApiOkBaseResponse from '@decorators/api-ok-base-response.decorator';
import { UpdateUserRolesDTO } from './dto/update-user-roles.dto';
import { SetUserRoleDTO } from './dto/set-user-role.dto';
import { SkipThrottle } from '@nestjs/throttler';
import { UserPaginationDTO } from './dto/user-pagination.dto';
import { AuditLogInterceptor } from '@interceptors/audit-log.interceptor';
import { ListUsersDTO } from './dto/users.dto';

@ApiTags('Users')
@ApiBearerAuth()
@ApiExtraModels(UserBaseEntity)
@ApiBaseResponses()
@Controller('users')
@SkipThrottle()
@UseInterceptors(AuditLogInterceptor)
export class UserController {
  logger = new Logger(UserController.name);

  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiOkBaseResponse({ dto: UserBaseEntity, isArray: true, meta: true })
  @UseGuards(AccessGuard)
  @Serialize(UserBaseEntity)
  @UseAbility(Actions.read, UserEntity)
  async findAll(
    @Query() paginationDTO: ListUsersDTO,
  ): Promise<PaginatorTypes.PaginatedResult<User>> {
    return this.userService.findAll(paginationDTO);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get authenticated user details' })
  @UseGuards(AccessGuard)
  @UseAbility(Actions.read, UserEntity)
  async me(
    @CaslUser() userProxy?: UserProxy<User>,
    @CaslConditions() conditions?: ConditionsProxy,
  ): Promise<User> {
    const tokenUser = await userProxy.get();
    this.logger.log(tokenUser);

    return this.userService.findUser(tokenUser.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Patch user' })
  @UseGuards(AccessGuard)
  @Serialize(UserBaseEntity)
  @UseAbility(Actions.update, UserEntity, UserHook)
  async updateUser(
    @CaslUser() userProxy?: UserProxy<User>,
    @CaslConditions() conditions?: ConditionsProxy,
    @CaslSubject() subjectProxy?: SubjectProxy<User>,
  ): Promise<User> {
    const tokenUser = await userProxy.get();
    const subject = await subjectProxy.get();

    this.logger.log(tokenUser);
    this.logger.log(subject);
    this.logger.log(conditions.toMongo());
    return subject;
  }


  @Get(':userId')
  @ApiOperation({ summary: 'Get user by Id' })
  async getUser(@Param('userId') userId: string) {
    return this.userService.findUser(userId);
  }

  /**
   * Update the roles of a user.
   * @param userId The ID of the user to update.
   * @param updateUserRolesDTO The new roles to assign to the user.
   * @returns The updated user.
   */
  @Put(':userId/roles')
  @Serialize(UserBaseEntity)
  @ApiOperation({ summary: 'Update user roles' })
  async updateUserRoles(
    @Param('userId') userId: string,
    @Body() updateUserRolesDTO: UpdateUserRolesDTO,
  ) {
    const { roles } = updateUserRolesDTO;
    return this.userService.updateUserRoles(userId, roles);
  }

  /**
   * Set the role of a user.
   * @param userId The ID of the user to update.
   * @param setUserRoleDTO The new role to assign to the user.
   * @returns The updated user.
   */
  @Put(':userId/role')
  @Serialize(UserBaseEntity)
  @ApiOperation({ summary: 'Set user role' })
  async setUserRole(
    @Param('userId') userId: string,
    @Body() setUserRoleDTO: SetUserRoleDTO,
  ) {
    const { role } = setUserRoleDTO;
    return this.userService.setUserRole(userId, role);
  }

  /**
   * Delete a user.
   * @param userId The ID of the user to delete.
   * @returns A confirmation message.
   */
  @Delete(':userId')
  @Serialize(UserBaseEntity)
  @ApiOperation({ summary: 'Delete user' })
  async deleteUser(@Param('userId') userId: string) {
    return this.userService.deleteUser(userId);
  }

  /**
   * Activate a user account.
   * @param userId The ID of the user to activate.
   * @returns The updated user.
   */
  @Put(':userId/activate')
  @Serialize(UserBaseEntity)
  @ApiOperation({ summary: 'Activate user account' })
  async activateUser(@Param('userId') userId: string) {
    return this.userService.activateUser(userId);
  }

  /**
   * Deactivate a user account.
   * @param userId The ID of the user to deactivate.
   * @returns The updated user.
   */
  @Put(':userId/deactivate')
  @Serialize(UserBaseEntity)
  @ApiOperation({ summary: 'Deactivate user account' })
  async deactivateUser(@Param('userId') userId: string) {
    return this.userService.deactivateUser(userId);
  }

  /**
   * Verify a user account.
   * @param userId The ID of the user to verify.
   * @returns The updated user.
   */
  @Put(':userId/verify')
  @Serialize(UserBaseEntity)
  @ApiOperation({ summary: 'Verify user account' })
  async verifyUser(@Param('userId') userId: string) {
    return this.userService.verifyUser(userId);
  }
}
