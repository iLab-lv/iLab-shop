<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# iLab Shop — repository instructions

These rules apply to the whole repository unless a future nested `AGENTS.md` explicitly overrides them.

## Inspect before changing
- Inspect the actual current working tree before implementing anything.
- Do not assume an older branch, previous prompt, documentation snapshot, or remembered file tree is current.
- Read the closest existing implementation before creating a new one.
- Preserve unrelated local changes.
- Current code/tree is authoritative for what presently exists; `docs/domain-rules.md` is authoritative for locked business decisions; `docs/design-system.md` is authoritative for visual rules.
- If code conflicts with a locked rule and the task did not explicitly change that rule, surface the conflict instead of silently inventing behavior.

## Read the relevant docs
Start with `docs/README.md`.

Use:
- routes/data/providers/server-client boundaries → `docs/architecture.md`
- users/pricing/catalog/search/cart/checkout/orders → `docs/domain-rules.md`
- visual work/tokens/typography → `docs/design-system.md`
- reuse/forms/admin editing/testing → `docs/development-rules.md`
- where code belongs → `docs/file-map.md`

## Reuse before creating
Before adding a component/helper/config:
1. search for an existing equivalent;
2. inspect the closest reusable implementation;
3. extend/refactor an existing abstraction when responsibilities match;
4. create a new abstraction only for a distinct responsibility.

Prefer generic infrastructure plus specialized content. Example: `ShopFullscreenPanel` owns fullscreen mechanics; `ContactPanel` and `SearchPanel` own their content/business logic.

Do not duplicate pricing, permissions, location data, design tokens, commerce status constants, compatibility derivation, or auth/session logic.

## Server authority and security
- Firebase Authentication provides identity.
- Sensitive authorization, pricing, stock, user-role mutations, and order mutations are server-authoritative.
- Never trust request-body UID, role, price, total, stock, wholesale entitlement, or permission claims.
- Never expose `purchasePriceCents` through public pages/APIs.
- Use existing auth/permission helpers.
- Do not weaken Firestore security or introduce direct browser writes for sensitive collections.
- Admin UI visibility is not a security boundary; privileged routes/mutations authorize server-side close to the data source.
- Preserve existing same-origin and private/no-store mutation patterns.

## Next.js routing
The app uses App Router with `basePath: "/shop"`.

For `Link`, router navigation and redirects use internal paths such as `/`, `/account`, `/checkout`, `/admin/products`, `/product/slug`.

Do not manually prepend `/shop` to Next navigation paths.

Raw browser requests to route handlers currently use mounted paths such as `/shop/api/...`; follow existing conventions/helpers.

## Design system
- `app/styles/tokens.css` is the single source of truth for shared design tokens.
- Use CSS Modules and shared CSS custom properties.
- Base UI font: Inter.
- Brand accent: `#22D3EE`; hover `#06B6D4`; active `#0891B2`.
- No generic royal/indigo/corporate blue.
- Neutrals should read gray/charcoal, not blue-gray.
- Semantic green/red/amber remain valid.
- Use existing spacing/radius/shadow/motion/layout/z tokens first.
- Keep aqua restrained to actions, focus, active/selected interaction and important links.

## Public/admin boundaries
- Public storefront code belongs under the public shop route group/shared shop components.
- Admin-only UI belongs under `app/admin`; admin reusable editor UI under `app/admin/components`.
- Server/data helpers belong under `lib/`.
- Do not reuse admin serializers publicly if they can leak private fields or create inappropriate coupling.
- Do not import `server-only` modules into client components.

## Business rules are not UI suggestions
Do not invent or silently change role semantics, wholesale eligibility, price fallback, stock behavior, checkout-to-account behavior, payment methods, fulfillment methods, order/payment status behavior, or catalog routes. Read `docs/domain-rules.md`. If a material decision is missing, ask rather than applying a generic ecommerce convention.

## Dependencies and services
- Prefer current dependencies/platform capabilities.
- Do not add infrastructure/services without explicit need and approval.
- Search currently needs no Algolia, Typesense, Meilisearch, Redis, Vercel KV, Firestore search-index document, `searchTokens`, or `searchPrefixes`.

## Single sources
- design tokens → `app/styles/tokens.css`
- contact/pickup locations → `app/components/shop/contactData.js`
- roles/permissions → `lib/auth/roles.mjs`
- commerce constants/pricing/cart normalization → `lib/commerce.mjs`
- order server logic → `lib/shopOrders.js`

## Client state
- Search dataset/state stays in memory for the current `ShopShell` lifecycle.
- Cart identity (`productId`, `quantity`) intentionally persists in localStorage.
- Persisted Cart prices are never authoritative.
- Auth changes invalidate/re-resolve permission-sensitive data.
- Do not create parallel state systems for existing concerns.

## Accessibility
Preserve semantic elements, labels, keyboard access, visible focus, Escape/focus restoration, scroll locking, reduced-motion behavior, ARIA state and live/error regions.

## Tests and completion
For meaningful work run relevant focused tests, `npm test` when shared business logic changes, `npm run lint`, and `npm run build`. Fix failures introduced by the task; avoid unrelated cleanup.

## Documentation maintenance
Update docs in the same task when changing routes, component responsibility, data ownership, locked business rules, design-system conventions, or meaningful file/directory responsibilities. Do not document trivial local implementation details.

## Working style
- Prefer small coherent changes over broad rewrites.
- Preserve working behavior while refactoring.
- Do not rename/move files without a clear reason.
- Do not duplicate temporary implementations.
- Keep user-facing errors useful without leaking internal Firebase details.
- When implementation is explicitly authorized, inspect first and proceed without re-asking for confirmation already supplied.
