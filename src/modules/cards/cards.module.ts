import { Module } from '@nestjs/common';
import { CardsService } from './cards.service';
import { CardsRepository } from './cards.repository';
import { CardsController } from './cards.controller';

@Module({
  providers: [CardsService, CardsRepository],
  controllers: [CardsController],
  exports: [CardsService],
})
export class CardsModule {}
