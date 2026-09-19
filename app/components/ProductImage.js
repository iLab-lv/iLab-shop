'use client';

import { useEffect, useState } from 'react';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../../lib/firebaseClient';
import styles from '../page.module.css';

export default function ProductImage({ imagePath, productName }) {
  const [imageUrl, setImageUrl] = useState(null);
  const [status, setStatus] = useState(imagePath ? 'loading' : 'missing');

  useEffect(() => {
    let active = true;
    if (!imagePath) {
      return () => { active = false; };
    }

    getDownloadURL(ref(storage, imagePath))
      .then((url) => {
        if (active) { setImageUrl(url); setStatus('ready'); }
      })
      .catch(() => {
        if (active) { setImageUrl(null); setStatus('missing'); }
      });

    return () => { active = false; };
  }, [imagePath]);

  if (status !== 'ready' || !imageUrl) {
    return (
      <div className={styles.imagePlaceholder} aria-label={`No image for ${productName}`}>
        {status === 'loading' ? 'Loading image…' : 'No image'}
      </div>
    );
  }

  return (
    // Firebase download URLs are resolved dynamically on this diagnostic page.
    // eslint-disable-next-line @next/next/no-img-element
    <img className={styles.productImage} src={imageUrl} alt=""
      onError={() => { setImageUrl(null); setStatus('missing'); }} />
  );
}
