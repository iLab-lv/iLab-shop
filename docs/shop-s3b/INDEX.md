# S3B — Landing and catalog navigation

The public Shop home now follows the approved landing-page hierarchy: editorial hero, Firebase-backed device-family grids, repair callout, device/model/type finder, then the existing live catalog. Brand pages keep their active Firebase series/models and local search, with the repair callout after the directory. Model listing/detail presentation remains for S3C.

The Apple family presentation order remains intentional, while every other real Firebase brand now flows into the secondary grid in source order. Links still use production brand/model slugs and `/shop` base-path handling; type/device/model filters and query-string behavior are unchanged. Existing purchase eligibility, inquiry handling, prices and inventory logic were not changed.

Focused tests passed (29/29); lint and production build passed. Browser screenshots were not recaptured: the existing S3A runner previously failed to bind `127.0.0.1:3000` (`listen EACCES`). Existing evidence was preserved. CSS breakpoint/source checks cover 375px, 760/820/900/1024px and desktop behavior, but rendered visual and interaction checks remain for manual review at 375px, 1024px and 1440px.

Files changed: home page composition, `HomepageHero`, `HomepageDiscovery`, `HomepageFinder`, `BrandModelDirectory`, scoped editorial variants of `ShopTrustHighlights` and `ServiceLinkCard`, `lib/homepagePresentation.mjs`, and its focused test. No model listing/detail, Firebase schema, cart/checkout, product-card, or Service changes.

S3C can proceed after a manual browser review confirms the new page composition and that catalog/search interactions still work at the target widths. Product listing and detail presentation remain untouched.
