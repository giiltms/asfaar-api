import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseEnumPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import {
  CurrentUser,
  JwtUserPayload,
} from '@common/decorators/current-user.decorator';
import { AddressService } from './address.service';
import {
  CreateAddressDto,
  UpdateAddressDto,
  AddressDto,
  AddressSummaryDto,
  SetDefaultAddressDto,
} from './dto/address.dto';
import { AddressType } from '@prisma/client';
import { ApiOkBaseResponse } from '@decorators/api-ok-base-response.decorator';
import { ApiDefaultResponse } from '@decorators/api-default-response.decorator';

@ApiTags('Addresses')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('addresses')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a new address',
    description: 'Create a new address for the authenticated user',
  })
  @ApiOkBaseResponse({ dto: AddressDto })
  @ApiDefaultResponse({ type: AddressDto })
  async createAddress(
    @CurrentUser() user: JwtUserPayload,
    @Body() createAddressDto: CreateAddressDto,
  ): Promise<AddressDto> {
    return this.addressService.createAddress(user.id, createAddressDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user addresses',
    description: 'Get all addresses for the authenticated user',
  })
  @ApiOkBaseResponse({ dto: AddressSummaryDto, isArray: true })
  @ApiDefaultResponse({ type: AddressSummaryDto, isArray: true })
  async getUserAddresses(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<AddressSummaryDto[]> {
    return this.addressService.getUserAddresses(user.id);
  }

  @Get('default')
  @ApiOperation({
    summary: 'Get default address',
    description: 'Get the default address for the authenticated user',
  })
  @ApiOkBaseResponse({ dto: AddressDto })
  @ApiDefaultResponse({ type: AddressDto })
  async getDefaultAddress(
    @CurrentUser() user: JwtUserPayload,
  ): Promise<AddressDto | null> {
    return this.addressService.getDefaultAddress(user.id);
  }

  @Get('search')
  @ApiOperation({
    summary: 'Search addresses',
    description: 'Search addresses by location terms',
  })
  @ApiQuery({
    name: 'q',
    description: 'Search term',
    example: 'Victoria Island',
  })
  @ApiOkBaseResponse({ dto: AddressSummaryDto, isArray: true })
  @ApiDefaultResponse({ type: AddressSummaryDto, isArray: true })
  async searchAddresses(
    @CurrentUser() user: JwtUserPayload,
    @Query('q') searchTerm: string,
  ): Promise<AddressSummaryDto[]> {
    return this.addressService.searchAddresses(user.id, searchTerm);
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Get address statistics',
    description: 'Get address statistics for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Address statistics',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        verified: { type: 'number' },
        unverified: { type: 'number' },
        hasDefault: { type: 'boolean' },
        byType: { type: 'object' },
      },
    },
  })
  @ApiDefaultResponse({})
  async getAddressStatistics(@CurrentUser() user: JwtUserPayload) {
    return this.addressService.getAddressStatistics(user.id);
  }

  @Get('type/:type')
  @ApiOperation({
    summary: 'Get addresses by type',
    description: 'Get addresses filtered by type',
  })
  @ApiParam({
    name: 'type',
    enum: AddressType,
    description: 'Address type to filter by',
  })
  @ApiOkBaseResponse({ dto: AddressSummaryDto, isArray: true })
  @ApiDefaultResponse({ type: AddressSummaryDto, isArray: true })
  async getAddressesByType(
    @CurrentUser() user: JwtUserPayload,
    @Param('type', new ParseEnumPipe(AddressType)) type: AddressType,
  ): Promise<AddressSummaryDto[]> {
    return this.addressService.getAddressesByType(user.id, type);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get address by ID',
    description: 'Get a specific address by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Address ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkBaseResponse({ dto: AddressDto })
  @ApiDefaultResponse({ type: AddressDto })
  async getAddressById(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) addressId: string,
  ): Promise<AddressDto> {
    return this.addressService.getAddressById(addressId, user.id);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update address',
    description: 'Update an existing address',
  })
  @ApiParam({
    name: 'id',
    description: 'Address ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkBaseResponse({ dto: AddressDto })
  @ApiDefaultResponse({ type: AddressDto })
  async updateAddress(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) addressId: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ): Promise<AddressDto> {
    return this.addressService.updateAddress(
      addressId,
      user.id,
      updateAddressDto,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete address',
    description: 'Delete an existing address',
  })
  @ApiParam({
    name: 'id',
    description: 'Address ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Address deleted successfully',
  })
  @ApiDefaultResponse({})
  async deleteAddress(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) addressId: string,
  ): Promise<void> {
    return this.addressService.deleteAddress(addressId, user.id);
  }

  @Post(':id/set-default')
  @ApiOperation({
    summary: 'Set default address',
    description: 'Set an address as the default address',
  })
  @ApiParam({
    name: 'id',
    description: 'Address ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkBaseResponse({ dto: AddressDto })
  @ApiDefaultResponse({ type: AddressDto })
  async setDefaultAddress(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) addressId: string,
  ): Promise<AddressDto> {
    return this.addressService.setDefaultAddress(addressId, user.id);
  }

  @Post(':id/verify')
  @ApiOperation({
    summary: 'Verify address',
    description: 'Mark an address as verified',
  })
  @ApiParam({
    name: 'id',
    description: 'Address ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkBaseResponse({ dto: AddressDto })
  @ApiDefaultResponse({ type: AddressDto })
  async verifyAddress(
    @CurrentUser() user: JwtUserPayload,
    @Param('id', ParseUUIDPipe) addressId: string,
  ): Promise<AddressDto> {
    return this.addressService.verifyAddress(addressId, user.id);
  }

  // Admin endpoints (could be protected with role-based guards)
  @Get('admin/:userId')
  @ApiOperation({
    summary: 'Get user addresses (Admin)',
    description: 'Get all addresses for a specific user (Admin only)',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkBaseResponse({ dto: AddressSummaryDto, isArray: true })
  @ApiDefaultResponse({ type: AddressSummaryDto, isArray: true })
  async getAdminUserAddresses(
    @Param('userId', ParseUUIDPipe) userId: string,
  ): Promise<AddressSummaryDto[]> {
    return this.addressService.getUserAddresses(userId);
  }

  @Get('admin/:userId/statistics')
  @ApiOperation({
    summary: 'Get user address statistics (Admin)',
    description: 'Get address statistics for a specific user (Admin only)',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Address statistics',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        verified: { type: 'number' },
        unverified: { type: 'number' },
        hasDefault: { type: 'boolean' },
        byType: { type: 'object' },
      },
    },
  })
  @ApiDefaultResponse({})
  async getAdminAddressStatistics(
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.addressService.getAddressStatistics(userId);
  }

  @Post('admin/:addressId/verify')
  @ApiOperation({
    summary: 'Verify address (Admin)',
    description: 'Mark an address as verified (Admin only)',
  })
  @ApiParam({
    name: 'addressId',
    description: 'Address ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOkBaseResponse({ dto: AddressDto })
  @ApiDefaultResponse({ type: AddressDto })
  async adminVerifyAddress(
    @Param('addressId', ParseUUIDPipe) addressId: string,
  ): Promise<AddressDto> {
    // Get the address to find userId
    const address = await this.addressService.getAddressById(addressId);
    return this.addressService.verifyAddress(addressId, address.userId);
  }
}
