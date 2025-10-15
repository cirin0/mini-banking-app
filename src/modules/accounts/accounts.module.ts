import { Module } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountsRepository } from './accounts.repository';
import { AccountsController } from './accounts.controller';

@Module({
  providers: [AccountsService, AccountsRepository],
  controllers: [AccountsController],
  exports: [AccountsService],
})
export class AccountsModule {}
