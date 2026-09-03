"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/layout/app-shell";
import { useRoleRedirect } from "@/components/auth/auth-provider";
import { api } from "@/lib/api";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/primitives";

const MAX_PRODUCT_IMAGES = 6;
const TARGET_IMAGE_SIZE_BYTES = 120 * 1024;

async function compressImageFile(file: File, targetSize = TARGET_IMAGE_SIZE_BYTES): Promise<File> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const imageBitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return file;

    const maxDimension = 1600;
    let { width, height } = imageBitmap;
    const scale = Math.min(maxDimension / Math.max(width, height), 1);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    canvas.width = width;
    canvas.height = height;
    context.drawImage(imageBitmap, 0, 0, width, height);

    let quality = 0.83;
    let blob: Blob | null = null;

    while (quality >= 0.55) {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((result) => resolve(result), file.type.startsWith("image/png") ? "image/jpeg" : file.type, quality);
      });
      if (blob && blob.size <= targetSize) break;
      quality -= 0.08;
    }

    if (!blob || blob.size === 0) {
      return file;
    }

    const extension = blob.type.includes("png") ? "png" : "jpg";
    return new File([blob], `${file.name.replace(/\.[^.]+$/, "") || "product"}.${extension}`, {
      type: blob.type,
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function prepareProductImages(files: File[]): Promise<File[]> {
  const selected = files.slice(0, MAX_PRODUCT_IMAGES);
  const compressed = await Promise.all(
    selected.map((file) => compressImageFile(file, TARGET_IMAGE_SIZE_BYTES)),
  );
  return compressed;
}

type ProductFormState = {
  name: string;
  quantity: string;
  weightKg: string;
  price: string;
  description: string;
  categoryId: string;
  isFeatured: boolean;
  isActive: boolean;
  images: File[];
};

const emptyProductForm = (): ProductFormState => ({
  name: "",
  quantity: "",
  weightKg: "0",
  price: "",
  description: "",
  categoryId: "",
  isFeatured: false,
  isActive: true,
  images: [],
});

export default function OwnerShopProductsPage() {
  const { user, isLoading: authLoading } = useRoleRedirect("OWNER");
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProductFormState>(emptyProductForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingForm, setEditingForm] = useState<ProductFormState>(emptyProductForm());

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

  const createProduct = useMutation({
    mutationFn: async (payload: ProductFormState) => {
      const images = await prepareProductImages(payload.images);
      return api.createShopProduct(
        {
          name: payload.name,
          quantity: payload.quantity,
          weightKg: payload.weightKg,
          price: payload.price,
          description: payload.description,
          categoryId: payload.categoryId,
          isFeatured: payload.isFeatured,
          isActive: payload.isActive,
        },
        images,
      );
    },
    onSuccess: () => {
      setForm(emptyProductForm());
      queryClient.invalidateQueries({ queryKey: ["shopProducts"] });
    },
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ProductFormState }) =>
      api.updateShopProduct(id, {
        name: payload.name,
        quantity: payload.quantity,
        weightKg: payload.weightKg,
        price: payload.price,
        description: payload.description,
        categoryId: payload.categoryId,
        isFeatured: payload.isFeatured,
        isActive: payload.isActive,
      }),
    onSuccess: () => {
      setEditingId(null);
      setEditingForm(emptyProductForm());
      queryClient.invalidateQueries({ queryKey: ["shopProducts"] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => api.deleteShopProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shopProducts"] });
    },
  });

  const imagePreviewUrls = useMemo(
    () => form.images.map((image) => ({ src: URL.createObjectURL(image), name: image.name })),
    [form.images],
  );

  const handleImageSelection = async (incomingFiles: FileList | null) => {
    if (!incomingFiles || incomingFiles.length === 0) return;

    const nextFiles = Array.from(incomingFiles).slice(0, MAX_PRODUCT_IMAGES - form.images.length);
    if (nextFiles.length === 0) return;

    const compressed = await Promise.all(
      nextFiles.map((file) => compressImageFile(file, TARGET_IMAGE_SIZE_BYTES)),
    );

    setForm((current) => ({
      ...current,
      images: [...current.images, ...compressed].slice(0, MAX_PRODUCT_IMAGES),
    }));
  };

  const stats = useMemo(() => {
    const data = products.data ?? [];
    return {
      total: data.length,
      active: data.filter((product) => product.isActive !== false).length,
      featured: data.filter((product) => product.isFeatured).length,
      lowStock: data.filter((product) => Number(product.quantity ?? 0) <= 5).length,
    };
  }, [products.data]);

  if (authLoading || !user) return <LoadingState />;

  return (
    <AppShell role="OWNER">
      <div className="page">
        <header className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <div>
            <p className="eyebrow">Catalog</p>
            <h1>Products</h1>
            <p className="subtext">Create and manage your storefront inventory in one place.</p>
          </div>
          <button
            type="button"
            className="button button-primary"
            style={{
              background: "linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)",
              border: "none",
              boxShadow: "0 12px 24px rgba(37, 99, 235, 0.18)",
              padding: "0.9rem 1.4rem",
              fontWeight: 700,
              borderRadius: 12,
            }}
          >
            + Add product
          </button>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 24 }}>
          {[
            { label: "Total products", value: stats.total, accent: "#2563eb" },
            { label: "Active", value: stats.active, accent: "#16a34a" },
            { label: "Featured", value: stats.featured, accent: "#7c3aed" },
            { label: "Low stock", value: stats.lowStock, accent: "#f59e0b" },
          ].map((item) => (
            <div key={item.label} style={{ background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)", border: "1px solid #e2e8f0", borderRadius: 18, padding: "18px 18px 16px", boxShadow: "0 10px 25px rgba(15, 23, 42, 0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.label}</span>
                <span style={{ width: 10, height: 10, display: "inline-block", background: item.accent, borderRadius: "50%" }} />
              </div>
              <strong style={{ fontSize: 32, letterSpacing: "-0.05em", display: "block", color: "#0f172a" }}>{item.value}</strong>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20, marginBottom: 24 }}>
          <section className="panel" style={{ borderRadius: 18, overflow: "hidden", boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)" }}>
            <div className="panel-heading" style={{ background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)", padding: "18px 22px" }}>
              <h2 style={{ fontSize: 18, letterSpacing: "-0.02em" }}>New product</h2>
            </div>
            <div className="panel-body" style={{ padding: 22 }}>
              <div className="form-grid" style={{ display: "grid", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 14 }}>
                  <label style={{ gridColumn: "span 2" }}>
                    <span className="field-label">Name</span>
                    <input className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                  </label>
                  <label>
                    <span className="field-label">Price</span>
                    <input className="input" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} />
                  </label>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 14 }}>
                  <label>
                    <span className="field-label">Quantity</span>
                    <input className="input" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} />
                  </label>
                  <label>
                    <span className="field-label">Weight (kg)</span>
                    <input className="input" type="number" min="0" step="0.01" value={form.weightKg} onChange={(event) => setForm({ ...form, weightKg: event.target.value })} />
                  </label>
                  <label>
                    <span className="field-label">Category</span>
                    <select className="input" value={form.categoryId} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
                      <option value="">Select category</option>
                      {categories.data?.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <label>
                  <span className="field-label">Description</span>
                  <textarea className="input" rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
                </label>
                <div style={{ padding: "16px 18px", border: "1px dashed #cbd5e1", borderRadius: 14, background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                    <span className="field-label" style={{ margin: 0 }}>Product images</span>
                    <span style={{ padding: "4px 10px", borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", fontSize: 12, fontWeight: 700 }}>
                      {form.images.length}/{MAX_PRODUCT_IMAGES}
                    </span>
                  </div>

                  <label htmlFor="product-image-upload" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 52, borderRadius: 12, background: "#fff", border: "1px solid #dbeafe", color: "#1d4ed8", fontWeight: 700, cursor: "pointer", textAlign: "center", padding: "10px 14px" }}>
                    + Upload images
                  </label>
                  <input
                    id="product-image-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    style={{ display: "none" }}
                    onChange={async (event) => {
                      await handleImageSelection(event.target.files);
                      event.target.value = "";
                    }}
                  />

                  <small style={{ display: "block", marginTop: 10, color: "#64748b" }}>
                    Up to 6 images. Files are compressed to around 100–150KB before upload.
                  </small>

                  {imagePreviewUrls.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(82px, 1fr))", gap: 10, marginTop: 14 }}>
                      {imagePreviewUrls.map(({ src, name }, index) => (
                        <div key={`${src}-${index}`} style={{ position: "relative" }}>
                          <Image
                            src={src}
                            alt={`Preview ${index + 1}`}
                            width={90}
                            height={90}
                            unoptimized
                            style={{ objectFit: "cover", borderRadius: 10, border: "1px solid #e2e8f0", width: "100%", height: 90 }}
                          />
                          <button
                            type="button"
                            onClick={() => setForm((current) => ({ ...current, images: current.images.filter((_, itemIndex) => itemIndex !== index) }))}
                            style={{ position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: "50%", border: "none", background: "rgba(15, 23, 42, 0.78)", color: "white", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                            aria-label={`Remove ${name}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: 18, flexWrap: "wrap", padding: "2px 4px" }}>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} />
                    Active
                  </label>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                    <input type="checkbox" checked={form.isFeatured} onChange={(event) => setForm({ ...form, isFeatured: event.target.checked })} />
                    Featured
                  </label>
                </div>
                <button
                  type="button"
                  className="button button-primary"
                  style={{ width: "fit-content", minWidth: 180, borderRadius: 12 }}
                  disabled={!form.name.trim() || !form.price || form.images.length === 0 || createProduct.isPending}
                  onClick={() => createProduct.mutate(form)}
                >
                  {createProduct.isPending ? "Saving..." : "Add product"}
                </button>
              </div>
            </div>
          </section>

          <aside className="panel" style={{ borderRadius: 18, overflow: "hidden", boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)", alignSelf: "start" }}>
            <div className="panel-heading" style={{ background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)", padding: "18px 22px" }}>
              <h2 style={{ fontSize: 18, letterSpacing: "-0.02em" }}>Catalog tips</h2>
            </div>
            <div className="panel-body" style={{ padding: 20 }}>
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ padding: 14, border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" }}>
                  <strong style={{ display: "block", marginBottom: 6, color: "#0f172a" }}>Best sellers</strong>
                  <span style={{ color: "#64748b", fontSize: 13 }}>Mark featured products to highlight them on the storefront homepage.</span>
                </div>
                <div style={{ padding: 14, border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" }}>
                  <strong style={{ display: "block", marginBottom: 6, color: "#0f172a" }}>Inventory health</strong>
                  <span style={{ color: "#64748b", fontSize: 13 }}>Keep stock counts realistic and use low-stock alerts to restock faster.</span>
                </div>
                <div style={{ padding: 14, border: "1px solid #e2e8f0", borderRadius: 12, background: "#f8fafc" }}>
                  <strong style={{ display: "block", marginBottom: 6, color: "#0f172a" }}>Media quality</strong>
                  <span style={{ color: "#64748b", fontSize: 13 }}>Use clear product images with a clean background for a stronger customer experience.</span>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {products.isLoading || categories.isLoading ? (
          <LoadingState label="Loading products" />
        ) : products.isError || categories.isError ? (
          <ErrorState message="Unable to load products." />
        ) : products.data && products.data.length === 0 ? (
          <EmptyState title="No products yet" description="Create your first product to start selling." />
        ) : (
          <section className="panel" style={{ borderRadius: 18, overflow: "hidden", boxShadow: "0 12px 30px rgba(15, 23, 42, 0.05)" }}>
            <div className="panel-heading" style={{ background: "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)", padding: "18px 22px" }}>
              <h2 style={{ fontSize: 18, letterSpacing: "-0.02em" }}>Product list</h2>
            </div>
            <div className="table-wrap">
              <table className="orders-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Weight</th>
                    <th>Featured</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.data?.map((product) => {
                    const isEditing = editingId === product.id;
                    const editValues = isEditing ? editingForm : null;
                    return (
                      <tr key={product.id}>
                        {isEditing && editValues ? (
                          <td colSpan={8}>
                            <div style={{ padding: 16, border: "1px solid #e2e8f0", borderRadius: 16, background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)", display: "grid", gap: 14 }}>
                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
                                <label>
                                  <span className="field-label">Name</span>
                                  <input className="input" value={editValues.name} onChange={(event) => setEditingForm({ ...editValues, name: event.target.value })} />
                                </label>
                                <label>
                                  <span className="field-label">Price</span>
                                  <input className="input" value={editValues.price} onChange={(event) => setEditingForm({ ...editValues, price: event.target.value })} />
                                </label>
                                <label>
                                  <span className="field-label">Quantity</span>
                                  <input className="input" value={editValues.quantity} onChange={(event) => setEditingForm({ ...editValues, quantity: event.target.value })} />
                                </label>
                                <label>
                                  <span className="field-label">Weight (kg)</span>
                                  <input className="input" type="number" min="0" step="0.01" value={editValues.weightKg} onChange={(event) => setEditingForm({ ...editValues, weightKg: event.target.value })} />
                                </label>
                              </div>

                              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                                <label>
                                  <span className="field-label">Category</span>
                                  <select className="input" value={editValues.categoryId} onChange={(event) => setEditingForm({ ...editValues, categoryId: event.target.value })}>
                                    <option value="">Select category</option>
                                    {categories.data?.map((category) => (
                                      <option key={category.id} value={category.id}>{category.name}</option>
                                    ))}
                                  </select>
                                </label>
                              </div>

                              <label>
                                <span className="field-label">Description</span>
                                <textarea className="input" rows={3} value={editValues.description} onChange={(event) => setEditingForm({ ...editValues, description: event.target.value })} />
                              </label>

                              <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                                  <input type="checkbox" checked={editValues.isActive} onChange={(event) => setEditingForm({ ...editValues, isActive: event.target.checked })} />
                                  Active
                                </label>
                                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 10, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                                  <input type="checkbox" checked={editValues.isFeatured} onChange={(event) => setEditingForm({ ...editValues, isFeatured: event.target.checked })} />
                                  Featured
                                </label>
                              </div>

                              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                                <button
                                  type="button"
                                  className="button button-primary"
                                  disabled={!editValues.name.trim() || !editValues.price || updateProduct.isPending}
                                  onClick={() => updateProduct.mutate({ id: product.id, payload: editValues })}
                                >
                                  Save changes
                                </button>
                                <button
                                  type="button"
                                  className="button button-secondary"
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditingForm(emptyProductForm());
                                  }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        ) : (
                          <>
                            <td>{product.name}</td>
                            <td>{product.sku || "Pending"}</td>
                            <td>{product.category?.name || "Uncategorized"}</td>
                            <td>{Number(product.price).toLocaleString()}</td>
                            <td>{Number(product.weightKg ?? 0).toLocaleString()} kg</td>
                            <td>{product.isFeatured ? "Yes" : "No"}</td>
                            <td>{product.isActive === false ? "Inactive" : "Active"}</td>
                            <td>
                              <div style={{ display: "flex", gap: 8 }}>
                                <button
                                  type="button"
                                  className="button button-secondary"
                                  onClick={() => {
                                    setEditingId(product.id);
                                    setEditingForm({
                                      name: product.name,
                                      quantity: product.quantity ? String(product.quantity) : "",
                                      weightKg: product.weightKg == null ? "0" : String(product.weightKg),
                                      price: String(product.price),
                                      description: product.description || "",
                                      categoryId: product.categoryId || "",
                                      isFeatured: !!product.isFeatured,
                                      isActive: product.isActive !== false,
                                      images: [],
                                    });
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  className="button button-danger"
                                  disabled={deleteProduct.isPending}
                                  onClick={() => deleteProduct.mutate(product.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
