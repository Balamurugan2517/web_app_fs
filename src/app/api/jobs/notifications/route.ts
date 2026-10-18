import { safeEqual } from '@/lib/crypto';
import { jobsSecret } from '@/lib/env';
import { AppError } from '@/lib/errors';
import { handle } from '@/lib/http';
import { processOutbox } from '@/lib/notifications/outbox';

/** Background job: send queued emails/SMS/WhatsApp (and retry failures). Called by cron every minute – see MOP. */
export async function POST(request: Request) {
  return handle(request, 'job.notifications', async () => {
    const given = request.headers.get('x-jobs-secret') ?? '';
    if (!safeEqual(given, jobsSecret())) throw new AppError('UNAUTHORIZED', 'Invalid job secret.', 401);
    return Response.json(await processOutbox(50));
  });
}
