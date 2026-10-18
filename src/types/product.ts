export type Department = 'women' | 'men' | 'kids' | 'unisex';
export type SizeSet = 'apparel' | 'kids' | 'footwear' | 'free';

/** One purchasable size of a product, with its own stock count. */
export interface Variant {
  id: string;
  size: string;
  /** e.g. LT-KNZ-001-M */
  sku: string;
  stock: number;
  lowStockThreshold: number;
}

export interface ProductImage { url: string; alt: string }

/** A product ("style"). Prices are INR, whole or 2-decimal rupees, GST-inclusive. Lives in PostgreSQL. */
export interface Product {
  id: string;
  /** Style code – never changes, even when stock is refilled. Variants are `${sku}-${size}`. */
  sku: string;
  slug: string;
  name: string;
  description: string;
  department: Department;
  category: string;
  sizeSet: SizeSet;
  images: ProductImage[];
  mrp: number;
  price: number;
  salePrice: number | null;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  costPrice: number;
  gstRate: number;
  hsnCode: string;
  weightKg: number;
  isActive: boolean;
  isNewArrival: boolean;
  variants: Variant[];
}

export const mainImage = (p: Pick<Product, 'images'>): string => p.images[0]?.url ?? '/images/hero.jpg';
