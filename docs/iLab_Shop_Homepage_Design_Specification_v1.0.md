# iLab Shop — Homepage Design Specification

**Version:** 1.0  
**Status:** Desktop visual references approved; implementation and mobile design pending  
**Project:** iLab Shop  
**Repository:** https://github.com/iLab-lv/iLab-shop  
**Scope:** Shop homepage redesign  

---

## 1. Project Objective

Redesign the existing iLab Shop homepage into a premium, editorial ecommerce experience for professional electronics repair parts.

The design must communicate:

- Precision engineering and technical expertise
- Quality replacement components
- Professional B2B parts supply
- Fast, convenient product discovery
- A modern, reliable ecommerce experience

The goal is to achieve a visually distinctive, Awwwards-quality presentation without sacrificing the usability of a real product catalog.

**Art direction:** Minimal Editorial / Precision Repair Lab.

This is a visual redesign of an existing working ecommerce system, not a rebuild of its architecture.

## 2. Approved Visual References

Three approved desktop mockups form the visual source of truth.

| Reference | File | Scope |
|---|---|---|
| REF-01 | `iLab Repair Parts Hero Banner(1).png` | Header, hero, service highlights |
| REF-02 | `Browse Devices and Premium Smartphone Brands(1).png` | Apple device browsing, Android brand strip |
| REF-03 | `Find Your Part_ iPhone Repair Categories.png` | Searchable selectors, changing device visual, part categories |

Each reference controls its own section. Differences between references must not trigger redesigns of unrelated sections.

The generated device assets are separate from the mockups and should be used as individual images rather than extracting imagery from flattened screenshots.

## 3. Global Design System

### Color

- Background: white / very light neutral gray
- Primary text: black / near-black
- Secondary text: muted cool gray
- Primary accent: existing iLab aqua/cyan
- Borders: thin, low-contrast neutral gray
- Dark photographic areas: reserved for secondary-brand panels

Retain the existing site's design tokens where compatible.

Avoid decorative gradient blobs, excessive glow, glassmorphism, neon treatments, and unnecessary dark sections.

### Typography

**Primary font: Inter.**

- Hero heading: oversized, bold, editorial
- Section headings: strong typographic hierarchy
- Body copy: restrained, readable
- Micro-labels: compact uppercase treatment with controlled letter spacing
- Accent emphasis: aqua/blue gradient may be used in the hero heading, matching REF-01

Do not introduce a second font solely for decoration.

### Layout

- Centered maximum-width content container
- Consistent horizontal alignment across sections
- Generous negative space
- Restrained border radii
- Thin visual separators
- Responsive proportions rather than rigid screenshot dimensions

The design should remain composed on 1440px, 1920px, and ultrawide monitors.

**Do not stretch layouts indefinitely on large screens.**

### Motion

Motion should reinforce precision rather than draw attention to itself.

- Subtle image movement
- Refined hover transitions
- Small arrow translations
- Minimal scale and opacity transitions
- No continuous decorative animation
- Respect reduced-motion preferences

Performance and responsiveness take priority over animation complexity.

---

## 4. Section 01 — Header and Hero

**Primary reference:** REF-01

### Header

Use the existing navigation structure and functionality while visually matching the approved light header.

The mockup demonstrates:

- iLab logo at left
- Primary product/device navigation
- Search
- Account access
- Aqua cart action

The existing site's route structure and functional navigation remain authoritative.

### Hero Copy

**Eyebrow:** PROFESSIONAL REPAIR PARTS

**H1:**  
Phone & Laptop  
Repair Parts

**Supporting text:**  
Quality replacement displays, batteries, cameras and components for iPhone, iPad, MacBook, Samsung and more.

**Primary CTA:** Browse parts

The CTA should navigate to the relevant catalog/discovery destination, not a nonfunctional placeholder.

### Hero Image

Use the approved burgundy, partially disassembled iPhone housing with its removed camera assembly.

Composition requirements:

- Large photographic product-art visual
- Light background
- Positioned on the right
- Controlled media area within the centered hero composition
- Partial central overlap is allowed where text readability remains unaffected
- Not positioned exclusively by the viewport's right edge
- Preserve the intended relationship between the housing and detached camera module
- No added parts, duplicated lenses, or explanatory labels

On wider screens, the visual must remain connected to the heading rather than drifting outward.

### Integrated Service Highlights

Three horizontally arranged editorial information items **within the hero itself**:

**01 — Riga Delivery**
- Prominent `3h` circular indicator
- RIGA DELIVERY
- Fast & reliable

**02 — Omniva Delivery**
- Parcel locker icon
- OMNIVA DELIVERY
- ACROSS LATVIA

