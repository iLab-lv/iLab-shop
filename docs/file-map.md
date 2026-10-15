# File map

Selective structural map. Keep it structural, not exhaustive.

## Root
```text
AGENTS.md              coding-agent rules
CLAUDE.md              points to AGENTS.md
README.md              project overview
next.config.mjs        basePath /shop
package.json           scripts/dependencies
docs/                  project decisions/conventions
tests/                 Node test-runner suites
scripts/               import/migration/bootstrap utilities
migrations/            migration/import artifacts
```

## Public routes
```text
app/
  layout.js                         root HTML + Inter
  globals.css                       global base + token import
  styles/tokens.css                 single design-token source
  sitemap.js                        canonical public Shop sitemap at /shop/sitemap.xml

  (shop)/
    layout.js                       wraps public pages in ShopShell
    page.js                         Shop home/catalog entry
    [brand]/page.js                 Brand page server route, metadata, and catalog loading
    [brand]/[device]/page.js        Model/device page
    product/[slug]/page.js          canonical Product detail
    checkout/
      page.js
      CheckoutClient.js
      CheckoutAuthGate.js
      checkout.module.css
    account/
      page.js
      AccountActions.js
      AccountProfileForm.js             Account Profile defaults editor
      account.module.css
```

## Public shared UI
```text
app/components/
  AuthControl.js
  Catalog.js
  ProductCard.js
  ProductImage.js

  shop/
    AddToCartButton.js
    AddToCartButton.module.css
    BrandModelDirectory.js           Brand hero and in-memory Series/Model directory search
    BrandModelDirectory.module.css   Brand-page-only layout and directory styling
    Breadcrumbs.js
    CartContext.js
    CartDrawer.js
    ContactPanel.js
    ShopCheckoutActionContext.js  minimal shared Checkout submitting state for fixed dock
    HomepageDiscovery.js
    ShopBenefits.js                  Shared homepage/Brand-page service-benefits strip
    ShopBenefits.module.css
    DeviceProducts.js
    ProductPurchase.js
    SearchContext.js
    SearchPanel.js
    ShopSettingsContext.js
    ShopCtaDock.js
    ShopFullscreenPanel.js
    ShopHeader.js
    ShopShell.js
    WholesaleNetPrice.js
    WholesaleNetPrice.module.css
```

## Admin
```text
app/admin/
  layout.js
  page.js
  products/
    page.js
    ProductsManager.js
  catalog/
    page.js
    DevicesSection.js
    ProductTypesSection.js
  orders/
    page.js
    OrdersManager.js
  users/
    page.js
    UsersManager.js
  settings/
    page.js
    SettingsManager.js

  components/
    AdminShell.js
    AdminNav.js
    AdminPageHeader.js
    AdminLogin.js
    AdminAccordionRow.js
    AdminButton.js
    AdminCombobox.js
    AdminEditorActions.js
    AdminFeedback.js
    AdminForm.js
    AdminStatusBadge.js
    ConfirmationDialog.js
    useAdminEditorAccordion.js
    useConfirmationDialog.js
```

## API routes
```text
app/api/auth/session/route.js
app/api/users/me/route.js
app/api/partner-applications/route.js

app/api/products/route.js
app/api/catalog/search-data/route.js
app/api/cart/resolve/route.js
app/api/orders/route.js
app/api/invoices/[orderId]/route.js

app/api/admin/check/route.js
app/api/admin/products/...
app/api/admin/product-images/route.js
app/api/admin/devices/...
app/api/admin/product-types/...
app/api/admin/users/...
app/api/admin/orders/...
app/api/admin/settings/route.js
```

## Lib — Auth
```text
lib/auth/
  roles.mjs
  userModel.mjs
  userProfiles.js                      Profile defaults, registration, Partner workflows, and admin user mutations
  serverAuth.js
  sessionAuth.js
  clientSession.js
  adminMutationAuth.js
  requestOrigin.mjs
```

