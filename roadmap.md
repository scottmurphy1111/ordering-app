# Order Local — Roadmap

**Purpose:** A single home for tracked-but-deferred work. Items live here when they've been scoped enough to act on later but aren't right for the current moment. Re-prioritize before each new build cycle.

**Convention:** Items are tagged by tier. Tier 1 is things every new vendor encounters in their first week — get these right before outreach, no rush. Tier 2 is launch polish. Tier 3 is post-launch. Tier 4 is punted or deliberately not pursued.

Last updated: April 2026.

---

## Tier 1 — Vendor first-week experience

Items vendors will encounter in their first week of use. The bar is "first impression reflects the product's quality" — these get polished thoughtfully before vendor outreach begins. No external timing pressure; doing these well matters more than doing them fast.

Tier 1 is split into two sub-tiers based on which outreach wave they gate:

- **Tier 1A — Pre-outreach blockers (first three vendors).** Load-bearing for the founding cohort. Cannot ship the product to vendor #1 without these. The founding cohort gets hand-walked through setup, so items that compensate for "no human in the room" (tutorials, polish, homepage clarity) move to 1B.
- **Tier 1B — Pre-fifty polish (before broader outreach).** Load-bearing once outreach scales beyond the founding cohort. The product has to teach itself, support itself, and produce a polished first impression to prospects you haven't met. These don't block first-three but do block first-fifty.

**Convention notes:**

- Items here gate vendor outreach, not internal milestones
- Polish here is intentional; polish elsewhere is deferred until evidence justifies it
- When something feels mostly-done but not quite, it stays here until it's actually done
- 1A items ship before any vendor outreach. 1B items can be in flight during the founding-cohort onboarding period, but should be done before reaching out to vendor #4.
- An item can move from 1B → 1A if a specific founding-cohort vendor needs it (e.g., a seasonal vendor in first three would promote any pickup-window seasonality work to 1A).

### Tier 1A — Pre-outreach blockers

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

### Remove delivery feature entirely

The delivery option is being cut from Order Local. Sweep three layers:

1. **UI:** Remove the delivery card from settings/general.
2. **Cart/checkout:** Remove delivery as a fulfillment option from the customer order flow.
3. **Schema:** Identify and remove any delivery-related fields, enums, or tables (likely fulfillment_type enum entries, delivery_address fields, delivery fee logic, etc.).

**Status:** ready-to-execute

**Scope:** Substantial — touches schema migrations, order flow, settings UI, and any business logic that branches on fulfillment type. Verify nothing breaks in the order pipeline post-removal. Existing orders with delivery fulfillment (if any in dev/test data) need a migration path or cleanup.

---

### Hardcoded brand green — sweep to design tokens

Brand green is hardcoded as Tailwind utility classes (`bg-green-600`, `text-green-600`, etc.) across the dashboard rather than referencing the token system. Means brand color changes require multi-file edits and blocks the "Brand the dashboard" Tier 2 vendor-theming item.

**Status:** ready-to-execute — but read the decision rule below before starting.

**Scope:**

