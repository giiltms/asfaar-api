import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaMiddleware {
  logger: Logger;
  constructor(private readonly prisma: PrismaClient) {
    this.logger = new Logger(PrismaMiddleware.name);
  }
}
