import type { SizeSet } from '../types/product';

/** The sizes a product may offer, per "size set". Order matters (it is the display order). */
export const SIZE_SETS: Record<SizeSet, string[]> = {
  apparel: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  kids: ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-11Y', '12-13Y'],
  footwear: ['5', '6', '7', '8', '9', '10', '11'],
  free: ['Free Size'],
};

export const SIZE_SET_LABEL: Record<SizeSet, string> = {
  apparel: 'Clothing (XS – XXL)', kids: 'Kids (age based)', footwear: 'Footwear (UK/India)', free: 'Free size',
};

export const isValidSize = (set: SizeSet, size: string): boolean => SIZE_SETS[set].includes(size);

export const sortSizes = (set: SizeSet, sizes: string[]): string[] =>
  [...sizes].sort((a, b) => SIZE_SETS[set].indexOf(a) - SIZE_SETS[set].indexOf(b));

export interface SizeChart { id: string; title: string; note: string; headers: string[]; rows: string[][] }

/**
 * Indian standard size guide. Garment sizes vary a little between brands/fabrics, so the chart is a guide
 * ("body measurements in inches") – the shop should confirm its own measurements with its tailor/manufacturer.
 */
export const INDIAN_SIZE_CHARTS: SizeChart[] = [
  { id: 'women', title: "Women's clothing (kurtis, tops, dresses, blouses)", note: 'Body measurements in inches. India size = bust measurement.',
    headers: ['Size', 'India size', 'UK size', 'Bust', 'Waist', 'Hip'],
    rows: [['XS', '32', '6', '32', '26', '34'], ['S', '34', '8', '34', '28', '36'], ['M', '36', '10', '36', '30', '38'], ['L', '38', '12', '38', '32', '40'], ['XL', '40', '14', '40', '34', '42'], ['XXL', '42', '16', '42', '36', '44']] },
  { id: 'men', title: "Men's clothing (shirts, kurtas, jackets)", note: 'Body measurements in inches. India size = chest measurement.',
    headers: ['Size', 'India size', 'Chest', 'Waist', 'Shoulder'],
    rows: [['XS', '36', '36', '30', '16.5'], ['S', '38', '38', '32', '17'], ['M', '40', '40', '34', '17.5'], ['L', '42', '42', '36', '18'], ['XL', '44', '44', '38', '18.5'], ['XXL', '46', '46', '40', '19']] },
  { id: 'bottoms', title: 'Trousers, pants & churidars (waist size)', note: 'Choose the size that matches your natural waist.',
    headers: ['Size', 'Waist (in)', 'Waist (cm)', 'Hip (in)'],
    rows: [['S', '28–30', '71–76', '36'], ['M', '32', '81', '38'], ['L', '34', '86', '40'], ['XL', '36', '91', '42'], ['XXL', '38', '97', '44']] },
  { id: 'kids', title: 'Kids clothing (by age)', note: 'If your child is between two sizes, pick the larger one.',
    headers: ['Age', 'Height (cm)', 'Chest (in)'],
    rows: [['2-3Y', '92–98', '21'], ['4-5Y', '104–110', '23'], ['6-7Y', '116–122', '25'], ['8-9Y', '128–134', '27'], ['10-11Y', '140–146', '29'], ['12-13Y', '152–158', '31']] },
  { id: 'footwear', title: 'Footwear (UK/India sizes)', note: 'Measure your foot from heel to longest toe. India sizes follow UK sizing.',
    headers: ['UK / India', 'EU', 'US (men)', 'Foot length (cm)'],
    rows: [['5', '38', '6', '23.8'], ['6', '39', '7', '24.6'], ['7', '40.5', '8', '25.4'], ['8', '42', '9', '26.2'], ['9', '43', '10', '27.1'], ['10', '44.5', '11', '27.9'], ['11', '46', '12', '28.8']] },
];
