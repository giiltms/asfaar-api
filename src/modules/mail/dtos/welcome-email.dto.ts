import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendWelcomeEmailDTO {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  name: string;
}
