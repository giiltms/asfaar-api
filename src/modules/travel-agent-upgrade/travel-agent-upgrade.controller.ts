import { Body, Controller, Get, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { UseGuards } from '@nestjs/common';
import {
  CurrentUser,
  JwtUserPayload,
} from '@common/decorators/current-user.decorator';
import { TravelAgentUpgradeService } from './travel-agent-upgrade.service';
import { CreateUpgradeApplicationDto, UploadUpgradeDocumentDto } from './dto/upgrade.dto';

@ApiTags('Travel Agent Upgrade')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('travel-agent/upgrade')
export class TravelAgentUpgradeController {
  constructor(private readonly service: TravelAgentUpgradeService) {}

  @Post('apply')
  @ApiOperation({ summary: 'Submit upgrade application and create payment' })
  async apply(
    @CurrentUser() user: JwtUserPayload,
    @Body() body: CreateUpgradeApplicationDto,
  ) {
    return this.service.createUpgradeApplication(user.id, body);
  }

  @Post('renew')
  @ApiOperation({ summary: 'Initiate license renewal payment' })
  async renew(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: { serviceFeeId: string },
  ) {
    return this.service.renewLicense(user.id, dto.serviceFeeId);
  }

  @Get('license')
  @ApiOperation({ summary: 'Get current license info' })
  async license(@CurrentUser() user: JwtUserPayload) {
    const license = await this.service['prisma'].travelAgentLicense.findUnique({
      where: { userId: user.id },
    });
    return { license };
  }

  @Put('documents/upload')
  @ApiOperation({ summary: 'Attach an uploaded document to the upgrade application' })
  async uploadDoc(
    @CurrentUser() user: JwtUserPayload,
    @Body() dto: UploadUpgradeDocumentDto,
  ) {
    return this.service.attachDocument(user.id, dto);
  }
}
