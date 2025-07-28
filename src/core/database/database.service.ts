import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { PaginationOptions, PaginatedResult, PaginationUtils } from '../../common/utils/pagination.utils';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    try {
      await this.prisma.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    this.logger.log('Database disconnected');
  }

  /**
   * Execute paginated query with automatic counting
   */
  async findManyWithPagination<T>(
    model: string,
    options: PaginationOptions,
    where?: any,
    include?: any,
    select?: any,
  ): Promise<PaginatedResult<T>> {
    const normalizedOptions = PaginationUtils.normalizePaginationOptions(options);
    const query = PaginationUtils.getPrismaQuery(normalizedOptions);

    const [data, totalItems] = await Promise.all([
      this.prisma[model].findMany({
        ...query,
        where,
        include,
        select,
      }),
      this.prisma[model].count({ where }),
    ]);

    return PaginationUtils.createPaginatedResult(data, totalItems, normalizedOptions);
  }

  /**
   * Execute database transaction with automatic rollback
   */
  async executeTransaction<T>(
    operations: (prisma: PrismaService) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return operations(tx as PrismaService);
    });
  }

  /**
   * Health check for database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<any> {
    try {
      const stats = await this.prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        LIMIT 10;
      `;
      return stats;
    } catch (error) {
      this.logger.error('Failed to get database stats', error);
      return null;
    }
  }
} 