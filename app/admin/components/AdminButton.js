'use client';

import { forwardRef } from 'react';
import styles from './AdminEditing.module.css';

const AdminButton = forwardRef(function AdminButton({ variant = 'secondary', className = '', ...props }, ref) {
  return <button ref={ref} className={`${styles.button} ${styles[`button${variant[0].toUpperCase()}${variant.slice(1)}`]} ${className}`} {...props} />;
});

export default AdminButton;
