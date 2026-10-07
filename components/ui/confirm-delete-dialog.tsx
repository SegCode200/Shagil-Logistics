"use client";

import { Trash2 } from "lucide-react";

type ConfirmDeleteDialogProps = {
  title: string;
  description: string;
  isPending: boolean;
  error?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDeleteDialog({
  title,
  description,
  isPending,
  error,
  onCancel,
  onConfirm,
}: ConfirmDeleteDialogProps) {
  return (
    <div
      className="import-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (!isPending && event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        className="import-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-delete-title"
        aria-describedby="confirm-delete-description"
      >
        <h2 id="confirm-delete-title">{title}</h2>
        <p id="confirm-delete-description">{description}</p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="button button-secondary"
            disabled={isPending}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="button button-danger"
            disabled={isPending}
            onClick={onConfirm}
          >
            <Trash2 size={16} />
            {isPending ? "Deleting..." : "Confirm delete"}
          </button>
        </div>
      </section>
    </div>
  );
}
