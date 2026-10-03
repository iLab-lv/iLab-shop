import { compareAdminDevices } from './adminDeviceTree.mjs';

export function deriveCompatibilitySelection(modelIds, devices) {
  const byId = new Map(devices.map((device) => [device.id, device]));
  const validModels = modelIds
    .map((id) => byId.get(id))
    .filter((device) => device?.type === 'model');
  const firstModel = validModels.find((model) => {
    const series = byId.get(model.parentId);
    return series?.type === 'series' && byId.get(series.parentId)?.type === 'brand';
  });
  const series = firstModel ? byId.get(firstModel.parentId) : null;
  const brand = series ? byId.get(series.parentId) : null;
  return {
    brandId: brand?.id ?? '',
    seriesId: series?.id ?? '',
    inconsistentModelIds: series
      ? validModels.filter((model) => model.parentId !== series.id).map((model) => model.id)
      : [],
    invalidModelIds: modelIds.filter((id) => byId.get(id)?.type !== 'model'),
  };
}

export function getCompatibilityEditorOptions(devices, brandId, seriesId, selectedModelIds = []) {
  const selected = new Set(selectedModelIds);
  const include = (device, selectedId = '') => device.status === 'active' || device.id === selectedId || selected.has(device.id);
  return {
    brands: devices.filter((device) => device.type === 'brand' && include(device, brandId)).sort(compareAdminDevices),
    series: devices.filter((device) => device.type === 'series' && device.parentId === brandId && include(device, seriesId)).sort(compareAdminDevices),
    models: devices.filter((device) => device.type === 'model' && device.parentId === seriesId && include(device)).sort(compareAdminDevices),
  };
}
