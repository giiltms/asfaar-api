import { IsString, IsEmail, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignInDTO {
  @ApiProperty({ type: String, example: 'superadmin@example.com' })
  @IsEmail()
  @IsNotEmpty()
  readonly email!: string;

  @ApiProperty({ type: String, default: 'password123' })
  @IsString()
  @Length(6, 20)
  readonly password!: string;
}
