'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildHeaderBrandNavigation, isBrandPathActive } from '../../../lib/shopHeaderNavigation.mjs';
import AuthControl from '../AuthControl';
import SiteSwitcher from './SiteSwitcher';
import styles from './ShopHeader.module.css';

export default function ShopHeader({ brands, searchOpen, onOpenSearch, searchTriggerRef }) {
  const pathname = usePathname() || '/';
  const navigation = useMemo(() => buildHeaderBrandNavigation(brands), [brands]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const menuButton = useRef(null);
  const moreButton = useRef(null);
  const desktopNav = useRef(null);
  const leaveTimer = useRef(null);
  const overflowActive = navigation.overflow.some((brand) => isBrandPathActive(pathname, brand.slug));

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key !== 'Escape') return;
      if (moreOpen) moreButton.current?.focus();
      else if (menuOpen) menuButton.current?.focus();
      setMoreOpen(false);
      setMenuOpen(false);
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen, moreOpen]);

  useEffect(() => {
    function closeMoreOnOutsideClick(event) {
      if (!desktopNav.current?.contains(event.target)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', closeMoreOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeMoreOnOutsideClick);
  }, []);

  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  return <header className={`${styles.header} ${menuOpen ? styles.menuOpen : ''}`}><div className={styles.inner}>
    <Link className={styles.logo} href="/" aria-label="iLab Shop home"><Image src="/shop/brand/logo.svg" alt="iLab" width={102} height={40} preload /></Link>
    <nav className={styles.desktopNav} aria-label="Shop navigation" ref={desktopNav}>
      {navigation.direct.map((brand) => {
        const active = isBrandPathActive(pathname, brand.slug);
        return <Link className={`${styles.navItem} ${active ? styles.active : ''}`} aria-current={active ? 'page' : undefined} key={brand.id || brand.slug} href={`/${brand.slug}`}>{brand.name}</Link>;
      })}
      {navigation.overflow.length ? <div className={styles.moreWrap} onMouseEnter={() => { clearTimeout(leaveTimer.current); setMoreOpen(true); }} onMouseLeave={() => { clearTimeout(leaveTimer.current); leaveTimer.current = setTimeout(() => setMoreOpen(false), 120); }}>
        <button ref={moreButton} className={`${styles.navItem} ${styles.moreButton} ${overflowActive ? styles.active : ''}`} type="button" aria-expanded={moreOpen} aria-controls="shop-brand-more" onFocus={() => setMoreOpen(true)} onClick={() => setMoreOpen((open) => !open)}>
          More <span className={`${styles.chevron} ${moreOpen ? styles.chevronOpen : ''}`} aria-hidden="true">›</span>
        </button>
        <div id="shop-brand-more" className={`${styles.dropdown} ${moreOpen ? styles.dropdownOpen : ''}`} aria-hidden={!moreOpen} inert={!moreOpen}>
          <ul>{navigation.overflow.map((brand) => {
            const active = isBrandPathActive(pathname, brand.slug);
            return <li key={brand.id || brand.slug}><Link className={`${styles.dropdownLink} ${active ? styles.active : ''}`} aria-current={active ? 'page' : undefined} href={`/${brand.slug}`} onClick={() => setMoreOpen(false)}>{brand.name}</Link></li>;
          })}</ul>
        </div>
      </div> : null}
    </nav>
    <div className={styles.headerActions}>
      <SiteSwitcher className={styles.desktopSwitcher} label="Serviss" href="https://ilab.lv/" />
      <span className={styles.utilitySeparator} aria-hidden="true" />
      <div className={styles.controls}>
        <div className={styles.desktopAuth}><AuthControl variant="header" onLoginOpen={() => setMenuOpen(false)} /></div>
        <button ref={searchTriggerRef} className={styles.searchButton} type="button" aria-label="Open catalog search" aria-expanded={searchOpen} aria-controls="shop-search-panel" onClick={() => { setMenuOpen(false); onOpenSearch(); }}><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg><span>Search</span></button>
        <button ref={menuButton} className={styles.menuButton} type="button" aria-label={menuOpen ? 'Close shop menu' : 'Open shop menu'} aria-expanded={menuOpen} aria-controls="shop-mobile-menu" onClick={() => setMenuOpen((open) => !open)}><span/><span/><span/></button>
      </div>
    </div></div>
    {menuOpen ? <div className={styles.menuBackdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }}><div className={styles.mobileMenu} id="shop-mobile-menu"><nav aria-label="Mobile shop navigation">{navigation.all.map((brand) => { const active = isBrandPathActive(pathname, brand.slug); return <Link className={active ? styles.active : ''} aria-current={active ? 'page' : undefined} key={brand.id || brand.slug} href={`/${brand.slug}`} onClick={() => setMenuOpen(false)}>{brand.name}</Link>; })}</nav><div className={styles.mobileUtilities}><div className={styles.mobileSwitcher}><SiteSwitcher label="Serviss" href="https://ilab.lv/" /></div><div className={styles.mobileAuth}><AuthControl variant="menu" onLoginOpen={() => setMenuOpen(false)} onAccountNavigate={() => setMenuOpen(false)} /></div><button className={styles.menuSearch} type="button" onClick={() => { setMenuOpen(false); onOpenSearch(); }}><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg><span>Search</span></button></div></div></div> : null}
  </header>;
}
