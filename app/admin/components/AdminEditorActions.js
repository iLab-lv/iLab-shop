'use client';

import { useRef } from 'react';
import { createSubmissionGuard } from '../../../lib/adminEditingState.mjs';
import AdminButton from './AdminButton';
import styles from './AdminEditing.module.css';

export default function AdminEditorActions({
  onSave,
  onCancel,
  onDelete,
  saveLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  deleteLabel = 'Delete',
  saving = false,
  disabled = false,
  deleteDisabled = false,
  children,
}) {
  const runGuarded = useRef(createSubmissionGuard());
  const actionsDisabled = saving || disabled;

  function handleSave() {
    if (!onSave || actionsDisabled) return;
    void runGuarded.current(onSave);
  }

  return (
    <div className={styles.actionBar}>
      <div className={styles.actionMain}>
        {onSave ? <AdminButton type="button" variant="primary" disabled={disabled} loading={saving} loadingLabel="Saving…" onClick={handleSave}>
          {saveLabel}
        </AdminButton> : null}
        {onCancel ? <AdminButton type="button" variant="secondary" disabled={actionsDisabled} onClick={onCancel}>{cancelLabel}</AdminButton> : null}
        {children}
      </div>
      {onDelete ? <AdminButton type="button" variant="destructive" disabled={actionsDisabled || deleteDisabled} onClick={onDelete}>{deleteLabel}</AdminButton> : null}
    </div>
  );
}
