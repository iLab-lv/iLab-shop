# Redesign migration

## Baseline and responsibility

- Repository: `iLab-lv/iLab-shop` (parts-store production application).
- Baseline: `292848b78cb061969074dd4e543cf2cbc28ab245` (`origin/main` on 2026-10-29).
- Remote backup: `backup/pre-redesign-2026-10-29` at the baseline commit.
- Working branch: `feature/redesign-integration`.
- Visual source of truth: `askoldas/iLabRedesign` at the approved revision inspected for each pass.
- This repository remains authoritative for catalog data, authentication, permissions, pricing, cart, checkout, orders, administration, Shop settings, and `/shop` routing.

The redesign overrides target visual presentation, not locked business rules. Do not copy its static catalog, localStorage auth/order mocks, simulated checkout, or hard-coded contact data into production.

## Phases and status

| Phase | Status |
| --- | --- |
| Repository baseline and architecture audit | Complete |
| Service CTA Dock | Not started (Service repository) |
| Shop CTA Dock | Complete (2026-10-29) |
| Shared Shop header, navigation, panels, and footer | Not started |
| Catalog, product, cart, and checkout surfaces | Not started |
| Responsive, accessibility, functional, SEO, and performance QA | Not started |

## Architecture decisions

- Preserve `ShopShell`, `CartProvider`, `SearchProvider`, `ShopSettingsProvider`, checkout action state, and server-authoritative cart/order resolution.
- Adapt redesign presentation around `ShopCtaDock`, `ContactPanel`, `CartDrawer`, and `ShopFullscreenPanel`; do not replace their production behavior with mock scripts.
- Keep `basePath: "/shop"` conventions and use existing internal navigation and mounted API URL rules.
- Source contact/pickup/tax data from `shopSettings/general` through existing helpers.
- Existing Shop design documentation describes the pre-migration UI. During migration, the approved redesign is authoritative for target typography, geometry, color, spacing, CTA, and drawer presentation; `docs/domain-rules.md` remains authoritative for business behavior.
- The Shop dock switches at 1024 px: Contact + Cart (or the existing checkout-only Place Order action) form the mobile counter bar; the same actions float at the lower right on desktop.
- `ShopFullscreenPanel` retains fullscreen Search/Inquiry behavior and exposes a drawer presentation only for Contact. `CartDrawer` remains separately owned by `CartContext` because its resolved commerce states and footer differ from generic panels.
- Contact continues to consume the public `shopSettings/general` projection and presents active pickup locations as redesign-style tabs. Cart presentation does not persist or calculate prices independently.
- Geologica is loaded through the redesign's Google Fonts stylesheet and scoped to migrated dock/drawer surfaces; Inter remains the application base font.

## Known risks

- The approved redesign uses a 1024 px dock breakpoint and 560 px side drawers; production currently uses a 760 px dock breakpoint, fullscreen contact panels, and a 440 px cart drawer.
- Checkout changes the dock's second action to a real submit control and must retain validation, loading, disabled, and order-complete states.
- Overlay coordination, focus trapping/return, Escape, scroll restoration, cart validity, auth-sensitive pricing, and live settings must remain intact.
- The Shop is English-only while links back to the localized Service remember LV/RU preference.
- The migrated typography has a runtime Google Fonts dependency and falls back to the existing Inter/system stack when unavailable.

## Pass 1B verification

- Compared the production implementation with `dock-shop.html`, `panels-shop.html`, `drawer-contact.html`, component/shop CSS, tokens/theme, `ui.js`, `shop.js`, and `DESIGN.md`.
- Rendered dock layouts at 375, 768, 1024, 1280, and 1600 px; rendered Contact and empty Cart drawers at true 375 and 1280 px. No horizontal overflow was observed.
- Verified source contracts for Escape, focus containment/return, scroll lock/restore, backdrop close, reduced motion, real settings, Cart state, and checkout form submission.
- `npm test` and `npm run lint` pass. Production build compiles and type-checks but cannot finish page-data collection without the repository's Firebase Admin environment variables.
- No production order was submitted. Authenticated, populated-cart, persistence, and order-request browser flows require configured Firebase test credentials/data and remain an environment-dependent verification item.

## Pass requirements

For every pass:

1. Compare the affected production implementation with the approved redesign.
2. Preserve production business rules, security boundaries, data ownership, SEO, and `/shop` routes.
3. Test keyboard/focus/Escape, reduced motion, 375, 768, 1024, 1280, and 1600 px layouts, plus cart/checkout/auth/settings-dependent states.
4. Run focused tests plus `npm test`, lint, and build checks in proportion to the change.
5. Update affected architecture/design/developer documentation, record decisions here, and list unresolved documentation conflicts.

Do not delete historical documentation without approval or treat mock/experimental behavior as production requirements.

## Local checkout recovery ? 2026-10-31

The baseline and working-branch labels above describe the original duplicate checkout. Its Pass 1B implementation and migration tracker were recovered into the authoritative `C:\Users\info\Desktop\shop`. The authoritative checkout remains on its original `home_design` branch at `6d6c371`; the recovered changes are intentionally uncommitted. The duplicate is retained for explicit deletion approval only. See [REPOSITORY_RECOVERY.md](REPOSITORY_RECOVERY.md). Pass 1B presentation work is preserved; authenticated, populated-cart and order-request verification listed above remains outstanding and is not made complete by consolidation.

Recovery validation found a pre-existing direct guest Checkout SSR failure: `AuthControl` initially opens the checkout login portal and evaluates `document.body` on the server (`AuthControl.js:315`). Direct `/shop/checkout` returns HTTP500, although the browser recovers and renders the guest gate. These auth files match the original authoritative copy and were not changed by consolidation. See the recovery report and `http-followup.json`; a focused auth fix is a separate follow-up.
