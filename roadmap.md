# Order Local — Roadmap

**Purpose:** A single home for tracked-but-deferred work. Items live here when they've been scoped enough to act on later but aren't right for the current moment. Re-prioritize before each new build cycle.

**Convention:** Items are tagged by tier. Tier 1 is things every new vendor encounters in their first week — get these right before outreach, no rush. Tier 2 is launch polish. Tier 3 is post-launch. Tier 4 is punted or deliberately not pursued.

Last updated: April 2026.

---

## Tier 1 — Vendor first-week experience

Items vendors will encounter in their first week of use. The bar is "first impression reflects the product's quality" — these get polished thoughtfully before vendor outreach begins. No external timing pressure; doing these well matters more than doing them fast.

**Convention notes:**

- Items here gate vendor outreach, not internal milestones
- Polish here is intentional; polish elsewhere is deferred until evidence justifies it
- When something feels mostly-done but not quite, it stays here until it's actually done

### Pickup Windows feature (THE WEDGE)

**Status:** Not started. Single biggest piece of work between now and launch.

**Why it matters:** This is the actual differentiator from ChowNow, Square, and every restaurant-first competitor. Pre-order with a defined pickup window (Saturday market 9am–noon, Thursday at the shop, Thanksgiving 9am–2pm only) is what makes Order Local fit makers/bakers/growers/farmers market vendors. Without it, the wedge is a slogan, not a product.

**Scope:**

- New schema tables: `pickup_locations` (name, address, notes), `pickup_windows` (location FK, start/end datetime, recurrence rule, cutoff datetime, customer-visible notes, per-window inventory caps)
- Vendor dashboard: replace the current free-form Schedule UI with a structured Pickup Windows manager. Create/edit/delete windows. Recurring weekly schedules (e.g., "every Saturday 9am–noon at Cobblestone Market until Nov 30"). One-off special-event windows (Thanksgiving, holidays). Per-window inventory caps and cutoff times.
- Customer-facing storefront: at checkout, customer picks a pickup window from the available set. Sold-out windows hide or disable. Cutoff-passed windows hide.
- Order list: orders group by pickup window so a vendor can see "everything to bring to Saturday's market" in one view.
- Order lifecycle reshape happens here — adds a "Scheduled" state for orders placed for a future window. (Previously deferred separately; consolidating into Pickup Windows because doing it independently would generate ~30% rework when this feature lands.)

**Estimated effort:** Multi-week. Phase-gated: schema + migration → vendor manager UI → customer checkout integration → order list grouping → lifecycle reshape.

**Trigger:** Next major prompt after CatalogItemForm extraction lands.

---

### 30-min vendor setup gauntlet test

**Status:** Pending — Scott to run himself.

**Why:** The pricing pitch promises "set up in 10 minutes." Need to actually time it end-to-end with a fresh account: signup → connect Stripe → add 5 catalog items → set pickup hours → share link → take a test order. Anywhere it takes longer than 10 min is a launch-blocking polish target.

---

### Stripe Connect end-to-end real-money test

**Status:** Pending — Scott to run himself.

**Why:** A payment bug in week 1 with a real vendor is a refund AND a churn. Test payouts, refunds, and dispute flow with a real $1 charge before a single vendor signs up. Existing Stripe Connect setup needs verification, not building.

---

### Terms of Service + Privacy Policy

**Status:** Pending.

**Options:** Termageddon ($10/mo template service) or attorney ($800–1,500 for done-right). Don't copy a competitor's text verbatim. Required because the platform processes payments and holds customer data.

---

### Support email + autoresponder

**Status:** Pending.

**Why it matters:** Vendors need somewhere to write when something goes wrong. A dedicated address with a polite autoresponder is sufficient for the first 50 vendors and infinitely better than nothing.

**Scope:**

- Set up support@getorderlocal.com forwarding to founder inbox
- Configure autoresponder: "We've got it, expect a reply within 24 hours, urgent matters: [text alternative]"
- Surface the address everywhere: dashboard footer, confirmation emails, ToS, error pages, Resources page
- Document internal SLA: 24h response, 48h resolution for non-critical, real-time for payment issues

