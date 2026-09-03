"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ShopProduct } from "@/lib/types";

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

export default function ShopCategoryPage() {
  const params = useParams<{ slug: string }>();
  const categorySlug = params.slug;

  const categories = useQuery({ queryKey: ["publicShopCategories"], queryFn: () => api.getPublicShopCategories() });
  const products = useQuery({ queryKey: ["publicShopProducts"], queryFn: () => api.getPublicShopProducts() });
  const categoryProductsQuery = useQuery({
    queryKey: ["publicShopCategoryProducts", categorySlug],
    queryFn: () => api.getPublicShopCategoryProducts(categorySlug),
    enabled: Boolean(categorySlug),
  });

  const category = (categories.data ?? []).find((item) => item.slug === categorySlug) ?? null;
  const fallbackProducts = (products.data ?? []).filter((product) => {
    const matchesCategoryId = product.categoryId === category?.id;
    const matchesCategorySlug = product.category?.slug === categorySlug;
    return product.isActive !== false && (matchesCategoryId || matchesCategorySlug || (!category && product.categoryId == null));
  });
  const categoryProducts = categoryProductsQuery.data ?? fallbackProducts;

  return (
    <main className="shop-main">
      <section className="shop-section products-shell">
        <div className="section-heading products-heading">
          <div>
            <span className="eyebrow">Category</span>
            <h2>{category?.name ?? "Products"}</h2>
          </div>
          <Link href="/shop/products">Browse all</Link>
        </div>

        {category ? (
          <div className="shop-category-hero shop-category-hero-text">
            <div className="shop-category-hero-copy">
              <span className="eyebrow">Collection</span>
              <h2>{category.name}</h2>
            </div>
          </div>
        ) : null}

        <div className="shop-product-grid shop-product-grid-wide">
          {categoryProducts.length === 0 ? (
            <div className="empty-state-card shop-empty-card">
              <h2>No products in this category yet.</h2>
              <p>Try another collection from the shop.</p>
            </div>
          ) : (
            categoryProducts.map((product, index) => (
              <article key={product.id} className="shop-product-card">
                <Link href={`/shop/product/${product.slug}`}>
                  <div className="product-image-wrap">
                    <Image src={productImage(product)} alt={product.name} width={300} height={300} loading={index === 0 ? "eager" : "lazy"} />
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
            ))
          )}
        </div>
      </section>
    </main>
  );
}