- Add `--success` token to `src/routes/layout.css` (alongside `--primary`, `--destructive`). Value: `oklch(0.612 0.17 152.75)` initially (matches today's `--primary`, locks them as independent values). Add corresponding `@theme inline` mapping for `--color-success`. **Already done — token exists in layout.css.**
- Grep targets — sweep all of these:
  - `bg-green-600`, `bg-green-700`, `bg-green-50`, `bg-green-500`, `bg-green-100` (status pills only — most others)
  - `text-green-600`, `text-green-700`
  - `border-green-500`, `border-green-600`
  - `ring-green-500`
  - `hover:bg-green-700`, `hover:bg-green-50`
  - `#1d9e75`, `#16a34a`, `#15803d`, `#22c55e`, `#f0fdf4` (any inline hex equivalents)
- Per-callsite decision rule: "would a vendor with a purple brand want this element to be purple?"
  - **Yes** (primary action, CTA, brand affordance) → migrate to `bg-primary` / `text-primary` / `border-primary` / `ring-ring` / `bg-primary/10` (replaces `bg-green-50` for primary tint contexts)
  - **No** (positive indicator, money value, "paid"/"available"/"fulfilled" status pill, successful state confirmation) → migrate to `text-success` / `bg-success/10`
  - **Unclear** → flag the callsite for review rather than guessing. Common ambiguous cases: "Edit" links in row actions (probably themable), revenue figures in stat cards (definitely not), green checkmark icons in success Alert (not — Alert severity already encodes this).
- Status pill map (`statusStyles` in CLAUDE.md): leave as-is for this sweep. Status pills use `bg-green-100 text-green-700` — outside the sweep's grep targets and a separate future migration when status pill treatments are revisited (see Tier 2 "Status pills: replace with icons + semantic-color labels").
- Verification:
  - Static: `bun run check` clean, no remaining grep hits for the listed targets outside `statusStyles`.
  - Visual: dashboard primary actions, money values, and "paid"/"available" pills render identically to pre-sweep at default theme (no vendor accent applied).
  - Cross-context: render a primary action and a money value side-by-side. Confirm they look identical at default theme — that's the test that the sweep correctly classified them, since they'll diverge once vendor theming lands.

**Out of scope:**

- Vendor accent theming itself (sub-item A of "Brand the dashboard" Tier 2). This sweep is the precondition; the actual `--primary` override at vendor load is the next step.
- Status pill restyling (Tier 2 "Status pills: replace with icons + semantic-color labels"). Status pills keep their current `green-100`/`green-700` treatment through this sweep.

**Estimated effort:** Half a day. Most of the time is the decision-rule pass on ambiguous callsites and the visual verification, not the find-and-replace.

**Trigger:** Before the "Brand the dashboard" Tier 2 sub-item A (vendor accent theming) can ship. This sweep is the precondition. No external pressure on its own — internal-only work.

---

### Pickup window date bounds (start date, end date)

**Status:** Pending — needs-design for UI, scope clear for schema/expand.

**Why it matters:** Seasonal vendors are central to the wedge audience — farmers markets running May–October, holiday bakers active only in November–December, CSA seasons with defined start and end dates, summer-only farm stands. Today, pickup window templates have no way to express "starts on X" or "ends on Y" — recurrence is open-ended in both directions, with the cron extending occurrences on a rolling 12-week horizon indefinitely. Seasonal vendors are forced to either deactivate windows manually at season's end (and remember to reactivate next year), delete and recreate templates each season (losing history), or accept that occurrences keep generating during their off-season. None of those reflect a 10-minute setup story for a seasonal maker.

The current form (Name, Location, Days, Start time, End time, Cutoff hours, Max orders, Active) reads as "every selected day, forever" — which is wrong for the seasonal half of the audience.

**Scope:**

- Add two fields to `pickup_window_templates`: `recurrence_start_date` (nullable, defaults to template creation date) and `recurrence_end_date` (nullable, null = indefinite).
- Form additions: "Starts on" date picker (defaults to today), "Ends on" date picker with a clear "indefinite" / "no end date" option (default).
- `expandTemplate()` in `src/lib/server/pickup/expand.ts` honors both bounds. Pass `dtstart` from `recurrence_start_date` and `until` from `recurrence_end_date` to the RRULE expansion. Materialization continues to generate the 12-week rolling window but truncates at `recurrence_end_date` when set.
- Display in the templates list: include date bounds in the summary line when present (e.g., "9am–12pm · Every Sat · May 1–Oct 31 · Cutoff 48h"). When unbounded, omit — current "Every Sat" reads correctly for indefinite.
- Empty-bounds-list state: when a template's end date has passed and there are no future occurrences, the upcoming-windows section should communicate "season ended [date]" rather than render empty.
- Decision needed: when a vendor sets an end date that falls before existing future occurrences with attached orders, how does materialization behave? Recommended: orderful occurrences past the new end date are preserved (matches existing "future occurrences with orders are preserved" policy); orderless occurrences past the new end date are deleted on next materialize call. Document this in the materialize.ts policy comment.
- Cross-reference with the Tier 3 "Pause for the season" item: that one toggles the entire shop on/off. This one bounds individual templates. They serve different needs — a year-round bakery with a seasonal market booth wants per-window date bounds, not whole-shop pause. Both can coexist; not redundant.

**Out of scope (defer to Tier 2):**

- Non-weekly recurrence patterns (every other week, monthly on the Nth weekday, specific day of month, custom intervals). Tracked as a separate Tier 2 entry: "Pickup window non-weekly recurrence patterns." The two items compose cleanly — `dtstart` and `until` from this item apply identically across all recurrence kinds when the Tier 2 work lands.
- "Skip these specific dates" (holiday exceptions to a recurring pattern). Per-occurrence cancellation already handles one-off skips; bulk-skip is a separate feature.
- Auto-renewal of seasonal windows year-over-year ("repeat this May–Oct schedule next year"). Solvable later; for v1, vendors set new dates each season.

**Estimated effort:** 1–2 days. Schema migration is small (two nullable columns). `expandTemplate` change is narrow — add `dtstart` and `until` to the RRULE options. UI is two date pickers in an existing form. Materialization policy update for past-end-date occurrences is the most subtle piece; the rest is mechanical.

**Trigger:** Before any vendor outreach that targets seasonal makers (farmers markets, CSAs, holiday bakers). The wedge audience profile names these explicitly, so this gates outreach to those segments.

---

### Tier 1B — Pre-fifty polish

### 30-min vendor setup gauntlet test

**Status:** Pending — Scott to run himself.

**Why:** The pricing pitch promises "set up in 10 minutes." Need to actually time it end-to-end with a fresh account: signup → connect Stripe → add 5 catalog items → set pickup hours → share link → take a test order. Anywhere it takes longer than 10 min is a launch-blocking polish target.

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

### Mobile UX — tables and actions

**Status:** Pending.

**Why it matters:** Vendors manage orders from phones at markets and during deliveries. If the dashboard is unusable on mobile, the product is effectively desktop-only — which contradicts the core use case. Every mobile vendor hits this day one.

**Scope:**

- Audit every dashboard table for mobile behavior (orders, catalog items, pickup windows, locations)
- Pick a responsive pattern per table — likely card-stack at narrow widths for heavy tables, hide-non-essential-columns for lighter ones
- Make hover-revealed actions always-visible on mobile (responsive pattern, not hover-only)

**Estimated effort:** 2–3 days for table responsive treatment. Done as one batch — same family of concerns, same testing surface.

**Trigger:** Before any vendor outreach. Mobile is half the audience by hours of dashboard use, more than half by frequency of access.

---

### Toast notifications: no auto-dismiss, no manual dismiss

Toast messages shown after saving items or categories don't disappear automatically and have no X to dismiss them. Vendors are stuck with persistent toasts cluttering the UI.

**Status:** ready-to-execute

**Scope:** Identify the toast component, decide on auto-dismiss duration (5s standard? 8s for action-confirmation?), add dismiss X affordance with proper aria-label. Likely also fixes the toast dismiss X size question flagged in Batch 9 Checkpoint 2 (whether 32×32 is proportionally too large for the toast container).

---

### Cart → checkout page transition flash

Navigating from cart to checkout briefly shows an empty cart page (visual flash) before checkout content renders.

**Status:** needs-investigation

**Scope:** Diagnose the navigation flow. Likely a SvelteKit data-loading race where checkout's load function reads the cart but the cart component re-renders empty mid-transition. Common fix: ensure cart state persists in URL or store across the navigation, or add a loading skeleton to mask the transition.

---

## Tier 2 — Launch polish

### `locals.vendor` staleness in dev-bypass mode

**Status:** Pending. Surfaced during setup checklist implementation.

**Why it matters:** `locals.vendor` is cached in memory in dev-bypass mode (intentional optimization in `ensureDevSeed()`). Any function reading from `locals.vendor` for derivation logic gets stale data when the underlying DB row changes. Production is unaffected because `handleVendorContext` queries fresh per request, but dev verification of any feature touching these surfaces produces unreliable results.

**Affected surfaces (audit completed):**

- `/checkout/+page.server.ts:15` — reads `locals.vendor` for Stripe keys and vendor settings. Highest risk: stale Stripe keys would produce incorrect payment behavior in dev testing.
- `dashboard/analytics/+page.server.ts:9` — reads `locals.vendor?.addons` for feature gating. Low risk: addon changes are rare.
- `settings/pickup/+page.server.ts:10` — reads `locals.vendor!.timezone` for display. Low risk: timezone changes are rare.

**Pattern fix:** functions that derive logic from `locals.vendor` should query fresh from DB (using vendorId) instead of trusting the passed object. The setup checklist (`src/lib/server/setup/checklist.ts`) is the canonical pattern.

**Scope:**

- Update checkout to query Stripe keys / vendor settings fresh (or at minimum query Stripe keys fresh, leaving non-financial fields alone)
- Decide whether analytics and pickup-timezone surfaces are worth fixing (low impact suggests no)
- CLAUDE.md note codifying "derivation logic queries fresh, don't trust locals.vendor" already exists from the checklist work

**Estimated effort:** 1-2 hours for checkout (single-surface fix, narrow blast radius). Analytics and timezone surfaces are 30 min each if desired.

**Trigger:** Before any dev workflow involves real Stripe testing (the 30-min vendor setup gauntlet, the Stripe Connect end-to-end test). If those tests touch checkout in dev mode, the staleness bug would produce confusing failures.

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
  **Estimated effort:** 2–4 hours including copy decisions.

**Trigger:** Standalone polish — whenever the Overview page is being touched for another reason.

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

**Trigger:** After Pickup Windows lands, since the feature will reshape Settings IA anyway. Don't audit General twice. **Trigger fired: Pickup Windows shipped Apr 2026 — ready to prioritize.**

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

### Status pills: replace with icons + semantic-color labels

Current status pills (received, confirmed, in production, ready, fulfilled, cancelled) render as colored background pills which feel visually heavy and jarring across order list rows.

**Status:** needs-design

**Approach:** Each status gets a recognizable icon (received → inbox, confirmed → check, in production → cooking-pot, ready → bell, fulfilled → check-circle, cancelled → x-circle) plus the status label as neutral text. Color is preserved on the icon for at-a-glance scanability without the heavy background fill. Affects orders list, order detail, anywhere status is displayed.

**Scope:** Design the icon mapping per status (verify each icon reads correctly at small size), update the StatusPill component (or wherever status renders) to use the new pattern, sweep all callsites. Sibling-parity check: every status display surface adopts the new treatment in the same prompt.

---

### Show ordered items in live order cards

The /dashboard/orders order cards show order#, customer, total, pickup time, status, and action buttons but don't show what the customer actually ordered. Vendors need this info before fulfilling.

**Status:** ready-to-execute

**Scope:** Add a one-line item summary per order card. Format: "3× Sourdough Loaf, 2× Cinnamon Rolls". Truncation rule TBD during implementation — likely show first 3 items + "and N more" when over.

---

### Brand the dashboard — vendor accent color theming

The dashboard currently uses hardcoded brand green for primary actions across all vendors. Vendors should see the dashboard themed with their own brand color (already collected in branding settings).

**Status:** needs-investigation (sub-item-A is mechanical, sub-item-B is design)

**Scope:** Two layers.

**Sub-item A — Accent color theming (mechanical CSS variable work):** Set `--primary` CSS custom property at root level based on vendor data on load. Works with existing primitive system because Batch 7–9 consolidated to `bg-primary` references throughout. Requires the hardcoded brand green sweep (Tier 1 item above) to land first.

**Sub-item B — Visual decoration (gradient/pattern):** Subtle gradient or pattern using vendor colors on dashboard chrome (sidebar, header, card backgrounds). Aesthetic layer beyond accent theming. Design exercise needed: how does the gradient interact with content backgrounds? Fallback for extreme colors? Contrast preservation?

---

### Custom domains — add-on feature

Vendor add-on for connecting their own domain (vendor.com) to point at their Order Local storefront. Revenue add-on for paid tiers.

**Status:** needs-investigation

**Open question:** Can this be automated? Two paths:

- (a) Vercel-style automatic SSL/domain provisioning via hosting platform API — vendor enters domain, backend registers it, SSL provisions, DNS instructions shown. ~10 min setup. Scales well. Feasibility depends on hosting platform's API.
- (b) Manual coordination per vendor — doesn't scale past ~50 vendors.

Investigation needed: identify hosting platform (Vercel, Cloudflare Pages, Fly.io, custom VPS) and whether their API supports custom domains as a programmatic operation.

---

### Pickup locations: support full deletion (not just deactivate)

Currently pickup locations can only be deactivated, not deleted entirely. Vendors who set up incorrect locations or want to clean up old data need a true delete option.

**Status:** needs-decision

**Open question:** Should deletion be hard-delete (record gone forever) or soft-delete with a "Trash" archive view? Hard-delete is simpler but loses historical context (occurrences that referenced this location either get orphaned or cascade-deleted, both of which have implications for analytics). Soft-delete preserves history but adds Trash UI. Default recommendation: soft-delete with 30-day grace period before hard-delete, matching common SaaS patterns.

---

### Pickup window non-weekly recurrence patterns

**Status:** Pending — needs-design.

**Why it matters:** Today's RRULE constraint is `FREQ=WEEKLY;BYDAY=...` — the only recurrence pattern templates can express is "every selected day each week." This covers the dominant case (weekly farmers markets, regular bakery pickup days) but misses real wedge-audience patterns:

- **Every other week** — biweekly CSA boxes are a standard subscription model. Vendors today either run weekly templates and manually cancel alternate occurrences, or split into two month-by-month manual schedules.
- **Monthly on the Nth weekday** — "first Saturday of each month" specialty markets, "third Thursday" wine releases, "last Sunday" pop-ups. Common for makers with low-frequency drops.
- **Specific day of month** — "the 15th of each month" subscription pickups. Less common but real.
- **Multiple-week intervals** — "every 4 weeks," "every 6 weeks." Rare but the RRULE primitive (`INTERVAL=N`) handles it for free if the form does.

Solvable today only by per-occurrence cancellation against a denser weekly template, which is annoying for the vendor and confusing in the upcoming-windows list (lots of "cancelled" entries between active ones).

**Scope:**

- Schema: replace single `recurrence` RRULE string field with structured columns or keep as RRULE string and parse — decision needed during design. The RRULE string approach is more flexible (handles edge cases the form may not surface) but harder to query; structured columns are queryable but constrain the recurrence vocabulary to what the schema models. Recommended: keep as RRULE string but add a `recurrence_kind` enum (`weekly`, `biweekly`, `monthly_by_weekday`, `monthly_by_day`, `custom_interval`) so the form can round-trip cleanly without re-parsing. Custom RRULE strings outside the supported kinds either get rejected at save or stored verbatim with `recurrence_kind = 'custom'`.
- Form: replace today's bare "Days" weekday selector with a recurrence-pattern picker. Likely shape: a top-level "Repeats" select (Weekly · Every other week · Monthly on the Nth weekday · Monthly on a specific date · Custom), with the day selector adapting based on choice. Real design work — the form gets meaningfully busier and needs careful disclosure to avoid overwhelming vendors who only need weekly.
- `expandTemplate()` already uses the `rrule` package, which handles all of these patterns natively. Implementation is largely "remove the BYDAY-only constraint" plus tests for each pattern × timezone × DST-boundary combination.
- Display: the templates-list summary line ("9am–12pm · Every Sat · Cutoff 48h") needs to express richer patterns succinctly. "Every other Sat," "First Sat of each month," "15th of each month," etc. Likely a small label helper that takes `recurrence_kind` plus parsed RRULE bits and produces the summary string. Worth doing alongside the form — same vocabulary, two surfaces.
- The date-bounds Tier 1 item (start date / end date) composes cleanly with this — `dtstart` and `until` apply identically across all recurrence kinds. No cross-cutting complications.

**Open questions for design:**

- Default recurrence on a fresh template: weekly is right for the dominant case, but what's the form transition look like when a vendor switches from weekly to monthly mid-edit? The day selector needs to gracefully reset or migrate values.
- Validation around impossible patterns ("monthly on the 31st" misses February, April, June, etc.). RRule handles these by skipping non-existent dates, but the upcoming-windows preview should make the skipped months obvious so vendors aren't surprised.
- Subscription pricing implications: a biweekly subscription is half the frequency of weekly, which affects per-window pricing math and possibly Stripe subscription interval. Needs a check across the subscription code path (`isSubscription`, `billingInterval` in the order snapshot) before this ships.

**Out of scope:**

- Yearly patterns ("annual holiday market every December 15"). Defer until a vendor specifically asks. RRULE supports `FREQ=YEARLY` for free, but the UI design for yearly patterns is its own thing and the use case is rare.
- Hybrid patterns ("Saturdays plus the third Thursday"). RRULE supports composing multiple rules but the UI gets unwieldy fast. If a vendor needs this, two separate templates is the answer for now.
- Holiday-aware skipping ("every Saturday except December 25"). Per-occurrence cancellation already handles this — just deeper than most vendors will go.

**Estimated effort:** 4–6 days. Form redesign is the biggest piece (1–2 days for design, 1–2 days for implementation). Schema migration plus `expandTemplate` updates plus summary-helper plus tests for the recurrence × timezone × DST matrix is another 2 days. The DST tests matter — biweekly and monthly patterns crossing a DST transition is exactly where time-handling bugs live.

**Trigger:** When 3+ vendors specifically ask for non-weekly patterns. The Tier 1 date-bounds item handles the bulk of seasonal-vendor needs without requiring this; biweekly and monthly are differentiated value but not blocking. CSA-heavy vendor cohort hitting the trigger first is most likely.

---

### Production items: clarify expiration behavior

Currently unclear when production items (the items shown on the production view of /dashboard/orders) expire or get cleared. Vendors want manual control over clearing production items.

**Status:** needs-investigation

**Scope:** Investigate current expiration logic (server-side filter? local storage? something else?). Then decide: should there be a manual "Clear production" button? Should expiration be configurable per vendor? Currently neither exists.

---

### account/notifications — build vendor notification preferences

Once the coming-soon placeholder is shipped (Tier 1 above), build the actual notification preferences page. Order email/SMS for transactional order status are NOT user-configurable — those are built-in transactional behavior and shouldn't be a setting (toggling them off is a footgun).

The notifications page hosts opt-in/opt-out for non-transactional communications:

- **Weekly summary digest** — opt-in. Email sent every Monday with last week's order count, revenue, top items.
- **Daily prep summary** — opt-in. Email sent the night before a pickup window with the next-day's order list, prep quantities, pickup times.
- **Product/feature update emails** — opt-out. Marketing-style emails from the Order Local team about new features, tips, etc.
- **Low inventory alerts** — opt-in. Future, only relevant once inventory tracking exists. Mark as future sub-item.

**Status:** needs-design

**Scope:** Design the page layout (likely a list of toggleable preferences with descriptions). Build the schema (vendor_notification_preferences table or fields on vendor table). Build the email/digest jobs that read from preferences. Each preference type is a separate piece of work — the page UI is the smallest part; the digest job and prep summary job are the meaningful work.

**Sub-items:**

- Page UI (toggles + descriptions) — small
- Weekly summary digest backend (cron job, email template, query) — medium
- Daily prep summary backend (cron job timing per vendor's pickup schedule, email template) — medium
- Product update email infrastructure (mailing list, audience targeting, send mechanism) — large; likely external service (Resend audience, Customer.io, etc.)
- Low inventory alerts — deferred until inventory tracking exists

---

### Pickup window action vertical centering

In the pickup windows table, action buttons (Edit, Delete, etc.) are not vertically centered against row content. Visual alignment issue.

**Status:** ready-to-execute

**Scope:** Locate the pickup window row markup in settings/pickup, fix the action cell's vertical alignment. Likely a missing `items-center` on the row container.

---

### Switching vendors doesn't work

Multi-vendor switching from the vendor selector fails or doesn't navigate correctly. May be a devmode/seed-data artifact.

**Status:** needs-investigation

**Scope:** Reproduce in dev, identify devmode vs real bug. If real, fix.

---

### Make-internal-user action shows no feedback and fails

Clicking "Make internal" on a team member produces no visible feedback. The action does succeed at the database level (member's isInternal flag toggles correctly) but no Alert renders to confirm. Same gap exists on cancelInvite, changeRole, and removeMember actions on the team page — all four return generic `{ success: true }` with no Alert wired.

Initial attempt 2026-05-04 wired specific success keys + Alerts to all four actions. Implementation completed but Scott reverted — wants to rethink the approach to action feedback patterns more broadly before applying.

**Status:** needs-rethinking

**Scope:** Design the action-feedback pattern. Open questions: should action feedback be Alert-based (current direction, may not fit all action types), toast-based (separate from page-level Alerts), inline-near-the-action (different visual model entirely)? Decide on canonical action-feedback pattern, then apply across team page actions plus any other action handlers in the codebase that currently lack feedback (likely many).

---

### Mobile UX — settings/team Make internal button hidden on mobile

The Members tab "Make internal" button on settings/team uses `class="hidden ... sm:inline-flex"`, making it invisible on mobile viewports. A vendor managing their team from a phone (e.g., at a market) cannot promote members to internal status via the Members tab.

Note: the same action exists on the Internal tab's "Promote a current member" section without the mobile-hidden class, so the action is reachable on mobile via that path. But the inconsistency is drift, not deliberate.

**Status:** ready-to-execute

**Scope:** Determine whether the `sm:inline-flex` hiding is intentional (mobile UX choice to avoid clutter in row actions) or drift. If drift, remove the hiding so the button is visible on mobile. If intentional, document the reason as a comment on the affected element.

---

### Card icon treatment inconsistency

Green icons in the upper-left corner of cards across various pages are receiving different treatment — different sizes, background tints, positioning, or stroke weights.

**Status:** needs-design + sweep

**Scope:** Audit every card with a corner icon. Define canonical treatment (size, background tint, padding, color). Migrate all callsites. Sibling-parity check post-migration.

---

### Table action treatments inconsistent across surfaces

Pickup windows, catalog items, catalog categories, and orders tables each render row actions with different visual treatments. Should converge on a single canonical pattern.

**Status:** needs-design + sweep

**Scope:** Audit every table with row actions. Define canonical (likely: right-aligned action cell, Edit as outline default-size, Delete as ghost icon, More dropdown if needed). Migrate all four tables. Sibling-parity check.

---

### Standardize success Alert placement across settings/general

The settings/general page has four forms (business profile, delivery, checkout, hours) each rendering success Alerts. Currently all four render at page level (above the form). During the Tier 2 consolidation work, an audit recommended moving Alerts into each form's CardFooter for tighter contextual coupling, but that scope expansion was deferred.

Decide on the canonical placement (page-level vs CardFooter) and sweep all four sections to match. Sibling-parity is the load-bearing property — all four sections render Alerts the same way.

**Status:** needs-design

**Scope:** Small once placement is decided. Audit captures all four Alert callsites; decide canonical, migrate.

---

## Tier 3 — Post-launch

### Item photo uploads polish

**Status:** Basic upload exists. Polish later.

**Scope:** Better image handling — resize/crop UI, multiple photos per item, drag-and-drop reorder, image optimization for the storefront.

**Trigger:** When vendors complain or when the storefront's photo grid needs to look more professional than what raw uploads produce.

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

**Trigger:** After Pickup Windows is in production AND a vendor specifically asks for this view (don't build on speculation). **Pickup Windows trigger fired Apr 2026 — waiting on vendor request.**

---

### iCal export / Google Calendar sync for pickup windows

**Status:** Conceptual. Connected to Pickup Windows.

**Scope:** Vendors can export their pickup-window schedule to their personal calendar. Customers can subscribe to a vendor's window calendar.

**Trigger:** After Pickup Windows is in production AND a vendor specifically asks for this. **Pickup Windows trigger fired Apr 2026 — waiting on vendor request.**

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

### Pause for the season — vendor-level pause feature

Seasonal vendors (e.g., farmers selling specific produce in season, holiday-only bakeries) need to pause their entire storefront without deleting data. Storefront shows "We're closed for the season, back [date]" to customers; no orders accepted; vendor dashboard remains accessible.

**Status:** needs-decision (multiple open questions)

**Scope:** Technically straightforward — add `vendor.status` field (`'active' | 'paused'`) with dashboard toggle, storefront pause UI, and order-creation guard. Real questions:

- Date-based (vendor sets resume date that auto-unpauses) or indefinite (vendor manually unpauses)?
- Existing scheduled orders during pause: auto-cancel? grandfather them through the pause window?
- Subscription billing during pause: halt charges (Stripe subscription pause) or continue billing while pausing fulfillment? Stripe-side implications either way.

---

### settings/resources — event-specific share cards

In addition to the default share card (storefront URL, generic branding), support generating share cards for specific pickup windows or events (holiday markets, festivals, pop-ups). Includes time-bound messaging ("Saturday Farmers Market — Order by Friday") and event-specific URL.

**Status:** needs-design

**Scope:** Design the event-specific generation flow. Vendor selects a pickup window/event from a list, system generates the share card with appropriate context. Output sized for each social platform.

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
