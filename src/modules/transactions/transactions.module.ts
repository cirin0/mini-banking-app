import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsController } from './transactions.controller';

@Module({
  providers: [TransactionsService, TransactionsRepository],
  controllers: [TransactionsController],
  exports: [TransactionsService],
})
export class TransactionsModule {}
