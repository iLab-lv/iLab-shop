import { SERVICE_HOME_LINK, buildServiceTargets, normalizeServiceLink, normalizedText, serviceLinkFromTarget, serviceLinkKey } from './shopServiceLinks.mjs';

const key = (value) => String(value ?? '').trim().toLocaleLowerCase();

export function serviceLinksEqual(stored, expected) {
  const left = normalizeServiceLink(stored);
  const right = normalizeServiceLink(expected);
  return Boolean(left && right && !Object.hasOwn(stored || {}, 'path')
    && serviceLinkKey(left) === serviceLinkKey(right)
    && left.paths.lv === right.paths.lv
    && left.paths.ru === right.paths.ru);
}

function matchBrand(brand, categories, targets, shopDevices, serviceDevices) {
  const shopName = normalizedText(brand.name);
  const shopSlug = key(brand.slug);
  if (shopSlug === 'iphone' || shopName === 'iphone') {
    for (const category of categories) {
      const apple = (category.brands || []).find((entry) => key(entry.key || entry.slug) === 'apple' && entry.route?.preferDedicatedHub && entry.route?.dedicatedHubPath);
      if (apple) {
        const hubKey = key(String(apple.route.dedicatedHubPath).split('/').filter(Boolean)[0]);
        const target = targets.categoryTargets.find((entry) => entry.categoryKey === hubKey);
        if (target) return { serviceLink: serviceLinkFromTarget(target), source: 'hub' };
      }
    }
  }

  const brandCandidates = [];
  for (const category of categories) {
    const categoryKey = key(category.slug || category.id);
    for (const entry of Array.isArray(category.brands) ? category.brands : []) {
      const targetKey = key(entry.key || entry.slug || entry.brandKey);
      const targetName = normalizedText(entry.name || entry.labels?.lv || targetKey);
      if ((shopSlug && shopSlug === targetKey) || (shopName && shopName === targetName)) {
        const target = targets.allTargets.find((option) => option.id === `brand:${categoryKey}:${targetKey}`);
        if (target) brandCandidates.push(target);
      }
    }
  }
  if (brandCandidates.length === 1) return { serviceLink: serviceLinkFromTarget(brandCandidates[0]), source: brandCandidates[0].type === 'category' ? 'hub' : 'brand' };
  if (brandCandidates.length > 1) {
    const seriesIds = new Set(shopDevices.filter((item) => item.type === 'series' && item.parentId === brand.id).map((item) => item.id));
    const shopModels = shopDevices.filter((item) => item.type === 'model' && seriesIds.has(item.parentId));
    const related = new Set();
    for (const model of shopModels) {
      const slugMatches = serviceDevices.filter((item) => key(item.slug || item.id) === key(model.slug));
      const nameMatches = slugMatches.length ? slugMatches : serviceDevices.filter((item) => normalizedText(item.name) === normalizedText(model.name));
      for (const device of nameMatches) related.add(`${key(device.categoryKey)}:${key(device.brandKey)}`);
    }
    const contextual = brandCandidates.filter((candidate) => related.has(`${key(candidate.id.split(':')[1])}:${key(candidate.id.split(':')[2])}`));
    if (contextual.length === 1) return { serviceLink: serviceLinkFromTarget(contextual[0]), source: contextual[0].type === 'category' ? 'hub' : 'brand' };
    const shopSeriesIds = new Set(shopDevices.filter((item) => item.type === 'series' && item.parentId === brand.id).map((item) => item.id));
    const brandModels = shopDevices.filter((item) => item.type === 'model' && shopSeriesIds.has(item.parentId));
    if (shopSlug === 'samsung' && brandModels.length > 0 && brandModels.every((item) => normalizedText(item.name).startsWith('samsung galaxy') && !normalizedText(item.name).includes('tab'))) {
      const phoneTarget = brandCandidates.find((item) => item.id === 'brand:telefonu-remonts:samsung');
      if (phoneTarget) return { serviceLink: serviceLinkFromTarget(phoneTarget), source: 'brand' };
    }
    return { serviceLink: SERVICE_HOME_LINK, source: 'home', ambiguous: brandCandidates.map((item) => ({ name: item.name, path: item.paths.lv })) };
  }

  const categoryCandidates = categories.filter((category) => {
    const slug = key(category.slug || category.id);
    return (shopSlug && slug === shopSlug) || (shopName && normalizedText(category.name || category.labels?.lv || slug) === shopName);
  });
  if (categoryCandidates.length === 1) {
    const categoryKey = key(categoryCandidates[0].slug || categoryCandidates[0].id);
    const target = targets.categoryTargets.find((entry) => entry.categoryKey === categoryKey);
    if (target) return { serviceLink: serviceLinkFromTarget(target), source: 'hub' };
  }
  return { serviceLink: SERVICE_HOME_LINK, source: 'home', ...(categoryCandidates.length > 1 ? { ambiguous: categoryCandidates.map((item) => ({ name: item.name || item.slug, path: `/${item.slug || item.id}` })) } : {}) };
}

