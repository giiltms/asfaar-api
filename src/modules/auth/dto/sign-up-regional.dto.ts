import {
  IsString,
  IsEmail,
  IsNotEmpty,
  Length,
  Matches,
  IsEnum,
  ArrayUnique,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Roles } from '@modules/app/app.roles';

export class SignUpRegionalDTO {
  @ApiProperty({ type: String, example: 'maryam@admin.com' })
  @IsEmail()
  @IsNotEmpty()
  readonly email!: string;

  @ApiPropertyOptional({ type: String, example: 'Maryam' })
  @IsString()
  @IsNotEmpty()
  readonly firstName!: string;

  @ApiPropertyOptional({ type: String, example: 'Ibrahim' })
  @IsString()
  @IsNotEmpty()
  readonly lastName!: string;

  @ApiProperty({
    type: String,
    example: 'North Central',
    description: 'Zone',
  })
  @IsString()
  @IsNotEmpty()
  readonly zone!: string;

  @ApiProperty({ type: String, default: 'string!12345' })
  @IsString()
  @Length(6, 20)
  @Matches(/[\d\W]/, {
    message:
      'password must contain at least one digit and/or special character',
  })
  @Matches(/[a-zA-Z]/, { message: 'password must contain at least one letter' })
  @Matches(/^\S+$/, { message: 'password must not contain spaces' })
  readonly password!: string;

  @ApiProperty({
    description: 'The roles of the user. Defaults to ["PASSENGER"].',
    enum: Roles,
    default: [Roles.APPLICANT],
    examples: [Roles.APPLICANT, Roles.ADMIN],
  })
  @IsEnum(Roles, { each: true })
  @ArrayUnique()
  readonly roles!: Roles[];

  @ApiProperty({
    description: 'National Identity Number',
    example: '12345678901',
    required: false,
  })
  @IsString()
  readonly nin?: string;

  @ApiProperty({
    description: 'User state or province',
    example: 'Lagos',
    required: false,
  })
  @IsString()
  readonly state?: string;

  @ApiProperty({
    description: 'Local Government Area',
    example: 'Eti-Osa',
    required: false,
  })
  @IsString()
  readonly lga?: string;
}
