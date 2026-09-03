"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/primitives";

export default function OwnerShopPage() {
  const { user, isLoading: authLoading } = useRoleRedirect("OWNER");
  const queryClient = useQueryClient();

  const categories = useQuery({
    queryKey: ["shopCategories"],
    queryFn: () => api.getShopCategories(),
    enabled: Boolean(user),
  });

  const products = useQuery({
    queryKey: ["shopProducts"],
    queryFn: () => api.getShopProducts(),
    enabled: Boolean(user),
  });

  const orders = useQuery({
    queryKey: ["shopOrders"],
    queryFn: () => api.getShopOrders(1, 10),
    enabled: Boolean(user),
  });

  const createCategory = useMutation({
    mutationFn: (payload: { name: string }) => api.createShopCategory(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopCategories"] }),
  });

  if (authLoading || !user) return <LoadingState />;

  return (
    <AppShell role="OWNER">
      <div className="page">
        <header className="page-header">
          <div>
            <p className="eyebrow">Store management</p>
            <h1>Shop</h1>
            <p className="subtext">Manage categories, products, and customer orders.</p>
          </div>
        </header>

        <div className="summary-grid summary-grid-primary">
          <div className="summary-card">
            <span className="summary-dot dot-blue" />
            <strong>{categories.data?.length ?? 0}</strong>
            <span>Categories</span>
          </div>
          <div className="summary-card">
            <span className="summary-dot dot-green" />
            <strong>{products.data?.length ?? 0}</strong>
            <span>Products</span>
          </div>
          <div className="summary-card">
            <span className="summary-dot dot-red" />
            <strong>{orders.data?.items?.length ?? 0}</strong>
            <span>Orders</span>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 24 }}>
          <div className="panel-heading">
            <h2>Quick actions</h2>
          </div>
          <div className="panel-body" style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <Link href="/owner/shop/categories" className="button button-primary">Manage categories</Link>
            <Link href="/owner/shop/products" className="button button-secondary">Manage products</Link>
            <Link href="/owner/shop/orders" className="button button-secondary">View orders</Link>
            <button
              type="button"
              className="button button-primary"
              onClick={() => createCategory.mutate({ name: `New category ${Date.now().toString().slice(-4)}` })}
            >
              Add sample category
            </button>
          </div>
        </div>

        {categories.isLoading || products.isLoading || orders.isLoading ? (
          <LoadingState label="Loading shop data" />
        ) : categories.isError || products.isError || orders.isError ? (
          <ErrorState message="Unable to load shop information." />
        ) : (
          <div className="summary-grid summary-grid-secondary">
            <div className="summary-card summary-card-secondary">
              <span>Latest category</span>
              <strong>{categories.data?.[0]?.name ?? "None"}</strong>
            </div>
            <div className="summary-card summary-card-secondary">
              <span>Featured products</span>
              <strong>{products.data?.filter((item) => item.isFeatured).length ?? 0}</strong>
            </div>
            <div className="summary-card summary-card-secondary">
              <span>Active products</span>
              <strong>{products.data?.filter((item) => item.isActive !== false).length ?? 0}</strong>
            </div>
          </div>
        )}

        <section className="panel">
          <div className="panel-heading">
            <h2>Shop status</h2>
          </div>
          <div className="panel-body">
            <EmptyState
              title="Owner shop management is ready"
              description="Use the actions above to manage categories, products, and orders for the storefront."
            />
          </div>
        </section>
      </div>
    </AppShell>
  );
}
