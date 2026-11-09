# Shop / Service design-system consistency

2026-11-09. See ARCHITECTURE_AND_REUSE.md for exact checkout scope. **Shop's light theme and Service's dark theme are intentional. No theme conversion or visual redesign is proposed.** Comparison uses current local Service source, not its older production appearance.

## Typography and frame matrix

Service foundation is `Service:app/(site)/serviceFoundation.module.scss`; Shop tokens are `app/styles/tokens.css`. Role-specific files below override foundation values. Legacy Service `_tokens.scss` and Shop's Inter/Admin scale are not the primary public redesign typography.

| Token/pattern | Service actual value / source | Shop actual value / source | Intentional difference? | Recommendation |
| --- | --- | --- | --- | --- |
| Public sans | Local Geologica variable TTF, weight 100–900, swap, `adjustFontFallback:false`; `serviceFonts.js:4-12` | Google Geologica variable, latin/latin-ext, CRSV/SHRP/slnt axes; `app/layout.js:10-16` | Same family; different source/fallback | Keep family. Build needs Google access; build passes with it. No requirement to copy Service assets. |
| Mono | Local IBM Plex Mono 400/500; `serviceFonts.js:14-23` | Google IBM Plex Mono 400/500/600; `app/layout.js:18-22` | Extra Shop weight is harmless | Retain unless unused-font analysis establishes a worthwhile saving. |
| Admin/base | Legacy global/body rules outside redesigned scope | Inter variable through `app/layout.js:4-8`, `--font-family-base` | Yes | Keep Admin distinct from storefront font scope. |
| Public body | 400 17px/1.55; foundation `:30-32,61-62` | 400 17px/1.55; `ShopShell.module.css:5` | Aligned | Browser computed public Geologica with Inter/system fallback. |
| Public technical label | 11px; mono, often 1.55 and .14em | Rulers 11px/1.55/.14em; Product type 11px/1.5/.14em; assorted older labels .68rem or token xs 12px | Small internal drift | DS-02: name public label roles rather than replacing every local size. |
| Home display | Desktop clamp(70px,6.4vw,108px)/.88, tracking -.06em, weight 600; foundation `:78-81`, HomePage `:19` | Default clamp(3.6rem,6vw,6.5rem)/.94, tracking -.065em, weight 500; HomepageHero CSS `:25`; breakpoint overrides `:44,57,66` | Approved composition differs | Retain Shop's approved heading. Do not force Service scale. |
| Mobile home display | Below 768: clamp(42px,13vw,58px)/.94 | Below 480: clamp(2.65rem,12.2vw,3.5rem), inherited .94 | Closely related, not identical | No parity correction needed. |
| Secondary heading | Basic clamp(30px,3vw,44px); HomePage h2 600/1.04/-.03em | Brand series clamp(1.25rem,2vw,1.55rem), Model catalog clamp(1.25rem,2vw,1.6rem); Product h1 clamp(1.8rem,3vw,2.7rem)/1.12 | Transactional density is justified | Share Shop roles among equivalent sections, not all cross-project headings. |
| Public variation axes | Body SHRP 0/CRSV 0, display SHRP 100; HomePage `:19` | Body SHRP 0/CRSV 0; card titles SHRP 60, money 100 (`app/page.module.css:232,239`) | Consistent grammar | Retain. |
| Paper/ink | #070a0d / #f2f5f7 | #f4f6f8 / #101418 | **Yes** | Preserve light/dark split. |
| Signal | #47c6e2; foundation `:12` | Brand token #22d3ee; dark Header literals #47c6e2; ruler #0891b2 | Contrast/frame adaptation valid | Give intentional frame/ruler roles tokens, not a new color redesign. |
| Container cap | 1440px | Token 1440px; Brand/Model/Product CSS 1480px; product grid cap 1248px | Some role differences valid | DS-02: document and use page-frame roles; avoid replacing grid caps blindly. |
| Outer gutter | 20px, 40px at 768, 96px at 1280; foundation `:26,76,83` | Token 20/40/64 at same thresholds; public content separately gains 96px rails; many route paddings 32px/14px | Different nesting makes numeric equality misleading | Compare actual content frame, not isolated token names. No overflow measured at sampled widths. |
| Header | Sticky 72px (`NavBar.module.scss:6`), responsive navigation | Sticky 72 desktop / 56px + safe area below 1024, `ShopHeader.module.css:1-...` | Mobile height difference intentional in Shop docs | Keep current height/offset coordination. |
| Rulers | 96px each, >=1280, top 72px | 96px each, >=1280, top `--header-height`=72px | Aligned | Retain geometry; correct lifecycle DS-01. |
| Header Search | Service utility controls use feature CSS | Shop 36px desktop Search; 44px at tablet, 40×42 below 600 | Current approved compact Header; docs still describe older 44/48/14px radius grammar | DS-02: reconcile obsolete docs, do not restore glass/rounded appearance from stale prose. |
| CTA/form dimensions | Service CTA examples min-height 52px; HubDeviceGrid input 56px (`:8`) | Home CTA 50, mobile 46; Product card action 44; Brand Search input 54; Checkout controls feature CSS | Purpose-specific differences acceptable | Keep functional 44px+ primary commerce targets. 40px nav controls do not alone prove a WCAG failure. |
| Radius/border | Public technical shell often square, 1px hairlines | Recent cards/dock/header square; older gallery, inquiry CTA and controls retain radius/shadow tokens | Review by approved component reference | Consolidate obsolete overrides only; no global removal of radii or borders. |
| Focus | 2px solid signal, 2px offset; foundation `:72` | Global 2px rgba aqua ring; Header/ruler explicit opaque aqua | Different contrast requirements | Keyboard focus exists, but modal containment fails (AR-01). Contrast audit remains required for final candidate. |
| Icons | Rulers 7/13px ticks; Header feature icons; Home hero link icons 18px | Search 17px, chevron 13px; ruler matching 7/13px ticks | Minor role variation | No arbitrary icon standardization necessary. |

