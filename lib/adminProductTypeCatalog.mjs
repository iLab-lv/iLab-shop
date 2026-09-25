const nameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function sortAdminProductTypes(productTypes) {
  return [...productTypes].sort((a, b) => {
    const aOrder = Number.isFinite(a.order) ? a.order : Number.POSITIVE_INFINITY;
    const bOrder = Number.isFinite(b.order) ? b.order : Number.POSITIVE_INFINITY;
    return aOrder - bOrder || nameCollator.compare(a.name, b.name) || a.id.localeCompare(b.id);
  });
}
