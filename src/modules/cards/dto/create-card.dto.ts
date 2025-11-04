import { ApiPropertyOptional } from '@nestjs/swagger';
import { CardType, PaymentSystem } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class CreateCardDto {
  @ApiPropertyOptional({
    enum: CardType,
    description: 'Currency of the account',
    default: CardType.DEBIT,
  })
  @IsEnum(CardType)
  @IsOptional()
  cardType?: CardType = CardType.DEBIT;

  @ApiPropertyOptional({
    enum: PaymentSystem,
    description: 'Payment system of the card',
    default: PaymentSystem.VISA,
  })
  @IsEnum(PaymentSystem)
  @IsOptional()
  paymentSystem?: PaymentSystem = PaymentSystem.VISA;
}
