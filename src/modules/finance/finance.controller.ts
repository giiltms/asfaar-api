import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@modules/auth/guard/auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { Roles as UserRoles } from '@common/constants/roles.constants';
import { FinanceService } from './finance.service';
import { FinanceQueryDto, FinanceOverviewResponseDto } from './dto/finance.dto';

@ApiTags('Finance Dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('overview')
  @Roles(UserRoles.FINANCE, UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get comprehensive finance overview',
    description:
      'Retrieve detailed financial analytics including revenue, transactions, payment provider breakdown, and recent payments. Accessible by Finance, Admin, and Super Admin roles.',
  })
  @ApiResponse({
    status: 200,
    description: 'Finance overview data retrieved successfully',
    type: FinanceOverviewResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions to access finance data',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error - Failed to retrieve finance data',
  })
  async getFinanceOverview(
    @Query() query: FinanceQueryDto,
  ): Promise<FinanceOverviewResponseDto> {
    return this.financeService.getFinanceOverview(query);
  }

  @Get('revenue')
  @Roles(UserRoles.FINANCE, UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get revenue analytics',
    description:
      'Retrieve detailed revenue breakdown by provider, type, and time period. Includes growth metrics and trends.',
  })
  @ApiResponse({
    status: 200,
    description: 'Revenue data retrieved successfully',
  })
  async getRevenueAnalytics(@Query() query: FinanceQueryDto) {
    const overview = await this.financeService.getFinanceOverview(query);
    return {
      success: true,
      message: 'Revenue analytics retrieved successfully',
      data: {
        totalRevenue: overview.data.overview.totalRevenue,
        monthlyGrowth: overview.data.overview.monthlyGrowth,
        averageTransactionValue: overview.data.overview.averageTransactionValue,
        providerBreakdown: overview.data.paymentProviderData,
        typeBreakdown: overview.data.paymentTypeData,
        monthlyTrends: overview.data.monthlyTransactions,
      },
      metadata: overview.metadata,
    };
  }

  @Get('transactions')
  @Roles(UserRoles.FINANCE, UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get transaction analytics',
    description:
      'Retrieve transaction statistics including success rates, volume trends, and recent activity.',
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction data retrieved successfully',
  })
  async getTransactionAnalytics(@Query() query: FinanceQueryDto) {
    const overview = await this.financeService.getFinanceOverview(query);
    return {
      success: true,
      message: 'Transaction analytics retrieved successfully',
      data: {
        totalTransactions: overview.data.overview.totalTransactions,
        successfulPayments: overview.data.overview.successfulPayments,
        failedPayments: overview.data.overview.failedPayments,
        successRate: overview.data.overview.successRate,
        recentPayments: overview.data.recentPayments,
        monthlyTrends: overview.data.monthlyTransactions,
      },
      metadata: overview.metadata,
    };
  }

  @Get('providers')
  @Roles(UserRoles.FINANCE, UserRoles.ADMIN, UserRoles.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get payment provider analytics',
    description:
      'Retrieve detailed analytics for each payment provider including revenue, transaction counts, and performance metrics.',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment provider data retrieved successfully',
  })
  async getProviderAnalytics(@Query() query: FinanceQueryDto) {
    const overview = await this.financeService.getFinanceOverview(query);
    return {
      success: true,
      message: 'Payment provider analytics retrieved successfully',
      data: {
        providerRevenue: overview.data.paymentProviderData,
        monthlyProviderTrends: overview.data.monthlyTransactions,
        totalProviders: Object.keys(overview.data.paymentProviderData).length,
      },
      metadata: overview.metadata,
    };
  }
}
