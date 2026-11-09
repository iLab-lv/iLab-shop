'use client';

import { useCallback, useEffect, useState } from 'react';
import { useServiceLocale } from './ServiceLocaleProvider';
import styles from './ShopNavigationRulers.module.css';

const clamp = (value) => Math.max(0, Math.min(1, value));

function scrollToPosition(top) {
  window.scrollTo({
    top,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
}

export default function ShopNavigationRulers() {
  const locale = useServiceLocale();
  const [sections, setSections] = useState([]);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);

  const update = useCallback(() => {
    const maximum = document.documentElement.scrollHeight - window.innerHeight;
    setProgress(maximum > 0 ? clamp(window.scrollY / maximum) : 0);
    const index = sections.reduce((current, section, sectionIndex) => (
      section.getBoundingClientRect().top <= 74 ? sectionIndex : current
    ), 0);
    setActive(index);
  }, [sections]);

  useEffect(() => {
    const content = document.querySelector('[data-shop-content]');
    if (!content) return undefined;

    const collectSections = () => {
      const next = [...content.querySelectorAll('[data-shop-ruler-section]')].filter((section) => (
        section.id && (section.querySelector('h1,h2') || section.getAttribute('aria-label'))
      ));
      setSections((previous) => previous.length === next.length && previous.every((section, index) => section === next[index]) ? previous : next);
    };

    collectSections();
    const observer = new MutationObserver(collectSections);
    observer.observe(content, { childList: true, subtree: true });
    let frame;
    const scheduleUpdate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(content);
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    scheduleUpdate();
    return () => {
      observer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
      cancelAnimationFrame(frame);
    };
  }, [update]);

  const sectionLabel = locale === 'ru' ? 'Раздел' : 'Sadaļa';
  const progressLabel = locale === 'ru' ? 'Прокрутка страницы, проценты' : 'Lapas ritināšana, procenti';
  return <>
    {sections.length > 0 ? <nav className={`${styles.rail} ${styles.railLeft}`} aria-label="Page sections">
      <div className={styles.railSections}>
        {sections.map((section, index) => <button
          key={section.id}
          type="button"
          style={{ top: `${(sections.length > 1 ? index / (sections.length - 1) : 0) * 100}%` }}
          aria-current={index === active ? 'location' : undefined}
          aria-label={`${sectionLabel} ${index + 1}: ${section.querySelector('h1,h2')?.textContent?.replace(/\s+/g, ' ').trim() || section.getAttribute('aria-label')}`}
          onClick={() => scrollToPosition(section.getBoundingClientRect().top + window.scrollY - 71)}
        >
          {String(index + 1).padStart(2, '0')}
          <span>{section.querySelector('h1,h2')?.textContent?.replace(/\s+/g, ' ').trim() || section.getAttribute('aria-label')}</span>
        </button>)}
        {sections.slice(1).map((section, index) => <i
          className={styles.railSegment}
          key={section.id}
          style={{
            top: `calc(${index / (sections.length - 1) * 100}% + 18px)`,
            bottom: `calc(${100 - (index + 1) / (sections.length - 1) * 100}% + 18px)`,
          }}
          aria-hidden="true"
        ><i /><i /><i /></i>)}
      </div>
    </nav> : null}
    <div className={`${styles.rail} ${styles.railRight}`} style={{ '--progress': progress }} aria-hidden="false">
      <div className={styles.railRuler}>
        {Array.from({ length: 41 }, (_, index) => <i style={{ top: `${index / 40 * 100}%` }} key={index} aria-hidden="true" />)}
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={Math.round(progress * 100)}
          aria-label={progressLabel}
          aria-orientation="vertical"
          onChange={(event) => scrollToPosition(Number(event.target.value) / 100 * (document.documentElement.scrollHeight - window.innerHeight))}
        />
      </div>
      <i className={styles.railMarker} aria-hidden="true" />
      <div className={styles.railScale} aria-hidden="true"><span>100</span><span>50</span><span>0</span></div>
    </div>
  </>;
}
