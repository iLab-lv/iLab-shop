# SEO, localization and separate-app integration

2026-11-09. Repository identities and audit boundaries are recorded in ARCHITECTURE_AND_REUSE.md. Service remained read-only. Safe deployed requests used no credentials, order POSTs or payment actions. The separate repositories and `/shop` reverse-proxy deployment are intentional.

## Current source contract

| Area | Current implementation | Assessment |
| --- | --- | --- |
| Mount | Shop `next.config.mjs:3`: `basePath:'/shop'` | Next Link/router use internal paths; browser APIs/assets explicitly use mounted paths. No double-prefix defect found in inspected public flows. |
| Proxy | `Service:next.config.mjs:525-539`: beforeFiles `/shop` and `/shop/:path*` -> `https://i-lab-shop.vercel.app/shop...` | The earlier origin remains current local configuration. Keep separate deployments. |
| Middleware | `Service:middleware.js:82-96` excludes Shop prefix from matcher | Shop requests bypass Service locale/Ads routing. No Ads routing change is proposed. |
| Canonical authority | `lib/shopSeo.mjs:1-24`: fixed `https://ilab.lv/shop` | Correct public domain, not request host or Vercel origin. Home filter states canonicalize to unfiltered home and noindex selected query states. |
| Page metadata | Home/Brand/Model/Product generateMetadata; Brand/Product manual SEO fields with fallbacks | Current local production browser emits correct home/Brand/Model/Product canonicals. Shared helper owns OG title/description/url/siteName. No social image is configured by that helper. |
| Private pages | Account/Checkout metadata noindex; Admin layout noindex/nofollow; `/api/:path*` config adds X-Robots-Tag | Current local unauthenticated Admin and owner-recovery GETs return 401, private/no-store and noindex/nofollow header. No private content was inspected. |
| Breadcrumbs | `Breadcrumbs.js`; `shopSeo.mjs:56-70` | Brand/Model/Product emit canonical BreadcrumbList. Account root duplication belongs to AR-02. |
| Product schema | `shopSeo.mjs:26-53` | Retail EUR offer only for positive safe-integer retail cents; stock availability only when known. Unpriced Products do not emit a fictitious €0 Offer. Wholesale/account state is not used in public schema. |
| Images/brand schema | Only absolute HTTPS `imagePaths` retained; no brand parameter used | SI-03: stored Storage paths do not become Product image URLs. Compatible device family is not necessarily product manufacturer; do not synthesize brand from compatibility. |
| Sitemap | `app/sitemap.xml/route.js`; `shopSitemapResponse.mjs`; `shopSitemap.mjs` | Runtime data, active/valid hierarchy, canonical products independent of Model, updatedAt normalization, deduplication, 50k splitting, fresh/stale failure behavior. Filters/Series/private/API routes excluded. |
| Robots owner | `Service:app/robots.js:9-22` | Current source advertises Service and Shop sitemaps. Shop has no independent root robots implementation; public root is Service-owned. |
| Language | `app/layout.js`: English HTML; locked Shop English-only | Missing RU/LV Shop route families and hreflang are intentional. Do not advertise translated Shop equivalents that do not exist. |
| Service destinations | `shopServiceLinks.mjs`, `serviceTargets.js` and stored `serviceLink.paths.lv/ru` | Brand/exact Model identities; Model fallback to Brand/home; Product links derived from modelIds. Avoids parallel Product link state and invalid RU prefixing. |
| Service locale bridge | `serviceLocale.mjs:27-38`, ServiceLocaleProvider | Incoming valid query > cookie > same-origin Service referrer > LV. Cookie path `/`, one year, SameSite=Lax. Removes only serviceLocale while preserving query/hash. English content/cache remains unchanged. |

Service reference adapters are separate, legitimate contracts: `Service:lib/siteSettings.js:54-65` reads `settings/site`, whereas Shop settings read `shopSettings/general`. Service uses LV/RU route/content helpers and shared section adapters; this is a useful pattern, not a reason to import Service modules or merge repositories.

## Deployed read-only evidence