function matchModel(model, devices) {
  const slugMatches = devices.filter((device) => key(device.slug || device.id) === key(model.slug));
  if (slugMatches.length === 1) return { device: slugMatches[0], source: 'slug' };
  if (slugMatches.length > 1) return { ambiguous: slugMatches };
  const name = normalizedText(model.name);
  const nameMatches = devices.filter((device) => normalizedText(device.name) === name);
  if (nameMatches.length === 1) return { device: nameMatches[0], source: 'name' };
  if (nameMatches.length > 1) return { ambiguous: nameMatches };
  return { device: null, source: 'unmatched' };
}

export function planServiceLinkBackfill(shopDevices = [], categories = [], serviceDevices = []) {
  const targets = buildServiceTargets(categories, serviceDevices);
  const byId = new Map(shopDevices.map((item) => [item.id, item]));
  const brands = shopDevices.filter((item) => item.type === 'brand');
  const series = shopDevices.filter((item) => item.type === 'series');
  const models = shopDevices.filter((item) => item.type === 'model');
  const brandLinks = new Map();
  const modelLinks = new Map();
  const modelClears = new Set();
  const report = {
    brands: { total: brands.length, upgraded: 0, hub: 0, brand: 0, home: 0, alreadyCorrect: 0, unresolved: 0, homeUpgraded: 0 },
    models: { total: models.length, upgraded: 0, slug: 0, name: 0, existing: 0, alreadyCorrect: 0, unmatched: 0, unresolved: 0 },
    ambiguous: [],
  };

  for (const brand of brands) {
    const raw = brand.serviceLink;
    const saved = normalizeServiceLink(raw);
    let result;
    if (saved?.type === 'home') result = { serviceLink: SERVICE_HOME_LINK, source: 'home' };
    else if (saved && saved.type !== 'device') {
      const target = targets.allTargets.find((entry) => serviceLinkKey(serviceLinkFromTarget(entry)) === serviceLinkKey(saved));
      result = target ? { serviceLink: serviceLinkFromTarget(target), source: target.type === 'category' ? 'hub' : 'brand' } : matchBrand(brand, categories, targets, shopDevices, serviceDevices);
    } else result = matchBrand(brand, categories, targets, shopDevices, serviceDevices);
    const serviceLink = result.serviceLink || SERVICE_HOME_LINK;
    brandLinks.set(brand.id, serviceLink);
    if (serviceLink.type === 'home') report.brands.home += 1;
    else if (serviceLink.type === 'category') report.brands.hub += 1;
    else report.brands.brand += 1;
    if (serviceLinksEqual(raw, serviceLink)) report.brands.alreadyCorrect += 1;
    else {
      report.brands.upgraded += 1;
      if (serviceLink.type === 'home') report.brands.homeUpgraded += 1;
    }
    if (result.ambiguous?.length) {
      report.brands.unresolved += 1;
      report.ambiguous.push({ type: 'brand', name: brand.name, candidates: result.ambiguous });
    }
  }

  for (const model of models) {
    const raw = model.serviceLink;
    const saved = normalizeServiceLink(raw);
    let match;
    let ambiguous = false;
    if (saved?.type === 'device') {
      const target = targets.deviceTargets.find((entry) => key(entry.targetId) === key(saved.targetId) || key(entry.slug) === key(saved.targetId));
      match = target ? { target, source: 'existing' } : null;
    }
    if (!match) {
      const found = matchModel(model, serviceDevices);
      if (found.device) {
        const slug = key(found.device.slug || found.device.id);
        const target = targets.deviceTargets.find((entry) => key(entry.targetId) === key(found.device.id) || key(entry.slug) === slug);
        if (target) match = { target, source: found.source };
      }
      if (found.ambiguous?.length) {
        ambiguous = true;
        report.ambiguous.push({ type: 'model', name: model.name, candidates: found.ambiguous.map((item) => ({ name: item.name, slug: item.slug || item.id })) });
      }
    }
    const seriesItem = byId.get(model.parentId);
    const parentBrand = seriesItem?.type === 'series' ? byId.get(seriesItem.parentId) : null;
    if (!match || !parentBrand || parentBrand.type !== 'brand') {
      report.models.unmatched += 1;
      if (ambiguous || (saved?.type === 'device' && !match)) report.models.unresolved += 1;
      if (raw) modelClears.add(model.id);
      if (match && (!parentBrand || parentBrand.type !== 'brand')) report.models.unresolved += 1;
      continue;
    }
    const serviceLink = serviceLinkFromTarget(match.target);
    modelLinks.set(model.id, serviceLink);
    if (match.source === 'existing') report.models.existing += 1;
    else report.models[match.source] += 1;
    if (serviceLinksEqual(raw, serviceLink)) report.models.alreadyCorrect += 1;
    else report.models.upgraded += 1;
  }

  return { brandLinks, modelLinks, modelClears, report, seriesIds: series.map((item) => item.id) };
}
