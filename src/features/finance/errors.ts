export class FinanceValidationError extends Error {}

export function financeError(error: unknown, fallback: string) {
  if (error instanceof FinanceValidationError) return error.message;
  console.error(fallback, error);
  return fallback;
}
