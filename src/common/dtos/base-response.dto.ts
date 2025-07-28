import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseDto<T = any> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;

  @ApiProperty()
  data?: T;

  @ApiProperty({ example: null })
  error?: any;

  @ApiProperty({ example: '2023-01-01T00:00:00Z' })
  timestamp: string;

  constructor(partial: Partial<BaseResponseDto<T>>) {
    Object.assign(this, partial);
    this.timestamp = new Date().toISOString();
  }
}

export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success: boolean = false;

  @ApiProperty({ example: 'An error occurred' })
  message: string;

  @ApiProperty({ example: 'VALIDATION_ERROR' })
  error?: string;

  @ApiProperty({ example: '2023-01-01T00:00:00Z' })
  timestamp: string;

  constructor(message: string, error?: string) {
    this.message = message;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }
} 