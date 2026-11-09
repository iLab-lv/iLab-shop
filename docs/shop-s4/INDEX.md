# S4 — Technical SEO and sitemap reliability

## Sitemap and build reliability

The previous build failure was caused by `app/sitemap.js` exporting `revalidate = 3600` while its first generation called `getShopSitemapData()` in Firestore. Next attempted sitemap prerendering during `next build`; the restricted runner denied the outbound Firestore connection (`connect EACCES`). This established an environment network restriction, not invalid Firebase credentials.

The Shop sitemap is now a dynamic Node route at `app/sitemap.xml/route.js`. It is generated on request, so build/prerender does not read Firestore. Its narrow collection reads are cached in-process for one hour; successful responses use one-hour shared caching with a 24-hour stale-while-revalidate window. If Firestore fails, an existing instance cache may serve stale data for up to 24 hours with `no-store`; if no safe cache exists, the route returns `503`, `Retry-After: 300`, and no-store instead of an empty sitemap. Empty/unusable catalog results are treated as unavailable. URLs split into sitemap-index sections at 50,000 entries using `?part=N`.

The public endpoint is **`https://ilab.lv/shop/sitemap.xml`**. The Service app's existing rewrites were verified: `/shop` and `/shop/:path*` proxy to the Shop deployment with its `/shop` base path. The Service root `robots.txt` still advertises only its own sitemap; adding the Shop sitemap is a separate Service change in [SERVICE_INTEGRATION.md](SERVICE_INTEGRATION.md).

## Canonicals, metadata, and localization

`lib/shopSeo.mjs` produces absolute canonicals from `https://ilab.lv` and adds exactly one `/shop` prefix. Home, Brand, Model, and Product routes receive route-specific title, description, canonical and Open Graph URL metadata. Stored Brand/Product title and description overrides remain honored. Home filter states (`type`, `device`, `model`, `cursor`) are canonicalized to `/shop` and marked `noindex,follow`; their functional URLs remain unchanged.

The Shop has no locale-prefixed public routes and remains English-only. `serviceLocale=lv|ru` is navigation context for Service links, not an indexed Shop translation. No `hreflang` or `x-default` alternates are emitted. Account and Checkout metadata is noindex; Admin already had noindex metadata. API paths receive `X-Robots-Tag: noindex, nofollow`. These indexing controls do not replace authentication or authorization.

## Structured data

Product pages emit server-rendered `Product` JSON-LD from actual product name, description, SKU, canonical URL, and absolute HTTPS image URLs if the catalog contains them. `Offer` appears only for a valid positive Retail price; it reports EUR and stock availability only when the stock value is known. Missing/invalid prices do not produce an Offer; ratings, discounts, manufacturer/brand, condition, shipping and return terms are not invented. Existing image fields are Firebase Storage paths resolved client-side, not stable public URLs, so they are omitted from JSON-LD unless an absolute URL is present.

The shared visible `Breadcrumbs` component now optionally emits matching `BreadcrumbList` JSON-LD on Brand, Model and Product pages. The actual product route is independent of Model, so its breadcrumb uses the primary compatible Brand when available rather than inventing a Model parent. Service already owns the `https://ilab.lv#organization` and `#website` declarations; Shop adds no competing Organization/WebSite schema. No SearchAction is emitted because Search has no public search-results route.

## Verification and remaining work

All 291 repository tests pass, including sitemap, canonical, Product/Breadcrumb schema, indexing-header and password-recovery coverage; lint passes. Production build succeeds and outputs `/sitemap.xml` as a dynamic route, without a sitemap prerender Firestore dependency. Global `git diff --check` reports seven pre-existing trailing blank-line errors in unrelated S3D/commerce files; none are in the S4 edits. Browser/proxy and hosted Firestore checks were not available; no production data or settings were changed.

Before release, apply the Service robots discovery handoff, then verify the public Shop sitemap through `https://ilab.lv/shop/sitemap.xml`, its sitemap index/part URLs if split, and canonical metadata on representative Home/Brand/Model/Product pages. Validate rendered Product JSON-LD with Google's Rich Results Test after deployment. The existing Service root sitemap and Shop sitemap have distinct URL scopes; confirm the deployed Service sitemap does not include `/shop` URLs before submitting both.