**03 — Wholesale**
- Partners icon
- WHOLESALE FOR PARTNERS
- Special pricing

Use thin vertical dividers and aqua icon accents.

**Do not place the service highlights in a separate full-width background stripe.** They belong to the hero composition, as illustrated in REF-01.

### Hero Interaction

The hero should remain visually strong without relying on movement.

Optional restrained image parallax or depth movement can be evaluated later. No complex disassembly animation is required.

---

## 5. Section 02 — Browse by Device

**Primary reference:** REF-02

### Apple Device Section

**Heading:** Browse by device  
**Secondary action:** View all devices →

Four equal-width visual panels:

1. iPhone
2. iPad
3. MacBook
4. Apple Watch

Design requirements:

- Light backgrounds
- Equal panel widths
- Large device imagery
- Minimal text
- Generous image cropping within each panel
- Device names clearly visible
- Small arrow navigation cues
- iPhone image slightly more prominent, without changing panel width

Use the separately prepared product imagery.

Images must be rendered as assets within the interface, not recreated using CSS or replaced with icons.

### Secondary Brands

Immediately below the Apple panels, display a separate dark photographic row:

1. Samsung
2. Xiaomi
3. Huawei

Design requirements:

- Three equal horizontal panels
- Dark navy / amber / burgundy photographic treatments respectively
- Strong photographic macro close-ups
- White brand names
- Small navigation arrows
- Restrained rounded corners
- Clear distinction from the light Apple section

Use brand-specific imagery and preserve the visual contrast of REF-02.

The Samsung, Xiaomi, and Huawei panels must not become ordinary white device cards.

### Interaction

- Whole panel is clickable
- Subtle hover movement or scale
- Arrow translates slightly on hover
- Keyboard focus must be clear
- Navigation must follow the existing catalog hierarchy

Do not introduce automatic carousels or additional content layers.

---

## 6. Section 03 — Find Your Part

**Primary reference:** REF-03

This section combines searchable device/model selection with the existing visual repair-part categories.

### Upper Finder Area

**Eyebrow:** FIND YOUR PART

**Heading:** Find the right part.

**Description:**  
Select your device, model and replacement part to find compatible products.

The layout includes:

- Text and filtering controls on the left
- One large representative device image on the right
- Light background
- Spacious editorial composition

### Device Selector

A searchable combobox with:

- Label: Device
- Default value: iPhone
- Selection required at all times
- No clear-to-empty state
- No images inside the combobox or its dropdown
- Text-based options
- Aqua chevron
- Search-as-you-type filtering

Supported device families include iPhone, iPad, MacBook, Apple Watch, Samsung, Xiaomi and Huawei, using the available catalog hierarchy.

### Model Selector

A second searchable combobox:

- Label: Model
- Default value: All models
- Immediately available because iPhone is preselected
- Text-based options only
- Options depend on the selected Device
- Supports searching by typed characters
- Supports keyboard navigation

Changing Device resets Model to All models and repopulates the relevant model options.

**No individual model image assets are required.**

### Existing Admin Behavior

The shop's existing admin combobox provides the behavioral reference:

`app/admin/components/AdminCombobox.js`

The product admin filtering logic is located in:

`app/admin/products/ProductsManager.js`

Retain the relevant interaction characteristics:

- Case-insensitive text matching
- Open on focus/click
- Arrow-key navigation
- Enter to select
- Escape to dismiss
- Close on outside click
- Selection state preserved
- Appropriate empty-result messaging

The storefront presentation must use the approved visual styling, not the admin's form styling.

The underlying Brand → Series → Model catalog hierarchy must be respected even if the public-facing controls show only Device and Model.

### Dynamic Device Image

A large photographic visual appears on the right side of the finder.

- iPhone selected → iPhone visual
- iPad selected → iPad visual
- MacBook selected → MacBook visual
- Apple Watch selected → Apple Watch visual
- Android brand selected → representative Android device visual

The visual changes when Device changes, not when an individual Model is selected.

No hundreds-of-images dependency.

The visual should be a cropped macro product composition matching REF-03, with its crop controlled by the media area.

### Part Category Selection

Below the Device/Model finder, retain the existing eight part categories with real product thumbnails:

1. Batteries
2. Displays
3. Cameras
4. Housings
5. Charging Port Flex
6. Buttons
7. Connectors
8. Sound/Vibration

Each panel contains:

- Representative product thumbnail
- Category name
- Small navigation/selection action
- Subtle border
- Light background

These categories are visual selection controls, not another text dropdown.

Category selection must operate within the selected device/model context where compatible.

Use the actual category records and available catalog data. Do not fabricate product-type identifiers or incompatible routes.

### Filtering and Navigation Logic

Initial state:

