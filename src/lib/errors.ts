/**
 * One error type for the whole backend.
 * Every expected failure is thrown as an AppError with a stable `code`, so the API layer can
 * turn it into a safe JSON response and the logs can be searched by code.
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'INVALID_STATE'
  | 'INVALID_SIGNATURE'
  | 'CONFIG_MISSING'
  | 'PAYMENT_PROVIDER_ERROR'
  | 'SHIPPING_PROVIDER_ERROR'
  | 'STORAGE_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, status = 400, details?: unknown, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const isAppError = (e: unknown): e is AppError => e instanceof AppError;

/** Message that is safe to show to a customer. Unknown errors never leak internals. */
export function publicMessage(e: unknown): string {
  return isAppError(e) && e.status < 500 ? e.message : 'Something went wrong on our side. Please try again.';
}