**Estimated effort:** Half a day. Most of that is configuring the autoresponder and updating templates.

**Trigger:** Before any vendor outreach. Vendors who can't reach support are vendors who churn loudly.

---

### Vendor onboarding walkthrough

**Status:** Pending.

**Scope:** First-time vendor checklist on the dashboard Overview page. Items: "Add logo / Add first item / Set pickup hours / Share link." Audience-appropriate empty states across the dashboard so a new vendor never sees a blank screen with no next action.

**Why:** The merchants who hit "first real order" stay; the ones who don't, churn. Onboarding completion is the leading indicator of retention.

**Estimated effort:** Modest — checklist component + per-page empty states. 3–5 days.

**Trigger:** After Pickup Windows lands and the dashboard's information architecture is stable.

---

### Tutorial videos and how-to page

**Status:** Pending.

**Why it matters:** The pitch promises "set up in 10 minutes." Vendors who hit a wall in their first week and don't see a tutorial churn silently. This is also the first time the product has to teach itself to someone who didn't get the in-person walkthrough.

**Scope:**

- Loom (or similar) recordings of 5 core workflows: signup, add catalog item, set pickup hours, share storefront link, manage first order
- Simple page in the dashboard or marketing site listing the videos with short descriptive copy
- Embedded inline-help links from relevant dashboard pages — subtle, not intrusive

**Estimated effort:** Half a day recording + half a day page setup + half a day inline-help links. 1–2 days total.

**Trigger:** Before any vendor outreach. The tutorials are the difference between "10-minute setup that works" and "vendor stares at empty dashboard and emails support."

---

### Homepage rewrite (v1)

**Status:** Pending.

**Why it matters:** Prospect vendors evaluate the homepage before signing up. The current homepage has stale restaurant-DNA copy and doesn't sell the wedge differentiator (Pickup Windows, makers/bakers/growers focus) or the recently-shipped capabilities.

**Scope:**

- Reframe top-of-page copy around the wedge audience (makers, bakers, growers, market vendors) — not generic "online ordering"
- Sell Pickup Windows as the centerpiece (production-view aggregation, per-occurrence overrides)
- Sell the no-commission-stripe-direct payment angle (vs Square/ChowNow)
- Sell setup speed (10 minutes, no contracts)
- Update the audience strip with the canonical list: Bakeries · Farm stands · Butchers · Florists · CSA boxes · Food trucks · Coffee shops · Specialty makers · Market vendors
- Sweep stale "menu"/"preparing"/"quick service" copy across all marketing pages — this work absorbs the scope of the Tier 2 Marketing site copy sweep item
- Note: this is v1. A v2 polish pass with real vendor screenshots and testimonials should land 1–2 months after the first paying vendors.

**Estimated effort:** 2–3 days for v1 including the marketing-site copy sweep.

**Trigger:** Before vendor outreach. The homepage is the prospect's first impression after the in-person pitch.

---

### Mobile UX — tables, actions, and inner navigation

**Status:** Pending.

**Why it matters:** Vendors manage orders from phones at markets and during deliveries. If the dashboard is unusable on mobile, the product is effectively desktop-only — which contradicts the core use case. Every mobile vendor hits this day one.

**Scope:**

- Audit every dashboard table for mobile behavior (orders, catalog items, pickup windows, locations)
- Pick a responsive pattern per table — likely card-stack at narrow widths for heavy tables, hide-non-essential-columns for lighter ones
- Make hover-revealed actions always-visible on mobile (responsive pattern, not hover-only)
- Make `/account` inner sidebar a mobile pattern (tabs or drawer); apply same to `/settings` if it has the same problem

**Estimated effort:** 2–3 days for table responsive treatment; half a day for the sidebar nav. Done as one batch — same family of concerns, same testing surface.

**Trigger:** Before any vendor outreach. Mobile is half the audience by hours of dashboard use, more than half by frequency of access.

---

### Vendor timezone field in onboarding

