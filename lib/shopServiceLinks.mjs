export const SERVICE_HOME_LINK = Object.freeze({
  type: 'home',
  paths: Object.freeze({ lv: '/', ru: '/ru' }),
});

const SAFE_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SAFE_TARGET_ID = /^[a-zA-Z0-9_-]{1,160}$/;

// Mirrored from iLab/lib/routes/routeTranslations.js. Service slugs are
// localized by identity; unknown category keys follow Service's key fallback.
const CATEGORY_SLUGS = Object.freeze({
  'iphone-remonts': { lv: 'iphone-remonts', ru: 'remont-iphone' },
  'telefonu-remonts': { lv: 'telefonu-remonts', ru: 'remont-telefonov' },
  'plansetdatoru-remonts': { lv: 'plansetdatoru-remonts', ru: 'remont-planshetov' },
  'datoru-remonts': { lv: 'datoru-remonts', ru: 'remont-noutbukov' },
  'dyson-remonts': { lv: 'dyson-remonts', ru: 'remont-dyson' },
  'fotoaparatu-remonts': { lv: 'fotoaparatu-remonts', ru: 'remont-fotoapparatov' },
});

const key = (value) => String(value ?? '').trim().toLocaleLowerCase();

export function isSafeServicePath(path) {
  if (typeof path !== 'string' || !path.startsWith('/') || path.startsWith('//') || path.endsWith('/') || /[?#\\%:\s]/.test(path)) return false;
  if (path === '/') return true;
  const segments = path.slice(1).split('/');
  if (segments.length > 4 || segments.some((segment) => !SAFE_SEGMENT.test(segment))) return false;
  return !(segments[0] === 'shop' || (segments[0] === 'ru' && segments[1] === 'shop'));
}

function safeLocalePath(path, locale) {
  if (!isSafeServicePath(path)) return false;
  if (locale === 'lv') return path !== '/ru' && !path.startsWith('/ru/');
  return path === '/ru' || path.startsWith('/ru/');
}

function localizedCategorySlug(categoryKey, locale) {
  return CATEGORY_SLUGS[categoryKey]?.[locale] || categoryKey;
}

function categoryPaths(categoryKey) {
  return {
    lv: `/${localizedCategorySlug(categoryKey, 'lv')}`,
    ru: `/ru/${localizedCategorySlug(categoryKey, 'ru')}`,
  };
}

function brandPaths(categoryKey, brandKey) {
  return {
    lv: `/${localizedCategorySlug(categoryKey, 'lv')}/${brandKey}`,
    ru: `/ru/${localizedCategorySlug(categoryKey, 'ru')}/${brandKey}`,
  };
}

function devicePaths(categoryKey, brandKey, slug) {
  const isIphone = categoryKey === 'telefonu-remonts' && brandKey === 'apple';
  const routeCategory = isIphone ? 'iphone-remonts' : categoryKey;
  const base = categoryPaths(routeCategory);
  return {
    lv: `${base.lv}/${isIphone ? '' : `${brandKey}/`}${slug}`,
    ru: `${base.ru}/${isIphone ? '' : `${brandKey}/`}${slug}`,
  };
}

function normalizedPaths(value, generatedPaths = {}) {
  const oldPath = typeof value.path === 'string' ? value.path : undefined;
  if (value.paths !== undefined && (!value.paths || typeof value.paths !== 'object' || Array.isArray(value.paths))) return null;
  if (oldPath !== undefined && !safeLocalePath(oldPath, 'lv')) return null;
  const supplied = value.paths || {};
  const lv = supplied.lv ?? oldPath ?? generatedPaths.lv;
  const ru = supplied.ru ?? generatedPaths.ru;
  if (lv !== undefined && !safeLocalePath(lv, 'lv')) return null;
  if (ru !== undefined && !safeLocalePath(ru, 'ru')) return null;
  if (!lv && !ru) return null;
  return { ...(lv ? { lv } : {}), ...(ru ? { ru } : {}) };
}

export function normalizeServiceLink(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (value.type === 'home') {
    const path = value.path;
    if (path !== undefined && path !== '/' && path !== '/ru') return null;
    if (value.paths !== undefined && (!value.paths || typeof value.paths !== 'object' || Array.isArray(value.paths)
      || (value.paths.lv !== undefined && value.paths.lv !== '/')
      || (value.paths.ru !== undefined && value.paths.ru !== '/ru'))) return null;
    return SERVICE_HOME_LINK;
  }
  if (value.type === 'category' && typeof value.categoryKey === 'string' && SAFE_SEGMENT.test(value.categoryKey)) {
    const paths = normalizedPaths(value, categoryPaths(value.categoryKey));
    return paths ? { type: 'category', categoryKey: value.categoryKey, paths } : null;
  }
  if (value.type === 'brand' && typeof value.categoryKey === 'string' && SAFE_SEGMENT.test(value.categoryKey) && typeof value.brandKey === 'string' && SAFE_SEGMENT.test(value.brandKey)) {
    const paths = normalizedPaths(value, brandPaths(value.categoryKey, value.brandKey));
    return paths ? { type: 'brand', categoryKey: value.categoryKey, brandKey: value.brandKey, paths } : null;
  }
  if (value.type === 'device' && typeof value.targetId === 'string' && SAFE_TARGET_ID.test(value.targetId)) {
    const generated = typeof value.categoryKey === 'string' && SAFE_SEGMENT.test(value.categoryKey) && typeof value.brandKey === 'string' && SAFE_SEGMENT.test(value.brandKey)
      ? devicePaths(value.categoryKey, value.brandKey, key(value.slug || value.targetId))
      : {};
    const paths = normalizedPaths(value, generated);
    return paths ? { type: 'device', targetId: value.targetId, paths } : null;
  }
  return null;
}

export function servicePathForLocale(value, locale = 'lv') {
  const preferred = locale === 'ru' ? 'ru' : 'lv';
  const link = normalizeServiceLink(value);
  if (!link) return preferred === 'ru' ? '/ru' : '/';
  return link.paths[preferred] || link.paths.lv || (preferred === 'ru' ? '/ru' : '/');
}

export function normalizedText(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const routeKey = (link) => {
  if (!link) return '';
  if (link.type === 'home') return 'home';
  if (link.type === 'category') return `category|${link.categoryKey}`;
  if (link.type === 'brand') return `brand|${link.categoryKey}|${link.brandKey}`;
  if (link.type === 'device') return `device|${link.targetId}`;
  return '';
};

export function serviceLinkKey(value) {
  return routeKey(normalizeServiceLink(value));
}

const localizedLabel = (name) => name || 'Service destination';

// Mirrors iLab's localizedPath.js, routeI18n.js, routeTranslations.js and
// sitemap.js: RU translates the category slug and adds /ru; brand/device
// slugs stay canonical. Apple phones use the dedicated iPhone hub.
export function buildServiceTargets(categories = [], devices = []) {
  const categoryTargets = [];
  const brandTargets = [];
  const categoryByKey = new Map();
  for (const category of categories) {
    const categoryKey = key(category.slug || category.id);
    if (!SAFE_SEGMENT.test(categoryKey)) continue;
    const paths = categoryPaths(categoryKey);
    const option = { id: `category:${categoryKey}`, name: category.name || category.labels?.lv || categoryKey, type: 'category', categoryKey, path: paths.lv, paths, description: `Category / hub · LV ${paths.lv} · RU ${paths.ru}` };
    categoryTargets.push(option);
    categoryByKey.set(categoryKey, category);
    for (const brand of Array.isArray(category.brands) ? category.brands : []) {
      const brandKey = key(brand.key || brand.slug || brand.brandKey);
      if (!SAFE_SEGMENT.test(brandKey)) continue;
      let target = { type: 'brand', categoryKey, brandKey, paths: brandPaths(categoryKey, brandKey) };
      if (brand?.route?.preferDedicatedHub && brand?.route?.dedicatedHubPath) {
        const hubKey = key(String(brand.route.dedicatedHubPath).split('/').filter(Boolean)[0]);
        if (!SAFE_SEGMENT.test(hubKey)) continue;
        target = { type: 'category', categoryKey: hubKey, paths: categoryPaths(hubKey) };
      }
      const name = brand.name || brand.labels?.lv || brandKey;
      brandTargets.push({ id: `brand:${categoryKey}:${brandKey}`, name: `${name} repair`, ...target, path: target.paths.lv, description: `${target.type === 'category' ? 'Dedicated hub' : 'Brand'} · ${category.name || categoryKey} · LV ${target.paths.lv} · RU ${target.paths.ru}` });
    }
  }
  const deviceTargets = [];
  for (const device of devices) {
    const categoryKey = key(device.categoryKey), brandKey = key(device.brandKey), slug = key(device.slug || device.id);
    if (!SAFE_SEGMENT.test(categoryKey) || !SAFE_SEGMENT.test(brandKey) || !SAFE_SEGMENT.test(slug)) continue;
    const documentId = String(device.id ?? '');
    const targetId = SAFE_TARGET_ID.test(documentId) ? documentId : slug;
    const paths = devicePaths(categoryKey, brandKey, slug);
    const category = categoryByKey.get(categoryKey);
    const brand = (category?.brands || []).find((item) => key(item.key || item.slug || item.brandKey) === brandKey);
    const name = device.name || slug;
    deviceTargets.push({ id: `device:${targetId}`, name, slug, targetId, type: 'device', categoryKey, brandKey, path: paths.lv, paths, description: `${brand?.name || brand?.labels?.lv || brandKey} · ${category?.name || categoryKey}${device.year ? ` · ${device.year}` : ''} · LV ${paths.lv} · RU ${paths.ru}`, searchText: `${name} ${slug} ${category?.name || categoryKey} ${brand?.name || brandKey}` });
  }
  return { categoryTargets, brandTargets, deviceTargets, allTargets: [...categoryTargets, ...brandTargets] };
}

export function serviceLinkFromTarget(target) {
  if (!target) return null;
  if (target.type === 'device') return normalizeServiceLink({ type: 'device', targetId: target.targetId, paths: target.paths });
  if (target.type === 'brand') return normalizeServiceLink({ type: 'brand', categoryKey: target.categoryKey, brandKey: target.brandKey, paths: target.paths });
  if (target.type === 'category') return normalizeServiceLink({ type: 'category', categoryKey: target.categoryKey, paths: target.paths });
  if (target.type === 'home') return SERVICE_HOME_LINK;
  return null;
}

export function resolveShopServiceLink({ model, brand } = {}) {
  const modelLink = normalizeServiceLink(model?.serviceLink);
  if (modelLink?.type === 'device') return { serviceLink: modelLink, source: 'model' };
  const brandLink = normalizeServiceLink(brand?.serviceLink);
  if (brandLink && brandLink.type !== 'device') return { serviceLink: brandLink, source: brandLink.type === 'home' ? 'home' : 'brand' };
  return { serviceLink: SERVICE_HOME_LINK, source: 'home' };
}

export function resolveProductServiceLinks(modelIds, devices) {
  const byId = new Map((Array.isArray(devices) ? devices : []).map((device) => [device.id, device]));
  const links = [];
  const seen = new Set();
  for (const modelId of Array.isArray(modelIds) ? modelIds : []) {
    const model = byId.get(modelId);
    if (!model || model.type !== 'model' || (model.status && model.status !== 'active')) continue;
    const series = byId.get(model.parentId);
    const brand = series?.type === 'series' && (!series.status || series.status === 'active') ? byId.get(series.parentId) : null;
    if (!brand || brand.type !== 'brand' || (brand.status && brand.status !== 'active')) continue;
    const resolved = resolveShopServiceLink({ model, brand });
    const identity = serviceLinkKey(resolved.serviceLink);
    if (seen.has(identity)) continue;
    seen.add(identity);
    links.push({
      serviceLink: resolved.serviceLink,
      source: resolved.source,
      modelName: model.name || '',
      brandName: brand.name || '',
      label: resolved.source === 'model' ? `${model.name || 'Device'} repair` : resolved.serviceLink.type === 'home' ? 'Visit iLab repair service' : `${brand.name || 'Device'} repair`,
    });
  }
  if (links.length) return links;
  return [{ serviceLink: SERVICE_HOME_LINK, source: 'home', modelName: '', brandName: '' }];
}
