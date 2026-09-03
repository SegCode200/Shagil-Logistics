"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/components/shop/cart-context";

export default function ShopHeader() {
  const { itemCount } = useCart();

  return (
    <header className="shop-header">
      <div className="shop-header-inner">
        <Link href="/shop" className="shop-brand">
          <span className="shop-brand-mark">S</span>
          Shagil Shop
        </Link>

        <nav className="shop-nav" aria-label="Main shop navigation">
          <Link href="/shop">Home</Link>
          <Link href="/shop/products">Shop</Link>
          <Link href="/shop/products">Categories</Link>
          <Link href="/shop/cart">Cart ({itemCount})</Link>
        </nav>

        <Link href="/shop/cart" className="shop-cart-pill" aria-label="View shopping cart">
          <ShoppingCart size={16} />
          <span>Cart ({itemCount})</span>
        </Link>
      </div>
    </header>
  );
}