## Spacing and responsive conventions

Both use the 4/8/12/16/24/32/48/64 progression; Service additionally names 96/128/192. Shop section rhythm should remain appropriate to a catalog. Service's global `--service-section-space:clamp(112px,11vw,176px)` and 88px mobile is not a mandate for every Shop section: Service home also uses 64px local section padding. Shop's hero/catalog/Brand and transactional sections use differing local values; meaningful debt is repeated responsibility and override layering, not every non-token number.

| Pattern | Service | Shop | Assessment |
| --- | --- | --- | --- |
| Grid gutter | 24px foundation; Home section header 16px row /24 column | `--shop-gutter:24px`; cards use deliberate 1px separator | Intentional catalog grid treatment |
| Route frame | Shared scoped foundation + section composition | Brand page padding 24px 32px 72px (`BrandModelDirectory.module.css:1`); Model/Product 30px 32px 64px (`CatalogPages.module.css:5-6`); below 560/600 mostly 14px | DS-02: equivalent frame roles should stop drifting; no demand for pixel parity |
| Ruler reservation | Service margin increases to 96px >=1280 | Shop main adds 96px side margins >=1280 (`ShopShell.module.css:10`), routes add inner padding | Different implementation, similar visual system |
| Fixed commerce clearance | Service bottom dock variable 60px + safe area | Shop content padding-bottom 120px desktop, 96px+safe-area mobile (`ShopShell.module.css:9-11`) | Purposeful transactional frame, verify content not obscured |
| Main responsive thresholds | Service 768/1024/1280 plus feature-specific thresholds | Reference 480/768/1024/1280; also 390/560/580/600/760/800/820/900 | Extra thresholds are not inherently defects; remove redundant override branches when editing a family |
| Representative behavior | Current Service source only; no repeated Service build | Shop home 390/768/1024/1280/1440; Brand/Model/Product 390/1440 | No measured horizontal overflow; no uncaught page exceptions. Not an exhaustive visual certification of Admin/authenticated states. |

## Navigation rulers: dedicated comparison

Single global implementations were located in each app:

- Shop: `app/components/shop/ShopNavigationRulers.js` and CSS, mounted once in ShopShell.
- Service: `app/(site)/ui/navigation-rulers/NavigationRulers.jsx` and SCSS, mounted once in Service layout. `RulerControls` factors control rendering from collection/lifecycle.

