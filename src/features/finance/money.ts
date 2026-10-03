import { FinanceValidationError } from './errors';

export const maxAmountMinor = Number.MAX_SAFE_INTEGER;

export function validateAmountMinor(amountMinor: number) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new FinanceValidationError('Enter a positive amount within the supported centavo range.');
  }
  return amountMinor;
}

/** Parse Brazilian notation as a whole string, without floating-point multiplication. */
export function parseBrlAmount(input: string) {
  const value = input.trim().replace(/^R\$\s*/, '');
  if (!/^(?:\d+|[1-9]\d{0,2}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(value)) {
    throw new FinanceValidationError('Enter an amount such as 25,90 or 1.234,56, with up to two centavo digits.');
  }
  const [whole, fraction = ''] = value.split(',');
  const minor = BigInt(`${whole.replace(/\./g, '')}${fraction.padEnd(2, '0')}`);
  if (minor <= 0n || minor > BigInt(maxAmountMinor)) {
    throw new FinanceValidationError('Enter a positive amount within the supported centavo range.');
  }
  return Number(minor);
}

/** Integer digit formatting preserves the last centavo even at MAX_SAFE_INTEGER. */
export function formatBrlInput(amountMinor: number) {
  return formatMinorDigits(BigInt(validateAmountMinor(amountMinor)));
}

function formatMinorDigits(amountMinor: bigint) {
  const digits = String(amountMinor).padStart(3, '0');
  const whole = digits.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${whole},${digits.slice(-2)}`;
}

export function formatBrlAmount(amountMinor: number | bigint) {
  if (typeof amountMinor === 'number' && !Number.isSafeInteger(amountMinor)) {
    throw new FinanceValidationError('Use integer centavos for currency formatting.');
  }
  const minor = BigInt(amountMinor);
  return `${minor < 0n ? '-' : ''}R$ ${formatMinorDigits(minor < 0n ? -minor : minor)}`;
}
