"use client";

type ConfirmDialogProps = {
  title: string;
  description: string;
  confirmLabel: string;
  error?: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ConfirmDialog({ title, description, confirmLabel, error, busy = false, onCancel, onConfirm }: ConfirmDialogProps) {
  return <div className="confirm-dialog-backdrop">
    <section className="confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title" aria-describedby="confirm-dialog-description">
      <span className="eyebrow">PLEASE CONFIRM</span>
      <h2 id="confirm-dialog-title">{title}</h2>
      <p id="confirm-dialog-description">{description}</p>
      {error && <div className="form-error" role="alert">{error}</div>}
      <div className="confirm-dialog-actions">
        <button type="button" className="button button-outline" onClick={onCancel} disabled={busy} autoFocus>Cancel</button>
        <button type="button" className="confirm-dialog-danger" onClick={onConfirm} disabled={busy}>{busy ? "Working…" : confirmLabel}</button>
      </div>
    </section>
  </div>;
}
