import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isMongoId } from 'class-validator';

@Injectable()
export class ParseMongoIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!isMongoId(value)) {
      throw new BadRequestException(`${value} is not a valid ObjectId`);
    }
    return value;
  }
}
