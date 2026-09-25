import ProductsManager from './ProductsManager';

export default async function ProductsPage({ searchParams }) {
  const params = await searchParams;
  const initialQuery = {
    search: typeof params.search === 'string' ? params.search : '',
    productType: typeof params.productType === 'string' ? params.productType : '',
    brand: typeof params.brand === 'string' ? params.brand : '',
    series: typeof params.series === 'string' ? params.series : '',
    model: typeof params.model === 'string' ? params.model : '',
    sort: typeof params.sort === 'string' ? params.sort : 'default',
    page: Number.isInteger(Number(params.page)) && Number(params.page) > 0 ? Number(params.page) : 1,
  };
  return <ProductsManager initialQuery={initialQuery} />;
}
