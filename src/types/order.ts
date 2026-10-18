export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_FAILED'
  | 'PAID'
  | 'COD_CONFIRMED'
  | 'SHIPMENT_CREATED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RTO'
  | 'RETURN_REQUESTED'
  | 'RETURNED';

export type PaymentMethod = 'PREPAID' | 'COD';
export type PaymentStatus = 'PENDING' | 'CAPTURED' | 'FAILED' | 'NOT_REQUIRED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export interface OrderItem {
  productId: string;
  variantId: string;
  sku: string;
  name: string;
  size: string;
  quantity: number;
  mrp: number;
  /** Price charged per unit (after any sale price, before coupon). GST-inclusive, frozen at purchase. */
  unitPrice: number;
  /** This line's share of the coupon discount (whole line, not per unit). */
  discountAlloc: number;
  /** Cost of goods per unit, frozen at purchase – used for profit reports. */
  unitCost: number;
  gstRate: number;
  hsnCode: string;
  weightKg: number;
  image: string;
}

export interface OrderEvent { at: string; type: string; message: string }

export interface OrderTotals {
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  gstIncluded: number;
  cogs: number;
}

export interface Order {
  id: string;
  /** Secret that lets a guest customer open their own order page. */
  publicToken: string;
  customerId?: string;
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  customer: { name: string; email: string; phone: string };
  address: { line1: string; line2?: string; city: string; state: string; pincode: string };
  items: OrderItem[];
  couponCode?: string;
  totals: OrderTotals;
  payment: {
    status: PaymentStatus;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    method?: string;
    failureReason?: string;
    paidAt?: string;
    refundedAmount: number;
  };
  shipment: {
    shiprocketOrderId?: number;
    shipmentId?: number;
    awb?: string;
    courier?: string;
    trackingUrl?: string;
    lastStatus?: string;
    lastError?: string;
    attempts: number;
    /** What the courier actually charged you (entered by the admin) – used in profit reports. */
    cost: number;
    deliveredAt?: string;
  };
  cancel?: { reason: string; at: string };
  events: OrderEvent[];
}
