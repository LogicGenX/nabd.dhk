# Admin Lite Field Notes

This note captures the storefront expectations so the lightweight admin only surfaces the data the UI actually consumes.

## Products

- Required core fields: id, title, description, images[].url, and a single price exposed through the first variant/price in Medusa (product.variants[0]?.prices[0]?.amount). See app/product/[id]/page.tsx and components/ProductGrid.tsx.
- Image usage: the UI pulls product.thumbnail first, then product.images[0].url as a fallback across listing, product, and search cards. There is no separate alt-text or gallery metadata.
- Pricing: the UI divides the stored amount by 100 and assumes a single currency (currently configured for Bangladeshi Taka (BDT)). Additional prices or currencies are ignored.
- Variants/options: only the first variant is read. There is no size or option selector on PDP yet; any size chips in the shop filters are UI-only placeholders and never sent to Medusa.
- Inventory/stock levels are not surfaced anywhere in the storefront today.

## Collections & Categories

- Collections are fetched via medusa.collections.list() and displayed by title and id in components/ShopDropdown.tsx, components/CollectionsFilter.tsx, and the shop page state. Counts are derived by calling medusa.products.list({ collection_id }).
- Categories come from medusa.productCategories.list() and rely on the name field. CategoryChips matches a hard-coded shortlist (T-Shirts, Pants, Sets, Accessories) by name, so those category names must exist in Medusa for the chips to render.
- Categories are also used for search suggestions and for filters, again referencing only id, name, and derived product counts. No hierarchy or additional metadata is consumed.
- Product tags are not referenced anywhere in the frontend codebase; Admin Lite does not need to expose or manage tags right now.

## Search & Discovery

- Product search cards (components/SearchOverlay/index.tsx) reuse the same minimal product shape (id, title, thumbnail, first price). Categories matching the query string are surfaced, but collections are not.
- Sorting inputs in the shop page write order=price or order=-price to Medusa's /store/products list call. Any additional sort options would require API support.

## Checkout & Customer Data Capture

- The current checkout page (app/checkout/page.tsx) is a local-only form that gathers name, address, and a payment method choice (bkash or cod). It does not collect email, phone number, or split shipping/billing addresses, nor does it submit to Medusa yet.
- Cart state (lib/store.ts) stores per-line: id, title, price, quantity, and an optional image URL. Nothing else is persisted.
- There is no UI for gift or order notes or special instructions.

## Payments & Fulfillment

- Payment options exposed to shoppers are bKash and Cash on Delivery, matching the Medusa plugins (plugins/bkash, plugins/cod). The frontend assumes manual capture flows; no client-side capture or refund handling exists.
- Shipping options should currently stay generic with no promised delivery timeline; avoid quoting shipping durations until ops finalizes the SLA, and these checkout selections still are not wired to Medusa fulfillment data.

## Implications for Admin Lite

- Product forms should focus on title, description, primary media (thumbnail plus gallery URLs), collection assignment, one or more categories, and a single price per SKU. Multi-variant UI can be deferred until the storefront requires it.
- Ensure the Admin Lite product flow enforces collection and at least one category, aligned with the existing product-policy Medusa plugin.
- Orders and customers functionality must assume single-currency pricing and no partial captures or refunds at this stage.
- Checkout work is needed to supply full customer contact info (name, email, phone if desired) and structured addresses before the new admin pages can display them. Keep this limitation in mind when shaping Admin Lite fields.
