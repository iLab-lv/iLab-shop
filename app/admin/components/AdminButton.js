'use client';

import { forwardRef } from 'react';
import styles from './AdminEditing.module.css';

const AdminButton = forwardRef(function AdminButton({ variant = 'secondary', size = 'default', loading = false, loadingLabel = 'Working…', className = '', children, disabled, ...props }, ref) {
  const variantName = variant === 'ghost' ? 'subtle' : variant;
  return <button ref={ref} className={`${styles.button} ${styles[`button${variantName[0].toUpperCase()}${variantName.slice(1)}`]} ${size === 'small' ? styles.buttonSmall : ''} ${className}`} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
    <span className={loading ? styles.buttonLabelHidden : ''}>{children}</span>
    {loading ? <span className={styles.buttonLoading}>{loadingLabel}</span> : null}
  </button>;
});

export default AdminButton;
