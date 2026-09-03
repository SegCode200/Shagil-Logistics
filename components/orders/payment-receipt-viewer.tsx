"use client";

import Image from "next/image";
import { RotateCcw, X, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import type { PaymentReceipt } from "@/lib/types";

export function PaymentReceiptViewer({ receipts }: { receipts: PaymentReceipt[] }) {
  const [selectedReceipt, setSelectedReceipt] = useState<PaymentReceipt | null>(null);
  const [zoom, setZoom] = useState(1);

  const openReceipt = (receipt: PaymentReceipt) => {
    setZoom(1);
    setSelectedReceipt(receipt);
  };

  return (
    <>
      <div className="payment-receipts-list">
        {receipts.map((receipt, index) => (
          receipt.publicUrl ? (
            <button
              type="button"
              className="payment-receipt-link"
              key={receipt.id || receipt.publicUrl}
              onClick={() => openReceipt(receipt)}
            >
              <span>Receipt {index + 1}</span>
              <strong>{receipt.originalFilename || "View receipt"}</strong>
            </button>
          ) : null
        ))}
      </div>

      {selectedReceipt?.publicUrl ? (
        <div className="receipt-viewer-backdrop" role="dialog" aria-modal="true" aria-label="Payment receipt preview">
          <div className="receipt-viewer">
            <div className="receipt-viewer-header">
              <strong>{selectedReceipt.originalFilename || "Payment receipt"}</strong>
              <div className="receipt-viewer-tools">
                <button type="button" className="receipt-viewer-tool" onClick={() => setZoom((current) => Math.max(0.5, current - 0.25))} disabled={zoom <= 0.5} aria-label="Zoom out">
                  <ZoomOut size={18} />
                </button>
                <span className="receipt-viewer-zoom">{Math.round(zoom * 100)}%</span>
                <button type="button" className="receipt-viewer-tool" onClick={() => setZoom((current) => Math.min(3, current + 0.25))} disabled={zoom >= 3} aria-label="Zoom in">
                  <ZoomIn size={18} />
                </button>
                <button type="button" className="receipt-viewer-tool" onClick={() => setZoom(1)} disabled={zoom === 1} aria-label="Reset zoom">
                  <RotateCcw size={17} />
                </button>
                <button type="button" className="receipt-viewer-close" onClick={() => setSelectedReceipt(null)} aria-label="Close receipt preview">
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="receipt-viewer-content">
              {selectedReceipt.mimeType === "application/pdf" || selectedReceipt.publicUrl.toLowerCase().split("?")[0].endsWith(".pdf") ? (
                <iframe className="receipt-viewer-pdf" style={{ transform: `scale(${zoom})` }} title={selectedReceipt.originalFilename || "Payment receipt PDF"} src={selectedReceipt.publicUrl} />
              ) : (
                <div className="receipt-viewer-image-wrap" style={{ transform: `scale(${zoom})` }}>
                  <Image src={selectedReceipt.publicUrl} alt={selectedReceipt.originalFilename || "Payment receipt"} width={1400} height={1400} unoptimized />
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
