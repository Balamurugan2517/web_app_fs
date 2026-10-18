/** Money helpers. Rule: the app keeps whole rupees; only the Razorpay boundary uses paise. */
export const formatINR = (amount: number): string =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

export const toPaise = (rupees: number): number => Math.round(rupees * 100);

/** For a GST-inclusive price, how much of it is tax? e.g. 118 at 18% -> 18. */
export const gstIncluded = (inclusivePrice: number, ratePercent: number): number =>
  Math.round((inclusivePrice - inclusivePrice / (1 + ratePercent / 100)) * 100) / 100;
