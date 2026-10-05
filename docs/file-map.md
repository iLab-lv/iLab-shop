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

  (shop)/
    layout.js                       wraps public pages in ShopShell
    page.js                         Shop home/catalog entry
    [brand]/page.js                 Brand page
    [brand]/[device]/page.js        Model/device page
    product/[slug]/page.js          canonical Product detail
    checkout/
      page.js
      CheckoutClient.js
      checkout.module.css
    account/
      page.js
      AccountActions.js
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
    Breadcrumbs.js
    CartContext.js
    CartDrawer.js
    ContactPanel.js
    DeviceProducts.js
    ProductPurchase.js
    SearchContext.js
    SearchPanel.js
    ShopCtaDock.js
    ShopFullscreenPanel.js
    ShopHeader.js
    ShopShell.js
    contactData.js
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

app/api/admin/check/route.js
app/api/admin/products/...
app/api/admin/product-images/route.js
app/api/admin/devices/...
app/api/admin/product-types/...
app/api/admin/users/...
app/api/admin/orders/...
```

## Lib — Auth
```text
lib/auth/
  roles.mjs
  userModel.mjs
  userProfiles.js
  serverAuth.js
  sessionAuth.js
  clientSession.js
  adminMutationAuth.js
```

## Lib — Commerce/public
```text
lib/commerce.mjs
  commerce constants, applicable price, cart normalization/line resolution

lib/shopCatalog.js
  public hierarchy/Product/Search catalog reads/serialization

lib/shopProducts.js
  public paginated Product API data

lib/searchCatalog.mjs
  in-memory Search normalization/index/ranking

lib/shopOrders.js
  Cart resolution, Checkout validation, Order transaction, history/admin updates
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

lib/adminCatalogHttp.js
lib/adminCatalogValidation.mjs
lib/adminEditingState.mjs
```

Keep private/admin serializers separate from public serializers.

## Tests
```text
tests/admin-catalog-validation.test.mjs
tests/admin-device-tree.test.mjs
tests/admin-editing-state.test.mjs
tests/admin-product-catalog.test.mjs
tests/admin-product-compatibility.test.mjs
tests/admin-product-types.test.mjs
tests/admin-product-validation.test.mjs
tests/admin-user-catalog.test.mjs
tests/admin-user-management.test.mjs
tests/authorization.test.mjs
tests/commerce.test.mjs
tests/public-search.test.mjs
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
