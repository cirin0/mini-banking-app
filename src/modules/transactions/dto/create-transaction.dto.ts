import { Currency } from '@prisma/client';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreateTransactionDto {
  @IsString()
  @IsNotEmpty()
  fromCardNumber: string;

  @IsString()
  @IsNotEmpty()
  toCardNumber: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: Currency;

  @IsString()
  @IsOptional()
  description?: string;
}
