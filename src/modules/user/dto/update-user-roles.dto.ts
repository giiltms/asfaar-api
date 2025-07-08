import { IsArray, ArrayNotEmpty, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Roles } from '@modules/app/app.roles';

export class UpdateUserRolesDTO {
  @ApiProperty({
    description: 'Roles to assign to the user',
    example: [Roles.SYSTEM_ADMIN, Roles.ADMIN, Roles.DRIVER, Roles.PASSENGER],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(Roles, { each: true })
  roles: Roles[];
}
