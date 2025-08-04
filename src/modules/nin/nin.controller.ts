import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam, 
  ApiQuery,
  ApiBearerAuth,
  ApiSecurity,
  ApiHeader 
} from '@nestjs/swagger';
import { Request } from 'express';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { NinService } from './nin.service';
import {
  VerifyNinDto,
  NinVerificationResponseDto,
  GetNinVerificationDto,
  NinVerificationHistoryDto,
} from './dtos/nin.dto';
import {
  RequirePermissions,
  CheckOwnership,
  NinPermissionsGuard,
  NIN_PERMISSIONS,
  AuthenticatedUser,
  AuthenticatedRequest,
} from './nin.permissions';
import { AuthGuard } from '@modules/auth/guard/auth.guard';

@ApiTags('NIN Verification')
@Controller('nin')
//@UseGuards(ThrottlerGuard, NinPermissionsGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth()
@UseGuards(AuthGuard)
export class NinController {
  constructor(private readonly ninService: NinService) {}

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  //@Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  //@RequirePermissions(NIN_PERMISSIONS.VERIFY_NIN)
  @ApiOperation({
    summary: 'Verify NIN',
    description: 'Verify a National Identification Number using YouVerify API',
  })
  @ApiResponse({
    status: 200,
    description: 'NIN verification successful',
    type: NinVerificationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid NIN format or validation failed',
  })
  @ApiResponse({
    status: 409,
    description: 'NIN already exists and is verified',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  @ApiHeader({
    name: 'X-Forwarded-For',
    description: 'Client IP address',
    required: false,
  })
  async verifyNin(
    @Body() verifyNinDto: VerifyNinDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<NinVerificationResponseDto> {
    const context = {
      userId: req.user?.id,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      forceVerification: verifyNinDto.forceVerification,
    };

    return await this.ninService.verifyNin(verifyNinDto, context);
  }

  @Get(':nin')
  @RequirePermissions(NIN_PERMISSIONS.VIEW_NIN)
  @CheckOwnership()
  @ApiOperation({
    summary: 'Get NIN verification details',
    description: 'Retrieve verification details for a specific NIN',
  })
  @ApiParam({
    name: 'nin',
    description: 'National Identification Number (11 digits)',
    example: '12345678901',
  })
  @ApiResponse({
    status: 200,
    description: 'NIN verification details retrieved successfully',
    type: NinVerificationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'NIN verification not found',
  })
  async getNinVerification(
    @Param('nin') nin: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<NinVerificationResponseDto> {
    const getNinDto: GetNinVerificationDto = { nin };
    return await this.ninService.getNinVerification(getNinDto, req.user);
  }



  @Put(':nin')
  @RequirePermissions(NIN_PERMISSIONS.MANAGE_NIN)
  @CheckOwnership()
  @ApiOperation({
    summary: 'Update NIN verification data',
    description: 'Update verification data for a specific NIN (Admin/Moderator only)',
  })
  @ApiParam({
    name: 'nin',
    description: 'National Identification Number (11 digits)',
    example: '12345678901',
  })
  @ApiResponse({
    status: 200,
    description: 'NIN verification data updated successfully',
    type: NinVerificationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'NIN verification not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  async updateNinVerification(
    @Param('nin') nin: string,
    @Body() updateData: any, // You can create a specific UpdateNinDto
    @Req() req: AuthenticatedRequest,
  ): Promise<NinVerificationResponseDto> {
    return await this.ninService.updateNinVerification(nin, updateData, req.user);
  }

  @Delete(':nin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(NIN_PERMISSIONS.DELETE_NIN)
  @CheckOwnership()
  @ApiOperation({
    summary: 'Delete NIN verification',
    description: 'Delete a NIN verification record (Admin only)',
  })
  @ApiParam({
    name: 'nin',
    description: 'National Identification Number (11 digits)',
    example: '12345678901',
  })
  @ApiResponse({
    status: 204,
    description: 'NIN verification deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'NIN verification not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Insufficient permissions',
  })
  async deleteNinVerification(
    @Param('nin') nin: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<void> {
    return await this.ninService.deleteNinVerification(nin, req.user);
  }


  @Post('revalidate/:nin')
  @RequirePermissions(NIN_PERMISSIONS.FORCE_VERIFICATION)
  @ApiOperation({
    summary: 'Force revalidation of NIN',
    description: 'Force revalidation of an already verified NIN (Admin only)',
  })
  @ApiParam({
    name: 'nin',
    description: 'National Identification Number (11 digits)',
    example: '12345678901',
  })
  @ApiResponse({
    status: 200,
    description: 'NIN revalidation completed',
    type: NinVerificationResponseDto,
  })
  async revalidateNin(
    @Param('nin') nin: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<NinVerificationResponseDto> {
    const verifyNinDto: VerifyNinDto = { nin, forceVerification: true };
    const context = {
      userId: req.user?.id,
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      forceVerification: true,
    };

    return await this.ninService.verifyNin(verifyNinDto, context);
  }


  @Post('test/verify')
  @RequirePermissions(NIN_PERMISSIONS.MANAGE_NIN)
  @ApiOperation({
    summary: 'Test NIN verification',
    description: 'Test NIN verification with mock data (Development/Testing only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Test verification completed',
  })
  async testVerification(
    @Body() testData: { nin: string; mockResponse?: boolean },
    @Req() req: AuthenticatedRequest,
  ) {
    // This endpoint would only be available in development/testing environments
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    
    if (!isDevelopment) {
      throw new Error('Test endpoint only available in development/test environments');
    }

    const context = {
      userId: req.user?.id,
      ipAddress: req.ip || 'test',
      userAgent: 'test-client',
    };

    return await this.ninService.verifyNin(
      { nin: testData.nin, forceVerification: true },
      context
    );
  }
}