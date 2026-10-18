'use client';

import { useState } from 'react';
import ProductImage from '../ProductImage';
import styles from './ProductGallery.module.css';

export default function ProductGallery({ imagePaths = [], productName }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const images = imagePaths.length ? imagePaths : [null];
  const hasMultipleImages = images.length > 1;

  function showImage(index) {
    setActiveIndex((index + images.length) % images.length);
  }

  function handleTouchEnd(event) {
    if (touchStart === null || !hasMultipleImages) return;
    const distance = event.changedTouches[0].clientX - touchStart;
    if (Math.abs(distance) > 45) showImage(activeIndex + (distance < 0 ? 1 : -1));
    setTouchStart(null);
  }

  return (
    <div
      className={styles.gallery}
      aria-label="Product images"
      onTouchStart={(event) => setTouchStart(event.touches[0].clientX)}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={() => setTouchStart(null)}
    >
      <div className={styles.imageFrame}>
        <ProductImage imagePath={images[activeIndex]} productName={productName} />
        {hasMultipleImages ? <>
          <button className={`${styles.arrow} ${styles.previous}`} type="button" onClick={() => showImage(activeIndex - 1)} aria-label="Show previous product image">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <button className={`${styles.arrow} ${styles.next}`} type="button" onClick={() => showImage(activeIndex + 1)} aria-label="Show next product image">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        </> : null}
      </div>
      {hasMultipleImages ? <div className={styles.indicators} aria-label={`Image ${activeIndex + 1} of ${images.length}`}>
        {images.map((_, index) => <button
          key={`${imagePaths[index]}-${index}`}
          type="button"
          className={index === activeIndex ? styles.activeDot : styles.dot}
          aria-label={`Show image ${index + 1} of ${images.length}`}
          aria-pressed={index === activeIndex}
          onClick={() => showImage(index)}
        />)}
      </div> : null}
    </div>
  );
}
