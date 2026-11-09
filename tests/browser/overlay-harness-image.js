export default function Image({ alt = '', productName, ...props }) {
  // Preserve layout without remote storage requests or Next's image loader.
  return <span role="img" aria-label={productName || alt} style={{ display: 'block', width: props.width || '100%', height: props.height || 48 }} />;
}
