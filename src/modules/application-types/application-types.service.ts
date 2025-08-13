import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@providers/prisma/prisma.service';
import {
  CreateApplicationTypeDto,
  UpdateApplicationTypeDto,
  ApplicationTypeFiltersDto,
} from './dto/application-type.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class ApplicationTypesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateApplicationTypeDto) {
    const existing = await this.prisma.applicationType.findFirst({
      where: { OR: [{ code: dto.code }, { name: dto.name }] },
    });
    if (existing)
      throw new ConflictException(
        'Application type with same code or name exists',
      );
    return this.prisma.applicationType.create({ data: dto });
  }

  async findAll(filters: ApplicationTypeFiltersDto = {}) {
    const { isActive, search } = filters;
    const where: Prisma.ApplicationTypeWhereInput = {};
    if (typeof isActive === 'boolean') where.isActive = isActive;
    if (search)
      where.OR = [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    return this.prisma.applicationType.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(code: string) {
    const item = await this.prisma.applicationType.findUnique({
      where: { code },
    });
    if (!item) throw new NotFoundException('Application type not found');
    return item;
  }

  async update(code: string, dto: UpdateApplicationTypeDto) {
    await this.findOne(code);
    if (dto.code && dto.code !== code) {
      const exists = await this.prisma.applicationType.findUnique({
        where: { code: dto.code },
      });
      if (exists) throw new ConflictException('New code already exists');
    }
    return this.prisma.applicationType.update({ where: { code }, data: dto });
  }

  async remove(code: string) {
    await this.findOne(code);
    await this.prisma.applicationType.delete({ where: { code } });
    return { success: true };
  }
}
