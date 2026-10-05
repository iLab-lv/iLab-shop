import styles from './SiteSwitcher.module.css';

export default function SiteSwitcher({ label, href, className = '' }) {
  return (
    <a className={`${styles.switcher} ${className}`.trim()} href={href}>
      {label}
    </a>
  );
}