**Status:** Pending. Created from Pickup Windows Phase 0 design.

**Why:** Pickup Windows Phase 1 adds `vendors.timezone` as a required column with a migration default of `America/New_York` for existing vendors. This default is fine while only NC-based vendors exist, but any vendor signing up from outside Eastern time will silently get the wrong timezone applied to their pickup windows — meaning RRULE materialization expands "Saturday 9am" in the wrong zone, the cutoff comparison runs against wrong wall-clock time, and the customer-facing slot selector displays times the vendor didn't intend.

**Scope:**

- Add a timezone field (IANA selector or auto-detect from browser) to the vendor signup or first-run onboarding flow
- Default to detected timezone, let vendor confirm or change
- Surface vendor timezone read-only on Settings/General so vendors can see what's set and contact support if it's wrong
- No need for vendor-initiated TZ changes after first set — that's a support flow, not a self-serve feature

**Estimated effort:** Half a day. Small scope but blocks any non-Eastern-TZ vendor from signing up successfully.

**Trigger:** Before the first vendor outreach campaign that could reach a vendor outside Eastern time. If outreach stays Triad-area NC for the first wave, this can wait. The moment outreach goes broader, this is required.

---

### Drizzle snapshot rebuild

**Status:** Pending. Surfaced during Pickup Windows Phase 1.

**Why:** `bun run db:generate` is currently broken — it requires interactive TTY because the Drizzle snapshot in `drizzle/meta/` is stale. The baseline snapshot only reflects migration 0000; migrations 0001–0003 (and now 0004, 0005) were all written manually. Each manual migration compounds the drift. By Phase 4 of Pickup Windows (occurrence generation, which will need another migration if any new fields land), this drift will be deep enough that any attempt to run `db:generate` will produce nonsense — diffing against a stale baseline rather than current reality.

**Scope:**

- Run `drizzle-kit introspect` against the dev Neon database to rebuild a snapshot from current truth
- Verify the introspected snapshot matches the schema source files exactly (any disagreement is a real bug — schema and DB have drifted)
- Reconcile any drift found (expected: zero or near-zero, since manual migrations have been disciplined)
- Replace the stale snapshot with the introspected one
- Confirm `bun run db:generate` runs cleanly without interactive TTY against a fresh schema change (test by adding a no-op column, generating, then reverting)
- Document in CLAUDE.md: "schema changes go through `db:generate` — no manual SQL migrations" as a project convention going forward

**Estimated effort:** 2–4 hours. Risk is low (introspect is read-only, nothing to break) but the reconciliation step is where time goes if drift is found.

