import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../providers/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PostsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.PostCreateInput) {
    return this.prisma.post.create({ data });
  }

  async findMany(args: Prisma.PostFindManyArgs) {
    return this.prisma.post.findMany(args);
  }

  async findFirst(args: Prisma.PostFindFirstArgs) {
    return this.prisma.post.findFirst(args);
  }

  async findUnique(args: Prisma.PostFindUniqueArgs) {
    return this.prisma.post.findUnique(args);
  }

  async update(args: Prisma.PostUpdateArgs) {
    return this.prisma.post.update(args);
  }

  async delete(args: Prisma.PostDeleteArgs) {
    return this.prisma.post.delete(args);
  }

  async count(args: Prisma.PostCountArgs) {
    return this.prisma.post.count(args);
  }

  // Like operations
  async findLike(args: Prisma.LikeFindFirstArgs) {
    return this.prisma.like.findFirst(args);
  }

  async createLike(args: Prisma.LikeCreateArgs) {
    return this.prisma.like.create(args);
  }

  async deleteLike(args: Prisma.LikeDeleteArgs) {
    return this.prisma.like.delete(args);
  }
}
