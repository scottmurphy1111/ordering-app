# Pre-launch Testing Checklist

Hands-on tests to run before Order Local opens to paying vendors. Each item requires a real browser session, database query, or live service interaction — these cannot be verified by static analysis alone.

Work through these on the production-equivalent dev environment (or staging). Check off each item only after actually observing the expected outcome.

---

## Auth & Onboarding

- [ ] Sign up with a new email → lands on `/dashboard` with setup checklist visible
- [ ] Sign up with an existing email → error shown (no duplicate account created)
- [ ] Log out → redirected to login
- [ ] Log back in → lands on `/dashboard`
- [ ] Access `/dashboard` while logged out → redirected to login
- [ ] Access `/admin` as a non-internal user → 404 or redirect (not visible)
- [ ] Access `/admin` as an internal user → admin panel renders correctly
- [ ] `is_internal` flag set on your production account via SQL before any launch testing

---

## Vendor Setup Flow

- [ ] Fresh vendor: setup checklist shows all 4 steps incomplete
- [ ] Add Stripe key in settings → checklist Stripe step marks complete
- [ ] Create a pickup window template → checklist Pickup windows step marks complete
- [ ] Create an available catalog item → checklist Catalog step marks complete
- [ ] Upload a logo → checklist Branding step marks complete
- [ ] All 4 steps complete → checklist auto-hides
- [ ] Remove logo → checklist reappears with Branding step incomplete

---

## Catalog

- [ ] Create a catalog item with all fields (name, description, price, image, category, tags, status)
- [ ] Item shows on storefront when status = `available`
- [ ] Item hidden from storefront when status = `hidden` or `draft`
- [ ] Sold out item shows as unavailable on storefront
- [ ] Edit an existing item → changes persist and reflect on storefront
- [ ] Delete an item → confirm dialog fires; item removed from list and storefront
- [ ] Create a category → appears in item form category dropdown
- [ ] Inline toggle switches available/unavailable correctly without page reload

---

## Pickup Windows

- [ ] Create a pickup window template (recurring)
- [ ] Cron materializes future windows → verify via `SELECT * FROM pickup_windows WHERE vendor_id = X ORDER BY starts_at` after running `bun run cron:materialize`
- [ ] Pickup windows appear on storefront for selection at checkout
- [ ] Past pickup windows do not appear on the storefront
- [ ] Edit a template → future unordered windows regenerate; windows with orders are untouched
- [ ] Delete a template → future unordered windows removed

---

## Storefront & Customer Checkout

- [ ] Storefront loads at `/{vendorSlug}/catalog`
- [ ] Items display correctly (name, price, image, description)
- [ ] Add item to cart → cart updates correctly
- [ ] Add item with modifiers → modifier selections persist in cart
- [ ] Remove item from cart → cart updates
- [ ] Select a pickup window → persists through to checkout
- [ ] Tip selector: hidden when `settings.enableTips = false`; visible when enabled
- [ ] ASAP pickup: hidden when `settings.asapPickupEnabled = false`; visible when enabled
- [ ] Proceed to Stripe checkout → Stripe hosted page loads
- [ ] Complete a test payment (Stripe test card `4242 4242 4242 4242`) → order created in DB
- [ ] Order confirmation email received at customer email
- [ ] Order appears in vendor dashboard under `/dashboard/orders`

---

## Orders — Vendor Dashboard

- [ ] New order appears in live view immediately after payment
- [ ] Order card shows correct customer name, items, price, pickup window
- [ ] Order status advances: Received → Confirmed → In production → Ready → Fulfilled
- [ ] Cancel an order → confirm dialog; order moves to Cancelled state
- [ ] Refund an order → confirm dialog; Stripe refund fires; payment status updates to `refunded`
- [ ] History page shows fulfilled and cancelled orders
- [ ] Search by customer name filters results
- [ ] Filter by status filters correctly
- [ ] Date range filter narrows results correctly
- [ ] Stale order auto-resolve: orders past their window + 7-day grace transition correctly on next page load

---

## Billing & Subscriptions

- [ ] Stripe Checkout session for a new subscription completes → subscription row created in DB
- [ ] Subscription active → `/dashboard/billing` shows current plan and renewal date
- [ ] Subscription past-due banner appears when payment fails (test via Stripe test card `4000 0000 0000 0341`)
- [ ] Pause billing → subscription pauses in Stripe; storefront shows pause copy ("Online ordering is temporarily unavailable")
- [ ] Resume billing → subscription resumes; storefront accessible again
- [ ] Switch plans (Starter ↔ Market) → plan updates in Stripe and UI
- [ ] Cancel subscription → cancel flow fires; account enters cancelled state
- [ ] Reactivate from cancelled state → subscription resumes
- [ ] Webhook events land in `system_events` table: `SELECT * FROM system_events ORDER BY created_at DESC LIMIT 20`

---

## Email

- [ ] Order confirmation email renders correctly (items, price, pickup window, vendor name)
- [ ] Email does not show `$NaN` for line item prices
- [ ] Email renders in light mode and dark mode clients (Gmail, Apple Mail)
- [ ] Reply-to address is monitored inbox, not a no-reply
- [ ] Emails do not land in spam (test across Gmail, Outlook, iCloud)

---

## Admin Panel

- [ ] `/admin` shows all vendors
- [ ] Vendor health indicators render correctly
- [ ] Cron monitoring shows last run time
- [ ] Manually trigger cron → `system_events` row written
- [ ] Pause/resume a vendor from admin panel → storefront reflects change

---

## Error & Edge Cases

- [ ] 404 page exists and is styled
- [ ] 500 page exists and is styled (test by temporarily breaking a route)
- [ ] Storefront for a paused vendor shows pause message (no items, no checkout)
- [ ] Storefront for a non-existent vendor slug → 404
- [ ] Expired/invalid auth session → redirected to login, not a crash
- [ ] Stripe webhook with invalid signature → 400 returned, no DB write

---

## Mobile

- [ ] Storefront at 375px (iPhone SE): items, cart, and checkout flow usable
- [ ] Dashboard at 375px: order cards, filters, and nav usable
- [ ] Hamburger menu opens and closes correctly on mobile
- [ ] Tap targets are large enough on mobile (buttons, toggles, links)

---

## Final Smoke Test

Three end-to-end runs before launch:

- [ ] **Run 1 — Internal:** you as vendor + you as customer. One full order, one cancellation.
- [ ] **Run 2 — Trusted external vendor:** invite one real person to set up a shop. Observe where they get confused.
- [ ] **Run 3 — Fresh customer:** a person who has never seen the product places an order. Observe.

---

## Production DB Verification

Run these queries on production after deploy:

```sql
-- Migrations applied
SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at;

-- No orphaned orders (orders with no vendor)
SELECT COUNT(*) FROM orders WHERE vendor_id NOT IN (SELECT id FROM vendors);

-- Internal user set
SELECT id, email, is_internal FROM users WHERE is_internal = true;

-- Cron fired (after first scheduled run)
SELECT * FROM system_events WHERE event_type = 'cron_run' ORDER BY created_at DESC LIMIT 5;
```