**Trigger:** Before Pickup Windows Phase 4 (the next phase that's likely to add migrations). Letting it slip past Phase 4 means Phase 4's migration is also hand-written, deepening the problem.

---

### Production cron wiring — Pickup Windows materialization

**Status:** Pending. Created from Pickup Windows Phase 4 design.

**Why:** Phase 4 builds the materialization endpoint at `/api/cron/materialize` (auth-protected, callable via HTTP). Phase 4 deliberately does NOT wire up the Netlify Scheduled Function that calls it nightly — that's deploy infrastructure, not feature code, and it doesn't matter operationally until the rolling 12-week horizon starts to age (roughly 4+ weeks after the first template is saved). On-save materialization handles immediate cases.

**Scope:**

- Create `netlify/functions/materialize.mts` — a thin (~10 line) Netlify Scheduled Function that calls `https://getorderlocal.com/api/cron/materialize` with the `Authorization: Bearer $CRON_SECRET` header
- Add the `@netlify/functions` package as a dependency
- Add a `[[scheduled-functions]]` stanza to `netlify.toml` pointing at the function file with a daily schedule (suggest: `cron = "0 7 * * *"` — 7am UTC, ~2–3am Eastern, low traffic window)
- Set the `CRON_SECRET` env var in Netlify deploy environment
- Document the deploy-side configuration in CLAUDE.md and/or README

**Estimated effort:** 1–2 hours including verification that the function actually fires on schedule (Netlify's UI shows function run logs).

**Trigger:** Before any vendor's first pickup window template ages past the 12-week horizon. In practice: anytime in the 4–6 weeks after Phase 4 ships. Easy to forget — worth landing soon after Phase 4, not at the last minute.

---

### Cart validation against current catalog

**Status:** Pending. Surfaced during Pickup Windows Phase 5 verification.

**Why:** The cart references catalog items by ID. When a vendor archives or deletes an item, customers with open carts (in-flight tabs, mobile sessions) still have stale references. Hitting checkout with a stale cart produces a 500 error from a foreign-key violation on the `order_items` INSERT. The customer sees a generic payment failure with no path to recovery.

This is a real production failure mode for a real-world workflow: a vendor pulls an item at 8am because they sold out at the morning market; a customer who built their cart at 7:45am hits checkout at 8:15 and gets cryptic failure.

**Scope:**

- At checkout (in both `/api/create-payment-intent` and `/api/create-checkout`), validate every cart item's `catalogItemId` against the current `catalog_items` table BEFORE creating the order
- For each missing or status-changed item (deleted, archived, hidden, sold-out), return a structured 400 response naming the affected items
- Cart UI handles the response by removing the unavailable items, surfacing a banner ("These items are no longer available: X, Y"), and letting the customer review their updated cart before retrying
- Consider also re-validating prices: if the vendor changed an item's price after the customer added it, the cart's price might be stale. Whether to enforce or just surface this is a UX call.
- Pair with optional cart-page background validation: when the cart loads, validate items in the background and warn proactively, so the customer doesn't get the surprise at the payment step

**Estimated effort:** Half a day for server-side validation + structured error response. Another half-day for cart UI handling. So 1 day total, single focused session.

**Trigger:** Before public vendor outreach. The current behavior — a 500 with no recovery path — produces customer-side friction that a vendor would notice and complain about within their first few orders. Land before any real customer carts exist.

---

## Tier 2 — Launch polish

### Forms & UI shadcn-svelte audit

**Status:** Active technical debt. CatalogItemForm extraction (in progress) deliberately uses raw HTML inputs matching the existing edit form, not shadcn primitives. CLAUDE.md says "Components: shadcn-svelte primitives + Iconify." The codebase has drifted.

**Goal:** Bring every form, button, dropdown, dialog, and selection control across the dashboard into consistent compliance with the shadcn-svelte rule. Codify the canonical patterns so future work follows them automatically.

**Scope (in):**

- Inventory every form/control across dashboard, settings, catalog, orders, account areas
- Identify which use shadcn primitives today vs raw HTML
- Identify controls that don't use a primitive but should (custom toggles, ad-hoc date pickers, inline confirmation prompts)
- Document canonical patterns: which primitive for which use case, validation error rendering, disabled states, focus rings
- Migrate highest-traffic surfaces first (catalog item form, order detail, settings forms)
- Codify patterns in CLAUDE.md

**Scope (out):**

- Customer-facing public storefront (its own CSS variables driven by vendor branding — different design constraints)
- Marketing site (separate property)
- Pages pre-launch deferred (Promos & Loyalty add-on flows, etc.)
- Anything requiring behavior changes, not just styling

**Approach when prioritized:**

1. Discovery prompt — full inventory of every form/control and which primitive it uses today
2. Decisions prompt — Scott's input on canonical patterns (validation style, error rendering, etc.) before any migration
3. Migration prompts in batches — one logical area at a time (catalog forms, then settings forms, then orders, etc.)
4. CLAUDE.md update codifying the patterns

**Estimated effort:** 1–2 weeks across batches. Not a single-prompt task.

**Trigger:** Should land before public launch but doesn't block customer outreach. The kind of work that makes the product feel deliberate rather than assembled.

---

### Marketing site copy sweep

**Status:** Pending. Tier 2 cleanup landed inside the dashboard but didn't touch marketing pages by design.

**Scope:** Sweep `/`, `/for-bakeries`, `/for-farmers-markets`, and any other marketing pages for stale "menu," "preparing," "quick service," and other restaurant-DNA holdovers. The marketing homepage `status: 'Preparing'` reference is a known leftover. There may be more.

**Note:** The Homepage rewrite (v1) in Tier 1 includes the full marketing-site copy sweep as part of its scope. If that item lands first, this item is done.

**Estimated effort:** 1–2 hours for a thorough audit + edits (if run standalone).

**Trigger:** Before the first vendor outreach campaign sends prospects to these URLs.

---

### Cart desktop alignment

**Status:** Resolved — verified non-bug. Playwright tests confirmed the anchor aligns perfectly with `<main>` at all viewport widths. Original report was likely a transient render state, browser zoom, or screenshot artifact. No code action.

---

### Dashboard Overview empty states

**Status:** Pending. Surfaced in the original screenshot audit but missed when this roadmap was first drafted.

**Why it matters:** The Overview page has empty Top Items and Order Type panels with no placeholder content when a vendor has no orders yet — just blank space. First-time vendors land here and see white voids. Empty states are where SaaS quality shows up most, especially on the first page a new user sees.

**Scope:**

- Top Items panel: when no orders exist, render an empty state with copy like "No orders yet — share your storefront link to get started" plus a one-click action (copy link / view storefront)
- Order Type panel: similar treatment with audience-appropriate copy
- Reconsider whether Overview needs both panels at all when there's no data — collapsing to a single "get started" panel may read better than two empty boxes
- This work pairs naturally with the broader onboarding flow (Tier 1) but stands alone as a polish item

**Estimated effort:** 2–4 hours including copy decisions.

**Trigger:** Before vendor onboarding flow lands, OR as standalone polish whenever the Overview page is being touched for another reason.

---

### Settings/General page audit

**Status:** Pending. Surfaced in the original screenshot audit but missed when this roadmap was first drafted.

**Why it matters:** The Settings/General page has fields for "Business name, type, address, phone, and website" — but the wedge audience has needs the current schema may not surface. Off-season toggle (for vendors who pause subscriptions in winter), market days display, and similar audience-specific concepts may need fields the page doesn't have yet.

**Note on overlap with Pickup Windows:** Multiple-pickup-locations support is being handled by the Pickup Windows feature itself (`pickup_locations` table). This audit should NOT add a "pickup locations" section to General settings — that lives in the Schedule feature. This audit covers everything else: business identity, contact info, off-season behavior, audience-specific niceties.

**Scope:**

- Read every field on Settings/General today
- Cross-reference against vendor needs from the Phase 0 vendor research and the wedge audience profile
- Identify missing fields that would actually get used (don't add fields speculatively — only what real bakers/farmers/florists would fill in)
- Identify fields that should be removed (anything restaurant-coded that survived the cleanup pass)
- Propose schema additions if needed; small migration

**Estimated effort:** Audit is 1 hour; implementation depends on what's surfaced. Likely half a day total if a few fields need adding.

**Trigger:** After Pickup Windows lands, since the feature will reshape Settings IA anyway. Don't audit General twice.

---

### Resources page content audit

**Status:** Pending. Verified working post-rename earlier in the session, but a content-quality audit was never done. Surfaced in the original screenshot review.

**Why it matters:** The Resources page (QR codes, shareable links, marketing materials) is load-bearing for the farmers market pitch. The vendor outreach playbook and market-manager one-pager both promise vendors can "print a QR code for your booth." If the Resources page doesn't actually deliver a print-ready QR code with vendor branding, the pitch is broken.

**Scope:**

- QR code generation: confirm it produces a high-resolution PNG/SVG at print scale (not a tiny screen-only version), confirm it links to the right URL (`/[vendorSlug]/catalog`), confirm vendor branding appears
- Shareable link: confirm the displayed URL is correct, copy-to-clipboard works, share targets work (Instagram, SMS, email)
- Embed code: if a website-embed feature exists per the Pro plan, confirm the snippet works
- Print-ready collateral: consider whether a downloadable PDF "tabletop tent" template (vendor logo + QR + "Order ahead online") would be worth adding for market booths

**Estimated effort:** Audit is 30 min; fixes depend on what's surfaced. Tabletop tent template is a stretch goal worth maybe 2 hours.

**Trigger:** Before any vendor outreach sends prospects to set up their account. The "print this for your booth" promise needs to actually work.

---

### Branding-to-storefront wiring verification

**Status:** Pending. The storefront polish prompt was supposed to wire the vendor's branding (logo, colors, banner) through to the public page. Whether this fully landed is worth a quick verification pass.

**Why it matters:** Branding is half the value of "your branded ordering page" — vendors will judge the product by how their own logo and colors look on the storefront. If the dashboard lets them upload a logo but the storefront ignores it, that's an embarrassing gap.

**Scope:**

- Set logo, banner, and three colors (background, foreground, accent) in `/dashboard/settings/branding`
- Verify each renders correctly on the public storefront
- Confirm absence handling: when a vendor has NOT uploaded a logo or banner, the storefront still looks intentional (typographic fallback, not a broken image)
- Confirm color contrast: extreme color choices by a vendor shouldn't make the page unreadable

**Estimated effort:** 30 min audit. Fixes depend.

**Trigger:** Before vendor outreach. This is a "does the product deliver on its promise" check.

---

### Order snapshot pattern documentation in CLAUDE.md

**Status:** Pending. Risk-flagged.

**Why:** Bug 1 ($NaN order detail) was caused by order JSONB snapshot shape drift. The fix landed but the pattern isn't codified. Future Pickup Windows work will likely need to write to and read from the same snapshot, and without docs the same drift can recur.

**Scope:** Add a CLAUDE.md section documenting:

- Order JSONB snapshot canonical shape (`basePrice` + `selectedModifiers: []`)
- That `orderItems.unitPrice` reads from `li.basePrice` in the snapshot
- Rule: any code that writes to or reads from the order snapshot must conform to this shape
- Migration strategy if the shape needs to change in the future

**Estimated effort:** 1 hour. Pure documentation.

**Trigger:** Before starting Pickup Windows feature work — ideally during the planning phase of that prompt so the snapshot shape is locked in before new write paths are added.

---

### Customer email-capture / repeat list

**Status:** Pending. Identified as a wedge differentiator for retention during Phase 0 vendor research.

**Why:** Most market vendors lose customers because they have no contact list. Building this for them is large retention value AND a sales hook ("we capture your customers' emails so you can email them next week"). One of the things ChowNow, Square, and Shopify don't do well for this audience.

**Scope:** At checkout, customer enters email (already does for the receipt). Vendor sees a "Customers" section in the dashboard with a list of every customer who's ever ordered, sortable by recency, total spend, order count. Optionally: "Email customers who ordered [X] before" type segmentation. CSV export.

**Estimated effort:** Medium — schema for customers table (or denormalize on orders), dashboard view, CSV export. Email sending itself can be deferred to a later add-on.

**Trigger:** After first vendors are live and have real customers. The feature requires customers to exist before it delivers value — first-week vendors have an empty customer list, so surfacing the panel before orders arrive is noise, not signal. Evaluated for Tier 1 promotion; kept here because the value activates after the first orders arrive, not before.

---

### Polling efficiency for `/api/orders-latest`

**Status:** Pending.

**Why it matters:** Current implementation polls every 15 seconds. At 100 vendors with dashboards open 8 hours/day, that's ~192,000 requests/day — non-trivial Netlify Functions cost before there's revenue to justify it.

**Scope:**

- Phase 1: smarter polling — exponential backoff when no new orders, longer intervals when tab is unfocused. 1–2 hours.
- Phase 2 (if needed): SSE (Server-Sent Events) for push-based updates. Native browser support, fits SvelteKit cleanly. Half a day if Phase 1 isn't sufficient.

**Estimated effort:** 2 hours for smarter polling; add half a day if SSE is needed.

**Trigger:** When polling cost becomes uncomfortable, or before scaling beyond ~25 vendors, whichever comes first.

---

## Tier 3 — Post-launch

### Item photo uploads polish

**Status:** Basic upload exists. Polish later.

**Scope:** Better image handling — resize/crop UI, multiple photos per item, drag-and-drop reorder, image optimization for the storefront.

**Trigger:** When vendors complain or when the storefront's photo grid needs to look more professional than what raw uploads produce.

---

### Onboarding flow + audience-appropriate empty states

(See Tier 1 — same item. If it doesn't land in Tier 1, it slides here.)

---

### Promos & Loyalty add-ons activation

**Status:** Schema/UI may exist; intentionally deferred from launch scope.

**Why deferred:** No real customers means no validation that vendors will use these. Premature activation accumulates UI complexity for features that may need redesign once real vendor feedback arrives.

**Trigger:** When 5+ paying customers ask for either feature, or when a specific vendor cohort (e.g., bakeries with subscription bread programs) needs them to convert.

---

### Advanced Analytics tease

**Status:** Deferred.

**Why:** A solo bakery owner with 5 orders a week doesn't need a dashboard. Analytics built before vendors have orders is vanity tooling that bloats the dashboard's nav.

**Trigger:** When the average paying vendor has 50+ orders/month — at that point analytics actually has signal to surface.

---

### Custom domains polish

**Status:** Already an add-on offering. Defer polish until vendor traffic justifies.

**Scope:** When ready: better DNS instructions, automatic Let's Encrypt cert provisioning, custom-domain-specific support docs.

**Trigger:** When 3+ Pro vendors purchase the custom domain add-on AND report friction.

---

### Customer-facing event calendar

**Status:** Conceptual. Connected to Pickup Windows.

**Scope:** Public page per vendor showing their upcoming pickup windows in calendar form. "Here's where to find us this month." Marketing surface for the vendor.

**Trigger:** After Pickup Windows is in production AND a vendor specifically asks for this view (don't build on speculation).

---

### iCal export / Google Calendar sync for pickup windows

**Status:** Conceptual. Connected to Pickup Windows.

**Scope:** Vendors can export their pickup-window schedule to their personal calendar. Customers can subscribe to a vendor's window calendar.

**Trigger:** Same as above.

---

### QuickBooks export integration

**Status:** Pending.

**Why it matters:** Bakeries and food vendors care about taxes. QuickBooks export is the highest-value accounting integration in their tooling stack.

**Scope:**

- Server endpoint producing QuickBooks-compatible CSV or QBXML (whichever format QuickBooks accepts cleanly)
- Dashboard page where vendors download monthly/quarterly reports
- Documentation on how to import into their QuickBooks instance

**Estimated effort:** 3–5 days depending on format requirements.

**Trigger:** 3+ vendors specifically request it. Don't build speculatively.

---

### Stripe Terminal integration

**Status:** Pending.

**Why it matters:** Retail vendors with physical counters (bakeries, farm stands with a shop) could let customers order ahead online, pick up at the counter, and add an in-person purchase to the same Stripe account.

**Scope:**

- Stripe Terminal SDK integration
- Dashboard page for terminal management (pair, unpair, transaction log)
- Receipt unification with online orders

**Estimated effort:** 5–7 days. Real integration work.

**Trigger:** 5+ retail vendors specifically request it.

---

## Tier 4 — Punted

### Native mobile apps

**Status:** Punted to year 2 minimum.

**Why:** Mobile-responsive web is enough for v1. ChowNow and Owner.com differentiate on native apps; Order Local doesn't need to match yet. The cost (Swift/Kotlin or React Native maintenance) is enormous for a solo founder.

**Trigger:** Customer feedback specifically asking for it AND $50K MRR or capital to hire a mobile dev.

---

### Multi-vendor team accounts

**Status:** Punted.

**Why:** Most v1 vendors don't need it. A solo bakery owner is the team. Adds significant auth/permission complexity for a feature that won't activate for 90% of users.

**Trigger:** When 3+ Pro vendors ask for it AND have multi-person operations.

---

### POS integrations (Square, Clover, Toast)

**Status:** Punted.

**Why:** ChowNow's main moat is 45+ POS integrations — but that's because they sell to restaurants where POS integration is table stakes. Order Local's audience (market vendors, bakeries, makers) is largely NOT POS-integrated. Many use Square as a card reader but not as inventory of record.

**Trigger:** When a Pro-tier retail bakery customer specifically requests Square integration AND has $200+/mo in MRR with Order Local. Build the one they ask for, not the matrix.

---

### Deliberately not pursued

The following were evaluated and consciously set aside — not deferred for later, but decided against. The reasoning is recorded here so the decision doesn't get re-litigated from scratch.

---

#### Venmo / CashApp / PayPal payment integrations

Stripe already handles cards, ACH, Apple Pay, and Google Pay — 95% of payment volume. Adding Venmo/CashApp recreates the payment chaos this product sells vendors away from. Each has its own integration cost, fee structure, and dispute process. PayPal Checkout could be a one-day add via Stripe Connect if a specific vendor requests it; Venmo and CashApp business APIs are not worth the lift.

---

#### Subdomain per vendor (sunrise-bread.getorderlocal.com)

Path-based URLs (`getorderlocal.com/sunrise-bread`) are simpler to build, share, and route. Subdomains require wildcard DNS, wildcard SSL, routing changes, and migration of every existing vendor link — for a marginally more branded URL that vendors who actually care about branding can already get via the custom-domain add-on.

---

#### Cloudflare migration (DNS or hosting)

No measured need. Current stack (Namecheap DNS, Netlify hosting) works fine for current scale. Cloudflare's value is DDoS protection, edge caching, and Workers — none currently needed. Migrate when there's a specific, measured trigger; not preemptively.

---

#### Ticket-based support system (Help Scout, Front, Intercom, Zendesk)

At fewer than 50 vendors, email forwarding to the founder inbox is sufficient. Ticket systems add structure and friction that costs more than it saves at this scale. Migrate when volume requires it.

---

#### Loyalty/rewards as a marketed feature

Schema scaffolding stays in the codebase for fast reactivation if vendors ask. But loyalty/rewards should NOT appear as a value prop on marketing pages. The Homepage rewrite (v1) in Tier 1 should make no mention of loyalty or rewards.

---

#### Redis / Memcache caching

SvelteKit load-function caching and Postgres-on-Neon are sufficient for current scale. Adding Redis preemptively introduces a new service to monitor and a new failure mode without measured benefit. When there's a specific measured bottleneck — name what's slow, name what gets cached, name the expected speedup — revisit.

**Trigger if revisited:** 50+ vendors with measurable page-load complaints. Until then, prefer query efficiency (indexes, N+1 elimination), which costs nothing operationally.

---

#### Mailchimp / HubSpot CRM integrations

The customer-email-capture roadmap item covers most of the "build a customer list" need natively. CRM integrations add complexity for marginal additional value. Vendors who need full CRM workflows are not the wedge audience; redirect them to use CSV exports.

---

## Working notes

### Standing conventions reminder

Items added to this roadmap should specify, at minimum:

- Status (not started / in progress / blocked)
- Why it matters (one paragraph max)
- Scope (what's in, what's out)
- Estimated effort (rough days/weeks)
- Trigger (what condition makes this the next thing to work on)

### Re-prioritization cadence

Review this list before any new build cycle. Specifically: when a build cycle is about to start, ask "did anything on this list become more urgent than what I was about to build?" The primary Tier 1 question is: "does this affect what a new vendor encounters in their first week?" If yes, it belongs in Tier 1. Then proceed. The roadmap is a checkpoint, not a queue.

### Evidence-gated items

Items in Tier 3 and Tier 4 should not be built without explicit vendor evidence: a specific request, a measured friction point, or a named cohort that needs the feature to convert. "Seems useful" is not sufficient. Name the vendors, name the ask, name the expected behavior change. Items already in Tier 3 with a trigger condition stay there until the trigger fires.

### Item lifecycle

When an item is actively being worked on, it leaves the roadmap and lives in CLAUDE.md or a dedicated prompt. When it ships, it's deleted from the roadmap. The roadmap is for _deferred_ work only.
