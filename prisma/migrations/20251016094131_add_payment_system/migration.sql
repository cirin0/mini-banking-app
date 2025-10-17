-- CreateEnum
CREATE TYPE "PaymentSystem" AS ENUM ('VISA', 'MASTERCARD');

-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "paymentSystem" "PaymentSystem" NOT NULL DEFAULT 'VISA';
