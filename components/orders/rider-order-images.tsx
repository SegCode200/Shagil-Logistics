"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { OrderImage } from "@/lib/types";

export function RiderOrderImages({ images }: { images?: OrderImage[] }) {
  const imageItems = (images || []).flatMap((image, index) => {
    const url = image.publicUrl || image.url;
    return url ? [{ image, url, index }] : [];
  });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const activeImage = activeIndex === null ? null : imageItems[activeIndex];

  useEffect(() => {
    if (activeIndex === null) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveIndex(null);
      if (event.key === "ArrowLeft") {
        setActiveIndex((current) =>
          current === null ? null : (current - 1 + imageItems.length) % imageItems.length,
        );
      }
      if (event.key === "ArrowRight") {
        setActiveIndex((current) =>
          current === null ? null : (current + 1) % imageItems.length,
        );
      }
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeIndex, imageItems.length]);

  if (imageItems.length === 0) return null;

  return (
    <>
      <section className="rider-order-images" aria-label="Product images">
        <div className="rider-order-images-heading">
          <strong>Product images</strong>
          <span>{imageItems.length} {imageItems.length === 1 ? "photo" : "photos"}</span>
        </div>
        <div className="rider-order-image-grid">
          {imageItems.map(({ image, url }, index) => (
            <button
              className="rider-order-image-thumb"
              type="button"
              key={image.id || url}
              aria-label={`View product image ${index + 1}`}
              onClick={() => setActiveIndex(index)}
            >
              <Image
                src={url}
                alt={image.originalFilename || image.name || `Product image ${index + 1}`}
                width={180}
                height={135}
                sizes="(max-width: 520px) 30vw, 120px"
                unoptimized
              />
            </button>
          ))}
        </div>
      </section>
      {activeImage && activeIndex !== null && (
        <div
          className="rider-image-lightbox"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveIndex(null);
          }}
        >
          <section
            className="rider-image-lightbox-content"
            role="dialog"
            aria-modal="true"
            aria-label={`Product image ${activeIndex + 1} of ${imageItems.length}`}
          >
            <header className="rider-image-lightbox-header">
              <span>
                {activeImage.image.originalFilename || activeImage.image.name || `Product image ${activeIndex + 1}`}
              </span>
              <button
                type="button"
                className="icon-button rider-image-lightbox-close"
                aria-label="Close product image"
                onClick={() => setActiveIndex(null)}
              >
                <X size={20} />
              </button>
            </header>
            <div className="rider-image-lightbox-stage">
              {imageItems.length > 1 && (
                <button
                  type="button"
                  className="rider-image-lightbox-nav rider-image-lightbox-prev"
                  aria-label="Previous product image"
                  onClick={() => setActiveIndex((activeIndex - 1 + imageItems.length) % imageItems.length)}
                >
                  <ChevronLeft size={24} />
                </button>
              )}
              <Image
                className="rider-image-lightbox-image"
                src={activeImage.url}
                alt={activeImage.image.originalFilename || activeImage.image.name || `Product image ${activeIndex + 1}`}
                width={1600}
                height={1200}
                sizes="100vw"
                unoptimized
                priority
              />
              {imageItems.length > 1 && (
                <button
                  type="button"
                  className="rider-image-lightbox-nav rider-image-lightbox-next"
                  aria-label="Next product image"
                  onClick={() => setActiveIndex((activeIndex + 1) % imageItems.length)}
                >
                  <ChevronRight size={24} />
                </button>
              )}
            </div>
            <p className="rider-image-lightbox-count">
              {activeIndex + 1} / {imageItems.length}
            </p>
          </section>
        </div>
      )}
    </>
  );
}
