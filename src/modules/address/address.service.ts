import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { Address, AddressType, Prisma } from '@prisma/client';
import {
  CreateAddressDto,
  UpdateAddressDto,
  AddressDto,
  AddressSummaryDto,
} from './dto/address.dto';
import { 
  ADDRESS_NOT_FOUND,
  ADDRESS_ACCESS_DENIED,
  DEFAULT_ADDRESS_REQUIRED,
} from '@common/constants/errors.constants';

@Injectable()
export class AddressService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new address for a user
   */
  async createAddress(
    userId: string,
    createAddressDto: CreateAddressDto,
  ): Promise<AddressDto> {
    const { isDefault, ...addressData } = createAddressDto;

    // If this is set as default, unset other default addresses
    if (isDefault) {
      await this.unsetDefaultAddresses(userId);
    }

    // If this is the user's first address, make it default
    const existingAddressesCount = await this.prisma.address.count({
      where: { userId },
    });

    const shouldBeDefault = isDefault || existingAddressesCount === 0;

    const address = await this.prisma.address.create({
      data: {
        ...addressData,
        userId,
        isDefault: shouldBeDefault,
      },
    });

    return this.mapToAddressDto(address);
  }

  /**
   * Get all addresses for a user
   */
  async getUserAddresses(userId: string): Promise<AddressSummaryDto[]> {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return addresses.map(address => this.mapToAddressSummaryDto(address));
  }

  /**
   * Get a specific address by ID
   */
  async getAddressById(addressId: string, userId?: string): Promise<AddressDto> {
    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundException(ADDRESS_NOT_FOUND);
    }

    // If userId is provided, check ownership
    if (userId && address.userId !== userId) {
      throw new ForbiddenException(ADDRESS_ACCESS_DENIED);
    }

    return this.mapToAddressDto(address);
  }

  /**
   * Update an address
   */
  async updateAddress(
    addressId: string,
    userId: string,
    updateAddressDto: UpdateAddressDto,
  ): Promise<AddressDto> {
    const existingAddress = await this.getAddressById(addressId, userId);

    const { isDefault, ...addressData } = updateAddressDto;

    // If setting as default, unset other defaults
    if (isDefault && !existingAddress.isDefault) {
      await this.unsetDefaultAddresses(userId, addressId);
    }

    const updatedAddress = await this.prisma.address.update({
      where: { id: addressId },
      data: {
        ...addressData,
        isDefault: isDefault ?? existingAddress.isDefault,
      },
    });

    return this.mapToAddressDto(updatedAddress);
  }

  /**
   * Delete an address
   */
  async deleteAddress(addressId: string, userId: string): Promise<void> {
    const address = await this.getAddressById(addressId, userId);

    // Check if this is the only address and it's default
    if (address.isDefault) {
      const addressCount = await this.prisma.address.count({
        where: { userId },
      });

      if (addressCount === 1) {
        throw new BadRequestException(DEFAULT_ADDRESS_REQUIRED);
      }

      // If deleting default address, set another as default
      await this.setNewDefaultAddress(userId, addressId);
    }

    await this.prisma.address.delete({
      where: { id: addressId },
    });
  }

  /**
   * Set an address as default
   */
  async setDefaultAddress(addressId: string, userId: string): Promise<AddressDto> {
    // Verify address ownership
    await this.getAddressById(addressId, userId);

    // Unset other default addresses
    await this.unsetDefaultAddresses(userId, addressId);

    // Set this address as default
    const updatedAddress = await this.prisma.address.update({
      where: { id: addressId },
      data: { isDefault: true },
    });

    return this.mapToAddressDto(updatedAddress);
  }

  /**
   * Get user's default address
   */
  async getDefaultAddress(userId: string): Promise<AddressDto | null> {
    const address = await this.prisma.address.findFirst({
      where: {
        userId,
        isDefault: true,
      },
    });

    return address ? this.mapToAddressDto(address) : null;
  }

  /**
   * Get addresses by type
   */
  async getAddressesByType(
    userId: string,
    type: AddressType,
  ): Promise<AddressSummaryDto[]> {
    const addresses = await this.prisma.address.findMany({
      where: {
        userId,
        type,
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return addresses.map(address => this.mapToAddressSummaryDto(address));
  }

  /**
   * Verify an address
   */
  async verifyAddress(addressId: string, userId: string): Promise<AddressDto> {
    await this.getAddressById(addressId, userId);

    const updatedAddress = await this.prisma.address.update({
      where: { id: addressId },
      data: { isVerified: true },
    });

    return this.mapToAddressDto(updatedAddress);
  }

  /**
   * Search addresses by location
   */
  async searchAddresses(
    userId: string,
    searchTerm: string,
  ): Promise<AddressSummaryDto[]> {
    const addresses = await this.prisma.address.findMany({
      where: {
        userId,
        OR: [
          { addressLine1: { contains: searchTerm, mode: 'insensitive' } },
          { addressLine2: { contains: searchTerm, mode: 'insensitive' } },
          { area: { contains: searchTerm, mode: 'insensitive' } },
          { city: { contains: searchTerm, mode: 'insensitive' } },
          { state: { contains: searchTerm, mode: 'insensitive' } },
          { lga: { contains: searchTerm, mode: 'insensitive' } },
          { label: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return addresses.map(address => this.mapToAddressSummaryDto(address));
  }

  /**
   * Get address statistics for a user
   */
  async getAddressStatistics(userId: string) {
    const [
      total,
      verified,
      byType,
      hasDefault,
    ] = await Promise.all([
      this.prisma.address.count({ where: { userId } }),
      this.prisma.address.count({ where: { userId, isVerified: true } }),
      this.prisma.address.groupBy({
        by: ['type'],
        where: { userId },
        _count: { type: true },
      }),
      this.prisma.address.findFirst({
        where: { userId, isDefault: true },
        select: { id: true },
      }),
    ]);

    return {
      total,
      verified,
      unverified: total - verified,
      hasDefault: !!hasDefault,
      byType: byType.reduce((acc, item) => {
        acc[item.type] = item._count.type;
        return acc;
      }, {} as Record<AddressType, number>),
    };
  }

  /**
   * Private helper methods
   */
  private async unsetDefaultAddresses(userId: string, excludeId?: string): Promise<void> {
    const where: Prisma.AddressWhereInput = {
      userId,
      isDefault: true,
    };

    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    await this.prisma.address.updateMany({
      where,
      data: { isDefault: false },
    });
  }

  private async setNewDefaultAddress(userId: string, excludeId: string): Promise<void> {
    const newDefaultAddress = await this.prisma.address.findFirst({
      where: {
        userId,
        NOT: { id: excludeId },
      },
      orderBy: { createdAt: 'asc' }, // Set oldest remaining address as default
    });

    if (newDefaultAddress) {
      await this.prisma.address.update({
        where: { id: newDefaultAddress.id },
        data: { isDefault: true },
      });
    }
  }

  private mapToAddressDto(address: Address): AddressDto {
    return {
      id: address.id,
      userId: address.userId,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      area: address.area,
      city: address.city,
      lga: address.lga,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      type: address.type,
      isDefault: address.isDefault,
      isVerified: address.isVerified,
      latitude: address.latitude,
      longitude: address.longitude,
      label: address.label,
      instructions: address.instructions,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  private mapToAddressSummaryDto(address: Address): AddressSummaryDto {
    const addressParts = [
      address.addressLine1,
      address.addressLine2,
      address.area,
      address.city,
      address.state,
    ].filter(Boolean);

    return {
      id: address.id,
      formattedAddress: addressParts.join(', '),
      type: address.type,
      isDefault: address.isDefault,
      isVerified: address.isVerified,
      label: address.label,
      country: address.country,
      state: address.state || '',
      city: address.city || '',
    };
  }

  /**
   * Format address for display
   */
  formatAddress(address: Address, format: 'short' | 'full' = 'full'): string {
    if (format === 'short') {
      return [address.city, address.state, address.country]
        .filter(Boolean)
        .join(', ');
    }

    const parts = [
      address.addressLine1,
      address.addressLine2,
      address.area,
      address.city,
      address.lga,
      address.state,
      address.postalCode,
      address.country,
    ].filter(Boolean);

    return parts.join(', ');
  }

  /**
   * Validate Nigerian address
   */
  private validateNigerianAddress(address: CreateAddressDto | UpdateAddressDto): void {
    if (address.country === 'Nigeria') {
      // Add Nigerian-specific validation logic here
      // For example, validate state against known Nigerian states
      // Validate LGA against known LGAs for the state
    }
  }
} 