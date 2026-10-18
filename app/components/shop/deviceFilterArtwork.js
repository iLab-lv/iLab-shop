import iphoneImage from '../../../public/images/device_filter/iphone.png';
import ipadImage from '../../../public/images/device_filter/ipad.png';
import macbookImage from '../../../public/images/device_filter/macbook.png';
import watchImage from '../../../public/images/device_filter/iwatch.png';
import smartphoneImage from '../../../public/images/device_filter/smartphone.png';

const ARTWORK = Object.freeze({
  iphone: { image: iphoneImage, kind: 'iphone' },
  ipad: { image: ipadImage, kind: 'ipad' },
  macbook: { image: macbookImage, kind: 'macbook' },
  'apple-watch': { image: watchImage, kind: 'watch' },
  samsung: { image: smartphoneImage, kind: 'android' },
  xiaomi: { image: smartphoneImage, kind: 'android' },
  huawei: { image: smartphoneImage, kind: 'android' },
});

export function getDeviceFilterArtwork(slug) {
  return ARTWORK[String(slug ?? '').toLocaleLowerCase()] ?? null;
}
