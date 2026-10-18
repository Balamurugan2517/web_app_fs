import { safeEqual } from '@/lib/crypto';
import { jobsSecret } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { handle } from '@/lib/http';
import { expireStaleOrders } from '@/lib/orders/service';

/** Background job: cancel checkouts that were never paid (default 30 min) and put their stock back. Called by cron every 5 minutes. */
export async function POST(request: Request) {
  return handle(request, 'job.expire-orders', async () => {
    const given = request.headers.get('x-jobs-secret') ?? '';
    if (!safeEqual(given, jobsSecret())) throw new AppError('UNAUTHORIZED', 'Invalid job secret.', 401);
    return Response.json({ expired: await expireStaleOrders(30) });
  });
}
