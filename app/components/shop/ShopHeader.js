'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { buildHeaderBrandNavigation, isBrandPathActive } from '../../../lib/shopHeaderNavigation.mjs';
import AuthControl from '../AuthControl';
import SiteSwitcher from './SiteSwitcher';
import ShopModal from './ShopModal';
import styles from './ShopHeader.module.css';

export default function ShopHeader({ brands, searchOpen, onOpenSearch, searchTriggerRef }) {
  const pathname = usePathname() || '/';
  const navigation = useMemo(() => buildHeaderBrandNavigation(brands), [brands]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const menuButton = useRef(null);
  const menuCloseButton = useRef(null);
  const moreButton = useRef(null);
  const desktopNav = useRef(null);
  const leaveTimer = useRef(null);
  const overflowActive = navigation.overflow.some((brand) => isBrandPathActive(pathname, brand.slug));

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key !== 'Escape') return;
      if (moreOpen) moreButton.current?.focus();
      setMoreOpen(false);
    }
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [moreOpen]);

  useEffect(() => {
    function closeMoreOnOutsideClick(event) {
      if (!desktopNav.current?.contains(event.target)) setMoreOpen(false);
    }
    document.addEventListener('mousedown', closeMoreOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeMoreOnOutsideClick);
  }, []);

  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  useEffect(() => {
    const closeMenu = () => { setMenuOpen(false); setMoreOpen(false); };
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => { if (desktop.matches) closeMenu(); };
    window.addEventListener('shop:close-major-overlays', closeMenu);
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      window.removeEventListener('shop:close-major-overlays', closeMenu);
      desktop.removeEventListener('change', closeOnDesktop);
    };
  }, []);

  return <>
    <header className={`${styles.header} ${menuOpen ? styles.menuOpen : ''}`} data-shop-header>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <Link className={styles.logo} href="/" aria-label="iLab Shop home"><Image src="/shop/brand/logo.svg" alt="iLab" width={102} height={40} preload /></Link>
          <SiteSwitcher className={styles.siteSwitcher} label="Serviss" href="https://ilab.lv/" serviceLocaleAware />
        </div>
        <nav className={styles.desktopNav} aria-label="Shop navigation" ref={desktopNav}>
          <ul className={styles.navList}>
            {navigation.direct.map((brand) => {
              const active = isBrandPathActive(pathname, brand.slug);
              return <li className={styles.navItemWrap} key={brand.id || brand.slug}><Link className={`${styles.navItem} ${active ? styles.active : ''}`} aria-current={active ? 'page' : undefined} href={`/${brand.slug}`}>{brand.name}</Link></li>;
            })}
            {navigation.overflow.length ? <li className={styles.moreWrap} onMouseEnter={() => { clearTimeout(leaveTimer.current); setMoreOpen(true); }} onMouseLeave={() => { clearTimeout(leaveTimer.current); leaveTimer.current = setTimeout(() => setMoreOpen(false), 120); }}>
              <button ref={moreButton} className={`${styles.navItem} ${styles.moreButton} ${overflowActive ? styles.active : ''}`} type="button" aria-expanded={moreOpen} aria-controls="shop-brand-more" onFocus={() => setMoreOpen(true)} onClick={() => setMoreOpen((open) => !open)}>
                More <svg className={`${styles.chevron} ${moreOpen ? styles.chevronOpen : ''}`} aria-hidden="true" viewBox="0 0 24 24"><path d="m8 10 4 4 4-4" /></svg>
              </button>
              <div id="shop-brand-more" className={`${styles.dropdown} ${moreOpen ? styles.dropdownOpen : ''}`} aria-hidden={!moreOpen} inert={!moreOpen}>
                <ul>{navigation.overflow.map((brand) => {
                  const active = isBrandPathActive(pathname, brand.slug);
                  return <li key={brand.id || brand.slug}><Link className={`${styles.dropdownLink} ${active ? styles.active : ''}`} aria-current={active ? 'page' : undefined} href={`/${brand.slug}`} onClick={() => setMoreOpen(false)}>{brand.name}</Link></li>;
                })}</ul>
              </div>
            </li> : null}
          </ul>
        </nav>
        <div className={styles.headerActions}>
          <div className={styles.controls}>
            <div className={styles.desktopAuth}><AuthControl variant="header" onLoginOpen={() => setMenuOpen(false)} /></div>
            <button ref={searchTriggerRef} className={styles.searchButton} type="button" aria-label="Open catalog search" aria-expanded={searchOpen} aria-controls="shop-search-panel" onClick={() => { setMenuOpen(false); onOpenSearch(); }}>
              <svg className={styles.searchIcon} aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>
              <span>Search</span>
              <svg className={styles.searchTrace} aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100"><rect x="0" y="0" width="100" height="100" pathLength="100" className={styles.traceTrail}/><rect x="0" y="0" width="100" height="100" pathLength="100" /></svg>
            </button>
            <button ref={menuButton} className={styles.menuButton} type="button" aria-label={menuOpen ? 'Close shop menu' : 'Open shop menu'} aria-expanded={menuOpen} aria-controls="shop-mobile-menu" onClick={() => { if (!menuOpen) window.dispatchEvent(new Event('shop:close-major-overlays')); setMenuOpen(!menuOpen); }}><span/><span/><span/></button>
          </div>
        </div>
      </div>
    </header>
    <ShopModal open={menuOpen} onClose={() => setMenuOpen(false)} returnFocusRef={menuButton} initialFocusRef={menuCloseButton} label="Shop navigation" id="shop-mobile-menu">
      <section className={styles.mobileMenuFrame} data-shop-modal-frame>
        <header className={styles.menuTopbar}><span>Shop navigation</span><button ref={menuCloseButton} type="button" aria-label="Close shop menu" onClick={() => setMenuOpen(false)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5 5 19" /></svg></button></header>
        <div className={styles.mobileMenu}>
        <nav aria-label="Mobile shop navigation">{navigation.all.map((brand) => {
          const active = isBrandPathActive(pathname, brand.slug);
          return <Link className={active ? styles.active : ''} aria-current={active ? 'page' : undefined} key={brand.id || brand.slug} href={`/${brand.slug}`} onClick={() => setMenuOpen(false)}>{brand.name}</Link>;
        })}</nav>
        <div className={styles.mobileAuth}><AuthControl variant="menu" onLoginOpen={() => setMenuOpen(false)} onAccountNavigate={() => setMenuOpen(false)} returnFocusRef={menuButton} /></div>
        </div>
      </section>
    </ShopModal>
  </>;
}
