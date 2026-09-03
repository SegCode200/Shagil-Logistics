"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/primitives";

export default function OwnerShopCategoriesPage() {
  const { user, isLoading: authLoading } = useRoleRedirect("OWNER");
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const copyCategoryLink = async (slug: string) => {
    const url = `${window.location.origin}/shop/category/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      window.alert("Public category link copied to clipboard.");
    } catch {
      window.prompt("Copy this public category link:", url);
    }
  };

  const categories = useQuery({
    queryKey: ["shopCategories"],
    queryFn: () => api.getShopCategories(),
    enabled: Boolean(user),
  });

  const createCategory = useMutation({
    mutationFn: (payload: { name: string }) => api.createShopCategory(payload),
    onSuccess: () => {
      setName("");
      queryClient.invalidateQueries({ queryKey: ["shopCategories"] });
    },
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      api.updateShopCategory(id, { name: value }),
    onSuccess: () => {
      setEditingId(null);
      setEditingName("");
      queryClient.invalidateQueries({ queryKey: ["shopCategories"] });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => api.deleteShopCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopCategories"] });
    },
  });

  if (authLoading || !user) return <LoadingState />;

  return (
    <AppShell role="OWNER">
      <div className="page">
        <header className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow">Catalog</p>
            <h1>Categories</h1>
            <p className="subtext">Create and manage storefront categories.</p>
          </div>
          <button
            type="button"
            className="button button-primary"
            style={{
              background: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
              border: "none",
              boxShadow: "0 12px 24px rgba(15, 118, 110, 0.18)",
              padding: "0.85rem 1.3rem",
              fontWeight: 700,
              borderRadius: 12,
            }}
          >
            + Add category
          </button>
        </header>

        <section className="panel" style={{ marginBottom: 24, borderRadius: 18, boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)" }}>
          <div className="panel-heading" style={{ background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)", padding: "18px 22px" }}>
            <h2 style={{ fontSize: 18, letterSpacing: "-0.02em" }}>New category</h2>
          </div>
          <div className="panel-body" style={{ padding: 22 }}>
            <div className="form-grid" style={{ display: "grid", gap: 14 }}>
              <label>
                <span className="field-label">Category name</span>
                <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
              </label>
              <button
                type="button"
                className="button button-primary"
                style={{ width: "fit-content", minWidth: 180, borderRadius: 12 }}
                disabled={!name.trim() || createCategory.isPending}
                onClick={() => createCategory.mutate({ name: name.trim() })}
              >
                {createCategory.isPending ? "Saving..." : "Add category"}
              </button>
            </div>
          </div>
        </section>

        {categories.isLoading ? (
          <LoadingState label="Loading categories" />
        ) : categories.isError ? (
          <ErrorState message="Unable to load categories." />
        ) : categories.data && categories.data.length === 0 ? (
          <EmptyState title="No categories yet" description="Create your first category to start selling." />
        ) : (
          <section className="panel">
            <div className="panel-heading">
              <h2>All categories</h2>
            </div>
            <div className="table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Slug</th>
                    <th>Public link</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.data?.map((category) => (
                    <tr key={category.id}>
                      <td>
                        {editingId === category.id ? (
                          <input
                            className="input"
                            value={editingName}
                            onChange={(event) => setEditingName(event.target.value)}
                          />
                        ) : (
                          category.name
                        )}
                      </td>
                      <td>{category.slug}</td>
                      <td>
                        <button
                          type="button"
                          className="button button-secondary"
                          onClick={() => copyCategoryLink(category.slug)}
                          style={{ whiteSpace: "nowrap" }}
                        >
                          Copy link
                        </button>
                      </td>
                      <td>{category.isActive === false ? "Inactive" : "Active"}</td>
                      <td>
                        {editingId === category.id ? (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              className="button button-primary"
                              disabled={!editingName.trim() || updateCategory.isPending}
                              onClick={() => updateCategory.mutate({ id: category.id, value: editingName.trim() })}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              className="button button-secondary"
                              onClick={() => {
                                setEditingId(null);
                                setEditingName("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              type="button"
                              className="button button-secondary"
                              onClick={() => {
                                setEditingId(category.id);
                                setEditingName(category.name);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="button button-danger"
                              disabled={deleteCategory.isPending}
                              onClick={() => deleteCategory.mutate(category.id)}
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
