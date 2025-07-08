import { Controller } from '@nestjs/common';
import { MailService } from '../services/mail.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Mail')
@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}
}
