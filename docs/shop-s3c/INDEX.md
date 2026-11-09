# S3C — Product catalog and detail

Model directories, model catalog pages, product cards, search-result rows, and product details now use the approved light, square, hairline catalog language. Model pages follow the reference sequence of model identity, part filters, live catalog, then repair interlink. Product details use a gallery/details split with description, repair interlink, and structured compatibility kept distinct.

Existing Firebase loading, model/product routes, filters, search, pagination, prices, availability, cart actions, and inquiry context remain in place. Cards and detail pages still use the shared purchase resolver: eligible items can be added to cart; missing-price and out-of-stock items remain visible and use inquiry. No data schema, Admin, Service, or commerce logic changed.

Validation: 43 focused catalog, search, commerce, and inquiry tests passed; lint passed. `next build` compiled, then failed prerendering `/sitemap.xml` because the environment could not reach the configured Firebase project (`connect EACCES`). No production data was changed. Rendered visual QA was not completed; the existing S3A runner writes into preserved historical evidence and its prior localhost binding attempt failed. Manual review should check a model route and product details at 375px, 1024px, and 1440px, including valid-price, missing-price, and out-of-stock products.

Known limitation: the build requires an isolated Firebase/emulator setup for sitemap data. No S3D cart, authentication, or checkout redesign has started.
