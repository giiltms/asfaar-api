import { IntersectionType } from '@nestjs/swagger';
import { UserPaginationDTO } from './user-pagination.dto';
import { UserFiltersDTO } from './user-filters.dto';

export class ListUsersDTO extends IntersectionType(
  UserPaginationDTO,
  UserFiltersDTO,
) {}
