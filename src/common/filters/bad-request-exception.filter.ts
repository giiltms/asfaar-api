import { Catch, HttpStatus, BadRequestException } from '@nestjs/common';
import BaseExceptionFilter from './base-exception.filter';
import { BAD_REQUEST } from '../constants';

@Catch(BadRequestException)
export class BadRequestExceptionFilter extends BaseExceptionFilter {
  constructor() {
    super(BAD_REQUEST, HttpStatus.BAD_REQUEST);
  }
}
