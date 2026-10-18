/** Image upload safety: the file's real type is read from its first bytes (a ".jpg" name proves nothing). */
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
export type ImageType = { ext: 'jpg' | 'png' | 'webp'; mime: string };

export function detectImageType(b: Uint8Array): ImageType | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (b.length > 12 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { ext: 'png', mime: 'image/png' };
  if (b.length > 12 && String.fromCharCode(...b.slice(0, 4)) === 'RIFF' && String.fromCharCode(...b.slice(8, 12)) === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  return null;
}

/** "LT-KNZ-001_2.jpg" -> { sku: "LT-KNZ-001", index: 2 }. Lets owners bulk-upload photos named after the style code. */
export function parseImageName(name: string): { sku: string; index: number } | null {
  const m = /^([A-Za-z0-9][A-Za-z0-9-]{2,40})(?:_(\d{1,2}))?\.(jpe?g|png|webp)$/i.exec(name.trim());
  return m ? { sku: m[1].toUpperCase(), index: m[2] ? Number(m[2]) : 1 } : null;
}

/** Only plain file names inside the upload folder may be served (blocks ../ tricks). */
export const isSafeMediaName = (name: string): boolean => /^[A-Za-z0-9][A-Za-z0-9._-]{0,120}$/.test(name) && !name.includes('..');
