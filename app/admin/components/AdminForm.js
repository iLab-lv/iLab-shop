import styles from './AdminEditing.module.css';

export function AdminField({ id, label, required = false, helpText, error, children, className = '' }) {
  const describedBy = [helpText ? `${id}-help` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`${styles.field} ${error ? styles.fieldInvalid : ''} ${className}`}>
      <label htmlFor={id}>{label}{required ? <span className={styles.required} aria-hidden="true"> *</span> : null}</label>
      {children({ id, required, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {helpText ? <p className={styles.helpText} id={`${id}-help`}>{helpText}</p> : null}
      {error ? <p className={styles.validation} id={`${id}-error`} role="alert">{error}</p> : null}
    </div>
  );
}

export function AdminTextInput({ label, helpText, error, required, className, ...props }) {
  return <AdminField id={props.id} label={label} helpText={helpText} error={error} required={required} className={className}>
    {(fieldProps) => <input {...props} {...fieldProps} type="text" className={styles.control} />}
  </AdminField>;
}

export function AdminNumberInput({ label, helpText, error, required, className, ...props }) {
  return <AdminField id={props.id} label={label} helpText={helpText} error={error} required={required} className={className}>
    {(fieldProps) => <input {...props} {...fieldProps} type="number" className={styles.control} />}
  </AdminField>;
}

export function AdminTextarea({ label, helpText, error, required, className, ...props }) {
  return <AdminField id={props.id} label={label} helpText={helpText} error={error} required={required} className={className}>
    {(fieldProps) => <textarea {...props} {...fieldProps} className={`${styles.control} ${styles.textarea}`} />}
  </AdminField>;
}

export function AdminSelect({ label, helpText, error, required, className, children, ...props }) {
  return <AdminField id={props.id} label={label} helpText={helpText} error={error} required={required} className={className}>
    {(fieldProps) => <select {...props} {...fieldProps} className={styles.control}>{children}</select>}
  </AdminField>;
}

export function AdminFormSection({ title, description, children }) {
  return <fieldset className={styles.formSection}>
    <legend>{title}</legend>
    {description ? <p>{description}</p> : null}
    <div className={styles.formGrid}>{children}</div>
  </fieldset>;
}
