'use client';

import { useEffect, useId, useRef } from 'react';
import AdminButton from './AdminButton';
import styles from './AdminEditing.module.css';

export default function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);
  const cancelRef = useRef(null);
  const returnFocusRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement;
      dialog.showModal();
      requestAnimationFrame(() => cancelRef.current?.focus());
    } else if (!open && dialog.open) {
      dialog.close();
      returnFocusRef.current?.focus?.();
      returnFocusRef.current = null;
    }
  }, [open]);

  useEffect(() => () => {
    returnFocusRef.current?.focus?.();
  }, []);

  function handleCancel(event) {
    event?.preventDefault();
    if (!loading) onCancel?.();
  }

  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={handleCancel}>
      <div className={styles.dialogBody}>
        <h2 id={titleId}>{title}</h2>
        <p id={descriptionId}>{description}</p>
        <div className={styles.dialogActions}>
          <AdminButton ref={cancelRef} type="button" variant="secondary" disabled={loading} onClick={handleCancel}>{cancelLabel}</AdminButton>
          <AdminButton type="button" variant={destructive ? 'destructive' : 'primary'} loading={loading}
            loadingLabel="Working…" onClick={onConfirm}>{confirmLabel}</AdminButton>
        </div>
      </div>
    </dialog>
  );
}
