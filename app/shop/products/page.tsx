"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
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

export default function ShopProductsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useQuery({ queryKey: ["publicShopCategories"], queryFn: () => api.getPublicShopCategories() });
  const products = useQuery({ queryKey: ["publicShopProducts"], queryFn: () => api.getPublicShopProducts() });

  const visibleCategories = (categories.data ?? []).filter((item) => item.isActive !== false);
  const filteredProducts = useMemo(() => {
    const items = (products.data ?? []).filter((product) => product.isActive !== false);
    const normalizedQuery = query.trim().toLowerCase();
    const byCategory = category === "all"
      ? items
      : items.filter((product) => product.categoryId === category || product.category?.id === category || product.category?.slug === category);
    if (!normalizedQuery) return byCategory;
    return byCategory.filter((product) =>
      product.name.toLowerCase().includes(normalizedQuery)
      || (product.description ?? "").toLowerCase().includes(normalizedQuery)
      || (product.category?.name ?? "").toLowerCase().includes(normalizedQuery),
    );
  }, [category, products.data, query]);

  return (
    <main className="shop-main">
      <section className="shop-section products-shell">
        <div className="section-heading products-heading">
          <div>
            <span className="eyebrow">Our catalogue</span>
            <h2>All products</h2>
          </div>
        </div>

        <div className="shop-search-bar">
          <input
            className="shop-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search products..."
            aria-label="Search products"
          />
        </div>

        <div className="shop-products-layout">
          <aside className="shop-filter-panel">
            <h3>Categories</h3>
            <div className="shop-filter-list">
              <button type="button" className={category === "all" ? "shop-filter-item active" : "shop-filter-item"} onClick={() => setCategory("all")}>All products</button>
              {visibleCategories.map((item: ShopCategory) => (
                <button
                  key={item.id}
                  type="button"
                  className={category === item.id ? "shop-filter-item active" : "shop-filter-item"}
                  onClick={() => setCategory(item.id)}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </aside>

          <div className="shop-product-grid shop-product-grid-wide">
            {filteredProducts.length === 0 ? (
              <div className="empty-state-card shop-empty-card">
                <h2>No products found.</h2>
                <p>Try a different keyword or category.</p>
              </div>
            ) : (
              filteredProducts.map((product) => (
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
                      <Link href={`/shop/product/${product.slug}`} className="inline-link">View details</Link>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
