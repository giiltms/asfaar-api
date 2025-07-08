import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import {
  DefaultArgs,
  PrismaClientOptions,
} from '@prisma/client/runtime/library';

export type PrismaRepositoryClient =
  | PrismaService
  | Omit<
      PrismaClient<PrismaClientOptions, never, DefaultArgs>,
      '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
    >;
