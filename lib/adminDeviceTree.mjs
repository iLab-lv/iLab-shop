const nameCollator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export function compareAdminDevices(a, b) {
  const aOrder = Number.isFinite(a.order) ? a.order : Number.POSITIVE_INFINITY;
  const bOrder = Number.isFinite(b.order) ? b.order : Number.POSITIVE_INFINITY;
  return aOrder - bOrder || nameCollator.compare(a.name, b.name) || a.id.localeCompare(b.id);
}

export function buildAdminDeviceHierarchy(devices) {
  const byId = new Map(devices.map((device) => [device.id, device]));
  const brands = [];
  const validBrandIds = new Set();
  const validSeriesIds = new Set();
  const seriesByBrand = new Map();
  const modelsBySeries = new Map();
  const orphans = [];

  for (const device of devices) {
    if (device.type === 'brand') {
      if (device.parentId !== null && device.parentId !== '') {
        orphans.push({ device, reason: 'Brand must not have a parent.' });
      } else {
        brands.push(device);
        validBrandIds.add(device.id);
      }
    } else if (!['series', 'model'].includes(device.type)) {
      orphans.push({ device, reason: 'Device type is not brand, series, or model.' });
    }
  }

  for (const device of devices) {
    if (device.type === 'series') {
      const parent = byId.get(device.parentId);
      if (!parent || parent.type !== 'brand' || !validBrandIds.has(parent.id)) {
        orphans.push({ device, reason: 'Series parent is missing or is not a brand.' });
      } else {
        const siblings = seriesByBrand.get(parent.id) ?? [];
        siblings.push(device);
        seriesByBrand.set(parent.id, siblings);
        validSeriesIds.add(device.id);
      }
    }
  }

  for (const device of devices) {
    if (device.type === 'model') {
      const parent = byId.get(device.parentId);
      if (!parent || parent.type !== 'series' || !validSeriesIds.has(parent.id)) {
        orphans.push({ device, reason: 'Model parent is missing or is not a series.' });
      } else {
        const siblings = modelsBySeries.get(parent.id) ?? [];
        siblings.push(device);
        modelsBySeries.set(parent.id, siblings);
      }
    }
  }

  const tree = brands.sort(compareAdminDevices).map((brand) => {
    const series = (seriesByBrand.get(brand.id) ?? []).sort(compareAdminDevices).map((item) => ({
      device: item,
      models: (modelsBySeries.get(item.id) ?? []).sort(compareAdminDevices),
    }));
    return {
      device: brand,
      series,
      modelCount: series.reduce((total, item) => total + item.models.length, 0),
    };
  });

  return { tree, orphans: orphans.sort((a, b) => compareAdminDevices(a.device, b.device)) };
}

function matches(device, query) {
  return [device.name, device.id, device.slug]
    .some((value) => String(value ?? '').toLocaleLowerCase().includes(query));
}

export function searchAdminDeviceHierarchy(tree, search) {
  const query = search.trim().toLocaleLowerCase();
  if (!query) return tree;

  return tree.flatMap((brand) => {
    if (matches(brand.device, query)) return [brand];

    const series = brand.series.flatMap((item) => {
      if (matches(item.device, query)) return [item];
      const models = item.models.filter((model) => matches(model, query));
      return models.length ? [{ ...item, models }] : [];
    });

    if (!series.length) return [];
    return [{ ...brand, series, modelCount: series.reduce((total, item) => total + item.models.length, 0) }];
  });
}

export function countAdminDevices(devices) {
  return devices.reduce((counts, device) => {
    if (device.type === 'brand') counts.brands += 1;
    if (device.type === 'series') counts.series += 1;
    if (device.type === 'model') counts.models += 1;
    return counts;
  }, { brands: 0, series: 0, models: 0 });
}
