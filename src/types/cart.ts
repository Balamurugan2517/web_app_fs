/** The small snapshot the browser keeps of a product. The SERVER re-prices everything, so this is display-only. */
export interface CartProductSnapshot {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  mrp: number;
}

export interface CartItem {
  product: CartProductSnapshot;
  quantity: number;
  selectedSize: string;
}

export interface CartContextType {
  cart: CartItem[];
  /** False until the saved cart has been read from the browser, so pages can avoid flashing "empty". */
  isCartLoaded: boolean;
  addToCart: (product: CartProductSnapshot, size: string) => void;
  removeFromCart: (productId: string, size: string) => void;
  updateQuantity: (productId: string, size: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
}