- Device = iPhone
- Model = All models
- Part type = none selected

Users may browse without specifying a model.

The implementation should ensure that valid selections lead to meaningful catalog results and preserve compatibility where applicable.

The precise result-navigation behavior should be mapped against existing routes and filters before implementation.

**No Color or Variant selector is required in this section.**

---

## 7. Product Catalog

Below Find Your Part, retain the existing real ecommerce product catalog.

Do not replace product cards with experimental editorial treatments.

Required characteristics:

- Consistent grid alignment
- Stable card heights where practical
- Support for long product names
- Compatibility information
- Product availability
- Retail and wholesale pricing
- Consistently positioned prices and Add to cart controls
- Existing cart functionality
- Functional pagination / load-more behavior as currently provided
- Real database-driven product content

The approved top-section mockups are design references, not sources of product names, prices, stock quantities, or catalog counts.

Preserve existing catalog capabilities unless changes are separately approved.

---

## 8. Assets

Use separately prepared assets rather than embedding flattened website mockups as page sections.

### Hero

- Approved burgundy iPhone housing and detached camera module composition

### Device Navigation

- iPhone
- iPad
- MacBook
- Apple Watch
- Samsung photographic panel
- Xiaomi photographic panel
- Huawei photographic panel

### Finder

- iPhone macro
- iPad macro
- MacBook macro
- Apple Watch macro
- Generic Android macro

### Product Categories

Reuse the existing eight category thumbnails where they are accurate and visually suitable.

### Asset Handling

- Preserve aspect ratios
- Avoid stretching or distorting devices
- Use controlled object positioning and cropping
- Use optimized image formats where appropriate
- Preserve transparency where provided
- Maintain appropriate image loading priorities
- Avoid introducing text baked into asset images

The final mapping between filenames and component references should be verified from the available project assets before implementation.

---

## 9. Responsive Design

Desktop composition is approved. Mobile-specific layouts remain to be visually reviewed.

### General Requirements

- Preserve readability and functional controls
- Avoid horizontal page overflow
- Maintain touch-friendly interactive targets
- Keep large imagery from obscuring text
- Preserve the hierarchy between primary Apple devices and secondary brands

### Hero

On narrower screens:

- Rebalance heading and device visual
- Preserve readable text
- Adapt integrated service highlights to the available width
- Avoid oversized empty gaps
- Prevent image clipping that removes the central repair story

### Device Navigation

The four desktop Apple panels may reorganize responsively, but the Apple-versus-other-brands hierarchy must remain clear.

### Finder

- Device and Model comboboxes remain fully usable on touch devices
- Dropdown menus must not be cut off by section overflow
- Dynamic images must not displace active inputs unexpectedly
- Part-category selection must remain accessible without tiny touch targets

Mobile visual composition requires approval before final styling is considered complete.

---

## 10. Scope and Non-Goals

### Included

- Homepage header presentation
- Hero visual and copy
- Integrated service highlights
- Browse by Device
- Secondary brand strip
- Find Your Part
- Product category browsing
- Visual integration into existing product catalog
- Responsive styling and restrained interaction polish

### Excluded for Now

- Chargers & Accessories promotional section
- Full ecommerce architecture changes
- Database schema changes
- Admin redesign
- Product-detail page redesign
- New checkout design
- Complex 3D device animations
- New model-specific image generation

The existing site functionality must remain intact.

---

## 11. Implementation Handoff Requirements

Before modifying code, Codex should:

1. Inspect the existing homepage and identify reusable components.
2. Inspect the admin combobox and current product filtering behavior.
3. Inspect the device hierarchy and model compatibility logic.
4. Map the approved visual assets to the relevant sections.
5. Identify changes needed to achieve the approved desktop layouts.
6. Explain any functionality or layout conflicts before proceeding.

Implementation should proceed section by section, with browser screenshots compared against the approved references.

No unrelated refactoring or redesigning.

## 12. Acceptance Criteria

The design is complete when:

- The hero visually matches REF-01 and remains balanced at large desktop widths.
- The three service highlights are integrated into the hero.
- The Apple selector matches the four-panel composition of REF-02.
- The secondary brands retain their separate dark photographic presentation.
- The Find Your Part section matches REF-03, with the agreed text-only searchable comboboxes.
- The large finder image changes according to Device.
- iPhone is the default Device and cannot be cleared.
- Model defaults to All models.
- The existing eight visual part categories remain usable.
- Real catalog functionality and data are preserved.
- The responsive version has been reviewed and approved.
- No unapproved aesthetic or structural changes have been introduced.

---

**Design governance:** Approved sections and visual assets remain locked. Future modifications must be limited to the area explicitly requested. The original reference mockups take precedence over improvisation or generic component styling.
