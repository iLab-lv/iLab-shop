'use client';

import Image from 'next/image';
import StorefrontCombobox from './StorefrontCombobox';
import { productTypeThumbnail } from '../../../lib/homepagePresentation.mjs';
import iphoneImage from '../../../public/images/device_filter/iphone.png';
import ipadImage from '../../../public/images/device_filter/ipad.png';
import macbookImage from '../../../public/images/device_filter/macbook.png';
import watchImage from '../../../public/images/device_filter/iwatch.png';
import smartphoneImage from '../../../public/images/device_filter/smartphone.png';
import styles from './HomepageFinder.module.css';

const DEVICE_IMAGES = Object.freeze({
  iphone: iphoneImage, ipad: ipadImage,
  macbook: macbookImage, 'apple-watch': watchImage,
  samsung: smartphoneImage, xiaomi: smartphoneImage, huawei: smartphoneImage,
});
const keyOf = (name) => name.toLocaleLowerCase().replace(/\s+/g, '-');

const DEVICE_STAGE_CLASSES = Object.freeze({
  iphone: styles.iphoneStage,
  ipad: styles.ipadStage,
  macbook: styles.macbookStage,
  'apple-watch': styles.watchStage,
  samsung: styles.androidStage,
  xiaomi: styles.androidStage,
  huawei: styles.androidStage,
});

export default function HomepageFinder({ devices, deviceId, modelId, activeType, productTypes, availableTypes, loading, onDeviceChange, onModelChange, onTypeChange }) {
  const device = devices.find((item) => item.id === deviceId) ?? devices[0];
  const deviceOptions = devices.map((item) => ({ id: item.id, name: item.name }));
  const modelOptions = [{ id: '', name: 'All models' }, ...(device?.models ?? []).map((model) => ({ ...model, description: model.seriesName }))];
  const deviceKey = keyOf(device?.name ?? '');
  const image = DEVICE_IMAGES[deviceKey] ?? DEVICE_IMAGES.smartphone;
  const stageClass = DEVICE_STAGE_CLASSES[deviceKey] ?? styles.androidStage;
  return <section className={styles.finder} id="part-finder" aria-labelledby="finder-title">
    <div className={styles.finderMain}>
      <div className={styles.finderCopy}>
        <p className={styles.eyebrow}>Find your part</p>
        <h2 id="finder-title">Find the right part.</h2>
        <p className={styles.description}>Select your device, model and replacement part to find compatible products.</p>
        <div className={styles.selectors}>
          <StorefrontCombobox id="finder-device" label="Device" options={deviceOptions} value={deviceId} onChange={onDeviceChange} disabled={loading} />
          <StorefrontCombobox id="finder-model" label="Model" options={modelOptions} value={modelId} onChange={onModelChange} disabled={loading} />
        </div>
      </div>
      <div className={`${styles.deviceStage} ${stageClass}`} aria-hidden="true"><Image key={deviceKey} src={image} alt="" fill sizes="(max-width: 760px) 88vw, 48vw" /></div>
    </div>
    <div className={styles.typeGrid} id="part-types">{productTypes.map((type) => {
      const thumbnail = productTypeThumbnail(type), selected = activeType === type.id;
      const available = availableTypes.includes(type.id);
      return <button type="button" key={type.id} className={selected ? styles.typeTileSelected : styles.typeTile} aria-pressed={selected} onClick={() => onTypeChange(selected ? '' : type.id)} disabled={loading || (!available && !selected)}>
        <span className={styles.typeArtwork}>{thumbnail ? <Image src={thumbnail} alt="" fill sizes="(max-width: 600px) 44vw, (max-width: 1024px) 23vw, 150px" /> : null}</span>
        <strong>{type.name}</strong><span className={styles.typeAction}>{selected ? 'Selected' : available ? 'View parts' : 'Unavailable'} {available ? <span aria-hidden="true">→</span> : null}</span>
      </button>;
    })}</div>
    {activeType ? <div className={styles.clearCategoryRow}><button type="button" onClick={() => onTypeChange('')} disabled={loading}>Clear category</button></div> : null}
  </section>;
}
