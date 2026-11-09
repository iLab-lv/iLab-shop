/* eslint-disable @next/next/no-img-element -- The isolated fixture has no Next image server. */
export default function Image({ alt = '', productName, ...props }) {
  if (props.src) return <img src={props.src} alt={alt} width={props.width} height={props.height} />;
  // Preserve layout without remote storage requests or Next's image loader.
  return <span role="img" aria-label={productName || alt} style={{ display: 'block', width: props.width || '100%', height: props.height || 48 }} />;
}
