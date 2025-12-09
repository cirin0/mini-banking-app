import { Module } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { TransactionsRepository } from './transactions.repository';
import { TransactionsRepositoryProxy } from '../../common/proxies/transactions-repository.proxy';
import { TransactionsServiceProxy } from '../../common/proxies/transactions-service.proxy';
import { TransactionsController } from './transactions.controller';
import { MonitoringService } from '../../common/monitoring/monitoring.service';

@Module({
  providers: [
    TransactionsRepository,
    {
      provide: TransactionsRepositoryProxy,
      useFactory: (repository: TransactionsRepository, monitoring?: MonitoringService) => {
        return new TransactionsRepositoryProxy(repository, monitoring);
      },
      inject: [TransactionsRepository, MonitoringService],
    },
    {
      provide: TransactionsService,
      useFactory: (repository: TransactionsRepositoryProxy) => {
        return new TransactionsService(repository as any);
      },
      inject: [TransactionsRepositoryProxy],
    },
    {
      provide: TransactionsServiceProxy,
      useFactory: (
        service: TransactionsService,
        repository: TransactionsRepositoryProxy,
        monitoring?: MonitoringService,
      ) => {
        return new TransactionsServiceProxy(service, repository, monitoring);
      },
      inject: [TransactionsService, TransactionsRepositoryProxy, MonitoringService],
    },
  ],
  controllers: [TransactionsController],
  exports: [TransactionsServiceProxy],
})
export class TransactionsModule {}
