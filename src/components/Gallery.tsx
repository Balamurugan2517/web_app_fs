'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { ProductImage } from '@/types/product';

export default function Gallery({ images, name }: { images: ProductImage[]; name: string }) {
  const list = images.length ? images : [{ url: '/images/hero.jpg', alt: name }];
  const [i, setI] = useState(0);
  const cur = list[i];
  return (
    <div>
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-rose-200/80 bg-white shadow-xl">
        <Image src={cur.url} alt={cur.alt || name} fill priority unoptimized={cur.url.startsWith('/media/')} sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
      </div>
      {list.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {list.map((im, idx) => (
            <button key={im.url} type="button" onClick={() => setI(idx)} aria-label={`Photo ${idx + 1}`} aria-current={idx === i} className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-md border-2 ${idx === i ? 'border-maroon' : 'border-transparent'}`}>
              <Image src={im.url} alt="" fill unoptimized={im.url.startsWith('/media/')} sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
