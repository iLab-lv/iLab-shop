# S4 Service integration handoff — not applied

The Shop is served publicly through the existing Service rewrites:

- `/shop` → `https://i-lab-shop.vercel.app/shop`
- `/shop/:path*` → `https://i-lab-shop.vercel.app/shop/:path*`

The Shop-owned public sitemap endpoint is `https://ilab.lv/shop/sitemap.xml`. No rewrite change is required. Keep the Service-owned sitemap at `https://ilab.lv/sitemap.xml` for Service pages and add the Shop URL as a second `Sitemap` directive in Service `app/robots.js`, for example:

```js
sitemap: [
  `${ORIGIN}/sitemap.xml`,
  `${ORIGIN}/shop/sitemap.xml`,
],
```

Preserve the current Service robots rules. The Shop root page, Brand/Model/Product pages are its sitemap scope; Service entries remain its existing Latvian/Russian scope. Do not add Shop URLs into the Service sitemap unless the Service sitemap is intentionally changed to a sitemap index and duplicate URL ownership is checked. The Shop is English-only and emits no `hreflang` alternates.

After a separately authorized Service update and deployment:

1. Request `https://ilab.lv/robots.txt` and confirm both sitemap directives.
2. Request `https://ilab.lv/shop/sitemap.xml`; confirm HTTP 200 and absolute `https://ilab.lv/shop/...` URLs. When catalog size exceeds 50,000 URLs, confirm the index and each `?part=N` child.
3. Confirm a sample URL from the Shop sitemap is absent from the Service sitemap, and vice versa.
4. Inspect canonical tags and Product/Breadcrumb JSON-LD on representative proxied pages.
5. Submit both sitemap URLs separately in Search Console if the existing property workflow requires it.

No Service source, deployment, robots file, or sitemap was modified in S4.
