Admin Lite Orders & Customers API
================================

All routes live under /admin/lite and require a Medusa admin bearer token (Authorization: Bearer <token>). The Next.js proxy obtains this token at login and injects it for every request. Responses use JSON unless noted. Amounts are returned in minor units for the configured currency (BDT).

Rate limiting defaults to 120 requests per minute per client IP (configurable via ADMIN_LITE_RATE_LIMIT).

Authentication & Headers
------------------------
- Authorization: Bearer <jwt> or x-admin-lite-token: <jwt>
- Content-Type: application/json for write operations
- Optional Origin or X-Forwarded-Origin must match ADMIN_LITE_ALLOWED_ORIGINS

Orders
------
List Orders — GET /admin/lite/orders
------------------------------------
Query parameters:
- limit (default 20, max 50)
- offset
- q — search by order id, display id, or customer email
- payment_status — comma-separated statuses (awaiting, captured, refunded, etc.)
- fulfillment_status — comma-separated statuses (not_fulfilled, shipped, ...)
- created_from, created_to — ISO timestamp or YYYY-MM-DD

Response schema (simplified):
- id, display_id, order_number
- created_at, updated_at
- currency_code
- customer { name, email, phone }
- totals { subtotal, shipping_total, tax_total, discount_total, total }
- payment_status, fulfillment_status
- items_count
Retrieve Order — GET /admin/lite/orders/:id
-------------------------------------------
Returns the full order with line items, billing and shipping addresses, customer profile, totals breakdown (subtotal, shipping, tax, discounts, total, paid, refunded), payment summary, fulfillment summary, and notes sourced from metadata.admin_lite_notes.

Update Payment — PATCH /admin/lite/orders/:id/payment
-----------------------------------------------------
Body fields:
- action: capture | refund | mark_paid
- reason (optional string, used for refund justification)

capture triggers orderService.capturePayment.
refund issues a full refund (fails if nothing captured).
mark_paid marks the payment as captured (for COD or manual flows).

Update Fulfillment — PATCH /admin/lite/orders/:id/fulfillment
-------------------------------------------------------------
Body fields:
- action: mark_shipped | mark_delivered | cancel_fulfillment
- tracking_number (optional)
- tracking_carrier (optional)

mark_shipped marks the first open fulfillment as shipped and persists tracking.
mark_delivered stamps metadata.admin_lite_delivered_at with an ISO timestamp.
cancel_fulfillment cancels the first open fulfillment.

Append Note — POST /admin/lite/orders/:id/note
----------------------------------------------
Body: { note: string }
Adds a timestamped entry to metadata.admin_lite_notes (kept to the most recent 50 entries).

Export Orders — GET /admin/lite/orders/export
---------------------------------------------
Query parameters mirror the list endpoint with independent limit (default 500, max 2000) and offset.
Returns text/csv with columns: order_id, order_number, created_at, customer_name, customer_email, customer_phone, city, country, items summary, subtotal, shipping_total, tax_total, discount_total, total, payment_status, fulfillment_status.
Customers
---------

List Customers — GET /admin/lite/customers
  - limit (default 20, max 50)
  - offset
  - q — search by email or name fragments
  Returns customers with id, email, first_name, last_name, display name, phone, created_at, updated_at, orders_count, last_order_at.

Retrieve Customer — GET /admin/lite/customers/:id
  Returns profile, addresses, metadata.admin_lite_customer_note, and the five most recent orders (id, display_id, status, payment_status, fulfillment_status, created_at, total).

Update Customer — PATCH /admin/lite/customers/:id
  Optional fields: first_name, last_name, phone, note (stored in metadata.admin_lite_customer_note).
  Response mirrors retrieve payload with updated information.

Error Codes
-----------
- 401 — missing or invalid token
- 403 — origin not allowed by ADMIN_LITE_ALLOWED_ORIGINS
- 400 — validation failure (missing fields, unsupported actions)
- 429 — rate limit exceeded
- 500 — configuration or server error (for example missing Admin Lite secret)

Products
--------

List Products — GET /admin/lite/products
  - Supports limit, offset, q, status, collection_id
  - Returns minimal product data for table views (title, status, price, thumbnail, updated_at)

Retrieve Product — GET /admin/lite/products/:id
  - Returns full product payload including collection, categories, images, thumbnail, price, and metadata

Create Product — POST /admin/lite/products
  Body fields:
    - title (string)
    - description (optional string)
    - handle (optional string)
    - status (published | draft | proposed)
    - collection_id (string)
    - category_ids (string array)
    - price (minor units)
    - images (string[] of URLs returned from /admin/lite/uploads)
    - thumbnail (optional string URL)

Update Product — PUT /admin/lite/products/:id
  - Same body fields as create (all optional). Passing price updates the primary variant price.

Catalog Helpers — GET /admin/lite/catalog
  - Returns collections and categories for form population.

Upload Media — POST /admin/lite/uploads
  - Accepts multipart form-data with field "files".
  - Returns uploads: [{ url }] suitable for use in product payloads.

