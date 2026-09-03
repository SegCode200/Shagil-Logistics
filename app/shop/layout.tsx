import type { ReactNode } from "react";
import { ShopCartProvider } from "@/components/shop/cart-context";
import ShopHeader from "@/components/shop/shop-header";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <ShopCartProvider>
      <div className="shop-page-shell">
        <ShopHeader />
        {children}
        <footer className="shop-footer">
          <div className="shop-footer-inner">
            <div>
              <strong>Shagil</strong>
              <p>Curated products delivered with the same trusted service.</p>
            </div>
            <div>
              <strong>Contact</strong>
              <p>Instagram • Facebook • WhatsApp</p>
            </div>
          </div>
        </footer>
      </div>
    </ShopCartProvider>
  );
}
