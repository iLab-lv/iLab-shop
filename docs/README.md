# iLab Shop documentation

This directory records current architecture and locked project decisions. It replaces older one-off planning/audit documents.

## Which document should I read?

| Task | Read |
| --- | --- |
| Any repository work | `../AGENTS.md` |
| Routes, providers, Firebase/server flow, public/admin boundaries | `architecture.md` |
| Users, roles, pricing, catalog, search, cart, checkout, orders | `domain-rules.md` |
| Colors, typography, spacing, radii, focus, visual styling | `design-system.md` |
| Component reuse, forms, admin editing, testing, coding patterns | `development-rules.md` |
| Finding the right file/folder | `file-map.md` |

## Authority and freshness
- `AGENTS.md` defines how work is performed.
- `domain-rules.md` records locked business decisions.
- `design-system.md` defines the shared visual system.
- `architecture.md` and `file-map.md` describe current structure and must be updated when it changes.
- The actual working tree is the source of truth for what code/files presently exist.

If current code conflicts with a locked business/design rule, surface the mismatch rather than silently reinterpreting it.

## Documentation maintenance
Update docs in the same task when changing routes, component ownership, server/client flow, a data source of truth, user/pricing/cart/checkout/order behavior, design-system conventions, or major file responsibilities.

Do not document every small function or selector.

## Previous docs folded into this set
Useful material was retained from the old authorization foundation, admin editing foundation, and admin audit:
- Firebase identity/profile/permission principles;
- reusable admin editing patterns and dirty-state handling;
- base-path and server/client-boundary warnings;
- useful admin UX behavior and legacy patterns that must not be copied.

Stale planning was removed, including old placeholder scopes, the former transitional single-price model, and the old statement that Orders did not exist.
