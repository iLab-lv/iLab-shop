import { grossToNetCents } from '../../../lib/commerce.mjs';
import styles from './WholesaleNetPrice.module.css';
const money = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
export default function WholesaleNetPrice({ grossCents, vatRatePercent, className = '' }) { const net = grossToNetCents(grossCents, vatRatePercent); return net === null ? null : <small className={`${styles.net} ${className}`}>{money.format(net / 100)} excl. VAT</small>; }
