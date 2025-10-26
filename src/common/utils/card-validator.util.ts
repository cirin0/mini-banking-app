import { PaymentSystem } from '@prisma/client';

export function validateLuhn(cardNumber: string): boolean {
  if (!cardNumber || cardNumber.length < 13 || cardNumber.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = cardNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumber[i], 10);

    if (isNaN(digit)) {
      return false;
    }

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

export function calculateLuhnCheckDigit(
  cardNumberWithoutCheckDigit: string,
): number {
  let sum = 0;
  let isEven = true;

  for (let i = cardNumberWithoutCheckDigit.length - 1; i >= 0; i--) {
    let digit = parseInt(cardNumberWithoutCheckDigit[i], 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit;
}

export function generateValidCardNumber(paymentSystem: PaymentSystem): string {
  let prefix: string;

  switch (paymentSystem) {
    case PaymentSystem.VISA:
      prefix = '4'; // Visa cards start with 4
      break;
    case PaymentSystem.MASTERCARD:
      prefix = '5'; // Mastercard cards start with 5
      break;
    default:
      prefix = '4'; // Default to Visa
  }

  // Generate 15 digits (prefix + 14 random digits)
  let cardNumberWithoutCheckDigit = prefix;
  for (let i = 1; i < 15; i++) {
    cardNumberWithoutCheckDigit += Math.floor(Math.random() * 10);
  }

  // Calculate and append the Luhn check digit
  const checkDigit = calculateLuhnCheckDigit(cardNumberWithoutCheckDigit);
  const cardNumber = cardNumberWithoutCheckDigit + checkDigit;

  return cardNumber;
}

export function validateCardPrefix(
  cardNumber: string,
  paymentSystem: PaymentSystem,
): boolean {
  switch (paymentSystem) {
    case PaymentSystem.VISA:
      return cardNumber.startsWith('4');
    case PaymentSystem.MASTERCARD:
      return cardNumber.startsWith('5');
    default:
      return false;
  }
}

export function validateCardNumber(
  cardNumber: string,
  paymentSystem: PaymentSystem,
): boolean {
  return (
    validateCardPrefix(cardNumber, paymentSystem) && validateLuhn(cardNumber)
  );
}
