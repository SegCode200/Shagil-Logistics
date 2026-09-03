"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ShopCategory, ShopProduct } from "@/lib/types";

const formatMoney = (value: number | string) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const productImage = (product: ShopProduct) => {
  const images = Array.isArray(product.images) ? product.images : [];
  const first = images[0];
  if (typeof first === "string") return first;
  return first?.imageUrl || "/placeholder.png";
};

export default function ShopHomePage() {
  const categories = useQuery({ queryKey: ["publicShopCategories"], queryFn: () => api.getPublicShopCategories() });
  const products = useQuery({ queryKey: ["publicShopProducts"], queryFn: () => api.getPublicShopProducts() });

  const productList = products.data ?? [];
  const categoryList = (categories.data ?? []).filter((category) => category.isActive !== false);
  const featuredProducts = productList.filter((product) => product.isFeatured && product.isActive !== false);
  const featured = featuredProducts[0] ?? productList[0] ?? null;
  const bestsellers = productList.filter((product) => product.isActive !== false).slice(0, 4);

  return (
    <main className="shop-main">
      <section className="shop-hero">
        <div className="shop-hero-copy">
          <span className="eyebrow">Fresh arrivals</span>
          <h1>Shop standout essentials for everyday life.</h1>
          <p>Discover a clean, curated selection of styles, beauty, and everyday must-haves designed to make routines easier and more polished.</p>

          <div className="shop-hero-actions">
            <Link href="/shop/products" className="primary-button">
              Shop now <ArrowRight size={18} />
            </Link>
            <Link href="/shop/products" className="secondary-button">
              View collection
            </Link>
          </div>

          <div className="shop-trust-row">
            <div><Truck size={18} /> <span>Fast delivery</span></div>
            <div><ShieldCheck size={18} /> <span>Secure checkout</span></div>
            <div><Sparkles size={18} /> <span>Curated quality</span></div>
          </div>
        </div>

        {featured ? (
          <div className="shop-hero-visual">
            <div className="shop-hero-card card-large">
              <Image src={productImage(featured)} alt={featured.name} width={900} height={900} priority />
            </div>
            <div className="shop-hero-badge">
              <span>Featured</span>
              <strong>{featured.name}</strong>
              <small>{formatMoney(featured.price)}</small>
            </div>
          </div>
        ) : null}
      </section>

      <section className="shop-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Categories</span>
            <h2>Browse by collection</h2>
          </div>
          <Link href="/shop/products">See all</Link>
        </div>

        <div className="shop-category-grid">
          {categoryList.map((category: ShopCategory) => (
            <Link key={category.id} href={`/shop/category/${category.slug}`} className="shop-category-card shop-category-card-text">
              <div className="shop-category-content">
                <h3>{category.name}</h3>
                <p>{category.description ?? "Shop this collection."}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="shop-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Best sellers</span>
            <h2>Popular picks</h2>
          </div>
          <Link href="/shop/products">Shop all</Link>
        </div>

        <div className="shop-product-grid">
          {bestsellers.map((product) => (
            <article key={product.id} className="shop-product-card">
              <Link href={`/shop/product/${product.slug}`}>
                <div className="product-image-wrap">
                  <Image src={productImage(product)} alt={product.name} width={800} height={800} />
                </div>
              </Link>
              <div className="shop-product-card-body">
                <div className="shop-product-meta">
                  <span>{product.category?.name ?? product.categoryName ?? "General"}</span>
                  <span>{product.isActive === false ? "Sold out" : "In stock"}</span>
                </div>
                <h3>{product.name}</h3>
                <div className="shop-product-footer">
                  <strong>{formatMoney(product.price)}</strong>
                  <Link href={`/shop/product/${product.slug}`} className="inline-link">View item</Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
