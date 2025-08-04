import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { NinVerification, Prisma } from '@prisma/client';

@Injectable()
export class NinRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByNin(nin: string): Promise<NinVerification | null> {
    return this.prisma.ninVerification.findUnique({ where: { nin } });
  }

  async findById(id: string): Promise<NinVerification | null> {
    return this.prisma.ninVerification.findUnique({ where: { id } });
  }

  async create(data: Prisma.NinVerificationCreateInput): Promise<NinVerification> {
    return this.prisma.ninVerification.create({ data });
  }

  async update(nin: string, data: Prisma.NinVerificationUpdateInput): Promise<NinVerification> {
    return this.prisma.ninVerification.update({
      where: { nin },
      data,
    });
  }

  async updateById(id: string, data: Prisma.NinVerificationUpdateInput): Promise<NinVerification> {
    return this.prisma.ninVerification.update({
      where: { id },
      data,
    });
  }

  async delete(nin: string): Promise<NinVerification> {
    return this.prisma.ninVerification.delete({ where: { nin } });
  }

  async deleteById(id: string): Promise<NinVerification> {
    return this.prisma.ninVerification.delete({ where: { id } });
  }

  async findAll(where: Prisma.NinVerificationWhereInput = {}, skip = 0, take = 10) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.ninVerification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.ninVerification.count({ where }),
    ]);

    return {
      data,
      total,
      page: Math.floor(skip / take) + 1,
      totalPages: Math.ceil(total / take),
    };
  }

  async findByUserId(userId: string): Promise<NinVerification[]> {
    return this.prisma.ninVerification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }
}
