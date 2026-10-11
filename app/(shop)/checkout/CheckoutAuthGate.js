'use client';
import AuthControl from '../../components/AuthControl';
import styles from './checkout.module.css';
export default function CheckoutAuthGate(){return <main className={styles.page}><section className={styles.authGate}><p>Checkout requires an account</p><h1>Sign in or create an account to continue</h1><span>Your orders and invoices will be available in your account. Your cart will remain intact.</span><AuthControl checkoutIntent /></section></main>;}
