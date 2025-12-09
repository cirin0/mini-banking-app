import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { TransactionsServiceProxy } from '../../common/proxies/transactions-service.proxy';
import { TransactionDto } from './dto/transaction.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import express from 'express';

interface AuthenticatedRequest extends express.Request {
  user: {
    id: string;
    email: string;
  };
}

@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsServiceProxy) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createTransaction(
    @Body() createTransactionDto: CreateTransactionDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<TransactionDto> {
    return this.transactionsService.createTransaction(
      createTransactionDto,
      req.user.id,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllTransactions(): Promise<TransactionDto[]> {
    return this.transactionsService.getAllTransactions();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getTransactionById(@Param('id') id: string): Promise<TransactionDto> {
    return this.transactionsService.getTransactionById(id);
  }

  @Get('card/:cardId')
  @UseGuards(JwtAuthGuard)
  async getTransactionsByCardId(
    @Param('cardId') cardId: string,
  ): Promise<TransactionDto[]> {
    return this.transactionsService.getTransactionsByCardId(cardId);
  }

  @Get('card-number/:cardNumber')
  @UseGuards(JwtAuthGuard)
  async getTransactionsByCardNumber(
    @Param('cardNumber') cardNumber: string,
  ): Promise<TransactionDto[]> {
    return this.transactionsService.getTransactionsByCardNumber(cardNumber);
  }
}
