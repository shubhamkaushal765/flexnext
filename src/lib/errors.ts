export type AppErrorCode = 'storage' | 'validation' | 'version' | 'unknown';

export const GENERIC_ERROR_MESSAGE = 'Something went wrong. Please try again.';

export class AppError extends Error {
  readonly code: AppErrorCode;
  constructor(message: string, code: AppErrorCode = 'unknown') {
    super(message);
    this.name = 'AppError';
    this.code = code;
  }
}

export function toUserMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  console.error('[unhandled]', error);
  return GENERIC_ERROR_MESSAGE;
}
