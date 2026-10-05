'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import AuthControl from '../AuthControl';
import SiteSwitcher from './SiteSwitcher';
import styles from './ShopHeader.module.css';

const navigation = [{ label: 'Catalog', href: '/' }];

export default function ShopHeader({ searchOpen, onOpenSearch, searchTriggerRef }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef(null);
  useEffect(() => {
    if (!menuOpen) return undefined;
    function closeOnEscape(event) { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); } }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);
  return <header className={`${styles.header} ${menuOpen ? styles.menuOpen : ''}`}><div className={styles.inner}>
    <Link className={styles.logo} href="/" aria-label="iLab Shop home"><Image src="/shop/brand/logo.svg" alt="iLab" width={102} height={40} priority /></Link>
    <nav className={styles.desktopNav} aria-label="Shop navigation">{navigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
    <div className={styles.headerActions}>
      <SiteSwitcher className={styles.desktopSwitcher} label="Serviss" href="https://ilab.lv/" />
      <span className={styles.utilitySeparator} aria-hidden="true" />
      <div className={styles.controls}>
        <div className={styles.desktopAuth}><AuthControl variant="header" onLoginOpen={() => setMenuOpen(false)} /></div>
        <button ref={searchTriggerRef} className={styles.searchButton} type="button" aria-label="Open catalog search" aria-expanded={searchOpen} aria-controls="shop-search-panel" onClick={() => { setMenuOpen(false); onOpenSearch(); }}><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg><span>Search</span></button>
        <button ref={menuButton} className={styles.menuButton} type="button" aria-label={menuOpen ? 'Close shop menu' : 'Open shop menu'} aria-expanded={menuOpen} aria-controls="shop-mobile-menu" onClick={() => setMenuOpen((open) => !open)}><span/><span/><span/></button>
      </div>
    </div></div>
    {menuOpen ? <div className={styles.menuBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }}><div className={styles.mobileMenu} id="shop-mobile-menu"><nav aria-label="Mobile shop navigation">{navigation.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}</nav><div className={styles.mobileUtilities}><div className={styles.mobileSwitcher}><SiteSwitcher label="Serviss" href="https://ilab.lv/" /></div><div className={styles.mobileAuth}><AuthControl variant="menu" onLoginOpen={() => setMenuOpen(false)} onAccountNavigate={() => setMenuOpen(false)} /></div><button className={styles.menuSearch} type="button" onClick={() => { setMenuOpen(false); onOpenSearch(); }}><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg><span>Search</span></button></div></div></div> : null}
  </header>;
}
