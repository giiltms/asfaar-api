import { Injectable } from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import { TempNINData } from '@prisma/client';

@Injectable()
export class NinRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByNin(nin: string): Promise<TempNINData | null> {
    return this.prisma.tempNINData.findUnique({ where: { nin } });
  }

  async create(data: Partial<TempNINData>): Promise<TempNINData> {
    return this.prisma.tempNINData.create({ data: data as any });
  }

  async update(nin: string, data: Partial<TempNINData>): Promise<TempNINData> {
    return this.prisma.tempNINData.update({
      where: { nin },
      data,
    });
  }

  async delete(nin: string): Promise<TempNINData> {
    return this.prisma.tempNINData.delete({ where: { nin } });
  }

  async findAll(where: any = {}, skip = 0, take = 10) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.tempNINData.findMany({ where, skip, take }),
      this.prisma.tempNINData.count({ where }),
    ]);

    return {
      data,
      total,
      page: Math.floor(skip / take) + 1,
      totalPages: Math.ceil(total / take),
    };
  }
}
