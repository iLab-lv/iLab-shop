# Design system

## Source of truth
Canonical design tokens: `app/styles/tokens.css`, imported once from `app/globals.css`.

Do not create competing color/admin/shop token files or JavaScript color constants for normal UI styling.

## Brand
```text
Accent       #22D3EE
Hover        #06B6D4
Active/dark  #0891B2
```

Use the existing token family:
```text
--color-accent
--color-accent-hover
--color-accent-active
--color-accent-text
--color-accent-soft
--color-accent-soft-hover
--color-focus-ring
```

### No generic blue
No royal/indigo/corporate blue for active nav, filters, focus, links, buttons, chips, upload states or pagination.

Visual language:
```text
black / charcoal / white / neutral gray
+ iLab aqua
+ semantic success/warning/danger
```

## Light palette
```text
--color-background       #f5f6f4
--color-surface          #ffffff
--color-surface-subtle   #fafafa
--color-surface-muted    #f3f4f3
--color-border           #e2e4e2
--color-border-strong    #c9cdca
--color-text             #171f24
--color-text-secondary   #454b48
--color-text-muted       #737875
--color-text-on-accent   #06252b
--color-placeholder      #929895
```

Public Shop and Admin are primarily light. Neutrals should read neutral, not blue-gray.

## Dark/frame palette
```text
--color-dark                 #000000
--color-dark-surface-1       #0a0a0a
--color-dark-surface-2       #141414
--color-dark-surface-3       #1f1f1f
--color-dark-border          #2a2a2a
--color-dark-text            #f5f5f5
--color-dark-text-secondary  #b3b3b3
--color-dark-text-muted      #8c8c8c
```

Use the shared glass/overlay tokens in `tokens.css` for dark fixed-frame UI.

Appropriate for Header/fullscreen frames/dark-glass controls; do not turn light content pages dark without an explicit redesign.

## Semantic colors
Use success/warning/danger tokens for real meaning.

Success: active, approved, in stock, paid/completed, successful feedback.
Warning: pending, awaiting action/payment.
Danger: error, rejected, cancelled, destructive, out of stock.
Neutral: inactive/informational/disabled when danger is not appropriate.

Do not rely on color alone.

## Typography
Base font: Inter, loaded via `next/font/google` in `app/layout.js`.

Use:
```text
--font-family-base
--font-weight-regular/medium/semibold/bold/extrabold
--font-size-xs/sm/base/lg/xl/2xl/3xl/display
--line-height-body
--line-height-heading
```

Responsive headings may use `clamp()`. Do not introduce another display font without an explicit decision.

## Spacing
```text
--space-2xs   2px
--space-xs    4px
--space-sm    8px
--space-md-sm 12px
--space-md    16px
--space-lg    24px
--space-xl    32px
--space-2xl   48px
--space-3xl   64px
```

## Radius
```text
--radius-sm    6px
--radius-md    8px
--radius-lg    12px
--radius-xl    14px
--radius-pill  999px
```

## Shadows
Use `--shadow-sm/md/lg/overlay`. Keep neutral and subtle; borders do most structural separation.

Header controls follow the shared iLab Service button grammar: 44px desktop controls (48px on mobile), 14px radius, 16px horizontal padding, weight 600 and 18px icons. Primary controls use the aqua shadow tokens; ghost utilities use restrained dark glass and aqua-tinted hover/press states. The Shop `SiteSwitcher` is a small standalone aqua-glass capsule, not a primary CTA or form switch. It is 30px tall and text-only, with a translucent aqua default and solid aqua hover. In the desktop header it sits outside the Account/Search action cluster, separated by a subtle neutral vertical divider; the two actions remain paired inside their existing cluster.

Dark glass uses a subtle 0.02 white control surface, 0.06/0.08 white borders and a 10px/140% blur/saturation treatment. Header height is 72px desktop and 56px mobile, plus safe-area inset where applicable.

## Motion
Use `--motion-fast/base/slow` and `--ease-standard`. Honor `prefers-reduced-motion`.

## Layout/z-index
Shared tokens include:
```text
--content-max
--content-wide-max
--header-height
--header-height-mobile
--z-header
--z-dock
--z-overlay
--z-modal
```

Component-specific structural values may stay local if they are not shared design decisions.

## Breakpoints
Reference: 480 / 768 / 1024 / 1280px.

CSS custom properties are not used in standard media-query conditions. Functional component-specific breakpoints may remain.

## Buttons
Primary: aqua fill, dark text, accent hover/active.
Secondary: surface, neutral/accent border, restrained accent hover.
Ghost/subtle: transparent, neutral text, subtle hover.
Destructive: danger family.

## Forms
Use shared surface/border/text/radius and aqua focus. Disabled is neutral; validation uses danger. Keep labels and native semantics.

## Selection
Typical selected state:
```text
text/border = accent or accent-text
background = accent-soft
```

Filled primary selections may use full accent with dark text.

## Admin
Admin shares the same brand system; no separate Admin blue identity. Admin may keep structural variables (sidebar width, content max, mobile header height), not its own palette.

## Icons/SVG
Prefer `currentColor`. Do not recolor brand logos/product imagery just to fit tokens.

## Hard-coded colors
Normal UI color belongs in `tokens.css`. Before adding a color: reuse an existing semantic token; only add a global token if the concept is genuinely shared.

## Character
Professional/B2B, compact, information-dense, light neutral content, dark iLab frame, restrained aqua, subtle shadows, consistent focus.
