Admin Lite SOP
==============

The Admin Lite dashboard is the daily driver for nabd.dhk operations. Access is limited to staff with valid Medusa admin credentials; sessions are represented by an httpOnly cookie issued from the Next.js proxy after a successful login.

Access & Authentication
-----------------------
- Frontend lives on the Vercel deployment under /admin/lite.
- Requests flow browser -> Next.js API proxy -> Medusa backend /admin/lite.
- Admins sign in at /admin/login; the proxy exchanges their credentials for a Medusa bearer token and stores it in a secure cookie. Tokens never touch localStorage.

Pre-flight checklist
--------------------
1. Confirm staging and production Medusa instances export the Admin Lite API (docker redeploy required).
2. Ensure MEDUSA_BACKEND_URL is reachable and MEDUSA_ADMIN_CORS allows the Vercel origin. Keep ADMIN_LITE_ALLOWED_ORIGINS in sync with the deployed frontend domains.
3. Verify JWT_SECRET is configured on Medusa; the proxy now calls /admin/auth/token for all sessions.

Day-to-day tasks
----------------
**Review orders**
- Go to Orders list -> filter by payment or fulfillment status.
- Click an order to view line items, addresses, payment, and fulfillment timeline.
- Use "Capture" (or "Mark as paid") after verifying payment, "Refund" for full refunds.
- Update fulfillment with "Mark shipped" (add tracking) or "Mark delivered" once courier confirms.
- Add internal notes for status changes or customer context; notes stay internal in metadata.admin_lite_notes.

**Manage customers**
- Search customers by email or name.
- Update name or phone, or leave a customer note (stored in metadata.admin_lite_customer_note).
- Review the last five orders from the customer profile.

**Manage products**
- Open Products to review titles, status, pricing, and stock; collection and size filters hydrate from /api/lite/catalog.
- Use “+ New collection” / “+ New category” in the product form to create Medusa collections and categories on the fly.
- Use Add product to upload media, assign collections/categories, and set BDT pricing (values are stored in minor units).
- Variant inventory controls persist Medusa manage_inventory, inventory_quantity, and allow_backorder for each variant.
- The In stock / Out of stock toggle calls /api/lite/products/:id/inventory to zero quantities and disable backorders when off, restoring a minimum quantity of 1 (and the original backorder flag) when re-enabled.
- Size filters and variant size inputs read from the Size option; adding or editing Size values refreshes the filter list after save.
- Tags are intentionally unsupported in Admin Lite.

**Exports**
- Orders CSV export is available under Orders -> Export. Download the CSV for finance or reconciliation.

Deprecated Medusa Admin
-----------------------
- The legacy Medusa Admin UI is no longer linked. Nginx no longer exposes /admin.
- In emergencies, enable the legacy admin by manually updating nginx.conf and MEDUSA_ADMIN_CORS, then revert after use.

Operational guardrails
----------------------
- Orders remain single currency (BDT). Amounts are minor-units; convert to BDT by dividing by 100 for human-readable views.
- Shipping timelines must not be promised until operations finalizes the SLA. Keep copy generic ("delivery timing to be confirmed").
- Do not add new PII fields without confirming compliance requirements.
- Rate limits default to 120 requests per minute. Adjust cautiously if Vercel proxy batching triggers 429s.

API Notes
---------
- /api/lite/catalog responds with { collections, categories, sizes } and omits tags.
- POST /api/lite/catalog/collections and /api/lite/catalog/categories create catalogue metadata and return the newly created resource for immediate selection.
- Ensure the Medusa backend has the product categories feature flag enabled (`product_categories: true` in `medusa-config.js`) and migrations applied so category creation succeeds.
- Backend boots now run migrations automatically; if you need to skip them set `MEDUSA_SKIP_MIGRATIONS=true` before starting the service.
- Proxy handlers force accept-encoding: identity and drop hop-by-hop headers to match Vercel expectations.

Support playbook
----------------
- 401 or 403 responses: confirm the Medusa session token has not expired (users may need to log in again) and verify ADMIN_LITE_ALLOWED_ORIGINS.
- 429 responses: review rate limit env vars or investigate automation loops.
- Unexpected 5xx: check Medusa logs, ensure JWT_SECRET is present, and restart the service if config changed.
- For feature requests, document UX, payload, and backend surface first; keep scope lean.

Smoke checklist after deploy
---------------------------
- Login works.
- /api/lite/catalog returns 200.
- Products list shows the Sizes filter and real values.
- Product row toggle flips stock correctly.
- Variant quantity edits persist.
- Creating a category/collection updates the filters after refresh.
