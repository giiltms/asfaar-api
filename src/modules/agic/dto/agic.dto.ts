import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AgicScanDto {
  @ApiProperty({
    description:
      'What the gatehouse scanned from the AGIC slip QR code, or the appointment number typed in',
    example:
      'https://agicltd.com/verify/biometric?reference=AGIC-BIO-260929-62ACF5&v=1&sig=1f14...',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  scan: string;
}
