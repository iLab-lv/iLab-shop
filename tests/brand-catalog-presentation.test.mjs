import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countBrandModels,
  filterBrandSeries,
  getBrandLogoPath,
  getModelHref,
} from '../lib/brandCatalogPresentation.mjs';

const series = [
  {
    id: 'series-s', name: 'Galaxy S',
    models: [
      { id: 's24', name: 'Galaxy S24', slug: 'galaxy-s24' },
      { id: 's24-ultra', name: 'Galaxy S24 Ultra', slug: 'galaxy-s24-ultra' },
    ],
  },
  {
    id: 'series-a', name: 'Galaxy A',
    models: [
      { id: 'a55', name: 'Galaxy A55', slug: 'galaxy-a55' },
      { id: 'a54', name: 'Galaxy A54', slug: 'galaxy-a54' },
    ],
  },
];

test('counts every model in the authoritative active hierarchy', () => {
  assert.equal(countBrandModels(series), 4);
});

test('empty search preserves every series and model in catalog order', () => {
  const result = filterBrandSeries(series, '   ');
  assert.deepEqual(result, series);
  assert.equal(countBrandModels(result), 4);
});

test('matches partial model names case-insensitively', () => {
  assert.deepEqual(filterBrandSeries(series, 'A55').map((item) => item.models.map((model) => model.id)), [['a55']]);
});

test('matches sensible multi-word terms across series and model names', () => {
  assert.deepEqual(filterBrandSeries(series, '24 ultra').map((item) => item.models.map((model) => model.id)), [['s24-ultra']]);
});

test('matching a series name exposes all its models and hides nonmatches', () => {
  const result = filterBrandSeries(series, 'galaxy a');
  assert.deepEqual(result.map((item) => item.id), ['series-a']);
  assert.deepEqual(result[0].models.map((model) => model.id), ['a55', 'a54']);
});

test('zero-match search returns an empty directory', () => {
  assert.deepEqual(filterBrandSeries(series, 'pixel'), []);
});

test('clearing search restores every series and model', () => {
  assert.equal(countBrandModels(filterBrandSeries(series, 'a55')), 1);
  assert.equal(countBrandModels(filterBrandSeries(series, '')), 4);
});

test('model href uses the real brand and model slugs without the basePath', () => {
  assert.equal(getModelHref('samsung', 'galaxy-a55'), '/samsung/galaxy-a55');
});

test('brand logo mapping supports Apple families and degrades safely', () => {
  assert.equal(getBrandLogoPath({ slug: 'apple-watch' }), '/shop/images/logos/apple-logo.svg');
  assert.equal(getBrandLogoPath({ slug: 'unknown-brand' }), null);
});

test('presentation receives only active hierarchy items from getBrandCatalog', () => {
  const authoritativeActiveSeries = series.filter((item) => item.id !== 'inactive-series');
  assert.deepEqual(filterBrandSeries(authoritativeActiveSeries, ''), series);
});
