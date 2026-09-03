"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/primitives";
import { useCart } from "@/components/shop/cart-context";
import { api } from "@/lib/api";
import type { ShopProduct } from "@/lib/types";

const formatMoney = (value: number | string) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const productImage = (product: ShopProduct, index = 0) => {
  const images = Array.isArray(product.images) ? product.images : [];
  const first = images[index];
  if (typeof first === "string") return first;
  return first?.imageUrl || "/placeholder.png";
};

export default function ShopProductPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [selectedImage, setSelectedImage] = useState(0);
  const { items, addItem, updateQuantity } = useCart();
  const products = useQuery({
    queryKey: ["publicShopProducts"],
    queryFn: () => api.getPublicShopProducts(),
    enabled: Boolean(slug),
  });

  const product = products.data?.find((item) => item.slug === slug);
  const cartItem = product ? items.find((item) => item.slug === product.slug) : undefined;

  if (products.isLoading) {
    return <main className="shop-main"><div className="empty-state-card"><h2>Loading product...</h2></div></main>;
  }

  if (!product) {
    return (
      <main className="shop-main empty-state-page">
        <div className="empty-state-card">
          <h2>Product not found</h2>
          <Link href="/shop/products" className="primary-button">Back to products</Link>
        </div>
      </main>
    );
  }

  const images = Array.isArray(product.images) ? product.images : [];
  const availableQuantity = Math.max(0, Number(product.quantity ?? 0));
  const available = product.isActive !== false && availableQuantity > 0;
  const relatedProducts = (products.data ?? []).filter((item) => {
    if (item.id === product.id || item.isActive === false) return false;
    const sameCategory = item.categoryId === product.categoryId || item.category?.id === product.categoryId || item.category?.id === product.category?.id;
    const sameCategoryName = (item.category?.name ?? item.categoryName ?? "") === (product.category?.name ?? product.categoryName ?? "");
    return sameCategory || sameCategoryName;
  }).slice(0, 4);

  return (
    <main className="shop-main">
      <section className="shop-product-detail">
        <div className="shop-product-gallery">
          <div className="shop-product-main-image">
            <Image src={productImage(product, selectedImage)} alt={product.name} width={900} height={900} />
          </div>
          <div className="shop-product-thumb-row">
            {images.map((image, index) => (
              <button
                key={typeof image === "string" ? image : image.imageUrl}
                type="button"
                className={index === selectedImage ? "shop-product-thumb active" : "shop-product-thumb"}
                onClick={() => setSelectedImage(index)}
                aria-label={`View image ${index + 1}`}
              >
                <Image src={typeof image === "string" ? image : image.imageUrl} alt={`${product.name} image ${index + 1}`} width={200} height={200} />
              </button>
            ))}
          </div>
        </div>

        <div className="shop-product-info">
          <span className="eyebrow">{product.category?.name ?? product.categoryName ?? "General"}</span>
          <h1>{product.name}</h1>
          <p className="shop-product-price">{formatMoney(product.price)}</p>
          <p className="shop-product-description">{product.description || "A carefully selected item from our shop."}</p>
          <div className="shop-product-stock-info">
            <span>{availableQuantity} available</span>
            <span>{Number(product.weightKg ?? 0).toLocaleString()} kg each</span>
          </div>

          <div className="shop-product-actions">
            {cartItem ? (
              <div className="shop-quantity-row">
                <button
                  type="button"
                  className="quantity-button"
                  onClick={() => updateQuantity(cartItem.id, Math.max(0, cartItem.quantity - 1))}
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <span className="shop-quantity-value">{cartItem.quantity}</span>
                <button
                  type="button"
                  className="quantity-button"
                  onClick={() => updateQuantity(cartItem.id, Math.min(cartItem.quantity + 1, availableQuantity))}
                  disabled={cartItem.quantity >= availableQuantity}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            ) : (
              <Button onClick={() => addItem({ id: product.id, slug: product.slug, name: product.name, price: product.price, weightKg: product.weightKg, availableQuantity, images: product.images }, 1)} className="primary-button" disabled={!available}>
                {available ? "Add to cart" : "Sold out"}
              </Button>
            )}
            <Link href="/shop/cart" className="secondary-button">Go to cart</Link>
          </div>

          <ul className="shop-product-features">
            <li>Secure checkout</li>
            <li>Fast customer support</li>
            <li>Curated product quality</li>
          </ul>
        </div>
      </section>

      {relatedProducts.length > 0 ? (
        <section className="shop-section" style={{ marginTop: 36 }}>
          <div className="section-heading products-heading">
            <div>
              <span className="eyebrow">More in this category</span>
              <h2>Related products</h2>
            </div>
          </div>

          <div className="shop-product-grid shop-product-grid-wide">
            {relatedProducts.map((item) => (
              <article key={item.id} className="shop-product-card">
                <Link href={`/shop/product/${item.slug}`}>
                  <div className="product-image-wrap">
                    <Image src={productImage(item)} alt={item.name} width={800} height={800} />
                  </div>
                </Link>
                <div className="shop-product-card-body">
                  <div className="shop-product-meta">
                    <span>{item.category?.name ?? item.categoryName ?? "General"}</span>
                    <span>{item.isActive === false ? "Sold out" : "In stock"}</span>
                  </div>
                  <h3>{item.name}</h3>
                  <div className="shop-product-footer">
                    <strong>{formatMoney(item.price)}</strong>
                    <Link href={`/shop/product/${item.slug}`} className="inline-link">View details</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
