import { IsEnum, IsOptional } from 'class-validator';
import { Currency } from '@prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAccountDto {
  @ApiPropertyOptional({
    enum: Currency,
    description: 'Currency of the account',
    default: Currency.UAH,
  })
  @IsEnum(Currency)
  @IsOptional()
  currency?: Currency = Currency.UAH;
}
