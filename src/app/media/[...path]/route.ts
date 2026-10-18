import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { getEnv } from '@/lib/env';
import { isSafeMediaName } from '@/lib/media';

const TYPES: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

/** Serves uploaded product photos from UPLOAD_DIR (outside the code folder, so deployments never delete them). */
export async function GET(_req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await ctx.params;
  const name = parts.length === 1 ? parts[0] : '';
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (!isSafeMediaName(name) || !TYPES[ext]) return new Response('Not found', { status: 404 });
  try {
    const file = await readFile(path.join(path.resolve(getEnv().UPLOAD_DIR), name));
    return new Response(new Uint8Array(file), { headers: { 'Content-Type': TYPES[ext], 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' } });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
