import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsRepository } from './cards.repository';
import { CardsRepositoryProxy } from '../../common/proxies/cards-repository.proxy';
import { CardsServiceProxy } from '../../common/proxies/cards-service.proxy';
import { CardsController } from './cards.controller';
import { AuthRepository } from '../auth/auth.repository';
import { MonitoringService } from '../monitoring/monitoring.service';

@Module({
  providers: [
    CardsRepository,
    AuthRepository,
    {
      provide: CardsRepositoryProxy,
      useFactory: (
        repository: CardsRepository,
        monitoring?: MonitoringService,
      ) => {
        return new CardsRepositoryProxy(repository, monitoring);
      },
      inject: [CardsRepository, MonitoringService],
    },
    {
      provide: CardsService,
      useFactory: (
        repository: CardsRepositoryProxy,
        authRepository: AuthRepository,
      ) => {
        return new CardsService(repository as any, authRepository);
      },
      inject: [CardsRepositoryProxy, AuthRepository],
    },
    {
      provide: CardsServiceProxy,
      useFactory: (service: CardsService, monitoring?: MonitoringService) => {
        return new CardsServiceProxy(service, monitoring);
      },
      inject: [CardsService, MonitoringService],
    },
  ],
  controllers: [CardsController],
  exports: [CardsServiceProxy],
})
export class CardsModule {}
