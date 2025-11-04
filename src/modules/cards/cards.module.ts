import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsRepository } from './cards.repository';
import { CardsController } from './cards.controller';
import { AuthRepository } from '../auth/auth.repository';

@Module({
  providers: [CardsService, CardsRepository, AuthRepository],
  controllers: [CardsController],
  exports: [CardsService],
})
export class CardsModule {}
