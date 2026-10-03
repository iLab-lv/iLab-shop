'use client';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import AuthControl from '../AuthControl';
import styles from './ShopHeader.module.css';
const navigation = [{ label: 'Catalog', href: '/' }];
function SearchControl({ onAfterSearch }) {
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);
  useEffect(() => { if (expanded) inputRef.current?.focus(); }, [expanded]);
  function submit(event) {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get('search')?.toString().trim() ?? '';
    window.dispatchEvent(new CustomEvent('shop:search', { detail: { query } }));
    document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    onAfterSearch?.();
  }
  return <form className={`${styles.search} ${expanded ? styles.searchExpanded : ''}`} role="search" onSubmit={submit}>
    {expanded ? <input ref={inputRef} name="search" type="search" placeholder="Search loaded products" aria-label="Search loaded products" /> : null}
    <button type={expanded ? 'submit' : 'button'} aria-label={expanded ? 'Search' : 'Open search'} onClick={() => setExpanded(true)}><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg><span>Search</span></button>
  </form>;
}
export default function ShopHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileLayout, setMobileLayout] = useState(false);
  const menuButton = useRef(null);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 960px)');
    const update = () => setMobileLayout(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    if (!menuOpen) return undefined;
    function closeOnEscape(event) { if (event.key === 'Escape') { setMenuOpen(false); menuButton.current?.focus(); } }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);
  return <header className={styles.header}><div className={styles.inner}>
    <Link className={styles.logo} href="/" aria-label="iLab Shop home"><Image src="/shop/brand/logo.svg" alt="iLab" width={102} height={40} priority /></Link>
    <nav className={styles.desktopNav} aria-label="Shop navigation">{navigation.map((item) => <Link key={item.href} href={item.href}>{item.label}</Link>)}</nav>
    <div className={styles.controls}><a className={styles.service} href="https://ilab.lv/">Service <span aria-hidden="true">↗</span></a><SearchControl />{!mobileLayout ? <div className={styles.desktopAuth}><AuthControl variant="header" /></div> : null}
      <button ref={menuButton} className={styles.menuButton} type="button" aria-label="Open shop menu" aria-expanded={menuOpen} aria-controls="shop-mobile-menu" onClick={() => setMenuOpen((open) => !open)}><span/><span/><span/></button>
    </div></div>
    {menuOpen ? <div className={styles.menuBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }}><div className={styles.mobileMenu} id="shop-mobile-menu"><nav aria-label="Mobile shop navigation">{navigation.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}</nav>{mobileLayout ? <AuthControl variant="menu" /> : null}</div></div> : null}
  </header>;
}
