# iLab Shop

Next.js storefront and administration application for iLab repair-parts sales.

Public deployment path: `https://ilab.lv/shop`

The application is mounted with `basePath: "/shop"`.

## Stack
- Next.js 16.3.5 / App Router
- React 19.2.8
- Firebase Authentication
- Firestore
- Firebase Storage
- Firebase Admin SDK
- Vercel
- CSS Modules + centralized CSS design tokens
- Node built-in test runner
- `@dnd-kit` for existing admin reorder interactions

## Commands
```bash
npm run dev
npm test
npm run lint
npm run build
npm start
```

Local public URL: `http://localhost:3000/shop`

## Documentation
- `AGENTS.md` — mandatory repository instructions
- `docs/README.md` — documentation index
- `docs/architecture.md` — routes, data flow, providers, server/client boundaries
- `docs/domain-rules.md` — users, pricing, catalog, cart, checkout and orders
- `docs/design-system.md` — design tokens and UI identity
- `docs/development-rules.md` — reuse, implementation and admin-editing conventions
- `docs/file-map.md` — selective structural map

## Important routing rule
Next.js navigation uses internal routes without `/shop`, e.g. `/product/example`, `/account`, `/admin/products`. Next applies the configured `basePath`.

Raw browser requests to route handlers currently use mounted URLs such as `/shop/api/cart/resolve` and `/shop/api/orders`.

## Firebase
The shop uses Firebase project `ilab-v2`.

Primary collections:
```text
shopProducts
shopDevices
shopProductTypes
shopOrders
shopSettings
users
```

See `docs/domain-rules.md` for authoritative application rules.
