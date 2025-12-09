import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CardsServiceProxy } from '../../common/proxies/cards-service.proxy';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCardDto } from './dto/create-card.dto';
import { GetCvvDto } from './dto/get-cvv.dto';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
  };
}

@Controller('cards')
export class CardsController {
  constructor(private readonly cardsService: CardsServiceProxy) {}

  @Post(':accountId')
  @UseGuards(JwtAuthGuard)
  async createCard(
    @Param('accountId') accountId: string,
    @Body() createCardDto: CreateCardDto,
  ) {
    if (!createCardDto.cardType || !createCardDto.paymentSystem) {
      throw new BadRequestException('cardType and paymentSystem are required');
    }
    return this.cardsService.createCardForAccount(
      accountId,
      createCardDto.cardType,
      createCardDto.paymentSystem,
    );
  }

  @Get(':cardId')
  @UseGuards(JwtAuthGuard)
  async getCardById(@Param('cardId') cardId: string) {
    return this.cardsService.getCardById(cardId);
  }

  @Get('account/:accountId')
  @UseGuards(JwtAuthGuard)
  async getCardsByAccountId(@Param('accountId') accountId: string) {
    return this.cardsService.getCardsByAccountId(accountId);
  }

  @Get('number/:cardNumber')
  @UseGuards(JwtAuthGuard)
  async getCardByNumber(@Param('cardNumber') cardNumber: string) {
    return this.cardsService.getCardByNumber(cardNumber);
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard)
  async getCardsByUserId(@Param('userId') userId: string) {
    return this.cardsService.getCardsByUserId(userId);
  }

  @Get(':cardId/cvv')
  @UseGuards(JwtAuthGuard)
  async getCvv(
    @Param('cardId') cardId: string,
    @Body() getCvvDto: GetCvvDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.cardsService.getCvvForCard(
      cardId,
      getCvvDto.password,
      req.user.id,
    );
  }

  @Delete('account/:accountId')
  @UseGuards(JwtAuthGuard)
  async deleteCardsByAccountId(@Param('accountId') accountId: string) {
    return this.cardsService.deleteCardsByAccountId(accountId);
  }
}