Requests were made during this audit on 2026-11-09. Statuses show the observed deployment, not its Vercel commit or project configuration. URLs are direct evidence targets: [public Shop](https://ilab.lv/shop), [Brand](https://ilab.lv/shop/iphone), [sample Product](https://ilab.lv/shop/product/back-camera-for-iphone-11), [robots](https://ilab.lv/robots.txt), [Shop sitemap](https://ilab.lv/shop/sitemap.xml), [direct origin](https://i-lab-shop.vercel.app/shop).

| Probe | Observed result | Interpretation |
| --- | --- | --- |
| Public `/shop` | 200 HTML, title `iLab Shop | Professional Repair Parts`, private/no-cache/no-store | Proxy home works; no canonical link in returned HTML. Repeated Googlebot request also lacked it. |
| Direct origin `/shop` | 200, same title/assets, no canonical or X-Robots-Tag | Deployed duplicate-host signal is missing. Current local source already points all hosts' canonicals to ilab.lv. |
| Public `/shop/iphone` | 200 HTML, no canonical in returned HTML | Nested Brand refresh works, deployed metadata is behind local source. |
| Public sample Product | 200 HTML, no canonical in returned HTML | Nested Product refresh works; not a certification of every Product. |
| Brand prefetch | GET `/shop/iphone?_rsc=audit` with RSC:1, Next-Router-Prefetch:1, Accept:text/x-component -> 200 `text/x-component` | Representative RSC proxy request retains its response type. Not a complete cross-version navigation/cache certification. |
| Public immutable CSS | `/shop/_next/static/immutable/chunks/0qkl2fw5621om.css` -> 200 text/css, one-year immutable cache | Mounted asset proxy works on the observed deployment. Chunk name is evidence only, not configuration. |
| Public `/shop/sitemap.xml` | 200 application/xml, 744 URL entries, samples all `https://ilab.lv/shop...` | Shop sitemap is reachable and public-domain URLs are correct. Count is total sitemap URLs, **not** a count of imported Products. |
| Root robots | 200, advertises only `https://ilab.lv/sitemap.xml` | Live Service has not yet received current local Shop-sitemap discovery change. |
| Admin Orders unauthenticated GET | 401 JSON `{error:'Authentication is required.'}`, observed cache `public,max-age=0,must-revalidate`, no X-Robots-Tag | Authorization denies the request. Current local route improves response to private/no-store and config supplies noindex. No authenticated data leakage was established. |
| Owner recovery unauthenticated GET to synthetic UUID | 404 HTML | Live endpoint differs from current local route, which returns 401 private/no-store. No real order identifier was used. |

The local isolated production browser rendered canonical URLs for `/shop`, `/shop/iphone`, `/shop/iphone/iphone-18-pro` and `/shop/product/back-camera-for-iphone-11`, plus Product/BreadcrumbList JSON-LD where appropriate. The sample product is unpriced: omission of Offer is correct. The schema omits its Storage-backed image (SI-03).

## Findings

**SI-01 — P1 confirmed deployed gap: production is behind the inspected release candidate.** Evidence: live probe matrix versus `lib/shopSeo.mjs`, `app/api/orders/[orderId]/route.js`, Admin Orders route/config and `Service:app/robots.js`. Scope: public metadata across sampled Shop families, direct hostname, recovery endpoint and Service sitemap discovery. Impact: canonical/duplicate-host ambiguity, incomplete deployment of Checkout recovery safeguards, missing sitemap discovery, weaker denial-response caching. Approach: identify exact Shop/Service deployment commits and env scopes; release the complete approved candidate through Preview and controlled production sequence, then repeat these GETs. Do not implement duplicate SEO fixes already present locally or assume a deploy is authorized by this audit. Effort: S–M release work; Vercel binding/approval required. Deployment blocker: **yes** for certifying the intended release; this is not a defect in current local canonical code and not proof of a broken order transaction.

**SI-02 — P1 confirmed source integration mismatch: Service -> Shop does not carry the selected locale.** `Service:app/(site)/ui/navbar/NavBar.jsx:29` and `HeaderActions.jsx:77` use `Link href='/shop'` without serviceLocale. Shop's established priority (`lib/serviceLocale.mjs:27-31`) intentionally prefers existing cookie over referrer. A visitor with an old LV cookie who switches Service to RU and enters Shop without an explicit parameter keeps LV for return navigation. A Next Link transition also cannot be assumed to update `document.referrer`. Footer legal link (`ShopFooter.js:45`) is fixed LV rather than bridge-aware. Scope: cross-app header transition and footer legal destination, not Shop translations. Approach: separately authorized Service task to use a normal cross-app anchor with `?serviceLocale=lv|ru` for current locale; verify actual localized legal targets before changing them. Keep Shop's existing bridge and routes. Effort: S (plus LV/RU roundtrip browser verification); blocker: **no** security/commerce blocker, recommended pre-release coherence correction. No Service edits were made.

**SI-03 — P2 confirmed image projection gap with performance follow-up.** `lib/shopSeo.mjs:36-39` accepts only absolute HTTPS strings, while `ProductImage.js:16-23` resolves stored Firebase paths client-side. The rendered sample Product schema includes name/url/description/SKU but no image although its page visibly loads an image. Source also returns a raw img without lazy-loading/size hints (`ProductImage.js:38-42`), so each mounted card starts its own getDownloadURL effect; repeated gallery thumbnails may resolve the same image separately. Scope: schema for path-backed images and list/gallery image delivery. Impact: weaker image metadata and avoidable client URL-resolution/image work. Approach: a public-safe image URL projection/cache with explicit dimensions/lazy-loading roles; reuse for JSON-LD without exposing private invoice objects. Do not add Next remote-image domains until using that optimizer, or emit a Storage object path as if it were an absolute image URL. Effort: M; blocker: no. Request count/LCP/bundle savings were not measured and are not claimed.

## Integration boundaries and remaining checks

- Root-domain cookie namespace is `ilab_shop_session` (`lib/auth/sessionAuth.js:8`). Cookie creation/origin resolution is centralized; inspect actual production Secure/HttpOnly/Path and proxy host behavior in an authorized sign-in session before release. No real sign-in or cookie mutation was performed.
- Current source retains no-store permission-sensitive reads and does not reuse Service serializers for commerce. Same Firebase project does not imply identical auth/profile policies or a shared session cookie.
- Browser runtime tests used a local production snapshot, not a Service reverse proxy. Direct deep GETs, one deployed RSC prefetch and one asset were verified; a full LV/RU Service -> Shop -> Product -> Cart -> gated Checkout -> Service roundtrip remains a Preview/release check.
- Product images use Firebase download URLs, while static illustrations use mounted paths/Next Image. The deployed immutable CSS path worked. The image optimizer on the new candidate, all fonts/assets through the production rewrite, and all possible nested route refreshes were not exhaustively tested.
- Query-filter canonical/noindex behavior has unit coverage. Current sitemap tests exercise inactive/invalid records, hierarchy, prices-independent visibility, XML escaping, pagination and stale failure handling. Do not infer exhaustive deployed sitemap crawling from 744 entries.
- Direct origin redirect/noindex policy must not break Service proxy requests. Public canonicalization already exists in current source; verify final deployed signals before adding host-based redirects. No canonical should use the internal Vercel domain.
- No live Vercel dashboard/project/Production-branch/environment/rollback assignment was verified. Record those separately before deployment. No Ads setting or middleware behavior should be changed for this work.
