'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  buildAdminDeviceHierarchy,
  countAdminDevices,
  searchAdminDeviceHierarchy,
} from '../../../lib/adminDeviceTree.mjs';
import styles from './catalog.module.css';

const API_ENDPOINT = '/shop/api/admin/devices';

function StatusBadge({ status }) {
  return <span className={`${styles.status} ${status === 'active' ? styles.statusActive : styles.statusInactive}`}>{status}</span>;
}

function DeviceMeta({ device }) {
  return <span className={styles.deviceMeta}>{device.id}{device.slug ? ` · ${device.slug}` : ''}</span>;
}

export default function DevicesSection() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [requestVersion, setRequestVersion] = useState(0);
  const [search, setSearch] = useState('');
  const [expandedBrands, setExpandedBrands] = useState(() => new Set());
  const [expandedSeries, setExpandedSeries] = useState(() => new Set());
  const [searchExpansion, setSearchExpansion] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch(API_ENDPOINT, { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Unable to load devices.');
        setDevices(Array.isArray(body.devices) ? body.devices : []);
        setError('');
      })
      .catch((requestError) => {
        if (requestError.name !== 'AbortError') setError('Unable to load devices.');
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [requestVersion]);

  const hierarchy = useMemo(() => buildAdminDeviceHierarchy(devices), [devices]);
  const counts = useMemo(() => countAdminDevices(devices), [devices]);
  const visibleTree = useMemo(
    () => searchAdminDeviceHierarchy(hierarchy.tree, search),
    [hierarchy.tree, search]
  );
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const defaultSearchBrands = useMemo(() => new Set(visibleTree.map((brand) => brand.device.id)), [visibleTree]);
  const defaultSearchSeries = useMemo(
    () => new Set(visibleTree.flatMap((brand) => brand.series.map((item) => item.device.id))),
    [visibleTree]
  );
  const activeBrands = normalizedSearch
    ? searchExpansion?.query === normalizedSearch ? searchExpansion.brands : defaultSearchBrands
    : expandedBrands;
  const activeSeries = normalizedSearch
    ? searchExpansion?.query === normalizedSearch ? searchExpansion.series : defaultSearchSeries
    : expandedSeries;

  function updateExpansion(kind, updater) {
    if (normalizedSearch) {
      setSearchExpansion((current) => {
        const brands = current?.query === normalizedSearch ? current.brands : defaultSearchBrands;
        const series = current?.query === normalizedSearch ? current.series : defaultSearchSeries;
        return { query: normalizedSearch, brands: kind === 'brands' ? updater(brands) : brands, series: kind === 'series' ? updater(series) : series };
      });
    } else if (kind === 'brands') setExpandedBrands(updater);
    else setExpandedSeries(updater);
  }

  function toggle(kind, id) {
    updateExpansion(kind, (current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function expandAll() {
    const brands = new Set(visibleTree.map((brand) => brand.device.id));
    const series = new Set(visibleTree.flatMap((brand) => brand.series.map((item) => item.device.id)));
    if (normalizedSearch) setSearchExpansion({ query: normalizedSearch, brands, series });
    else {
      setExpandedBrands(brands);
      setExpandedSeries(series);
    }
  }

  function collapseAll() {
    if (normalizedSearch) setSearchExpansion({ query: normalizedSearch, brands: new Set(), series: new Set() });
    else {
      setExpandedBrands(new Set());
      setExpandedSeries(new Set());
    }
  }

  function retry() {
    setLoading(true);
    setError('');
    setRequestVersion((version) => version + 1);
  }

  return (
    <section className={styles.section} aria-labelledby="devices-heading">
      <div className={styles.sectionHeader}>
        <div>
          <h2 id="devices-heading">Devices</h2>
          <p>{loading ? 'Loading devices…' : `${counts.brands} brands · ${counts.series} series · ${counts.models} models`}</p>
        </div>
      </div>

      <div className={styles.controls}>
        <label className={styles.searchField}>
          <span>Search</span>
          <input type="search" value={search} placeholder="Search by name, ID, or slug…"
            disabled={loading} onChange={(event) => setSearch(event.target.value)} />
        </label>
        <div className={styles.treeActions}>
          <button type="button" disabled={loading || visibleTree.length === 0} onClick={expandAll}>Expand all</button>
          <button type="button" disabled={loading || visibleTree.length === 0} onClick={collapseAll}>Collapse all</button>
        </div>
      </div>

      {error ? <div className={styles.error} role="alert"><p>Unable to load devices.</p><button type="button" onClick={retry}>Retry</button></div> : null}
      {!error && loading ? <div className={styles.state} aria-live="polite">Loading devices…</div> : null}
      {!error && !loading && devices.length === 0 ? <div className={styles.state}>No devices exist.</div> : null}
      {!error && !loading && devices.length > 0 && visibleTree.length === 0 ? <div className={styles.state}>No devices match your search.</div> : null}

      {!error && !loading && visibleTree.length > 0 ? (
        <div className={styles.tree} role="tree" aria-label="Device hierarchy">
          {visibleTree.map((brand) => {
            const brandOpen = activeBrands.has(brand.device.id);
            return <div className={styles.brandGroup} key={brand.device.id} role="treeitem" aria-expanded={brandOpen} aria-selected="false">
              <div className={styles.brandRow}>
                <button className={styles.toggle} type="button" aria-expanded={brandOpen}
                  aria-controls={`brand-${brand.device.id}`} onClick={() => toggle('brands', brand.device.id)}>
                  <span aria-hidden="true">{brandOpen ? '▾' : '▸'}</span><span className={styles.srOnly}>{brandOpen ? 'Collapse' : 'Expand'} {brand.device.name}</span>
                </button>
                <div className={styles.identity}><strong>{brand.device.name || brand.device.id}</strong><DeviceMeta device={brand.device} /></div>
                <span className={styles.count}>{brand.series.length} series · {brand.modelCount} models</span>
                <StatusBadge status={brand.device.status} />
              </div>
              {brandOpen ? <div className={styles.seriesList} id={`brand-${brand.device.id}`} role="group">
                {brand.series.length ? brand.series.map((item) => {
                  const seriesOpen = activeSeries.has(item.device.id);
                  return <div className={styles.seriesGroup} key={item.device.id} role="treeitem" aria-expanded={seriesOpen} aria-selected="false">
                    <div className={styles.seriesRow}>
                      <button className={styles.toggle} type="button" aria-expanded={seriesOpen}
                        aria-controls={`series-${item.device.id}`} onClick={() => toggle('series', item.device.id)}>
                        <span aria-hidden="true">{seriesOpen ? '▾' : '▸'}</span><span className={styles.srOnly}>{seriesOpen ? 'Collapse' : 'Expand'} {item.device.name}</span>
                      </button>
                      <div className={styles.identity}><strong>{item.device.name || item.device.id}</strong><DeviceMeta device={item.device} /></div>
                      <span className={styles.count}>{item.models.length} models</span>
                      <StatusBadge status={item.device.status} />
                    </div>
                    {seriesOpen ? <div className={styles.modelList} id={`series-${item.device.id}`} role="group">
                      {item.models.length ? item.models.map((model) => <div className={styles.modelRow} key={model.id} role="treeitem" aria-selected="false">
                        <span className={styles.modelMarker} aria-hidden="true" />
                        <div className={styles.identity}><strong>{model.name || model.id}</strong><DeviceMeta device={model} /></div>
                        <StatusBadge status={model.status} />
                      </div>) : <p className={styles.noChildren}>No models in this series.</p>}
                    </div> : null}
                  </div>;
                }) : <p className={styles.noChildren}>No series in this brand.</p>}
              </div> : null}
            </div>;
          })}
        </div>
      ) : null}

      {!error && !loading && hierarchy.orphans.length > 0 ? <section className={styles.warning} aria-labelledby="device-warnings">
        <h2 id="device-warnings">Hierarchy warnings</h2>
        <p>{hierarchy.orphans.length} device {hierarchy.orphans.length === 1 ? 'document is' : 'documents are'} outside the valid hierarchy. Firestore was not modified.</p>
        <ul>{hierarchy.orphans.map(({ device, reason }) => <li key={device.id}><strong>{device.name || device.id}</strong><span>{device.id} · {device.type || 'unknown type'} · {reason}</span></li>)}</ul>
      </section> : null}
    </section>
  );
}
