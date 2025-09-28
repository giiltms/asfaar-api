import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  ValidationPipe,
  ParseUUIDPipe,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { PassportsService } from './passports.service';
import {
  CreatePassportDto,
  CreatePassportMultipartDto,
  UpdatePassportDto,
  VerifyPassportDto,
  PassportQueryDto,
} from './dto/passport.dto';
import { PassportEntity } from './entities/passport.entity';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import {
  CurrentUser,
  JwtUserPayload,
} from '@common/decorators/current-user.decorator';
import { Roles as UserRoles } from '@common/constants/roles.constants';
import { BaseResponseDto } from '@common/dtos/base-response.dto';

@ApiTags('Passports')
@Controller('passports')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class PassportsController {
  constructor(private readonly passportsService: PassportsService) {}

  @Post()
  @Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.VERIFICATION_OFFICER)
  @UseInterceptors(FileInterceptor('passportFrontPhoto'))
  @ApiOperation({
    summary: 'Create a new passport',
    description: 'Create a new international passport record for a user with passport data page upload',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Passport data with passport data page (biographical page) file upload',
    schema: {
      type: 'object',
      properties: {
        passportNumber: {
          type: 'string',
          description: 'Passport number',
          example: 'A12345678',
        },
        passportType: {
          type: 'string',
          enum: ['ORDINARY', 'DIPLOMATIC', 'OFFICIAL', 'EMERGENCY'],
          description: 'Type of passport',
          example: 'ORDINARY',
        },
        passportIssueDate: {
          type: 'string',
          format: 'date-time',
          description: 'Passport issue date',
          example: '2020-01-15T00:00:00.000Z',
        },
        passportExpiryDate: {
          type: 'string',
          format: 'date-time',
          description: 'Passport expiry date',
          example: '2030-01-15T00:00:00.000Z',
        },
        passportIssueCountry: {
          type: 'string',
          description: 'Country that issued the passport (ISO 3166-1 alpha-3)',
          example: 'NGA',
        },
        passportPhoto: {
          type: 'string',
          description: 'Main passport photo URL (if not uploading file)',
          example: 'https://storage.example.com/passports/photo-123.jpg',
        },
        passportBackPhoto: {
          type: 'string',
          description: 'Back page scan URL (if not uploading file)',
          example: 'https://storage.example.com/passports/back-123.jpg',
        },
        documentHash: {
          type: 'string',
          description: 'Document hash for integrity verification',
          example: 'sha256:abc123def456...',
        },
        passportMetadata: {
          type: 'object',
          description: 'Additional passport metadata (MRZ, etc.)',
          example: {
            mrz: 'P<NGAJOHN<<DOE<<<<<<<<<<<<<<<<<<<<<<<<<<<A12345678NGA8001015M3001151<<<<<<<<<<<<<<08',
            issuingAuthority: 'Federal Ministry of Interior',
          },
        },
        passportFrontPhoto: {
          type: 'string',
          format: 'binary',
          description: 'Passport data page (biographical page) scan (JPEG, PNG, WebP, PDF - max 10MB)',
        },
      },
      required: ['passportNumber', 'passportIssueDate', 'passportExpiryDate', 'passportIssueCountry', 'passportFrontPhoto'],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Passport created successfully',
    type: PassportEntity,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data or passport already exists',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Insufficient permissions',
  })
  async createPassport(
    @Body(ValidationPipe) createPassportDto: CreatePassportMultipartDto,
    @CurrentUser() user: JwtUserPayload,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({
            fileType: /^(image\/(jpeg|jpg|png|webp)|application\/pdf)$/,
          }),
        ],
        fileIsRequired: true, // Passport data page is required
      }),
    )
    passportFrontPhotoFile: Express.Multer.File,
  ): Promise<BaseResponseDto<PassportEntity>> {
    const passport = await this.passportsService.createPassportWithFile(
      user.id,
      createPassportDto,
      passportFrontPhotoFile,
      user.id,
    );

    return {
      success: true,
      message: 'Passport created successfully',
      data: passport,
      timestamp: new Date().toISOString(),
    };
  }

  @Get()
  @Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.VERIFICATION_OFFICER)
  @ApiOperation({
    summary: 'Get all passports',
    description: 'Retrieve all passports with pagination and filtering options',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Passports retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            passports: {
              type: 'array',
              items: { $ref: '#/components/schemas/PassportEntity' },
            },
            total: { type: 'number' },
            page: { type: 'number' },
            limit: { type: 'number' },
            totalPages: { type: 'number' },
          },
        },
        timestamp: { type: 'string' },
      },
    },
  })
  async findAllPassports(
    @Query(ValidationPipe) query: PassportQueryDto,
  ): Promise<BaseResponseDto<any>> {
    const result = await this.passportsService.findAllPassports(query);

    return {
      success: true,
      message: 'Passports retrieved successfully',
      data: result,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('my')
  @Roles(
    UserRoles.ADMIN,
    UserRoles.SUPER_ADMIN,
    UserRoles.VERIFICATION_OFFICER,
    UserRoles.APPLICANT,
  )
  @ApiOperation({
    summary: 'Get my passports',
    description: 'Retrieve all passports for the current user',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User passports retrieved successfully',
    type: [PassportEntity],
  })
  async findMyPassports(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<PassportEntity[]>> {
    const passports = await this.passportsService.findUserPassports(user.id);

    return {
      success: true,
      message: 'User passports retrieved successfully',
      data: passports,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('statistics')
  @Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get passport statistics',
    description: 'Retrieve passport statistics and analytics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Passport statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            verified: { type: 'number' },
            pending: { type: 'number' },
            rejected: { type: 'number' },
            expired: { type: 'number' },
            byType: { type: 'object' },
            byCountry: { type: 'object' },
          },
        },
        timestamp: { type: 'string' },
      },
    },
  })
  async getPassportStatistics(): Promise<BaseResponseDto<any>> {
    const statistics = await this.passportsService.getPassportStatistics();

    return {
      success: true,
      message: 'Passport statistics retrieved successfully',
      data: statistics,
      timestamp: new Date().toISOString(),
    };
  }

  @Get(':id')
  @Roles(
    UserRoles.ADMIN,
    UserRoles.SUPER_ADMIN,
    UserRoles.VERIFICATION_OFFICER,
    UserRoles.APPLICANT,
  )
  @ApiOperation({
    summary: 'Get passport by ID',
    description: 'Retrieve a specific passport by its ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Passport ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Passport retrieved successfully',
    type: PassportEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Passport not found',
  })
  async findPassportById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BaseResponseDto<PassportEntity>> {
    const passport = await this.passportsService.findPassportById(id);

    return {
      success: true,
      message: 'Passport retrieved successfully',
      data: passport,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id')
  @Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.VERIFICATION_OFFICER)
  @ApiOperation({
    summary: 'Update passport',
    description: 'Update passport information',
  })
  @ApiParam({
    name: 'id',
    description: 'Passport ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Passport updated successfully',
    type: PassportEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Passport not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input data',
  })
  async updatePassport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updatePassportDto: UpdatePassportDto,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<PassportEntity>> {
    const passport = await this.passportsService.updatePassport(
      id,
      updatePassportDto,
      user.id,
    );

    return {
      success: true,
      message: 'Passport updated successfully',
      data: passport,
      timestamp: new Date().toISOString(),
    };
  }

  @Patch(':id/verify')
  @Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.VERIFICATION_OFFICER)
  @ApiOperation({
    summary: 'Verify passport',
    description: 'Update passport verification status',
  })
  @ApiParam({
    name: 'id',
    description: 'Passport ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Passport verification updated successfully',
    type: PassportEntity,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Passport not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid verification data',
  })
  async verifyPassport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) verifyPassportDto: VerifyPassportDto,
    @CurrentUser() user: JwtUserPayload,
  ): Promise<BaseResponseDto<PassportEntity>> {
    const passport = await this.passportsService.verifyPassport(
      id,
      verifyPassportDto,
      user.id,
    );

    return {
      success: true,
      message: 'Passport verification updated successfully',
      data: passport,
      timestamp: new Date().toISOString(),
    };
  }

  @Delete(':id')
  @Roles(UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Delete passport',
    description: 'Delete a passport record',
  })
  @ApiParam({
    name: 'id',
    description: 'Passport ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Passport deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Passport not found',
  })
  async deletePassport(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BaseResponseDto<null>> {
    await this.passportsService.deletePassport(id);

    return {
      success: true,
      message: 'Passport deleted successfully',
      data: null,
      timestamp: new Date().toISOString(),
    };
  }
}
