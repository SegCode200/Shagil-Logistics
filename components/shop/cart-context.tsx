"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CartProduct = {
  id: string;
  slug: string;
  name: string;
  price: number | string;
  weightKg?: number | string | null;
  availableQuantity?: number | string | null;
  images?: Array<string | { imageUrl?: string | null }>;
};

export type CartItem = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  weightKg: number;
  availableQuantity: number;
  selectedOptions?: Record<string, string>;
};

type CartContextValue = {
  items: CartItem[];
  itemCount: number;
  totalWeightKg: number;
  subtotal: number;
  addItem: (product: CartProduct, quantity?: number, selectedOptions?: Record<string, string>) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
};

const STORAGE_KEY = "shagil-shop-cart";

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function ShopCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      const stored = JSON.parse(raw) as Partial<CartItem>[];
      return stored.map((item) => ({
        ...item,
        id: String(item.id || ""),
        productId: String(item.productId || item.id || ""),
        name: String(item.name || "Product"),
        price: Number(item.price || 0),
        image: String(item.image || "/placeholder.png"),
        quantity: Math.max(1, Number(item.quantity || 1)),
        weightKg: Math.max(0, Number(item.weightKg || 0)),
        availableQuantity: Math.max(0, Number(item.availableQuantity || 0)),
      })) as CartItem[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items]);

  const addItem = useCallback((product: CartProduct, quantity = 1, selectedOptions?: Record<string, string>) => {
    setItems((current) => {
      const key = `${product.id}-${JSON.stringify(selectedOptions ?? {})}`;
      const existing = current.find((item) => item.id === key);
      const image = Array.isArray(product.images)
        ? typeof product.images[0] === "string"
          ? product.images[0]
          : product.images[0]?.imageUrl || "/placeholder.png"
        : "/placeholder.png";
      const availableQuantity = Math.max(0, Number(product.availableQuantity ?? 0));
      if (existing) {
        return current.map((item) => item.id === key
          ? { ...item, quantity: Math.min(item.quantity + quantity, item.availableQuantity || Number.MAX_SAFE_INTEGER) }
          : item);
      }
      return [
        ...current,
        {
          id: key,
          productId: product.id,
          slug: product.slug,
          name: product.name,
          price: Number(product.price || 0),
          image,
          quantity,
          weightKg: Math.max(0, Number(product.weightKg ?? 0)),
          availableQuantity,
          selectedOptions,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    const nextQuantity = Math.max(0, quantity);
    if (nextQuantity <= 0) {
      setItems((current) => current.filter((item) => item.id !== productId));
      return;
    }
    setItems((current) => current.map((item) => item.id === productId
      ? { ...item, quantity: Math.min(nextQuantity, item.availableQuantity || Number.MAX_SAFE_INTEGER) }
      : item));
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((current) => current.filter((item) => item.id !== productId));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const itemCount = useMemo(() => items.length, [items]);
  const totalWeightKg = useMemo(() => items.reduce((sum, item) => sum + item.weightKg * item.quantity, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);

  const value = useMemo<CartContextValue>(() => ({
    items,
    itemCount,
    totalWeightKg,
    subtotal,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  }), [items, itemCount, totalWeightKg, subtotal, addItem, updateQuantity, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside ShopCartProvider");
  return context;
}
