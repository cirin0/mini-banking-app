import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { AccountsServiceProxy } from '../../common/proxies/accounts-service.proxy';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CreateAccountDto } from './dto/create-account.dto';
import { DepositDto } from './dto/deposit.dto';

interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
  };
}

@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsServiceProxy) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createAccount(
    @Request() req: RequestWithUser,
    @Body() createAccountDto: CreateAccountDto,
  ) {
    return this.accountsService.createAccountForUser(
      req.user.id,
      createAccountDto.currency,
    );
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyAccounts(@Request() req: RequestWithUser) {
    return this.accountsService.getUserAccounts(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getAccountById(
    @Request() req: RequestWithUser,
    @Param('id') id: string,
  ) {
    const account = await this.accountsService.getAccountById(id);

    if (account.userId !== req.user.id) {
      throw new ForbiddenException('You do not have access to this account');
    }

    return account;
  }

  @UseGuards(JwtAuthGuard)
  @Post(':accountId/deposit')
  async deposit(
    @Param('accountId') accountId: string,
    @Body() DepositDto: DepositDto,
    @Req() req: RequestWithUser,
  ) {
    return this.accountsService.depositToAccount(
      accountId,
      DepositDto.amount,
      req.user.id,
    );
  }
}
