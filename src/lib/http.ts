import { randomUUID } from 'node:crypto';
import { AppError, isAppError, publicMessage } from './errors';
import { logger } from './logger';
import { checkRateLimit, clientIp } from './rate-limit';

/**
 * Wraps every API route handler so that:
 *  1. each request gets a requestId (customers can quote it to support, and it appears in the logs);
 *  2. optional rate limiting is applied;
 *  3. ANY error is caught, logged in full, and returned as a SAFE, uniform JSON body.
 */
export async function handle(
  request: Request,
  name: string,
  fn: (ctx: { requestId: string }) => Promise<Response>,
  opts: { rateLimit?: { limit: number; windowMs: number } } = {},
): Promise<Response> {
  const requestId = randomUUID();
  try {
    if (opts.rateLimit) {
      const rl = checkRateLimit(`${name}:${clientIp(request.headers)}`, opts.rateLimit.limit, opts.rateLimit.windowMs);
      if (!rl.ok) throw new AppError('RATE_LIMITED', 'Too many requests. Please wait a moment and try again.', 429, { retryAfterSec: rl.retryAfterSec });
    }
    return await fn({ requestId });
  } catch (err) {
    const status = isAppError(err) ? err.status : 500;
    logger[status >= 500 ? 'error' : 'warn'](`${name} failed`, {
      requestId, code: isAppError(err) ? err.code : 'INTERNAL_ERROR', status,
      error: err instanceof Error ? err.message : String(err),
      details: isAppError(err) ? err.details : undefined,
      stack: status >= 500 && err instanceof Error ? err.stack : undefined,
    });
    return Response.json(
      { error: { code: isAppError(err) ? err.code : 'INTERNAL_ERROR', message: publicMessage(err), details: isAppError(err) && err.status < 500 ? err.details : undefined, requestId } },
      { status },
    );
  }
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new AppError('VALIDATION_ERROR', 'Request body must be valid JSON.', 400);
  }
}
