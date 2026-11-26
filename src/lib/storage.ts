export type BookingKind = "flight" | "hotel" | "listing";

export type CartItem = {
  kind: BookingKind;
  id: string;
  title: string;
  subtitle: string;
  amount: number;
  meta?: Record<string, string>;
};

export type BookingRecord = CartItem & {
  bookingId: string;
  createdAt: string;
  guestName: string;
  email: string;
  paymentMethod: string;
  status: "confirmed";
};

const CART_KEY = "shubham-holidays-cart";
const BOOKINGS_KEY = "shubham-holidays-bookings";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getCart(): CartItem | null {
  return read<CartItem | null>(CART_KEY, null);
}

export function setCart(item: CartItem) {
  write(CART_KEY, item);
}

export function clearCart() {
  localStorage.removeItem(CART_KEY);
}

export function getBookings(): BookingRecord[] {
  return read<BookingRecord[]>(BOOKINGS_KEY, []);
}

export function addBooking(record: BookingRecord) {
  const next = [record, ...getBookings()];
  write(BOOKINGS_KEY, next);
  return next;
}

export function makeBookingId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `SH-${stamp}-${rand}`;
}