## Lib — Commerce/public
```text
lib/commerce.mjs
  commerce constants, applicable price, cart normalization/line resolution

lib/shopCatalog.js
  public hierarchy/Product/Search catalog reads/serialization and sitemap data read

lib/shopSitemap.mjs
  pure canonical URL generation, active hierarchy validation, deduplication, and timestamp normalization

lib/shopProducts.js
  public paginated Product API data

lib/searchCatalog.mjs
  in-memory Search normalization/index/ranking

lib/homepagePresentation.mjs
  pure homepage Brand grouping, asset mapping, and Product Type query resolution

lib/brandCatalogPresentation.mjs
  pure Brand logo mapping, Model counting, local directory filtering, and Model href creation

lib/shopHeaderNavigation.mjs
  pure public Header Brand validation, first-five/overflow splitting, and active-route matching

lib/shopOrders.js
  Cart resolution, authenticated Checkout validation, Order/Invoice transaction, history/admin updates

lib/orderDisplay.mjs
  shared human Order reference, customer/fulfillment summary, compact date, and local Admin list filtering

lib/checkoutValidation.mjs
  pure Checkout payload validation and normalized Order customer snapshot
  pure fulfillment fee, method label, and legacy-safe order display helpers

lib/checkoutNavigation.mjs
  pure Checkout route detection for the persistent CTA dock

lib/orderSubmission.mjs
  Order-first orchestration and non-fatal optional Profile-default save

lib/invoices/invoiceModel.mjs
  pure invoice numbering, VAT snapshot, Latvian formatting, amount words

lib/invoices/invoicePdf.js
  server PDF template/renderer using embedded Inter and the existing logo paths

lib/invoices/invoiceService.js
  private Storage upload/read, PDF status and self-healing regeneration

lib/shopSettings.js
  server-only Firestore settings reads/writes and public serialization

lib/shopSettingsDefaults.mjs
  centralized pure fallback values

lib/shopSettingsModel.mjs
  pure normalization, validation, and active-location filtering
```

## Lib — Firebase
```text
lib/firebaseClient.js
lib/firebaseAdmin.js
```

## Lib — Admin
```text
lib/adminProducts.js
lib/adminProductValidation.mjs
lib/adminProductCatalog.mjs
lib/adminProductCompatibility.mjs
lib/adminProductImages.js
lib/adminProductHttp.js

lib/adminDevices.js
lib/adminDeviceTree.mjs

lib/adminProductTypes.js
lib/adminProductTypeCatalog.mjs

lib/adminUsers.js
lib/adminUserCatalog.mjs

lib/adminDashboard.js
  bounded server-side Dashboard queries
lib/adminDashboardMetrics.mjs
  Europe/Riga month windows and pure Dashboard aggregation

lib/adminCatalogHttp.js
lib/adminCatalogValidation.mjs
lib/adminEditingState.mjs
```

Keep private/admin serializers separate from public serializers.

## Tests
```text
tests/admin-catalog-validation.test.mjs
tests/admin-dashboard-metrics.test.mjs
tests/admin-device-tree.test.mjs
tests/admin-editing-state.test.mjs
tests/admin-product-catalog.test.mjs
tests/admin-product-compatibility.test.mjs
tests/admin-product-types.test.mjs
tests/admin-product-validation.test.mjs
tests/admin-user-catalog.test.mjs
tests/admin-user-management.test.mjs
tests/authorization.test.mjs
tests/brand-catalog-presentation.test.mjs
tests/commerce.test.mjs
tests/homepage-presentation.test.mjs
tests/public-search.test.mjs
tests/request-origin.test.mjs
tests/shop-settings.test.mjs
tests/shop-header-navigation.test.mjs
```

## Placement rules
```text
public page route           -> app/(shop)/...
public reusable UI          -> app/components/shop/ or app/components/
admin page/feature UI       -> app/admin/...
admin reusable editor UI    -> app/admin/components/
route handler               -> app/api/...
shared server/business      -> lib/
pure shared helper          -> lib/*.mjs when browser/server reuse is intended
design token                -> app/styles/tokens.css
project decision docs       -> docs/
```

Do not create a new top-level folder for a concern already represented here without a clear reason.