| Behavior/detail | Service | Shop | Result |
| --- | --- | --- | --- |
| Left/right geometry | Width 96, top 72, section track 32px inset; right track 96px inset, 41 ticks, 7/13px tick lengths, 48px marker | Same geometry and marker formula | Feels like the same system; keep |
| Type/labels | Mono 11px/1.55, tracking .14em, tooltip sans 13px/1.4, numbered section buttons 40×28 | Same | Keep light contrast adaptation |
| Active threshold | Measured target position minus 71px; active when scrollY+3 passes target | Each target top <=74; click offset -71 | Equivalent desktop threshold |
| Progress | scrollY/(document scrollHeight-innerHeight), clamped | Same | Both use 100/50/0 printed top-to-bottom although native progress starts 0 at top; inherited visual scale, not a Shop-only mismatch |
| Section interface | Actual top-level semantic sections; includes h1 when appropriate; excludes hidden/inert/aria-hidden elements | Explicit `[data-shop-ruler-section]`, id + heading/aria-label required; nested Product compatibility intentionally included | Explicit Shop configuration is appropriate; add visibility guard and document nested-section policy |
| Utility/error pages | Both rails hidden if zero sections | Left omitted but right always rendered | Guest Checkout gets a meaningless desktop progress rail |
| Overlays | `blocked` from UiDialogsProvider; hidden/inert for navigation, locator, Contact, booking | No overlay state prop/context; ShopShell renders `<ShopNavigationRulers />` unconditionally | Confirmed DS-01 gap; browser Search retained visible background right ruler |
| Viewport lifecycle | matchMedia >=1280; disconnects observers/listeners when narrow | CSS hides rails, but observers/listeners and scroll React updates remain active | Avoid hidden mobile work |
| Measurement/performance | Dirty flags cache positions/max scroll; DOM progress update; React changes only active section | Every animation frame reads every section rect and scroll height; React `setProgress`; maps 41 ticks again | Bounded small section count, but unnecessary work and allocation |
| Discovery | Route-keyed state, MutationObserver + main/body ResizeObserver | Main subtree MutationObserver + main ResizeObserver; useCallback depends on sections and reconnects on changes | Not a leak: cleanup exists. Consider route-aware collection and cached geometry |
| Scroll/motion | Native vertical range, keyboard focus outline, reduced-motion auto | Same native range and reduced-motion auto | Good foundation |
| Accessibility language | Follows actual LV/RU route | Page nav label English, section/range labels use remembered Service LV/RU | Shop HTML is English: accessible Shop controls should use English, independently of Service destination preference |
| Listener cleanup | Disconnects observers, media change, resize/scroll and RAF | Disconnects both observers, resize/scroll and RAF | No confirmed leaked listener |

**Can current rulers remain?** Geometry, controls, explicit section markers and the light palette can remain. The lifecycle/overlay/utility behavior should be corrected in a targeted task; importing Service code across repositories is unnecessary. Keep one Shop owner with a small documented section interface and one aggregate blocked state. Do not invent multiple per-page rulers.

## Findings

**DS-01 — P2 confirmed: ruler lifecycle and language diverge from Service.** Evidence: Shop JS `:15-58,61-99`, CSS `:1-40`; Service JSX `:34-112`; runtime Search right ruler remained visible. Scope: all public pages, hidden-but-running mobile observers and desktop utility rail. Impact: unnecessary mobile scroll work, irrelevant utility control, background overlay controls and mixed-language accessible names. Approach: media-gated connection, aggregate shell overlay state, no-section hiding, visibility-aware collection, cached positions and English Shop labels. Preserve dimensions and native range. Effort: M (0.5–1 day). Deployment blocker: no; AR-01 is the urgent keyboard defect. No performance timing regression was measured.

**DS-02 — P2 recommendation: reduce CSS override and token ownership drift.** `app/page.module.css:1-...` contains successive card generations and later decorative discovery rules; CatalogPages CSS `:1-43` restyles its own earlier selectors; Header/ruler repeat frame colors outside tokens. `docs/design-system.md` still describes Header glass, 14px radius and a small capsule despite current square technical controls. Scope: shared public CSS/docs. Impact: future fixes can edit a rule that is later overridden; developers may restore a superseded appearance from prose. Approach: consolidate each component's effective rules, name the few shared public type/frame roles, update docs to approved current implementation. Do not apply wholesale Service sizes to Shop. Effort: M (1–2 days); blocker: no.

**DS-03 — P2 confirmed visual defect: mobile hero artwork overlaps the secondary action area.** At 390×900 in the isolated production build, the top of the phone/camera artwork runs behind “Browse by device” next to the main CTA. `HomepageHero.module.css:29,38-39,52-68` combines a short mobile media box with an absolutely centered oversized image. Scope: mobile home hero; observed at 390, not claimed at every phone width. Impact: secondary-action contrast and separation are reduced; there is no measured horizontal overflow. Approach: contain artwork below the actions through local media sizing/positioning, preserving image, typography, colors and layout direction. Effort: S; blocker: no. Recheck 390/480/768 and keyboard action visibility; do not redesign the hero.

AR-01 (mobile dialog focus), AR-02 (landmarks) and AR-10 (test gap) are tracked once in the architecture report. Font fallback/field CLS, screen-reader output, full color-contrast coverage and authenticated Admin responsive states remain separate verification work, not invented confirmed failures.
