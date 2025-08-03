import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum PostStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
  DELETED = 'DELETED',
}

export class AuthorDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiPropertyOptional({ example: 'John' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  lastName?: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  avatar?: string;
}

export class CategoryDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Technology' })
  name: string;

  @ApiProperty({ example: 'technology' })
  slug: string;
}

export class TagDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'JavaScript' })
  name: string;

  @ApiProperty({ example: 'javascript' })
  slug: string;
}

export class CommentDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Great post! Thanks for sharing.' })
  content: string;

  @ApiProperty({ type: AuthorDto })
  author: AuthorDto;

  @ApiProperty({ example: '2023-12-01T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: false })
  isEdited: boolean;

  @ApiProperty({ example: 5 })
  likeCount: number;
}

export class PostDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Getting Started with NestJS' })
  title: string;

  @ApiProperty({ example: 'getting-started-with-nestjs-123456' })
  slug: string;

  @ApiPropertyOptional({
    example: 'A comprehensive guide to building APIs with NestJS...',
  })
  content?: string;

  @ApiPropertyOptional({
    example: 'Learn how to build scalable APIs with NestJS framework',
  })
  excerpt?: string;

  @ApiPropertyOptional({ example: 'https://example.com/featured-image.jpg' })
  featuredImage?: string;

  @ApiProperty({ type: AuthorDto })
  author: AuthorDto;

  @ApiPropertyOptional({ type: CategoryDto })
  category?: CategoryDto;

  @ApiProperty({ enum: PostStatus, example: PostStatus.ACTIVE })
  status: PostStatus;

  @ApiProperty({ example: true })
  isPublished: boolean;

  @ApiPropertyOptional({ example: '2023-12-01T10:30:00Z' })
  publishedAt?: Date;

  @ApiProperty({ example: 150 })
  viewCount: number;

  @ApiProperty({ example: 25 })
  likeCount: number;

  @ApiProperty({ example: 8 })
  commentCount: number;

  @ApiProperty({ example: '2023-12-01T10:30:00Z' })
  createdAt: Date;

  @ApiProperty({ example: '2023-12-01T10:30:00Z' })
  updatedAt: Date;

  @ApiPropertyOptional({ type: [TagDto] })
  tags?: TagDto[];

  @ApiPropertyOptional({ type: [CommentDto] })
  comments?: CommentDto[];

  constructor(partial: Partial<PostDto>) {
    Object.assign(this, partial);
  }
}

export class CreatePostDto {
  @ApiProperty({ example: 'Getting Started with NestJS' })
  @IsString()
  title: string;

  @ApiPropertyOptional({
    example: 'A comprehensive guide to building APIs with NestJS...',
  })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ example: 'Learn how to build scalable APIs' })
  @IsString()
  @IsOptional()
  excerpt?: string;

  @ApiPropertyOptional({ example: 'https://example.com/featured-image.jpg' })
  @IsString()
  @IsOptional()
  featuredImage?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean = false;

  @ApiPropertyOptional({
    example: ['javascript', 'nestjs', 'api'],
    type: [String],
  })
  @IsOptional()
  tagNames?: string[];
}

export class UpdatePostDto {
  @ApiPropertyOptional({ example: 'Updated: Getting Started with NestJS' })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated content...' })
  @IsString()
  @IsOptional()
  content?: string;

  @ApiPropertyOptional({ example: 'Updated excerpt' })
  @IsString()
  @IsOptional()
  excerpt?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/new-featured-image.jpg',
  })
  @IsString()
  @IsOptional()
  featuredImage?: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional({ enum: PostStatus, example: PostStatus.ACTIVE })
  @IsEnum(PostStatus)
  @IsOptional()
  status?: PostStatus;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @ApiPropertyOptional({
    example: ['javascript', 'nestjs', 'api'],
    type: [String],
  })
  @IsOptional()
  tagNames?: string[];
}

export class PostSummaryDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Getting Started with NestJS' })
  title: string;

  @ApiProperty({ example: 'getting-started-with-nestjs-123456' })
  slug: string;

  @ApiPropertyOptional({
    example: 'Learn how to build scalable APIs with NestJS framework',
  })
  excerpt?: string;

  @ApiPropertyOptional({ example: 'https://example.com/featured-image.jpg' })
  featuredImage?: string;

  @ApiProperty({ type: AuthorDto })
  author: AuthorDto;

  @ApiPropertyOptional({ type: CategoryDto })
  category?: CategoryDto;

  @ApiProperty({ example: true })
  isPublished: boolean;

  @ApiProperty({ example: 150 })
  viewCount: number;

  @ApiProperty({ example: 25 })
  likeCount: number;

  @ApiProperty({ example: 8 })
  commentCount: number;

  @ApiProperty({ example: '2023-12-01T10:30:00Z' })
  createdAt: Date;

  constructor(partial: Partial<PostSummaryDto>) {
    Object.assign(this, partial);
  }
}
