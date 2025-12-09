import { Module } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { AccountsRepository } from './accounts.repository';
import { AccountsRepositoryProxy } from '../../common/proxies/accounts-repository.proxy';
import { AccountsServiceProxy } from '../../common/proxies/accounts-service.proxy';
import { AccountsController } from './accounts.controller';
import { MonitoringService } from '../../common/monitoring/monitoring.service';

@Module({
  providers: [
    AccountsRepository,
    {
      provide: AccountsRepositoryProxy,
      useFactory: (repository: AccountsRepository, monitoring?: MonitoringService) => {
        return new AccountsRepositoryProxy(repository, monitoring);
      },
      inject: [AccountsRepository, MonitoringService],
    },
    {
      provide: AccountsService,
      useFactory: (repository: AccountsRepositoryProxy) => {
        return new AccountsService(repository as any);
      },
      inject: [AccountsRepositoryProxy],
    },
    {
      provide: AccountsServiceProxy,
      useFactory: (service: AccountsService, monitoring?: MonitoringService) => {
        return new AccountsServiceProxy(service, monitoring);
      },
      inject: [AccountsService, MonitoringService],
    },
  ],
  controllers: [AccountsController],
  exports: [AccountsService, AccountsServiceProxy],
})
export class AccountsModule {}
