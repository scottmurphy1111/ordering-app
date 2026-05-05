# CLAUDE.md — Order Local

This file tells Claude Code how to write code for this project. Read it before
making changes. Follow it exactly.

---

## Workflow rule — patterns first, code second

**Before writing any new component, page section, form, table, banner, dialog, list view, filter UI, or any other piece of UI or behavior:**

1. Scan the Patterns Index below.
2. If a documented pattern handles the shape of problem you're solving, use it. Do not invent a variant. Do not write a parallel implementation that resembles it.
3. If you believe a documented pattern is wrong for your specific case, stop. Surface the conflict in your response before proceeding. Explain what the pattern says, why you think it doesn't fit, and what alternative you'd propose. Wait for direction.
4. If no documented pattern matches, proceed — but flag in your response that you're building something the Patterns Index doesn't cover. That signals it might be worth documenting if reused.

**The same rule applies to modification work.** When editing an existing component, page section, form, table, or any documented surface — even small changes like adding a column, renaming a button, swapping an icon — run the pattern check on the surface you're touching. If your edit introduces a class, height, color, structure, or convention that conflicts with the documented pattern for that surface, stop and surface the conflict before applying. Existing code that already violates a pattern is technical debt; don't extend the violation, and don't silently fix it without flagging — surface it for explicit decision.

This is not a guideline. It is a required step in every task that produces new UI or behavior. Reading CLAUDE.md is necessary but not sufficient — the index exists so patterns get applied, not just read.

**Sparse-usage patterns count.** A pattern documented here is intentional even if it appears in only one place in the codebase. Low usage is not a signal to ignore it or remove it. The documentation is the forcing function for future reuse.

**Sibling parity is part of pattern application.** When a pattern is applied to one surface, every sibling surface that should look identical adopts the same treatment in the same task. Sibling parity is itself a pattern (see index below).

---

## Patterns Index

One-line summaries and links to the detailed sections of this document. Scan this on every task before writing code.

### Layout and structure

- **Page header** — title left, mode toggle + primary CTA right. Single canonical structure across all dashboard pages. → [Page Header Pattern](#page-header-pattern)
- **Inner navigation** — sidebar (desktop) / select (mobile) for pages with sub-pages. Use `InnerNavLayout` component. → [Inner navigation (Account, Settings)](#inner-navigation-account-settings)
- **Mobile-first card two-column** — column on mobile, row on desktop. Never use `shrink-0` on right column without `md:` modifier. → [Card two-column pattern](#card-two-column-pattern)
- **Search + filter toolbar** — search row above; filter pills (left) + date range (right) below. Two-row layout, not one. → [Search + Filter Toolbar Pattern](#search--filter-toolbar-pattern)
- **Summary / stats bar** — divider-separated row of stats. Never a grid of bordered cards. → [Summary / Stats Bar](#summary--stats-bar)

### Cards

- **Content / navigation card** — for hubs (Settings, Catalog). Icon tile + title + description, hover lifts. → [Content / navigation card](#content--navigation-card-settings-hub-catalog-hub)
- **Data / list card** — for order cards. Clickable body links to detail; action strip below is NOT inside the link. → [Data / list card](#data--list-card-order-cards)
- **Stat card** — for dashboard overview. Label + value + CTA link. → [Stat card](#stat-card-dashboard-overview)
- **Order card typography** — two sizes (`text-sm` primary / `text-xs` secondary), two weights (`font-medium` primary / regular secondary), three gray levels (`text-gray-900` primary / `text-gray-500` secondary / `text-gray-400` tertiary). Status labels are secondary, not primary — the progress row carries visual weight. Amber for time/scheduling, red for destructive — fixed semantic, not hierarchy levels. → [Order card typography hierarchy](#order-card-typography-hierarchy)

### Tables and lists

- **Table** — `rounded-xl overflow-hidden`, `border-gray-200`, header `bg-gray-50`. Row actions always visible, never hover-revealed. → [Tables](#tables)
- **Inline toggle switch** — for boolean states in list rows. Use instead of "Active"/"Available" badges where toggleable. → [Inline Toggle Switches](#inline-toggle-switches)
- **Empty state** — every list/table/filtered view must have one. Copy reflects active filter when filtered. → [Empty States](#empty-states)
- **Loading skeleton** — every data-fetching component. Skeleton count matches expected results. → [Loading & Skeleton States](#loading--skeleton-states)

### Forms and inputs

- **Input / select / textarea** — `h-8` for single-line, explicit classes documented. Wrap native date inputs in styled containers. → [Forms & Inputs](#forms--inputs)
- **Label vs value rendering** — DB enum values are canonical; never render raw values where labels belong. Use `.find()` against canonical lists. → [Label vs Value Rendering](#label-vs-value-rendering)
- **Confirmation dialog** — required for any destructive/irreversible action. Confirm button names the action ("Delete", not "OK"). → [Confirmation Dialogs](#confirmation-dialogs)

### Buttons

- **Button sizing** — size determines height (32px default / 24px xs); variant determines color. They compose. Never apply ad-hoc `h-*` to override. → [Buttons](#buttons)
- **Documented raw `<button>` exceptions** — nine specific cases where raw `<button>` is required instead of the primitive. → [Documented raw button exceptions](#documented-raw-button-exceptions)

### Tabs and segmented controls

- **Tabs (route-based)** — switching between sibling pages. `value` derives from `$page.url.pathname`; `onValueChange` calls `goto()`. Do NOT `bind:value`. → [Tabs (shadcn `<Tabs>`)](#tabs-shadcn-tabs)
- **Tabs (in-page state)** — switching values within one page. `bind:value` for primitives, controlled `value=`/`onValueChange=` for typed unions. → [Tabs (shadcn `<Tabs>`)](#tabs-shadcn-tabs)
- **FilterPills** — rounded-pill filters with counts and optional urgent dots. NOT the same as Tabs. → [FilterPills](#filterpills-rounded-pill-filters-with-counts)

### Date and time

- **Date range picker** — two separate `Popover`-wrapped `Calendar` instances, NOT a single range-mode Calendar. Preserves "from only" / "up to X" semantics. → [Date range picker](#date-range-picker-calendar--popover)
- **Time column handling** — Drizzle `time` columns return `"HH:MM:SS"` strings; always split on `:` and take first two parts. → [Database & Server](#database--server)
- **Vendor timezone** — stored as IANA in `vendors.timezone`; UI helpers in `src/lib/utils/timezones.ts`. Always use these. → [Database & Server](#database--server)

### Feedback (Alerts)

- **Alert Pattern A — transient action feedback** — success/error after form submission. Wrap in `{#if form?.someSuccess}` so it remounts on each submit. → [Alert (severity-based feedback)](#alert-severity-based-feedback)
- **Alert Pattern B — persistent informational placeholder** — "coming soon" or deferred-feature contexts. `dismissible={false}` and `autofade={0}`. → [Alert (severity-based feedback)](#alert-severity-based-feedback)

### Status

- **Status badges** — color-coded pills with documented `statusStyles` map. Always `capitalize`. Never show when all items share one status. → [Badges & Status Pills](#badges--status-pills)
- **Order lifecycle progress** — icon row from `order-lifecycle.ts` showing completed/current/pending stages. Compact icon strip on list cards; full labeled stepper with connector lines on detail page. Never use colored `<Badge>` for lifecycle status. → [Order lifecycle progress](#order-lifecycle-progress)
- **Order state-transition buttons** — appear ONLY on the detail page Actions card, never on list cards. Default `<Button>` (brand green) with an icon matching the destination stage from `actionConfig`. → [Order state-transition buttons](#order-state-transition-buttons)
- **Outlined-destructive buttons** — Cancel order, Refund payment on the detail page. `<Button variant="outline">` with red classes. Filled red is never used in this codebase. → [Destructive actions](#destructive-actions-cancel-refund)
- **Card action strip** — list-card actions sit in a right-aligned `border-t border-gray-100 px-4 py-2` strip below the body, separated by a divider. Strip is conditionally rendered (no empty strip when there are no actions). On list cards (`/dashboard/orders`, `/dashboard/orders/history`), Cancel and Refund are quiet text links, not buttons. → [Data / list card](#data--list-card-order-cards)

### Navigation and routing

- **Internal links** — always `resolve()` from `$app/paths`. Never bare strings. Applies to `href`, `goto()`, redirects. → [SvelteKit Conventions](#sveltekit-conventions)
- **URL is source of truth for filter / sort / mode state** — read via `$page.url.searchParams` server-side, `SvelteURLSearchParams` derived in components. → [URL is the source of truth for state](#url-is-the-source-of-truth-for-state)
- **No old-route redirects** — when a route is renamed, old URLs 404. Don't add `redirect()` rules to preserve them. → [Core Philosophy](#core-philosophy)
- **Production view day-grouping** — default groups by day; `?group=window` toggles to window view. Client-side `$derived` re-buckets server's window-level data. → [Production view day-grouping](#production-view-day-grouping)

### State management (Svelte 5)

- **`$derived` for computed state, `$effect` for external sync only** — never `$effect` to sync state with state. → [When to use `$effect`](#when-to-use-effect)
- **Reactive primitives** — `SvelteSet`, `SvelteMap`, `SvelteDate`, `SvelteURL`, `SvelteURLSearchParams` from `svelte/reactivity` instead of built-ins for mutable instances in components. → [Svelte reactivity primitives](#svelte-reactivity-primitives)
- **URL filter state in components** — `$derived.by` returning a fresh `SvelteURLSearchParams` on reads; build a fresh instance per write and `goto()`. → [URL is the source of truth for state](#url-is-the-source-of-truth-for-state)

### Data layer

- **Order snapshot pattern** — `orders.items` JSONB written once at order creation, never mutated. Read from snapshot for display, not from FK. → [Order snapshot pattern](#order-snapshot-pattern)
- **Pickup window snapshot** — `orders.pickupWindowSnapshot` is the receipt; `pickupWindowId` is just a join hint. Never re-derive display from FK. → [Pickup window snapshot](#pickup-window-snapshot-orderspickupwindowsnapshot)
- **Vendor settings as gates** — check `settings.enableTips`, `settings.asapPickupEnabled` before rendering related UI. Default off. → [Vendor settings](#vendor-settings)
- **Modifier-aware aggregation** — always include `selectedModifiers` in GROUP BY for production queries. Different modifier sets = separate rows. Render as `Item Name — mod1, mod2` with mods in `text-gray-500`. → [Modifier-aware item aggregation](#modifier-aware-item-aggregation)

### Design tokens and color

- **Themable vs fixed semantic tokens** — `--primary` themes per vendor; `--success` and `--destructive` stay fixed. → [Color Palette](#color-palette)
- **Text-green-600 decision rule** — primary action → `text-primary` (themable); positive indicator → `text-success` (fixed). → [Color Palette](#color-palette)

### Cross-cutting conventions

- **Sibling parity** — when changing a UI element on one page, update every sibling page in the same task. Apply this for every pattern in this index. → [Core Philosophy](#core-philosophy)
- **Mobile-first base classes** — base classes describe mobile (≤375px); `md:` adds desktop enhancements. → [Mobile-First Convention](#mobile-first-convention)
- **eslint-disable: block-form** — use `<!-- eslint-disable RULE -->` / `<!-- eslint-enable RULE -->` blocks, not `eslint-disable-next-line`. → [eslint-disable: block-form over next-line](#eslint-disable-block-form-over-next-line)
- **Verification protocol** — `[STATIC]` tags for code-inspection checks, `[BEHAVIORAL]` for runtime exercise. Never claim PASS on `[BEHAVIORAL]` from inspection. → [Verification protocol](#verification-protocol)
- **Print pattern** — `print:hidden` to opt-out chrome from printing; `hidden print:block` for print-only headers; `<style>` body reset. Apply to future printable views. → [Print pattern](#print-pattern)

---

## When you discover a pattern that should be in the index

If a task surfaces a reusable pattern not currently in the Patterns Index, flag it in your response. Don't add it to the index unilaterally — index entries should be deliberate. The user adds entries when patterns are confirmed worth documenting.

When a documented pattern's example becomes orphaned (e.g., the codebase no longer contains the example callsite the doc references), flag it. Don't silently remove the pattern. Sparse usage is intentional; orphaned examples need replacement, not deletion.

---

## Response self-check — before sending

Before sending any response that produced or modified code, run this checklist. State the result of each check in your response, even briefly. Failed checks block the response — fix them first.

**Routing and links:**
- Every internal `href` in changed files uses `resolve()` from `$app/paths`.
- Every `goto()` call uses `resolve()`.
- No new `redirect()` rules were added for old/renamed routes.

**Forms and inputs:**
- Every new single-line input, select, or single-line input variant uses `h-8` (via shadcn primitive or explicit class).
- Every new input has a visible label, not just a placeholder.
- Every new destructive action has a confirmation dialog (or uses `window.confirm` with the existing deferred-shadcn-audit note).

**Lists and data display:**
- Every new list, table, or filtered view has an empty state.
- Every new data-fetching component has a skeleton or loading state.
- Row actions in tables and cards are always visible (no `opacity-0 group-hover:opacity-100`).

**Tokens and colors:**
- No new hex colors introduced. Colors come from the documented palette.
- `text-green-600` callsites in changed code follow the decision rule (`text-primary` for themable, `text-success` for fixed semantic).
- No `style={...}` inline attributes added.

**Vocabulary:**
- No new instance of "tenant," "restaurant," "merchant" referring to vendors.
- No new instance of "menu" referring to the catalog feature.
- `preparing` status renders as "In production" in any vendor-facing display.

**Sibling parity:**
- Every page that displays the affected element type was checked. List which pages were updated and which were intentionally left unchanged with reason. (See "Sibling enumeration" below.)

**Scope:**
- The change is the smallest diff that satisfies the prompt. Any expansion is listed under "Scope expansion" in the response.

**Reactivity:**
- No `$effect` used for state-to-state synchronization.
- Mutable `Set`/`Map`/`Date`/`URL`/`URLSearchParams` instances in component code use `Svelte*` reactive versions.
- No `eslint-disable-next-line` on multi-line elements; block-form is used.

If a check is not applicable to this change (e.g., no forms touched), state "n/a" — don't skip silently.

**When a self-check fails:**

A failed self-check is not a "fix it silently and move on" situation. The whole purpose of the self-check is to make drift visible — silently fixing the failure defeats the audit.

The rule:

1. Do not rewrite the failing code to make the check pass without flagging.
2. State the failure in your response: which check failed, what the offending code is, what the conforming version would be.
3. Apply the conforming fix only if it is mechanical and unambiguous, AND the prompt clearly intended the conforming behavior. Example: prompt says "add a save button" and your draft used `h-9` — fixing to `h-8` is mechanical and the prompt clearly wanted a normal button. Apply the fix and note it.
4. Do not apply the fix if it requires interpretation. Example: a self-check flags that you wrote `text-green-600` somewhere; the conforming fix is either `text-primary` (themable) or `text-success` (fixed semantic), and the choice depends on what the element is. Surface the choice; wait for direction.
5. Either way, the response includes a "Self-check failures" section listing what failed and how it was resolved (mechanical fix applied, or pending direction).

A response that ships with self-check failures fixed silently is worse than a response that ships with the failures surfaced. The audit only works if failures are visible.

---

## No silent scope expansion

The "Smallest diff" principle in Core Philosophy is non-negotiable for code generation. Concretely:

- **Don't bundle unrelated fixes.** If you notice a bug, typo, or pattern violation outside the prompt's stated scope, do NOT fix it as part of the current task. Surface it in the response under "Out of scope but observed" and let the user decide whether to spin off a new task.

- **Don't refactor "while you're there."** Renaming variables, restructuring imports, reformatting code, modernizing syntax — none of these belong in a task that didn't ask for them. The diff should be auditable: every change traces back to a prompt requirement.

- **List scope expansions explicitly.** If your change genuinely required touching a file or surface beyond the prompt's stated scope (e.g., a shared component had to change to support the new feature), list the expansion in your response under a "Scope expansion" heading. State (a) what was changed, (b) why it was necessary, (c) what would have been impossible without the expansion.

- **A bigger diff is not a better diff.** A response that touched 30 files when the prompt asked for changes to 3 has either expanded scope silently or misunderstood the task. Both are problems.

**Anti-examples:**

- ❌ Prompt: "Add an end-date field to the pickup window form." Response touches the form file, the schema, and also reformats `expand.ts`'s imports. The reformat is silent scope expansion.
- ❌ Prompt: "Fix the typo in the orders page header." Response fixes the typo and also migrates the page from raw inputs to shadcn primitives. The migration is silent scope expansion.
- ✅ Prompt: "Add an end-date field to the pickup window form." Response touches the form file and the schema migration. Response notes: "Scope expansion: also added a `recurrence_end_date` column to `pickup_window_templates`. Necessary because the form field has nowhere to write to without it. Documented in the migration."

---

## Sibling enumeration

When changing a UI element that has siblings (the same element type appearing on other pages), enumerate those siblings explicitly in your response.

**The enumeration step:**

1. Identify the element type changed (e.g., "page header," "primary CTA button," "filter pills row," "card action strip").
2. List every page in the dashboard that displays that element type.
3. State for each: was it updated in this task, intentionally left unchanged, or out of scope?
4. If "left unchanged" or "out of scope," justify briefly.

**Example response format:**

> Changed the page header CTA button on `/dashboard/orders` from outline to solid. Sibling pages with primary CTAs in the page header:
> - `/dashboard/orders/history` — updated to match (sibling parity)
> - `/dashboard/catalog/items` — updated to match (sibling parity)
> - `/dashboard/catalog/categories` — left unchanged (page has no primary CTA in the header today; not a sibling violation)
> - `/dashboard/settings/*` — n/a (settings pages use the InnerNavLayout pattern, no page-level CTA)

**When you can't enumerate confidently:**

If you don't know whether a sibling exists (haven't seen the file, no grep result for the relevant element), say so. Don't claim sibling parity you didn't verify. "I checked the orders pages and updated both; I did not check catalog or settings pages — please confirm whether they need the same change" is a valid response.

**The enumeration applies to every pattern in the Patterns Index.** A change to one Tabs callsite checks every Tabs callsite. A change to one FilterPills callsite checks every FilterPills callsite. The enumeration is the work that keeps the codebase consistent over time.

---

## Doc-vs-code conflicts

CLAUDE.md and the actual codebase will sometimes disagree. A documented pattern's reference implementation may have drifted from the doc. A documented convention may have been replaced in code without the doc being updated. A primitive may have been customized in ways the doc doesn't reflect.

**When you discover a conflict:**

1. Stop. Do not silently align to either side.
2. Quote the documented behavior verbatim from CLAUDE.md.
3. Quote the actual codebase behavior verbatim from the relevant file.
4. State which the user appears to want based on prompt context, but flag the conflict for explicit resolution.
5. Wait for direction.

**Why this matters:**

If you align to the code without flagging, the doc decays — future tasks will misread the doc and produce inconsistent work.

If you align to the doc without flagging, the code may regress — the doc may itself be wrong and the code change correct.

The user decides which side is canonical. Your job is to surface the conflict, not resolve it.

**Exception:** if the conflict is trivial and obviously a doc-update issue (e.g., the doc references a file at an old path, the code is at the new path), you may align silently AND note the doc fix in a "Documentation drift observed" section of your response. The user can then update the doc separately.

---

## Explicit "Not done in this prompt" lists

End every multi-task response with a "Not done in this prompt" section listing items the prompt mentioned, implied, or naturally connects to but you did not complete in this task. Reasons may include: out of scope, blocked on a decision, deferred deliberately, requires behavioral verification, or requires user confirmation before proceeding.

**Format:**

```
**Not done in this prompt:**
- [Item] — [reason]
- [Item] — [reason]
```

**An empty list is acceptable** when truly applicable. Write `**Not done in this prompt:** None.` rather than omitting the section. The presence of the section is the forcing function — if you skip it, you skip the audit.

**Example:**

> **Not done in this prompt:**
> - Sibling parity check on `/dashboard/catalog/categories` — page wasn't accessible during work; please confirm or run separately.
> - Migration to `text-success` token in `OrdersSummaryBar` — out of scope; flagged for the brand green sweep prompt.
> - Behavioral verification of the new form submission flow — `[BEHAVIORAL]`, requires browser exercise.

The list is a contract: anything not listed is implicitly claimed as either complete or genuinely out of scope. Anything listed is a known follow-up.

---

## Exceptions are enumerated, not invented

Documented exceptions to any rule must be listed at the rule's location in CLAUDE.md. Do not invent unlisted exceptions in code without first proposing them as additions to the documented list.

**The pattern:**

- Rule: "Use `<Button>` for all button affordances."
- Documented exceptions: 9 specific cases, each with a reason and the required class string.
- Acceptable: a callsite matching one of the 9 documented exceptions uses raw `<button>` per the documented exception.
- Not acceptable: a callsite uses raw `<button>` for a 10th reason that "seemed obvious" without proposing the exception first.

**When you encounter a case that doesn't fit any documented exception:**

1. Use the documented pattern as written. If the result is wrong (visually broken, ergonomically painful, technically impossible), surface that in your response.
2. Propose the new exception explicitly: state the rule, state the case, state why no documented exception applies, propose the new exception's classes/conditions.
3. Wait for direction. The user decides whether to add the exception to CLAUDE.md.

**Anti-pattern:**

- ❌ Code adds a raw `<button>` to a new surface with a comment `// custom for X reason` that doesn't appear in CLAUDE.md's exception list.
- ❌ Code uses `text-green-700` somewhere because "it looked better than `text-green-600`" without proposing a palette addition.
- ❌ Code introduces a `size="sm"` Button variant after the doc says "Retired sizes: sm" because "it fits the design."

The Patterns Index protects existing patterns from being forgotten. This rule protects them from being silently bypassed. Both forces are needed.

---

## Editing CLAUDE.md itself

CLAUDE.md is load-bearing infrastructure for code generation. Edits to it follow the same discipline as edits to code:

- **Run the Workflow Rule on the doc.** Before adding a new section, scan the existing structure. If similar guidance already exists, extend it rather than duplicating.
- **Update the Patterns Index when adding patterns.** A new pattern documented downstream is invisible if the index doesn't point at it. Adding patterns without indexing them recreates the memory-hole problem the index was designed to fix.
- **Do not duplicate guidance across multiple sections.** If a rule is already in the "What Not to Do" list, don't restate it in a new section. Cross-reference instead.
- **Do not edit CLAUDE.md inline as part of a code-change task.** When code work surfaces a needed doc update (a new pattern, a new exception, a clarification), surface it in the response under a "CLAUDE.md update needed" heading. The next prompt produces a separate artifact for the doc edit. Mixing code changes and doc changes in one diff makes both harder to review.
- **Preserve historical context.** When a section's reasoning is no longer current (e.g., a deferred-shadcn-audit note, a "as of Batch 9" reference), do not delete it silently. Update it with a new note explaining what changed; the history matters for future contributors trying to understand why a convention exists.
- **The Patterns Index is the user's to maintain.** When you discover a candidate pattern, flag it in your response. Do not add it to the index in the same task. Index entries are deliberate.

**Exception — typo fixes and trivial corrections.** A single-character typo, a broken markdown link, a stale path reference — these can be corrected as a small inline fix with a "Documentation drift observed" note in the response. Use judgment: if the fix is small enough that proposing it as a separate artifact would create more friction than the fix is worth, just fix it and note it.

The doc has more leverage than any single piece of code. A bad code change affects one feature; a bad CLAUDE.md change affects every future code change. Treat edits accordingly.

---

## Project Configuration

- **Language:** TypeScript
- **Framework:** SvelteKit (Svelte 5)
- **Package manager / runtime:** **Bun** — use `bun` for every script command,
  never `npm`. Examples: `bun run dev`, `bun run check`, `bun run build`.
- **Database:** Postgres on Neon, Drizzle ORM
- **Auth:** BetterAuth
- **Styling:** Tailwind CSS v4
- **Components:** shadcn-svelte primitives + Iconify (`@iconify/svelte`)
- **Tooling add-ons:** prettier, eslint, vitest, playwright, mdsvex,
  drizzle-kit, MCP

---

## What Order Local Is

Order Local is a B2B SaaS that gives local businesses a branded online
ordering page with Stripe checkout. **It is not a marketplace.** It is not
DoorDash. We do not take a percentage of vendor sales — vendors pay a flat
monthly subscription and Stripe's standard processing fees, nothing else.

### Audience

The product is built for **makers, bakers, and growers** — local businesses
that sell pre-orders for pickup at farmers markets, shops, or by appointment.
Specifically:

- Independent bakeries
- Farmers market vendors (farms, butchers, jam makers, etc.)
- Florists, CSAs, breweries, food trucks, specialty makers

This audience does **not** include:

- Sit-down restaurants
- Quick-service restaurants doing delivery
- Anyone running a dine-in operation

When making product decisions, optimize for the bakery and farmers market
vendor first. If a feature would be useful for a sit-down restaurant but
adds complexity for a baker, do not add it.

### What we don't build

- Delivery dispatch / driver networks
- POS hardware integrations (out of scope for v1)
- Reservations / table management
- Marketplace discovery (no consumer-facing directory)
- Anything that assumes a restaurant context (tables, dine-in, service modes)

---

## Core Vocabulary

These naming choices are deliberate. Use them everywhere.

| Concept                                              | We say                                             | We do NOT say                       |
| ---------------------------------------------------- | -------------------------------------------------- | ----------------------------------- |
| The business that uses Order Local (entity)          | **vendor** (`vendors` table)                       | tenant, restaurant, store, merchant |
| The business in user-facing dashboard copy           | **shop** (sometimes "your shop")                   | your tenant, your restaurant        |
| The list of things a vendor sells (entity & feature) | **catalog** (`catalogItems` table)                 | menu (in code, schema, dashboard)   |
| The customer-facing public page                      | **storefront**                                     | restaurant page, microsite          |
| The URL path for the storefront                      | `/[vendorSlug]/catalog`                            | `/[vendorSlug]/menu`                |
| Pickup time slots (planned feature)                  | **pickup windows**                                 | service hours, table reservations   |
| Customer-facing dashboard nav item                   | **Catalog**                                        | Menu                                |
| Settings hub                                         | shop-level: **Settings** · user-level: **Account** | mixing the two                      |

The word "menu" appears in two acceptable places only:

1. shadcn-svelte's `<DropdownMenu>` UI primitive (generic dropdown)
2. Comments or docs referring to the historical name

If you find "menu" anywhere else and it's referring to the catalog feature,
rename it. If you find "tenant" anywhere referring to our `vendors` entity,
rename it. Both are technical debt.

**Vendor type values (canonical list):** `bakery`, `farm`, `butcher`, `florist`,
`brewery`, `coffee_shop`, `food_truck`, `specialty_maker`, `market_vendor`, `other`.
Display labels are mapped centrally in `src/lib/utils/business-type-labels.ts`.
**Do not add restaurant-style values** (`full_service`, `quick_service`, `bar`,
`cafe`) — these are explicitly out of scope for the wedge audience. Adding a new
vendor type requires updating the schema enum, the display helper, and the seed.

---

## Brand Voice & Aesthetic

The product voice is **confident and clean, modern SaaS, minimal fluff.** The
storefront and dashboard should feel designed, not templated. When making
visual or copy decisions:

### Voice

- Direct and specific. "Pickup windows that match your schedule" — not
  "powerful scheduling capabilities."
- Honest about what we do and don't do. We are pickup-only. We don't deliver.
  Don't write copy that hedges this.
- Practical, not aspirational. A baker should read our copy and feel like
  we understand their Saturday morning, not like we're selling them a vision.
- No emoji in product UI unless the user has used emoji in their own data
  (e.g., a vendor's menu item description). Marketing pages allow emoji
  sparingly.

### Aesthetic

- Editorial, type-forward, generous whitespace
- Photo-forward when photos exist; type-forward when they don't
- No AI-generic patterns: no purple gradients, no glassmorphism, no centered
  hero with a neon button, no Inter as a default body font
- Functional first. Mobile-first. A vendor checking orders one-handed at a
  market booth at 9am should be able to do it without thinking.

### What we don't build (UX edition)

- "Confetti when an order arrives" gimmicks
- Onboarding tours that block real work
- Empty states that read like marketing copy ("Welcome to your journey…")
- Animations longer than 200ms
- Anything that requires a help article to understand

---

## Customer-facing surfaces

The public storefront (`/[vendorSlug]/catalog`) is consumed by customers, not
vendors. Different rules apply:

- **No internal taxonomy renders here.** Internal vendor type values (`bakery`,
  `farm`, etc.) are for queries and admin contexts only. They never render to
  customers. If a vendor doesn't have a tagline, render nothing — do not fall
  back to the type.
- **No vendor-facing language renders here.** Words like "vendor," "shop owner,"
  "subscription," "billing" don't appear on the storefront. Customers never see
  Order Local's product structure.
- **Vendor-facing pages** (everything under `/dashboard`, `/account`, `/login`)
  **follow the marketing voice**: confident, direct, audience-named (makers,
  bakers, growers).
- **Customer-facing pages follow a softer, transactional voice.** The customer
  just wants to order something. They don't need our positioning.

---

## SvelteKit Conventions

### `href` rule (non-negotiable)

**Always** use `resolve()` from `$app/paths` for every `href` attribute that
points to an internal route.

✅ Correct:

```svelte
<script>
	import { resolve } from '$app/paths';
</script>

<a href={resolve('/dashboard/catalog')}>Catalog</a>
<a href={resolve(`/dashboard/orders/${id}`)}>Order #{id}</a>
```

❌ Wrong:

```svelte
<a href="/dashboard/catalog">Catalog</a>
<a href={`/dashboard/orders/${id}`}>Order #{id}</a>
```

This applies to every internal link, every `goto()` call, and every redirect.

### URL is the source of truth for state

Use the URL for any state that should survive a page refresh, deep-link, or
share. Specifically:

- Active filter on a list page: `?status=received` (read via `$page.url.searchParams`)
- Active sort: `?sort=newest`
- Active mode toggle: derive from `$page.url.pathname` (e.g., `/orders` vs `/orders/history`)
- Pagination: `?page=2`

Do **not** use local component state for any of the above. The URL is canonical.

**Server load functions** read URL params using standard `url.searchParams` — server-side, no reactivity needed. The load function exposes initial values via `data`.

**In components, use `SvelteURLSearchParams` for filter/sort/pagination state.** The params instance is derived from `data` (which reflects the current URL after every navigation), so it always matches what the server loaded. Writes build a fresh instance per call and navigate.

```svelte
<script>
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let { data } = $props();

	// Derived params instance — recomputes from data on every navigation.
	// Reads in $derived and templates reflect the current URL state automatically.
	const params = $derived.by(() => {
		const p = new SvelteURLSearchParams();
		if (data.search) p.set('search', data.search);
		if (data.categoryId) p.set('categoryId', String(data.categoryId));
		return p;
	});

	// Writes build a fresh instance from current params, mutate it, then navigate.
	// Don't mutate the derived `params` directly — it recomputes from data anyway.
	function updateSearch(value) {
		const next = new SvelteURLSearchParams(params);
		if (value) next.set('search', value);
		else next.delete('search');
		goto(resolve('/dashboard/catalog/items?' + next.toString()), {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}
</script>
```

**Reads happen against `params`.** `params.get('search')`, `params.has('categoryId')` in `$derived` and templates re-run reactively because `params` itself is a `$derived` value — it updates when `data` updates.

**Writes copy, mutate, navigate.** Each write handler creates `new SvelteURLSearchParams(params)` (a copy of the current derived state), applies its mutations, and calls `goto()`. After navigation the load function re-runs, `data` updates, and `params` recomputes. No `$effect` is involved in this cycle — `$derived` handles it.

### Svelte 5 runes

This project uses Svelte 5. Use runes (`$state`, `$derived`, `$props`,
`$effect`) for reactive state. Do not use Svelte 4 `let` reactive declarations
or `$:` blocks in new code.

### Svelte reactivity primitives

When mutating a `Set`, `Map`, `Date`, `URL`, or `URLSearchParams` instance in component code, use the reactive version from `svelte/reactivity`. The ESLint rule `svelte/prefer-svelte-reactivity` enforces this.

**Why.** Built-in instances don't integrate with Svelte's reactivity system. Mutations on a built-in (`set.add(x)`, `params.set(k, v)`) won't trigger re-evaluation in `$derived` or `$effect` that reads them. The reactive versions do.

**Reactive replacements:**

| Built-in                | Use instead                   |
| ----------------------- | ----------------------------- |
| `new Set()`             | `new SvelteSet()`             |
| `new Map()`             | `new SvelteMap()`             |
| `new Date()`            | `new SvelteDate()`            |
| `new URL()`             | `new SvelteURL()`             |
| `new URLSearchParams()` | `new SvelteURLSearchParams()` |

All imported from `svelte/reactivity`:

```svelte
<script>
	import { SvelteSet, SvelteURLSearchParams } from 'svelte/reactivity';
</script>
```

**Anti-pattern (what the linter catches):**

```svelte
// ❌ Wrong — mutations don't trigger reactivity let selected = $state(new Set()); selected.add(id);
// $derived reading selected.has(...) won't re-run let params = new URLSearchParams();
params.set('search', value); // $derived reading params.get(...) won't re-run // ✅ Right let
selected = new SvelteSet(); selected.add(id); let params = new SvelteURLSearchParams();
params.set('search', value);
```

**When built-ins are still fine.** The rule applies to mutable instances in component code where mutations need to trigger reactivity. Read-only usage and code outside Svelte components (server load functions, utility modules, anywhere not under `$derived`/`$effect` reactivity) can use the built-ins. The server `+page.server.ts` reading `url.searchParams` is fine — that's not component reactivity.

**Other primitives in `svelte/reactivity`** (situational, not default):

- `MediaQuery` — for JS-driven viewport logic. SSR caution: `current` is `false` server-side, which may cause hydration mismatches.
- `createSubscriber` — for bridging event-based browser APIs (WebSocket, IntersectionObserver) into reactivity.

### When to use `$effect`

`$effect` runs after Svelte updates the DOM in response to reactive state changes. It exists for synchronizing component state with **external systems** — things outside Svelte's reactivity graph.

**Reach for `$effect` when:**

- DOM interop that can't be expressed declaratively (focus management, third-party DOM libraries, manual measurement)
- External subscriptions (WebSocket connections, IntersectionObserver, ResizeObserver, browser APIs that emit events)
- Lifecycle effects (setting up and tearing down browser-only resources)
- Logging, analytics, or other side effects that respond to state changes but don't produce derived values

**Do not use `$effect` for:**

- Computing derived state. Use `$derived` or `$derived.by`.
- Synchronizing one piece of reactive state with another. Use `$derived` for one-way derivations, or restructure so both pieces share a single source of truth.
- Updating state in response to other state. From Svelte's docs:

> "Generally speaking, you should not update state inside effects, as it will make code more convoluted and will often lead to never-ending update cycles."
> — https://svelte.dev/docs/svelte/$effect#When-not-to-use-$effect

**Concrete examples in this codebase:**

✅ **Correct** — The catalog items and catalog categories pages use `$effect` to read `data.drawer` and open the drawer sheet. This is a legitimate cross-graph sync: server-driven URL state triggers a component-owned UI action (`drawerOpen = true`). It uses `untrack` to prevent the effect from re-running when the drawer state itself changes.

```svelte
$effect(() => {
  if (!data.drawer) return;
  drawerMode = data.drawer.mode;
  drawerOpen = true; // side effect — fine, this is external UI state
});
```

❌ **Wrong** — Mirroring filter params from `data` into `$state` variables via `$effect`:

```svelte
let searchValue = $state(untrack(() => data.search ?? ''));
$effect(() => { searchValue = data.search ?? ''; }); // state sync via effect — don't do this
```

The correct replacement is `$derived.by` returning a `SvelteURLSearchParams` instance — see the skeleton above under "URL is the source of truth for state."

### MCP tools available

You have access to the Svelte MCP server with these tools:

- **`list-sections`** — call this FIRST when working on Svelte/SvelteKit
  to find relevant docs
- **`get-documentation`** — fetch full docs for sections matched by your task
- **`svelte-autofixer`** — run on every Svelte file you write before
  considering it done. Keep calling it until no issues remain.
- **`playground-link`** — only after user confirmation, and never if code
  was written to project files

When the user asks about Svelte or SvelteKit topics, start with `list-sections`.
When writing Svelte code, finish with `svelte-autofixer`.

---

## Core Philosophy

- **Consistency over creativity.** When a UI pattern already exists in the
  codebase, use it exactly. Do not invent a new variant.
- **Extract, don't duplicate.** If the same component or layout appears on more
  than one page, extract it into a shared component immediately.
- **Sibling parity.** When you change a UI element on one page, check every
  sibling or related page for the same element and apply the identical change.
  Explicitly confirm parity in your response.
- **Smallest diff.** Make the minimal change required. Do not refactor unrelated
  code, rename variables, or restructure files unless explicitly asked.
- **No redirects from old routes.** Project policy: when a route is renamed or
  removed, old URLs 404. Do not add `redirect(...)` rules to preserve old
  paths.

---

## Shared Components — Never Duplicate

When the same UI pattern appears on more than one page, it MUST be extracted
into a shared component in `src/lib/components/` and imported on both pages.
Never copy-paste markup between pages.

Current shared components that must stay in sync:

- `OrdersSummaryBar` — used on `/dashboard/orders` and `/dashboard/orders/history`
- `OrdersFilterTabs` — used on both pages
- `OrdersTabs` — Live | History view toggle, used on both pages
- `OrdersSearchRow` — search input, used on both pages
- `CatalogItemForm` — catalog item fields (image, name, description, price, category, tags, status, subscription). Used on `/dashboard/catalog/items` (inline new), `/dashboard/catalog/items/new` (standalone new), and `/dashboard/catalog/items/[itemId]` (edit). Do NOT duplicate item field markup across these three routes — always extend the shared component.

If you add a feature to one page that logically belongs on a sibling page, add
it to both in the same task.

---

## Page Layout Structure — Orders Pages

Both `/dashboard/orders` (live) and `/dashboard/orders/history` follow this
exact section order:

1. Page header row (`<h1>` left, toggle + bell right)
2. `<OrdersSummaryBar>` — one row, divider-separated stats
3. Search input — full width, single row
4. Filter pills (left) + date range (right) — single row, space-between
5. Order list

Never place filter pills and date pickers on separate rows. Never place "From"
/ "To" as bare text labels outside a styled input container. The date range
inputs must always be wrapped in a single bordered pill/container.

---

## Color Palette

The dashboard uses CSS custom properties (design tokens) for colors that may need to vary by context — primary brand actions theme to vendor accent colors (per the "Brand the dashboard" roadmap item), while semantic indicators (success, destructive) stay fixed across all vendors.

Use the **Token** column for new code. The **Legacy class** column is what you'll see in older callsites; migrate when touching.

### Themable (vendor accent)

These tokens repaint when a vendor's brand color is applied at the root level.

| Role | Token | Legacy class | Hex (default) |
| --- | --- | --- | --- |
| Primary action (bg) | `bg-primary` | `bg-green-600` | #16a34a |
| Primary hover | `hover:bg-primary/90` | `hover:bg-green-700` | — |
| Primary tint (subtle bg) | `bg-primary/10` | `bg-green-50` | — |
| Primary border | `border-primary` | `border-green-500` | #22c55e |
| Focus ring | `ring-ring` | `ring-green-500` | #22c55e |
| Primary text (on white) | `text-primary` | `text-green-600` | #16a34a |

### Fixed semantic (do not theme)

These tokens stay constant regardless of vendor brand. Money should read as money, errors should read as errors.

| Role | Token | Legacy class | Hex |
| --- | --- | --- | --- |
| Positive / money / "paid" / available | `text-success` | `text-green-600` (positive use) | #16a34a |
| Success bg tint | `bg-success/10` | `bg-green-50` (positive use) | — |
| Destructive | `text-destructive` | `text-red-500` | #ef4444 |
| Destructive bg | `bg-destructive/10` | `bg-red-50` | — |

### Status pills (fixed, by status)

Status pills use fixed hex colors per status — see the `statusStyles` map in the Badges & Status Pills section. Not subject to vendor theming.

### Always-fixed (no token, no migration)

| Role | Class | Hex |
| --- | --- | --- |
| Urgent / warning | `text-amber-500` | #f59e0b |
| Urgent text (dark) | `text-amber-700` | #b45309 |
| Urgent bg | `bg-amber-50` | #fffbeb |
| Urgent border | `border-amber-400` | #fbbf24 |
| Body text | `text-gray-900` | #111827 |
| Secondary text | `text-gray-500` | #6b7280 |
| Muted text | `text-gray-400` | #9ca3af |
| Border | `border-gray-200` | #e5e7eb |
| Subtle bg | `bg-gray-50` | #f9fafb |
| White | `bg-white` | #ffffff |

**Storefront-specific colors:** the public storefront (`/[vendorSlug]/catalog`) uses CSS variables driven by the vendor's branding settings (background, foreground, accent). The palette above applies only to the dashboard, marketing site, and admin areas.

**Decision rule for `text-green-600` callsites during the sweep:** if the role is "primary action / brand affordance," migrate to `text-primary` (themable). If the role is "positive indicator / money / successful state," migrate to `text-success` (fixed). When unclear, the question to ask is: "would a vendor with a purple brand want this element to be purple?" If yes → `text-primary`. If no → `text-success`.

---

## Typography

- Page titles (`<h1>`): `text-2xl font-bold text-gray-900`
- Section headings (`<h2>`): `text-sm font-medium text-gray-500 uppercase tracking-wide`
- Card titles: `text-base font-semibold text-gray-900`
- Body: `text-sm text-gray-700`
- Secondary / meta: `text-sm text-gray-500`
- Muted / timestamps: `text-xs text-gray-400`
- Monospace (order IDs, codes): `font-mono text-xs text-gray-400`
- Currency values: `font-semibold text-gray-900` (large: `text-lg` or `text-2xl`)

The marketing site and storefront use a custom font pairing (display + body)
that may differ from the dashboard. Do not change the dashboard typography
unless explicitly asked.

---

## Spacing & Layout

- Main content padding: `p-6` or `px-6 py-6` (sidebar is fixed-width to its left)
- Between page header and first content section: `mb-6`
- Between major sections: `mb-6` or `gap-6` in a grid
- Between related elements within a section: `mb-3` or `gap-3`
- Card internal padding: `p-4` (compact) or `p-6` (spacious)
- Border radius: `rounded-xl` for cards, `rounded-lg` for inputs/buttons,
  `rounded-full` for pills/badges

---

## Page Header Pattern

Every dashboard page follows this exact header structure:

```svelte
<div class="mb-6 flex items-center justify-between">
	<!-- Left: title + optional subtitle -->
	<div>
		<h1 class="text-2xl font-bold text-gray-900">{title}</h1>
		{#if subtitle}
			<p class="mt-1 text-sm text-gray-500">{subtitle}</p>
		{/if}
	</div>

	<!-- Right: mode toggle (if applicable) + primary CTA -->
	<div class="flex items-center gap-3">
		{#if modeToggle}{@render modeToggle()}{/if}
		{#if primaryAction}{@render primaryAction()}{/if}
	</div>
</div>
```

- The primary CTA always sits at the far right.
- Mode toggles sit immediately left of the CTA.
- Do not put breadcrumbs inside the main content area.
- Do not stack a separate `<p>` subtitle unless it adds real context.

---

## Buttons

**Size determines dimensions. For text buttons, that's height. For icon-only buttons, that's a square dimension. Variant determines color/style. They compose.**

### Sizes

| Size        | Height                        | `size` prop                      | Used for                                                                                                    |
| ----------- | ----------------------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Default     | `h-8` (32px / 32×32 for icon) | `default` (text) · `icon` (icon) | Standard — toolbars, page CTAs, form submits, modal footers; icon buttons next to inputs or text buttons    |
| Extra-small | `h-6` (24px / 24×24 for icon) | `xs` (text) · `icon-xs` (icon)   | Tight inline — dialog/sheet close buttons, input field decorations, banner dismiss, compact overlay actions |

**Retired sizes (do not use):** `sm`, `icon-lg`, `icon-sm`. Removed in Batch 9. Migration: `sm` → `default`, `icon-lg` → `icon`, `icon-sm` → `icon` (or `icon-xs` if nested inside a control).

Icon buttons match their context. A delete icon in a table row uses `size="icon"` (32×32) so it aligns with `default` text buttons. A close button inside a dialog uses `size="icon-xs"` (24×24) as a tight inline decoration. The size system handles alignment automatically — pick the size based on what's adjacent.

**Height is a property of the size variant, not negotiable per callsite.** A `default` button is `h-8` everywhere. When a `<Button>` sits next to a form input or select, they align automatically — `default` and `h-8` inputs are the same height. No special handling needed.

### Variants

| Variant       | Style                      | When                                                             |
| ------------- | -------------------------- | ---------------------------------------------------------------- |
| `default`     | Solid green (`bg-primary`) | Most-emphasized affordance — page-level CTA, primary form submit |
| `outline`     | White bg, gray border      | Secondary/alternative action, Cancel, form alternatives          |
| `ghost`       | No bg, hover only          | Low-emphasis — icon buttons, inline text-link-style actions      |
| `destructive` | Filled red                 | Destructive actions that need maximum visual emphasis            |
| `link`        | Text with underline        | Link-style inline actions                                        |

Variants and sizes compose freely:

```svelte
<!-- Standard primary CTA -->
<Button>+ New item</Button>

<!-- Secondary action in a table row -->
<Button variant="outline">Edit</Button>

<!-- Destructive form footer -->
<Button variant="destructive">Delete account</Button>

<!-- Icon button in a toolbar (matches h-8 default text buttons and inputs) -->
<Button size="icon" variant="ghost"><Icon icon="mdi:bell-outline" /></Button>

<!-- Tight inline icon button (dialog close, input decoration) -->
<Button size="icon-xs" variant="ghost"><Icon icon="mdi:close" /></Button>

<!-- Low-emphasis icon button in a row action -->
<Button size="icon" variant="ghost" class="text-red-400 hover:text-red-600"
	><Icon icon="mdi:trash-can-outline" /></Button
>
```

### Documented raw `<button>` exceptions

Use `<Button>` for all button affordances unless the callsite matches one of these documented exceptions. Each exception is flagged for the Tier 2 shadcn audit.

1. **Quiet text-link actions in card action strips**: list-card action strips (`/dashboard/orders`, `/dashboard/orders/history`) place Cancel and Refund as quiet text affordances rather than buttons. The shadcn `<Button>` primitive's padding and min-width assumptions force a button shape that conflicts with the text-link aesthetic. Use raw `<button>` with classes `text-sm font-medium text-red-500 transition-colors hover:text-red-600`. The wrapping `<form>` carries the `?/cancel` or `?/refund` action; the button is just the rendered affordance.

2. **Outlined-destructive** (Cancel order, Refund payment) on the detail page: `<Button variant="destructive">` applies filled red. Outlined red is the documented quieter treatment. Use `<Button variant="outline" class="border-red-200 text-red-500 hover:bg-red-50">`. NOTE: this is now implemented via the `<Button>` primitive (variant + class override), not via raw `<button>`. The exception remains documented because the class-override pattern is non-default behavior worth noting; converting to a `destructive-outline` Button variant is a Tier 2 shadcn audit candidate.

3. **Dark-surface hamburger** (mobile nav header): `<Button variant="ghost">` hover uses `hover:bg-accent`, which conflicts with explicit dark-surface hover overrides. Use `hover:bg-gray-800` to match sidebar nav link convention. See Mobile header section.

4. **Sortable table column headers**: column headers that toggle sort direction use a raw `<button>` because `<th>` is the semantic container and Button's padding/shape assumptions don't fit cleanly inside a header cell.

5. **Accordion toggles**: when a custom expand/collapse UI overrides the shadcn Accordion primitive (e.g., full-row clickable headers inside a list), the toggle is a raw `<button>` wrapping the row content. Button's height constraints would require explicit overrides on every callsite.

6. **Status filter pills**: the `FilterPills` / status tabs pattern (see Filter Pills section) uses raw `<button>` elements because the pill shape (`rounded-full px-3 py-1.5`) and the green/gray active/inactive color system don't map to any Button size or variant. Migrating would require a new `pill` variant.

7. **`DropdownMenuItem` as form submit**: bits-ui's `DropdownMenuItem` renders its own interactive element. When a menu item must submit a form (e.g., a status change via `method="post"`), use a raw `<button type="submit">` inside the item — nesting a `<Button>` creates an invalid nested interactive element.

8. **Popover triggers with custom interior**: bits-ui's `PopoverTrigger` renders its own `<button>` internally. Do not nest a `<Button>` inside `PopoverTrigger`. Apply trigger classes directly via the `class` prop on `PopoverTrigger`.

9. **Absolutely-positioned input field decorations** (clear, eye toggle): buttons positioned `absolute` inside an input container conflict with `<Button>`'s internal padding and min-width. Use a raw `<button>` with explicit sizing (e.g., `size-6 rounded flex items-center justify-center`) and position classes. Exception: if the decoration sits outside the input's padding area, `size="icon-xs"` may fit.

### Rules

- Never use bare red text as a delete/cancel action without a wrapping button.
- Destructive actions (delete, cancel order, refund) always require a confirmation dialog. Never single-click destructive.
- The most important action on a page is always a solid green primary button. Secondary actions are outline. Tertiary are ghost or text.
- Never have more than one solid primary button visible at the same time.
- When there are 3+ secondary actions, group them under a `⋯ More` dropdown.

---

## Tabs (shadcn `<Tabs>`)

shadcn `<Tabs>` is the canonical primitive for two distinct use cases:

1. **Route-based view toggles** — switching between pages that share a parent context (`catalog/items` vs `catalog/categories`; `orders` live vs history; orders vs production view).
2. **In-page state segments** — switching between values within a single page (billing interval monthly/annual; analytics period 7d/30d; `CatalogItemForm` subscription interval).

Both render identically via the same primitive. The team page Members/Internal users tabs are the visual reference.

**Imports** — always named flat imports:

```ts
import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
```

Do not use `import * as Tabs` and `<Tabs.Root>` — flat imports match the canonical callsites.

**Pattern A — Route-based (`CatalogTabs`, `OrdersTabs`):**

```svelte
<script>
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';

	const activeValue = $derived(page.url.pathname.includes('/categories') ? 'categories' : 'items');

	function handleValueChange(value: string) {
		goto(
			resolve(value === 'categories' ? '/dashboard/catalog/categories' : '/dashboard/catalog/items')
		);
	}
</script>

<Tabs value={activeValue} onValueChange={handleValueChange}>
	<TabsList>
		<TabsTrigger value="items">
			<Icon icon="mdi:silverware-fork-knife" class="h-3.5 w-3.5" />
			Items
		</TabsTrigger>
		<TabsTrigger value="categories">
			<Icon icon="mdi:tag-multiple-outline" class="h-3.5 w-3.5" />
			Categories
		</TabsTrigger>
	</TabsList>
</Tabs>
```

Active state derives one-way from `$page.url.pathname` (or `searchParams` if the toggle uses a URL param). `onValueChange` calls `goto()`. Do NOT use `$effect` to sync state with navigation — that is the state-sync-via-effect anti-pattern. Do NOT use `bind:value` for route-based tabs.

**Pattern B — Local state (billing interval, `CatalogItemForm` subscription interval):**

```svelte
<Tabs bind:value={billingInterval}>
	<TabsList>
		<TabsTrigger value="monthly">Monthly</TabsTrigger>
		<TabsTrigger value="yearly">Yearly</TabsTrigger>
	</TabsList>
</Tabs>
```

When the bound state has a typed union (e.g. `BillingInterval = 'monthly' | 'annual'`), use controlled `value=` + `onValueChange=` with a cast at the callback boundary instead of `bind:value`:

```svelte
<Tabs
  value={selectedInterval}
  onValueChange={(v) => (selectedInterval = v as BillingInterval)}
>
  ...
</Tabs>
```

This preserves the typed-union constraint downstream. Don't widen the state to `string` to satisfy `bind:value` — the type carries meaning.

**Triggers with custom indicators** — `TabsTrigger` accepts arbitrary children. The Live segment in `OrdersTabs` uses an animated ping dot:

```svelte
<TabsTrigger value="live">
	<span class="relative flex h-1.5 w-1.5 shrink-0">
		{#if activeValue === 'live'}
			<span
				class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70 opacity-75"
			></span>
		{/if}
		<span
			class="relative inline-flex h-1.5 w-1.5 rounded-full {activeValue === 'live'
				? 'bg-primary'
				: 'bg-muted-foreground/30'}"
		></span>
	</span>
	Live
</TabsTrigger>
```

The Annual billing segment shows a savings badge as a child:

```svelte
<TabsTrigger value="annual">
	Annual
	<span class="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary"
		>-$168</span
	>
</TabsTrigger>
```

**Icon sizing inside `TabsTrigger`** — shadcn applies `[&_svg:not([class*='size-'])]:size-4` (16px) to SVG children. Author icons with `class="h-3.5 w-3.5"` and accept the 16px override — that is the canonical trigger icon size. Do not add `size-3.5` to fight it.

**`TabsContent`** — only needed when the tab controls in-page panel visibility (team page Members/Internal users). For route-based tabs where SvelteKit renders the panel, skip `TabsContent` entirely.

**`aria-label`** — pass a meaningful label on `<Tabs>` for accessibility:

- `CatalogTabs`: `"Switch catalog view"`
- `OrdersTabs`: `"Switch orders view"`
- Billing interval: `"Choose billing interval"`

---

## FilterPills (rounded-pill filters with counts)

`FilterPills` is the canonical component for status/filter selectors that need a rounded-full pill shape, plain-text counts, and optional urgent indicators. Currently the single consumer is `OrdersFilterTabs` (which wraps it) on the orders pages.

Do not migrate `FilterPills` to shadcn `<Tabs>` — they are a distinct visual pattern. See "When to use FilterPills vs Tabs" below.

**Import:**

```ts
import FilterPills from '$lib/components/FilterPills.svelte';
```

**Prop interface** (`FilterPill` is exported from the component):

```ts
interface FilterPill {
	label: string;
	value: string;
	count: number;
	dot?: boolean; // show amber dot when count > 0 and not active
	icon?: string; // Iconify icon name (e.g. 'mdi:check-circle-outline'); renders at h-3 w-3 left of label
}
```

**Pattern:**

```svelte
<FilterPills
	pills={[
		{ label: 'All', value: '', count: 16 },
		{ label: 'Received', value: 'received', count: 6, dot: true, icon: 'mdi:inbox-arrow-down' },
		{ label: 'Confirmed', value: 'confirmed', count: 6, icon: 'mdi:check-circle-outline' }
	]}
	active={data.statusFilter ?? ''}
	onSelect={(value) => goto(resolve(buildStatusPath(value)))}
/>
```

**Visual treatment (rendered by the component):**

- Container: `flex gap-1.5 overflow-x-auto pb-0.5`
- Active pill: `bg-primary text-white`
- Inactive pill: `border border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200`
- Icon (when `icon` prop is set): `h-3 w-3 shrink-0` rendered to the left of the label. The "All" pill omits the icon by convention — the asymmetry signals "meta-option, not filtered."
- Count: plain text inside the pill — never a nested `bg-white rounded-full` badge
- Urgent dot: `h-1.5 w-1.5 rounded-full bg-amber-400` — rendered only when `dot === true && count > 0 && !active`

**Rules:**

- Always pass a count, even if 0. Don't conditionally omit zero-count pills.
- The URL query string (`?status=received`) is the source of truth. Pass `data.statusFilter` as `active` and navigate on `onSelect`.
- The `dot` prop signals "needs attention" — use it for statuses that require action (e.g. `received`, `ready`). Do not add a dot to terminal statuses (`fulfilled`, `cancelled`).

**When to use FilterPills vs Tabs:**

- Use **Tabs** when choices are mutually exclusive views or modes (Items/Categories, Live/History, Monthly/Annual).
- Use **FilterPills** when choices are filters over a list where each option can carry a count or urgent indicator (status filters, category filters).

---

## Date range picker (Calendar + Popover)

The canonical pattern for date range filters — two separate `Popover`-wrapped `Calendar` instances, **not** a single range-mode Calendar. Two separate pickers preserve open-ended "from only" and "up to X" behaviors that the URL contract supports.

Reference implementation: `src/routes/(app)/dashboard/orders/history/+page.svelte`.

**Imports:**

```ts
import * as Popover from '$lib/components/ui/popover';
import { Calendar } from '$lib/components/ui/calendar';
import { parseDate, type CalendarDate } from '@internationalized/date';
```

**State:**

```svelte
<script>
	let fromOpen = $state(false);
	let toOpen = $state(false);

	const fromDate = $derived(data.from ? parseDate(data.from) : undefined);
	const toDate = $derived(data.to ? parseDate(data.to) : undefined);
</script>
```

**`CalendarDate` ↔ string conversion:**

- URL stores ISO date strings (`"2026-01-05"`)
- `Calendar` uses `CalendarDate` from `@internationalized/date`
- In: `parseDate(urlString)` → `CalendarDate`
- Out: `calendarDate.toString()` → ISO string
- The cast `as CalendarDate | undefined` at `onValueChange` is required — shadcn's `type="single"` Calendar types the callback as `DateValue | undefined`. The cast is safe at runtime because non-range mode only emits `CalendarDate`.

**`updateDateRange` helper:**

```ts
function updateDateRange(which: 'from' | 'to', date: CalendarDate | undefined) {
	const p = new SvelteURLSearchParams();
	if (data.search) p.set('q', data.search);
	if (data.statusFilter) p.set('status', data.statusFilter);
	const nextFrom = which === 'from' ? date?.toString() : data.from;
	const nextTo = which === 'to' ? date?.toString() : data.to;
	if (nextFrom) p.set('from', nextFrom);
	if (nextTo) p.set('to', nextTo);
	const qs = p.toString();
	goto(
		qs
			? resolve(`/dashboard/orders/history?${qs}` as `/${string}`)
			: resolve('/dashboard/orders/history'),
		{ replaceState: true }
	);
}
```

**`clearDates` helper** — clears both dates without clearing search/status:

```ts
function clearDates() {
	const p = new SvelteURLSearchParams();
	if (data.search) p.set('q', data.search);
	if (data.statusFilter) p.set('status', data.statusFilter);
	const qs = p.toString();
	goto(
		qs
			? resolve(`/dashboard/orders/history?${qs}` as `/${string}`)
			: resolve('/dashboard/orders/history'),
		{ replaceState: true }
	);
}
```

Do not call `updateDateRange('from', undefined)` to clear both dates — that only clears `from` and preserves `to`. Use a dedicated `clearDates()`.

**Template (both pickers inside a single shared container):**

```svelte
<div class="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-background px-3 py-1.5">
  <Icon icon="mdi:calendar-outline" class="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />

  <Popover.Root bind:open={fromOpen}>
    <Popover.Trigger>
      {#snippet child({ props })}
        <button {...props} type="button" class="text-xs outline-none {data.from ? 'text-foreground' : 'text-muted-foreground'}">
          {data.from ? formatPickerDate(data.from) : 'From'}
        </button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-auto p-0" align="start">
      <Calendar
        type="single"
        value={fromDate}
        onValueChange={(date) => { fromOpen = false; updateDateRange('from', date as CalendarDate | undefined); }}
      />
    </Popover.Content>
  </Popover.Root>

  <span class="text-muted-foreground/40">→</span>

  <Popover.Root bind:open={toOpen}>
    <Popover.Trigger>
      {#snippet child({ props })}
        <button {...props} type="button" class="text-xs outline-none {data.to ? 'text-foreground' : 'text-muted-foreground'}">
          {data.to ? formatPickerDate(data.to) : 'To'}
        </button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-auto p-0" align="start">
      <Calendar
        type="single"
        value={toDate}
        onValueChange={(date) => { toOpen = false; updateDateRange('to', date as CalendarDate | undefined); }}
      />
    </Popover.Content>
  </Popover.Root>

  {#if data.from || data.to}
    <button type="button" class="ml-1 text-muted-foreground transition-colors hover:text-foreground" onclick={clearDates}>
      <Icon icon="mdi:close" class="h-3 w-3" />
    </button>
  {/if}
</div>
```

**Popover trigger via `{#snippet child({ props })}`** — passes bits-ui's aria props to a raw `<button>`. This is the documented Popover trigger exception (raw `<button>` inside `PopoverTrigger` keeps size/padding control while forwarding aria attributes). Do not nest a `<Button>` inside `PopoverTrigger`.

**Layout rule** — both pickers share a single outer container (the rounded border wraps `From → To` together). Never render them as separate floating inputs. The container sits on the same row as `FilterPills` (right-aligned, `space-between` on the toolbar row).

---

## Summary / Stats Bar

Single horizontal row of key stats at the top of list pages. Used on Orders.
Apply consistently to any list page with meaningful aggregate data.

```svelte
<div class="mb-6 flex items-center rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
	{#each stats as stat, i}
		<div class={cn('flex flex-col', i > 0 && 'ml-6 border-l border-gray-200 pl-6')}>
			<span class="text-xs tracking-wide text-gray-500 uppercase">{stat.label}</span>
			<span
				class={cn(
					'text-lg font-semibold',
					stat.urgent && 'text-amber-500',
					stat.positive && 'text-green-600',
					!stat.urgent && !stat.positive && 'text-gray-900'
				)}
			>
				{stat.value}
			</span>
		</div>
	{/each}
</div>
```

**Rules:**

- Never use a grid of bordered cards. Always inline divider-separated row.
- Stats update reactively when filters or date ranges change.

---

## Search + Filter Toolbar Pattern

Any page with a filterable list follows this exact two-row layout:

```
Row 1: [ Search input — full width                              ]
Row 2: [ Filter pills (left)          Date range picker (right) ]
```

**Rules:**

- Filter pills and date range are always on the same row, space-between.
- Date inputs always inside a single shared container — never bare native
  inputs with floating "From"/"To" text labels.
- Search is always above on its own row, never on the same row as pills.
- If a page has no date filter, the second row is just pills left-aligned.
- Never omit the search bar from a list page. If search isn't wired up yet,
  render a disabled placeholder.

---

## Cards

### Content / navigation card (Settings hub, Catalog hub)

```svelte
<a
	href={resolve(href)}
	class="group block rounded-xl border border-gray-200 bg-white p-6 transition-all hover:border-gray-300 hover:shadow-sm"
>
	<div class="mb-3 flex items-start gap-3">
		<div class="rounded-lg bg-green-50 p-2">
			<Icon {icon} class="h-5 w-5 text-green-600" />
		</div>
	</div>
	<h3 class="mb-1 text-base font-semibold text-gray-900">{title}</h3>
	<p class="text-sm text-gray-500">{description}</p>
</a>
```

### Data / list card (order cards)

The canonical reference implementations are `src/routes/(app)/dashboard/orders/+page.svelte` and `src/routes/(app)/dashboard/orders/history/+page.svelte`. Both follow the body + action strip pattern below.

```svelte
<div
	class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md
		{isCancelled ? 'opacity-50' : ''}"
>
	<!-- Card body: clickable, navigates to detail -->
	<div
		role="button"
		tabindex="0"
		class="cursor-pointer px-4 py-3"
		onclick={() => goto(resolve(`/dashboard/orders/${order.id}`))}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') goto(resolve(`/dashboard/orders/${order.id}`));
		}}
	>
		<!-- card content: badges row, customer, time, items summary, price -->
	</div>

	<!-- Action strip: only renders when there are actions -->
	{#if hasActions}
		<div class="flex items-center justify-end gap-3 border-t border-gray-100 px-4 py-2">
			<!-- text-link actions, right-aligned -->
		</div>
	{/if}
</div>
```

**Body padding** is `px-4 py-3` for list-card visual density. The previous `p-4` was looser; `py-3` is the implementation choice for compact lists.

**Hover treatment** uses `shadow-sm hover:shadow-md transition-shadow` for visual feedback. Do NOT use `hover:bg-muted/50`, `hover:bg-gray-50`, or any background-color hover on cards — shadow lift is the canonical signal. Background-color hovers on full cards read as "this row is selected" rather than "this is interactive," which conflicts with the click-to-navigate model.

**Action strip** is conditionally rendered. Cards with no available actions (e.g., fulfilled orders) end after the body. The strip never renders empty. Inside the strip:

- Right-aligned (`justify-end gap-3`)
- Border above (`border-t border-gray-100`)
- Padding `px-4 py-2`
- Affordances are quiet text links, not buttons. See [Documented raw `<button>` exceptions](#documented-raw-button-exceptions) entry #1.

#### Order card typography hierarchy

A two-size, two-weight, three-color system establishes scan-order on the cards:

| Tier | Class string | Use for |
| --- | --- | --- |
| Primary | `text-sm font-medium text-gray-900` | Customer name, price |
| Secondary | `text-xs text-gray-500` | Order number, delivery address, items summary, status label next to progress row |
| Tertiary | `text-xs text-gray-400` | Created date (history page), relative-time annotations |

Order number is monospace (`font-mono`) and joins the secondary tier — monospace alone gives findability; weight isn't needed.

**Fixed semantic colors** (not hierarchy levels):

- Pickup time / scheduled-for: `text-xs text-amber-700` (with relative-time portion in `text-amber-500`)
- Destructive text-link: `text-sm font-medium text-red-500 hover:text-red-600`

Amber and red signal "attention" and "destructive" respectively; they don't fit the gray-scale tier system.

**Customer name and price are equal-tier primary information.** Both `text-sm font-medium text-gray-900`. Earlier implementations had price at `text-base font-semibold` while customer was plain `text-sm`; that asymmetry was unearned. Vendor needs both who and how much; both get the same weight.

**Status label adjacent to the progress row is secondary**, not primary. The progress row carries the visual weight; the textual label is reinforcement.

**How the hierarchy applies to the detail page:**

The detail page (`/dashboard/orders/[orderId]`) uses the same three-tier gray scale for body content (`text-gray-900` primary, `text-gray-500` secondary, `text-gray-400` tertiary). Two documented exceptions:

1. **Card section headers** (`<CardTitle>` with `text-xs font-semibold tracking-wide text-muted-foreground uppercase`) keep their muted-token convention. This is the detail-page section-heading style, not part of the card typography vocabulary.
2. **Items card "Total" line** (`text-sm font-bold`) — semantic emphasis for the receipt's final answer, not hierarchy drift.

The detail-page page-header price uses `text-xl font-semibold text-gray-900` — one tier above cards' `text-sm font-medium text-gray-900` price, because it's a page-level data point rather than a list-card summary. The detail page `<h1>` (`text-2xl font-bold text-gray-900`) stays the loudest element on the page.

**Dashboard overview "Recent orders" table** (added in the lifecycle-vocabulary alignment prompt): the Status column uses the same icon + label vocabulary as the cards' progress row, in compact form (`h-3.5 w-3.5` icon, `text-xs font-medium text-gray-700` label). Active stages render in `text-primary`, cancelled in `text-red-500`, scheduled in `text-amber-600`. The same canonical `lifecycleStages` source is used.

**Customer-facing order status page** (`src/routes/(public)/[vendorSlug]/orders/[orderId]/+page.svelte`) intentionally diverges from the vendor-side lifecycle vocabulary. Three differences are deliberate, not drift:

1. **Icons.** The customer-side STEPS constant uses `mdi:receipt-text-outline` for received, `mdi:package-variant-closed` for in-production, and `mdi:bell-ring-outline` for ready. The vendor-side `lifecycleStages` uses `mdi:inbox-arrow-down`, `mdi:progress-wrench`, and `mdi:package-variant-closed` respectively. The vendor metaphors are worker-task-oriented; the customer metaphors are buyer-perspective-oriented. The `bell-ring-outline` for ready is a stronger "come pick up your order" signal than a neutral package icon.

2. **Labels.** Customer-side uses "Ready!" (with celebratory exclamation) and "Done" (warmer than "Fulfilled"). Vendor side uses neutral "Ready" and "Fulfilled."

3. **Visual treatment.** Customer-side stepper uses circular badges with `border-2` rings; vendor-side uses transparent containers with `bg-primary/10` only on the current stage. The richer customer treatment is appropriate for a single-order context that the customer reads once.

**Do not migrate the customer-side STEPS constant to import from `lifecycleStages`.** The divergence is intentional. If a future change touches the customer-side icons or labels, the change should preserve the buyer-perspective metaphors.

The customer page also legitimately uses themable tokens (`text-foreground`, `text-muted-foreground`) and CSS custom properties (`--background-color`, `--accent-color`, `--foreground-color`) for vendor branding. The gray-scale typography hierarchy used on vendor surfaces does NOT apply here — vendor theming requires themable tokens. This is the documented exception.

### Stat card (dashboard overview)

```svelte
<div class="rounded-xl border border-gray-200 bg-white p-6">
	<div class="mb-1 text-xs tracking-wide text-gray-500 uppercase">{label}</div>
	<div class="mb-2 text-2xl font-bold text-gray-900">{value}</div>
	<a href={resolve(href)} class="text-xs font-medium text-green-600 hover:text-green-700">
		{cta} →
	</a>
</div>
```

---

## Badges & Status Pills

```ts
const statusStyles = {
  // Order lifecycle
  received:  "bg-blue-100 text-blue-700",
  confirmed: "bg-indigo-100 text-indigo-700",
  preparing: "bg-amber-100 text-amber-700",
  ready:     "bg-purple-100 text-purple-700",
  fulfilled: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  // Payment
  paid:      "bg-green-100 text-green-700",
  refunded:  "bg-amber-100 text-amber-700",
  unpaid:    "bg-gray-100 text-gray-500",
  // Catalog item availability
  available: "bg-green-100 text-green-700",
  sold_out:  "bg-amber-100 text-amber-700",
  hidden:    "bg-gray-100 text-gray-400",
  draft:     "bg-gray-100 text-gray-500",
  // Sale
  sale:      "bg-red-100 text-red-600",
};

// Base badge
class={cn(
  "px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
  statusStyles[status]
)}
```

**Rules:**

- Always use `capitalize`.
- Never show a badge when all items in a list share the same status — use an
  inline toggle instead.
- Payment status is always shown on history order cards, even if "unpaid".

---

## Inline Toggle Switches

Used for boolean states (available/unavailable, active/inactive) directly in
list rows.

```svelte
<button
	onclick={() => handleToggle(id)}
	class={cn(
		'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
		isOn ? 'bg-green-500' : 'bg-gray-200'
	)}
	aria-label={isOn ? 'Disable' : 'Enable'}
>
	<span
		class={cn(
			'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
			isOn ? 'translate-x-4' : 'translate-x-0.5'
		)}
	/>
</button>
```

Use instead of static "Active"/"Available" badges wherever the state is
toggleable.

---

## Tables

```svelte
<div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
	<table class="w-full">
		<thead class="border-b border-gray-200 bg-gray-50">
			<tr>
				<th class="px-4 py-3 text-left text-xs font-medium tracking-wide text-gray-500 uppercase"
					>Name</th
				>
				<!-- ... -->
			</tr>
		</thead>
		<tbody class="divide-y divide-gray-100">
			{#each rows as row}
				<tr class="hover:bg-gray-50">
					<td class="px-4 py-3 text-sm text-gray-900">{row.name}</td>
					<!-- Row actions: always visible -->
					<td class="px-4 py-3 text-right">
						<div class="flex items-center justify-end gap-1">
							<a href={resolve(`/dashboard/catalog/items/${row.id}`)} class="...">Edit</a>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
```

**Rules:**

- Table container always `rounded-xl` and `overflow-hidden`.
- Destructive row actions are icon-only with `text-red-400`, always behind a confirmation dialog.
- Never show a prominent red "Delete" text link inline.
- Row actions are always visible. Do not use `opacity-0 group-hover:opacity-100` to hide them until
  hover. Row hover changes background only (`hover:bg-gray-50`). Do not add `group` to `<tr>` for
  action visibility.
- Mobile card actions (action strip below content) follow the same convention: always visible.

---

## Empty States

Every list, table, or filtered view must have an empty state. Never blank.

```svelte
{#if items.length === 0}
	<div class="rounded-xl border border-gray-200 bg-white p-12 text-center">
		<h3 class="mb-1 text-base font-semibold text-gray-900">{title}</h3>
		<p class="mb-4 text-sm text-gray-500">{description}</p>
		{#if cta}
			<a href={resolve(cta.href)} class="text-sm font-medium text-green-600 hover:text-green-700">
				{cta.label} →
			</a>
		{/if}
	</div>
{/if}
```

When an active search/filter produces no results, the empty state copy
reflects the active filter: `No results for "scott"` or
`No cancelled orders in this date range.`

**For Order Local specifically:** empty states for vendors who just signed up
should suggest _the next concrete action_, not aspirational copy. "No orders
yet — share your storefront link to get started" with a button that opens the
Resources page beats "Welcome! Start your journey here."

---

## Forms & Inputs

```
// Text input — explicit height
class="h-8 w-full px-3 text-sm border border-gray-200 rounded-lg bg-white
       placeholder:text-gray-400 focus:outline-none focus:ring-2
       focus:ring-green-500 focus:border-transparent"

// Select (raw)
class="h-8 w-full px-3 text-sm border border-gray-200 rounded-lg bg-white
       focus:outline-none focus:ring-2 focus:ring-green-500"

// Textarea
class="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white
       resize-none focus:outline-none focus:ring-2 focus:ring-green-500"

// Label
class="block text-sm font-medium text-gray-700 mb-1.5"

// Helper text
class="text-xs text-gray-400 mt-1.5"

// Error text
class="text-xs text-red-500 mt-1.5"

// Error input state (add to input)
class="border-red-300 focus:ring-red-500"
```

All single-line form inputs (text, email, number, search, password, date) and selects use `h-8`
(32px). The shadcn `<Input>` and `<SelectTrigger>` primitives default to `h-8` — do not override
to a different height per-callsite. Textareas are multi-line and are not subject to this rule;
use `min-h-*` instead.

**Raw vs shadcn migration:** The shadcn `<Input>` and `<SelectTrigger>` primitives have been
updated to `h-8` as the default. New code should prefer the shadcn primitives. Raw `<input>`/
`<select>` elements that exist today (settings, forms, etc.) follow the `h-8` rule via
per-callsite classes — these will eventually be migrated to shadcn primitives in a separate audit
(see roadmap, "Forms & UI shadcn-svelte audit" in Tier 2).

**Rules:**

- Never use native browser date inputs with default styling. Wrap in a styled
  container.
- Every input has a visible label. Placeholder is not a label.
- Error messages appear below the input in red, never as alerts or toasts for
  inline validation.

---

## Label vs Value Rendering

DB values are canonical (lowercase enum, snake_case, IANA strings). Labels are human-readable. Never render a raw value where a label belongs.

**Pattern for Select triggers:**

```svelte
let typeValue = $state('bakery');

<Select type="single" name="type" bind:value={typeValue}>
	<SelectTrigger>
		<SelectValue>
			{BUSINESS_TYPES.find((bt) => bt.value === typeValue)?.label ?? 'Select type'}
		</SelectValue>
	</SelectTrigger>
	...
</Select>
```

`bind:value` submits `'bakery'` to the server; the user sees `'Bakery'`. Don't rely on bits-ui's implicit label lookup for pre-set values — it fails when `SelectContent` hasn't mounted yet.

**Rules:**

- Select triggers — always resolve label from the canonical list via `.find()`, never render the raw value string
- Badges and status pills — `capitalize` covers single-word statuses; for multi-word enums (`sold_out`, `food_truck`, `in_production`) use an explicit labels map
- Table cells and summary text showing enum columns — resolve label before rendering
- The `preparing` status renders as "In production" everywhere a vendor sees it (see Order lifecycle section)

**Where raw values ARE correct:**

- `value` attribute on form inputs and hidden inputs
- `name`/`action` attributes
- Server-side logic, DB queries, URL slugs

**Centralized label sources:**

- `BUSINESS_TYPES` in `src/lib/utils/business-type-labels.ts` — vendor type
- When adding a new enum to the schema, add its labels map at the same time. Don't scatter label resolution across components.

---

## Confirmation Dialogs

Required before any destructive or irreversible action (delete, cancel order,
refund, bulk operations).

**Rules:**

- The confirm button label names the action ("Delete", not "Yes" or "OK").
- The cancel button always dismisses without action.
- Never auto-execute destructive actions on single click.

**Deferred to shadcn audit:** Any confirmation currently implemented with `window.confirm()` is
a temporary measure. When the shadcn component audit lands, migrate all `confirm()` calls to a
proper `<Dialog>` primitive with explicit confirm/cancel buttons. Current callsites:
`/dashboard/settings/pickup` — `deleteTemplate` form (×2).

---

## Alert (severity-based feedback)

Alert is the canonical primitive for transient action feedback (form submissions, save confirmations, errors) and for persistent informational placeholders. Replaces all raw banner-shaped markup across the dashboard. Currently 47 callsites across settings, catalog, account, and orders pages.

**Import:**

```ts
import { Alert } from '$lib/components/ui/alert';
```

**Severities and defaults:**

| Severity | Palette | Auto-fades after | Dismissible | Icon |
|---|---|---|---|---|
| `success` | green | 5000ms | yes | `mdi:check-circle-outline` |
| `info` | blue | 5000ms | yes | `mdi:information-outline` |
| `warning` | amber | 8000ms | yes | `mdi:alert-outline` |
| `error` | red | never (persistent) | yes | `mdi:alert-circle-outline` |

Errors persist by default — auto-fading them risks users missing critical feedback.

**Pattern A — Transient action feedback (the dominant pattern):**

```svelte
{#if form?.someSuccess}
  <Alert severity="success">Changes saved.</Alert>
{/if}
{#if form?.error}
  <Alert severity="error">{form.error}</Alert>
{/if}
```

Wrapped in `{#if ...}` so the Alert mounts/unmounts on form-action state changes. Each new form submission creates a fresh Alert instance with `shown = true` and starts a fresh timer.

Severity choice follows the action's semantic outcome:
- Action completed (save, remove, state change): `severity="success"`
- Server or validation error: `severity="error"`
- State change without celebration or alarm: `severity="info"`
- Needs attention, not blocking: `severity="warning"`

Note: `severity="success"` applies to both creation and destruction confirmations. "Window removed" and "Member added" both use `success` — the severity signals the action completed cleanly, not that something was added.

**Pattern B — Persistent informational placeholder:**

```svelte
<Alert severity="info" dismissible={false} autofade={0}>
  Notification preferences coming soon. You'll be able to opt in to weekly
  summary digests, daily prep emails before pickup windows, and product
  updates from the Order Local team.
</Alert>
```

> **TODO when notifications page ships:** This example references the live placeholder at `/dashboard/account/notifications`. When the actual notification preferences UI replaces the placeholder Alert, this example becomes orphaned. Either swap to another persistent-placeholder usage in the codebase, or revisit whether Pattern B is a real pattern worth documenting (current usage is one site; if there are no other persistent placeholders planned or in use, demote to a footnote or remove entirely). Roadmap reference: Tier 2 "account/notifications — build vendor notification preferences."

Use for pages whose primary functionality is intentionally deferred. `dismissible={false}` prevents dismissal (the message must persist for context). `autofade={0}` disables auto-fade regardless of severity default. The Alert becomes a persistent informational element rather than a transient notification.

Don't use Pattern B for active errors or warnings — those should use their natural severity defaults (`error` already persists; `warning` auto-fades after 8s).

**Props:**

| Prop | Type | Default | Notes |
|---|---|---|---|
| `severity` | `'success' \| 'info' \| 'warning' \| 'error'` | required | Determines palette, icon, and default duration |
| `dismissible` | `boolean` | `true` | Whether the × dismiss button renders |
| `autofade` | `number` | severity default | Override auto-fade duration in ms. `autofade={0}` disables |
| `ondismiss` | `() => void` | — | Callback when dismissed |
| `class` | `string` | — | Additional classes (typically spacing: `mb-4`, `mt-4`) |

**Rules:**

- Never write raw banner markup (`border-green-200 bg-green-50`, etc.) for any colored message box. Alert is the answer.
- Don't override the severity icon at the callsite — severity determines icon consistently across the dashboard.
- Don't use `autofade={0}` on error Alerts — errors are already persistent by default.
- Field-level validation errors (invalid email, missing required field) render as `text-xs text-red-500 mt-1.5` below the input, not as Alert. Alert is for form-level action feedback only.

---

## Navigation & Routing

- Active sidebar nav item: `bg-green-600 text-white rounded-lg`
- Inactive sidebar nav: `text-gray-400 hover:text-white hover:bg-gray-800`
- All internal navigation uses `<a href={resolve(...)}>` or `goto(resolve(...))`.
  Never `window.location` for internal routes.
- Use `$page.url.pathname` for active states. Never local state if the URL
  encodes it.
- Query params (`?status=received`, `?category=breads`) are always the source
  of truth for filter state. Read via `$page.url.searchParams`.

### Order lifecycle progress

The order lifecycle is visualized as an icon-based progress row, not a colored `<Badge>`. Icons and labels come from `lifecycleStages` in `src/lib/utils/order-lifecycle.ts`. Never add a new status icon outside that module.

**Compact (list cards):** a row of icons without labels. Completed stages: icon at full `text-primary` opacity. Current stage: icon wrapped in `bg-primary/10 rounded-full p-0.5`. Pending stages: icon at `text-gray-300`. Cancelled orders: `mdi:close-circle` in `text-red-500` with the label "Cancelled".

**Full stepper (detail page):** same icon treatment, larger (`h-5 w-5`), with stage labels below and `h-px flex-1` connector lines (`bg-primary` for completed segments, `bg-gray-200` for pending). Cancelled orders skip the stepper and show the icon + label inline instead.

**When to use:** whenever lifecycle status needs to be communicated on an order card or detail page. Do not fall back to Badge for lifecycle — the icon row is the only treatment.

### Order state-transition buttons

Order state-transition buttons ("Confirm", "Start production", "Mark ready", "Fulfill") appear ONLY on the order detail page Actions card (`/dashboard/orders/[orderId]`). They do NOT appear on list cards in `/dashboard/orders` or `/dashboard/orders/history`. List cards are clickable and navigate to the detail page; vendors advance order status from there.

Implemented via the default `<Button>` primitive (brand green). Each button includes an `<Icon>` matching the destination stage from `actionConfig` in `src/lib/utils/order-lifecycle.ts`. Button labels and icons are sourced from that single canonical map.

```svelte
{@const action = actionConfig[order.status]}
<Button type="submit">
	<Icon icon={action.icon} class="h-3.5 w-3.5" />
	{action.label}
</Button>
```

The detail page is the only state-transition surface. Brand green is the canonical primary-CTA treatment for that surface — there is no longer a competing per-card button to displace it. The earlier convention of `bg-blue-600 hover:bg-blue-700 text-white` on raw `<button>` elements was never implemented; the convention before this rewrite was a class override (`bg-gray-900 text-white hover:bg-gray-800`) that briefly applied during a transitional state. Both are retired.

### Destructive actions (Cancel, Refund)

Destructive actions take two forms in this codebase, depending on surface context:

**On the detail page (`/dashboard/orders/[orderId]`):** "Cancel order" and "Refund payment" use `<Button variant="outline">` with class override `border-red-200 text-red-500 hover:bg-red-50`. The filled `variant="destructive"` is never used — outlined red is the canonical quieter treatment. The detail page sits these buttons next to the brand-green state-transition button, so the quieter treatment prevents the destructive action from competing with the primary CTA.

**On list cards (`/dashboard/orders`, `/dashboard/orders/history`):** Cancel and Refund are quiet text affordances in the card action strip below the body, NOT outlined buttons. Raw `<button>` element with classes `text-sm font-medium text-red-500 transition-colors hover:text-red-600`. The strip itself signals "these are actions"; the affordances inside don't need button shape to read as actionable. See "Card action strip" pattern under [Data / list card](#data--list-card-order-cards).

The mobile hamburger uses a plain `<button>` instead of `<Button variant="ghost">` due to dark-surface hover conflict — flagged for Tier 2 shadcn audit alongside a potential `dark-surface` variant. The outlined-destructive treatment on detail page is also flagged for the same audit (a `destructive-outline` variant would eliminate the class override).

### Mobile header

The mobile header (`md:hidden` in `+layout.svelte`) is `sticky top-0 z-30` so the hamburger remains accessible during scroll. Desktop is `md:static md:z-auto` — the persistent sidebar provides navigation and a sticky decorative header would steal vertical space. The Sheet/drawer overlay sits at `z-50`, above the sticky header.

The hamburger uses a plain `<button>` rather than shadcn `<Button variant="ghost">` because ghost's `hover:bg-accent` conflicts unpredictably with explicit dark-surface hover overrides. Hover convention matches sidebar nav links: `hover:bg-gray-800`. Tier 2 shadcn audit should add a "dark surface" Button variant to resolve this properly.

### Production view day-grouping

The production view (`/dashboard/orders?view=production`) defaults to grouping by **day**, not by pickup window. Vendors think in days ("what do I bake Saturday?"), not in implementation-detail pickup-window IDs. The day grouping is computed client-side via a `$derived` value that re-buckets the server's window-grouped data into days, summing quantities across windows on the same date.

A toggle in the production toolbar swaps between day and window grouping. State is in URL via `?group=window` — the day view is the default, no param needed. URL state allows bookmarking and survives reload.

When applying this pattern to other views: server should query at the natural SQL granularity (whatever the database aggregation key is); client should re-bucket into the user-mental-model grouping via `$derived`. The toggle, if needed, lives in URL search params — not component-local state.

Day-card header format: `Saturday, May 2 · 12 items to prep · 2 pickup windows` (plural-aware on both counts).

### Modifier-aware item aggregation

When aggregating order items for production views, **always include modifier identity in the GROUP BY**. Two items with the same name but different modifier sets represent different prep work. Aggregating them together hides production-relevant variance.

Server-side: include `selectedModifiers` in both the SELECT and GROUP BY. PostgreSQL's JSONB grouping correctly distinguishes different modifier sets (canonical representation handles object key ordering; array order is preserved as part of identity).

Client-side rendering format:

```svelte
{item.name}{#if item.modifiers.length > 0}<span class="text-gray-500"> — {item.modifiers.join(', ')}</span>{/if}
```

Item name in primary color (`text-gray-900`); modifier list in `text-gray-500` with em-dash separator; comma-separated modifiers when multiple. No suffix when modifiers array is empty.

When deduplicating client-side (e.g., for day-grouping re-bucketing), the deduplication key is `name + sorted(modifiers).join('|')` — sorting ensures `[crusty, sliced]` and `[sliced, crusty]` collapse to the same row.

---

## Mobile-First Convention

Write base classes for the narrowest meaningful layout. Add `md:` modifiers for desktop enhancements. The `md:` breakpoint (768px) is the single toggle point for the dashboard — it matches the sidebar/no-sidebar layout switch in `+layout.svelte`.

### Card two-column pattern

Desktop-style "left content / right actions" cards reflow to a vertical stack at mobile. The correct pattern:

```svelte
<!-- outer: column on mobile, row on desktop -->
<div class="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-start md:gap-4">
	<!-- left / top section: full width on mobile -->
	<div class="min-w-0 flex-1">...</div>

	<!-- right / bottom section: full width on mobile, right column on desktop -->
	<div class="flex flex-col gap-2 md:shrink-0 md:items-end md:gap-1">
		...price or summary...
		<div class="flex flex-wrap gap-1.5 md:mt-2 md:justify-end">...action buttons...</div>
	</div>
</div>
```

**Rules:**

- Never use `shrink-0` on a right column without pairing it with `md:shrink-0` (not bare `shrink-0`). A bare `shrink-0` right column forces the left column to compress on mobile.
- When a desktop layout has a "right column" pattern (price + actions, or similar), the mobile pattern should NOT try to reproduce that structure horizontally. Stack vertically and let each element take its natural width. Don't use `justify-between` or `flex-row-reverse` to recreate desktop's spatial relationships on mobile — produces brittle layouts that fight the platform.
- For rows with overflowing content (date range + export, filter toolbar extras), use `flex-col gap-2 md:flex-row md:items-center` to stack on mobile and inline on desktop. Keep logically related elements (result count + export button) in the same inner container so they stay together as a unit when wrapping.

---

## Inner navigation (Account, Settings)

Pages with multiple sub-pages that share a parent (Account, Settings) use
the `InnerNavLayout` component for inner navigation. The component lives at
`src/lib/components/InnerNavLayout.svelte` and provides:

- **Desktop (`md:` and up):** a left sidebar nav, `w-44` (176px) wide,
  showing each destination as an icon + label row. The sidebar's title (e.g.,
  "ACCOUNT", "SETTINGS") sits above the nav items in the same uppercase
  treatment as section headings (`text-xs font-medium tracking-wider
text-gray-500 uppercase`). Active state: `bg-gray-100 font-medium
text-gray-900`. Inactive: `text-gray-500 hover:bg-gray-50
hover:text-gray-900`.
- **Mobile (below `md:`):** a full-width shadcn `<Select>` at the top of
  the content area, below the page header. Trigger shows the active
  destination's icon + label. Selecting a different option navigates to that
  destination via `goto(resolve(...))`.

Active state is derived from `page.url.pathname.startsWith(href)`, never
from local state. The pattern's mobile-first shape: base classes describe
the mobile select-above-content layout, `md:` adds the sidebar column.

When adding a new top-level destination with sub-pages, use this component.
Do not build a parallel inner-nav implementation. Do not introduce a card
grid hub as an alternative — the inner sidebar/select pattern is canonical.

If the bare parent route (e.g., `/dashboard/settings`) needs to redirect to
a default sub-page, use `+page.server.ts` with a `redirect(302, ...)`. The
sub-pages themselves do not include back links to the parent — the inner
sidebar/select handles navigation.

---

## Print pattern

For printable views (production list, receipt, etc.), use Tailwind's `print:` variants for opt-out chrome hiding. The default behavior is "everything prints"; explicit `print:hidden` on chrome elements removes them from print. This scales better than opt-in approaches because new content added to the page prints correctly without needing print-specific markup.

**Layout-level chrome** receives `print:hidden` on the wrapping element:

```svelte
<aside class="... print:hidden">...</aside>
<header class="... print:hidden">...</header>
<footer class="... print:hidden">...</footer>
```

**Page-level chrome** (search, filters, tabs, summary bars, toolbars) also gets `print:hidden` on its wrapping element.

**Print-only headers** use `hidden print:block` so they're invisible on screen but appear in print:

```svelte
<div class="hidden print:mb-6 print:block">
  <h1 class="text-xl font-bold text-gray-900">Production list</h1>
  <p class="text-sm text-gray-500">{vendorName} · Printed {date}</p>
</div>
```

**Body reset** for print, in a `<style>` block on the page that has the printable content:

```svelte
<style>
  @media print {
    :global(body) {
      background: white !important;
    }
  }
</style>
```

This neutralizes any vendor-themed or dark page background so print output is clean.

**Print trigger** is `window.print()` from a button click. No PDF generation, no new dependencies.

Apply this pattern to any future printable view (order receipts, invoices, end-of-day summaries, etc.).

---

## Loading & Skeleton States

Every data-fetching component shows a skeleton while loading, not a spinner
or blank space.

```svelte
<!-- Skeleton line -->
<div class="h-4 animate-pulse rounded bg-gray-200" />

<!-- Skeleton card -->
<div class="animate-pulse rounded-xl border border-gray-200 bg-white p-4">
	<div class="mb-3 h-4 w-1/3 rounded bg-gray-200" />
	<div class="space-y-2">
		<div class="h-3 w-full rounded bg-gray-200" />
		<div class="h-3 w-5/6 rounded bg-gray-200" />
	</div>
</div>
```

Skeleton count matches expected result count.

---

## Component File Conventions

- Shared components live in `src/lib/components/`
- Page-specific components live colocated with their page file (`+page.svelte`)
  or in a `_components/` subfolder if the page has many
- Component names are PascalCase, file names match
- Extract a component when the same markup appears in 2+ places
- Shared components have TypeScript interfaces for all props
- Prefer named exports over default exports for shared components

---

## Database & Server

- The schema lives in `src/lib/server/db/schema/`. The single source of truth
  for the data model.
- Drizzle migrations are applied via `bun run db:migrate` (or `db:push` if the
  project is push-based — check `drizzle.config.ts`).
- Never write raw SQL in routes. Always go through Drizzle.
- Server-only code lives under `src/lib/server/`. Never import from
  `$lib/server/*` in client-side code.
- Database column naming: `snake_case` in SQL, `camelCase` in TypeScript
  (Drizzle's default mapping).
- **Drizzle `time` columns return `"HH:MM:SS"` strings** (e.g. `"09:00:00"`, not `"09:00"`).
  When parsing or comparing time-column values, always split on `:` and take the first two
  parts, OR normalize before comparison. Current consumers: `pickup_window_templates.window_start`
  / `window_end`. Phase 4 materialization will be the next.
- **Vendor timezone** is stored in `vendors.timezone` as an IANA string (e.g. `"America/Chicago"`).
  Default is `"America/New_York"`. Validate with `new Intl.DateTimeFormat('en-US', { timeZone })` —
  it throws on invalid values. The timezone UI helper lives in `src/lib/utils/timezones.ts`:
  `US_TIMEZONES` (7 US entries with friendly labels) and `getAllTimezones()` (full IANA list via
  `Intl.supportedValuesOf('timeZone')` with fallback). Always use these — never hardcode timezone
  lists inline. In client components that need the browser's local timezone, auto-detect in
  `onMount` with `Intl.DateTimeFormat().resolvedOptions().timeZone`; SSR initializes to the
  default, `onMount` corrects to the user's browser timezone.

---

## Build & dev gotchas

- **CommonJS dependencies require `ssr.noExternal` in `vite.config.ts`.** Symptoms: "service
  was stopped" errors during dev SSR, or named-export import failures that don't surface in
  client builds (Vite handles CJS interop differently in production than in the SSR module
  runner). Fix: add the offending package name to the `ssr.noExternal` array in
  `vite.config.ts`. Currently affects: `rrule`. Add to this list as new CJS deps are introduced.

- **Neon HTTP driver does not support transactions.** Use sequential operations and rely on
  idempotency (unique constraints + `onConflictDoNothing`, or version checks) for atomicity.
  Switching to the WebSocket driver to gain transactions is not worth the persistent-connection
  cost in serverless deployments.

- **Testing the cron endpoint locally.** The endpoint at `GET /api/cron/materialize` is
  protected by a `CRON_SECRET` Bearer token. To fire it against the local dev server:
  1. Set `CRON_SECRET` to any non-empty value in your `.env` file.
  2. Start the dev server: `bun run dev`
  3. Run: `bun run cron:materialize`

  The script reads `CRON_SECRET` from the environment and prints the JSON response. No
  curl needed. The dev server must be running; the script does not start it.

- **Production cron via Netlify Scheduled Functions.** The function at
  `netlify/functions/materialize.mts` is a thin HTTP wrapper that calls the SvelteKit endpoint
  at `/api/cron/materialize` daily at 7am UTC (~2-3am Eastern, low-traffic window). The endpoint
  runs `materializeAllActiveTemplates()` (extends pickup window horizon) and
  `transitionScheduledOrders()` (flips scheduled→received within the production horizon).
  Production `CRON_SECRET` is set in Netlify environment variables, distinct from the dev value
  in `.env`. Schedule is declared via the `config` export in the function file (Netlify Functions
  v2 — no `[[scheduled-functions]]` stanza needed in `netlify.toml`).

- **`drizzle/meta/` was rebaselined Apr 2026** to recover from broken snapshot state caused
  by hand-written migrations 0001–0005 that were never run through `drizzle-kit generate`.
  The first migration after the rebaseline (`0001_rebaseline_post_introspect.sql`) reconciles
  two things: an index representation artifact between `drizzle-kit introspect` and the schema
  source, and a stale `enableTips` default value that predated the restaurant-DNA cleanup.
  SQL migration files 0000–0005 in `drizzle/` are historical record; see `drizzle/README.md`.
  New migrations going forward generate from the rebuilt baseline. `bun run db:generate` is
  safe again — run it normally.

---

## shadcn-svelte primitive install gotchas

Five distinct issues have surfaced when installing or modifying shadcn-svelte primitives. Verify each on first use of any new primitive — static checks won't catch any of these.

**1. bits-ui state attribute syntax**

shadcn-svelte's installed primitives sometimes ship with `data-checked:` / `data-unchecked:` / `data-open:` / `data-closed:` / `data-active:` shorthand variant syntax in their class strings. This is wrong for bits-ui's actual rendering: bits-ui emits value-based state attributes (`data-state="checked"`, `data-state="open"`, etc.), not bare boolean attributes.

The correct Tailwind syntax is `data-[state=checked]:`, `data-[state=unchecked]:`, `data-[state=open]:`, `data-[state=closed]:`, `data-[state=active]:` — the bracket form that targets the value of the data-state attribute.

Symptoms when wrong: the primitive renders without the active-state visual (e.g., Switch unchecked thumb doesn't translate, Checkbox doesn't show its check fill, Dropdown doesn't animate open).

Primitives previously fixed in this project: Switch, Checkbox, Accordion, Dialog, DropdownMenu, Select, Sheet, Tabs, Tooltip. Each had `data-X:` shorthand replaced with `data-[state=X]:`.

Two attributes that should NOT be converted: `data-highlighted` (SelectItem) and `data-disabled` (DropdownMenuItem). Those are genuine boolean attributes, not `data-state` values.

**Sweep on first install:** open every newly-installed primitive file and search for `data-checked\|data-unchecked\|data-open\|data-closed\|data-active` followed by `:`. Convert to `data-[state=X]:` form before using the primitive in any callsite.

**2. tw-animate-css dependency**

shadcn-svelte primitives reference animation utility classes (`animate-in`, `animate-out`, `fade-in-0`, `fade-out-0`, `zoom-in-95`, `zoom-out-95`, `slide-in-from-*`, `slide-out-to-*`) for overlay enter/exit. These are not part of Tailwind v4 by default. They require the `tw-animate-css` package:

```bash
bun add -D tw-animate-css
```

And in `src/routes/layout.css`, immediately after the Tailwind import:

```css
@import 'tailwindcss';
@import 'tw-animate-css';
```

Symptom when missing: overlays pop in/out without easing; animations don't render at all. Static checks pass — the issue is invisible until visual exercise.

`tw-animate-css` is already installed in this project. This note exists for reference if a future Tailwind upgrade or config reset removes it.

**3. Primitive default colors may not work in light-on-light contexts**

shadcn-svelte primitives use design tokens (`bg-input`, `bg-muted`, `bg-background`) for default backgrounds. In this project's light theme some of those tokens render invisibly against white surfaces.

Example: Switch's unchecked track previously used `bg-input`, which rendered transparent against the white form background. Fixed by replacing with `bg-gray-300` at the primitive level.

When installing a new primitive, visually verify each default state in the actual UI context where it will be used. If a default state renders invisibly or with insufficient contrast, override the affected token at the primitive file level — not at each callsite. Per-callsite overrides cause drift.

**4. CLI `--overwrite` clobber risk**

`bunx shadcn-svelte@latest add <primitive> --overwrite` regenerates primitives from upstream source. This destroys any project-specific customizations: size variants, comment markers, eslint-disable blocks, color overrides.

Dependency primitives get regenerated too. When you `add Calendar`, Button gets pulled in as a dependency and regenerated, losing its size taxonomy additions.

Workflow:

- Prefer `bunx shadcn-svelte@latest add <primitive>` without `--overwrite`.
- If `--overwrite` is required (e.g., upgrading shadcn-svelte), `git diff` every customized primitive after install and restore from git as needed.
- The Button primitive is the most heavily customized file in this project (size taxonomy, variant additions, prop passthrough). Always verify it is intact after any `--overwrite` install.

This has happened twice during the Batch 4–9 migration. Both times Button was clobbered and restored from git.

**5. Component prop accepted but not rendered**

Declaring a prop does not guarantee it renders. `ConfirmModal` accepted a `title` prop — surfaced as a documented option at ~7 callsites — before anyone noticed the title never appeared in the rendered dialog. The component silently ignored the prop. Static checks passed.

When building or reviewing a component:

- For each declared prop, verify the template consumes it.
- If the prop produces visible output (text, class, visibility toggle), exercise it at least once in the browser before declaring the component done.

---

## Order lifecycle (current)

Schema enum values: `received`, `confirmed`, `preparing`, `ready`, `fulfilled`,
`cancelled`.

Display labels: Received, Confirmed, **In production**, Ready, Fulfilled,
Cancelled.

Note the display rename: `preparing` → "In production" everywhere a vendor sees
it. The schema value is unchanged.

The lifecycle is currently restaurant-shaped and assumes orders are in active
production within minutes of being received. This is wrong for makers/bakers/growers
(a Thanksgiving pie order placed November 15 sits idle until November 25). The
lifecycle will be properly reshaped as part of the Pickup Windows feature; until
then, vendors live with the workaround of leaving holiday orders in `confirmed`
until they begin actual production.

---

## Order snapshot pattern

### Where it lives

`orders.items` — a `jsonb` column on the `orders` table
(`src/lib/server/db/orders.ts`). Written once at order creation, never
mutated. Serves as the permanent record of what was in the cart at
purchase time.

### Canonical shape

The column stores an array of line items. Each item conforms to `CartItem`
from `src/lib/cart.svelte.ts`:

```typescript
type OrderLineItem = {
	itemId: number; // catalogItems.id at purchase — used as FK hint only
	name: string; // display name, denormalised from catalogItems
	basePrice: number; // unit base price in cents, BEFORE modifier adjustments
	quantity: number;
	selectedModifiers: Array<{
		group: string; // modifier group display name
		name: string; // selected option display name
		priceAdjustment: number; // cents, added to basePrice (can be negative)
	}>;
	imageUrl?: string; // optional storefront image URL
	isSubscription?: boolean; // true for recurring items
	billingInterval?: string; // 'monthly' | 'yearly', only when isSubscription=true
};
```

**Required at all write sites:** `name`, `basePrice`, `quantity`,
`selectedModifiers` (array — pass `[]` when there are no modifiers, never
omit).

**Optional:** `itemId`, `imageUrl`, `isSubscription`, `billingInterval`.

### Snapshot → `orderItems` table mapping

A parallel `order_items` row is inserted alongside every snapshot line
item. The mapping is:

| Snapshot field                                     | `orderItems` column | Notes                                |
| -------------------------------------------------- | ------------------- | ------------------------------------ |
| `name`                                             | `name`              | verbatim                             |
| `quantity`                                         | `quantity`          | verbatim                             |
| `basePrice + Σ(selectedModifiers.priceAdjustment)` | `unitPrice`         | effective unit price                 |
| `selectedModifiers`                                | `selectedModifiers` | stored verbatim as JSONB             |
| `itemId`                                           | `catalogItemId`     | nullable; `null` if item was deleted |

The `orderItems` table is the queryable, relational copy. The JSONB
snapshot is the immutable receipt. When displaying order details to vendors
or customers, read from the snapshot, not `orderItems`.

### Who reads and writes this today

| Code path                                          | Reads                                                                                              | Writes                                                                              |
| -------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `routes/api/create-checkout/+server.ts`            | —                                                                                                  | snapshot + `orderItems` (source: `CartItem[]`)                                      |
| `routes/api/create-payment-intent/+server.ts`      | —                                                                                                  | snapshot + `orderItems` (same shape)                                                |
| `lib/server/seed-demo.ts`                          | —                                                                                                  | snapshot only (minimal shape: `name`, `basePrice`, `quantity`, `selectedModifiers`) |
| `dashboard/orders/[orderId]/+page.svelte`          | `name`, `quantity`, `basePrice`, `selectedModifiers[].name`, `selectedModifiers[].priceAdjustment` | —                                                                                   |
| `routes/api/webhooks/stripe/[vendorId]/+server.ts` | `order.items` cast to email template shape                                                         | —                                                                                   |

### Known drift

The Stripe webhook passes `order.items` directly to `orderConfirmedEmail`
with a TypeScript `as` cast to a type that expects `unitPrice`, but the
snapshot stores `basePrice`. The `orderItemsTable` email helper renders
`item.unitPrice * item.quantity`, so **confirmation email line-item prices
display as `$NaN`**. This is a pre-existing bug; do not work around it by
changing the snapshot shape — fix the email helper to read `basePrice` or
compute the effective price.

### Rules

- Any code path that writes to `orders.items` must include at minimum
  `name`, `basePrice`, `quantity`, and `selectedModifiers`. No exceptions.
- Any code path that reads `orders.items` must cast the JSONB explicitly
  (Drizzle types the column as `unknown`). Use the shape above as the
  ground truth for the cast.
- Future additions to line items (e.g. pickup window reference, bundle
  grouping) require: (1) updating this doc, (2) updating both write paths,
  (3) a migration or backfill plan for existing snapshot rows if the new
  field is required by readers.
- Do not change `selectedModifiers` to omit items with no modifiers — pass
  `[]`. Readers guard with `?.length` but writers should be consistent.

### Pickup window snapshot (`orders.pickupWindowSnapshot`)

A separate JSONB column written at the same INSERT that writes `orders.items`.
Canonical type (from `src/lib/server/pickup/checkout.ts`):

```typescript
type PickupWindowSnapshot = {
	windowId: number; // pickupWindows.id at purchase time
	name: string; // window display name, denormalised
	startsAt: string; // ISO 8601 UTC
	endsAt: string; // ISO 8601 UTC
	notes: string | null; // window-level notes
	location: {
		name: string;
		address: unknown | null; // structured address JSONB
		notes: string | null;
	} | null;
};
```

`null` when the order used free-form scheduling or was a subscription. When
reading in the confirmation email or order detail page, cast with
`order.pickupWindowSnapshot as PickupWindowSnapshot | null` and guard for
`null`. **Never re-derive pickup display from the FK** (`pickupWindowId`) — the
snapshot is the receipt, the FK is just a join hint.

---

## Vendor settings

Each vendor has per-shop settings that change how the customer-facing storefront
and cart behave. When building a feature that adds checkout, payment, or
scheduling UI, **check the vendor's settings first** rather than hardcoding
defaults.

Settings live in the `vendors.settings` JSONB column. Current keys:

- `enableTips` (default `false`) — controls whether the cart shows a tip
  selector. Most makers, bakers, and growers don't accept tips. Coffee shops and
  food trucks may opt in.
- `asapPickupEnabled` (default `false`) — controls whether the cart shows an
  "ASAP" pickup option. Default is "Schedule" only (free-form date/time).

Add new settings to the General settings page (`/dashboard/settings/general`)
with helper text explaining when a vendor would want to enable it. Default off
for the wedge audience; vendors opt in.

---

## Verification protocol

Static and behavioral verification are not interchangeable. Claude Code performs static checks; the human performs behavioral checks. A phase is not closed until BOTH have run.

### What Claude Code verifies (the static report)

Claude Code's verification report includes ONLY:

- `bun run check` result (exact output)
- `bun run build` result (exact output)
- File diff summary (created, modified, deleted)
- Code-level inspection: implementation matches prompt specifications
- Logical traces: code paths follow expected sequences

Claude Code's static report ends with:

**"Static checks complete. Behavioral verification required before this phase closes. Pending checks listed below."**

Followed by a list of every behavioral check from the prompt, with the SQL queries, browser steps, or other instructions the human needs to run.

### What Claude Code does NOT verify

Claude Code does not write "PASS" against any item that requires:

- Running the app in a browser
- Querying the database for actual row state
- Placing test orders, clicking buttons, or observing UI behavior
- Confirming a runtime value matches an expected value
- Checking a network response, email render, or any I/O behavior

If the prompt asks for these, Claude Code lists them as "Pending behavioral verification" with concrete instructions for the human, not as "PASS."

### Phase prompts use explicit tags

Every verification step in a phase prompt is tagged:

- `[STATIC]` — Claude Code can verify from code or build output alone
- `[BEHAVIORAL]` — requires runtime exercise; the human runs it

Examples:

- `[STATIC] bun run check passes with zero errors`
- `[STATIC] The createTemplate action calls materializeTemplate after the insert`
- `[BEHAVIORAL] Place a test order against a future window; confirm the order's pickup_window_snapshot.notes matches the window's notes at order time`
- `[BEHAVIORAL] Edit a template after orders exist; query the DB and confirm orderless future occurrences regenerate while orderful ones remain`

In the final report, `[STATIC]` items show real evidence; `[BEHAVIORAL]` items show "Pending — human runs this" with the exact steps and queries.

### When prompts don't tag verification steps

If a prompt asks you to verify something but does not tag the step `[STATIC]` or `[BEHAVIORAL]`, classify it yourself and report the classification in the response. Never claim "verified" without specifying which kind of verification was performed.

**Self-classification examples:**

- "I verified that the import statement is correct" → `[STATIC]` (code inspection)
- "I verified that the form submits successfully" → `[BEHAVIORAL]` (you cannot verify this without runtime exercise; flag as Pending)
- "I verified that the Alert renders" → `[BEHAVIORAL]` if you mean visual rendering; `[STATIC]` if you mean the code includes the Alert component. Specify which.

**The rule:** every "verified" claim in your response must include the `[STATIC]` or `[BEHAVIORAL]` classification. `[BEHAVIORAL]` claims that you performed yourself are invalid — those go in the "Pending behavioral verification" list with instructions for the human.

### When no verification was performed at all

Sometimes a response produces code without running any verification — not `bun run check`, not `bun run lint`, no inspection of imports, nothing. This is acceptable for small changes (single-line edits, copy tweaks, doc updates) but must be stated explicitly.

If your response does not include verification of any kind, state this verbatim:

> **No verification performed.** `[STATIC]` checks (`bun run check`, `bun run lint`) recommended before this change is merged.

This is the correct behavior when:
- The change is too small to warrant a verification step (typo fix, single-word copy change, comment addition)
- You are in an environment without access to the verification commands
- The prompt explicitly waived verification

This is NOT acceptable when:
- The change touches multiple files
- The change introduces new types or modifies type signatures
- The change adds or modifies a primitive
- The prompt mentions verification as part of the deliverable

In those cases, run the verification or state why you couldn't (and surface that as a blocker).

The rule prevents responses that read as if verification was performed when it wasn't. "Looks correct to me" is not verification — neither `[STATIC]` nor `[BEHAVIORAL]`. Don't dress unverified inspection as either.

### Why this exists

Static verification has caught zero load-bearing bugs in this codebase. Every real bug found through verification was found by behavioral testing — actual database queries, real browser clicks, observed runtime values. Treating "PASS by inspection" as equivalent to "PASS by observation" has hidden bugs that would have shipped to production. The protocol prevents that.

### Visual-reality-check phases

Static checks (`bun run check`, `bun run lint`) verify type correctness and lint rules. They do not verify that primitives render correctly in real UI contexts.

The Batch 4–9 migration surfaced multiple bug classes that passed static checks while being visually broken:

- Switch and Checkbox rendering without active-state visuals (bits-ui `data-state` variant syntax mismatch)
- Animations missing across 7 overlay primitives (`tw-animate-css` not installed)
- Switch unchecked track invisible (`bg-input` transparent on white background)
- `ConfirmModal` titles silently dropped (component accepted prop, didn't render it)
- Orders/Production toggle missed entirely until noticed visually mid-session
- Segmented control rendering with wrong canonical visual until compared against the team page Tabs reference

**Every primitive and visual change requires at least one visual exercise before being considered done.** Static-only verification is not sufficient.

Four required phases for any primitive or visual change:

**Phase 1 — Static checks:** `bun run check`, `bun run lint`. Required floor; catches type errors and lint violations. Necessary but not sufficient.

**Phase 2 — Sibling-parity check:** when a change affects multiple callsites that should look identical (all view toggles, all destructive buttons, all icon sizes in a row), explicitly compare their rendered output. Drift between siblings is the most common failure mode after a batch migration.

**Phase 3 — Cross-context exercise:** render the primitive in every visual context where it will be used. A Button in an order card looks different from the same Button in a card action strip. Exercise both. For overlays (Dialog, Sheet, Popover): open them, close them, verify entry and exit animations play.

**Phase 4 — Mobile-width check:** load affected pages at 375px viewport. Confirm spacing, wrapping, and tap-target sizes work at the smallest supported width.

Phase 1 alone is not sufficient. Treat Phases 2–4 as required steps, not optional polish.

When visual exercise reveals drift: fix at the primitive layer when the issue is the primitive's default. Fix at the callsite only when the issue is a wrong variant choice — and document why.

---

## /vendors redirect

`/vendors` auto-redirects to `/dashboard` for users with exactly 1 active vendor membership (`isActive = true`). Internal users (`isInternal = true`) always see the picker. Use `/vendors?manage=true` to deliberately access the picker regardless (e.g., from a future "Manage shops" entry point). Multi-vendor users always see the picker. There is no modal tour — the setup checklist on `/dashboard` handles all onboarding guidance.

---

## Dashboard setup checklist

The dashboard's setup checklist (`src/lib/components/SetupChecklist.svelte`) derives completion from existing state — no completion flags are stored. Derivation sources:

- **Stripe**: `vendors.stripeSecretKey IS NOT NULL`
- **Pickup windows**: at least 1 active `pickup_window_templates` row for the vendor
- **Catalog**: at least 1 `catalog_items` row with `status = 'available'` for the vendor
- **Branding**: `vendors.logoUrl IS NOT NULL`

The checklist auto-hides when all 4 steps complete and re-appears if a step regresses (e.g. Stripe key removed). The utility lives in `src/lib/server/setup/checklist.ts` and runs its three DB queries (vendor row + pickup count + catalog count) in parallel via `Promise.all`. It is called from the dashboard `+page.server.ts` inside the existing `Promise.all` to avoid sequential round trips. Derivation queries source from DB directly, not from `locals.vendor` — `locals.vendor` can be stale in dev-bypass mode.

---

## eslint-disable: block-form over next-line

Single-line `<!-- eslint-disable-next-line RULE -->` comments are fragile when Prettier owns line breaks. Prettier may split a long element onto multiple lines, causing the disable comment to apply to the wrong resulting line and silently leaving the violation active.

**Wrong — fragile after reformat:**

```svelte
<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
<a href={vendor.website} target="_blank" rel="noreferrer noopener">Visit website</a>
```

After Prettier reformats the `<a>` to multiple lines, the `eslint-disable-next-line` applies to the opening-tag line, not to the `href` attribute line where the violation appears — the suppression silently stops working.

**Right — block-form survives any reformat:**

```svelte
<!-- eslint-disable svelte/no-navigation-without-resolve -->
<a href={vendor.website} target="_blank" rel="noreferrer noopener"> Visit website </a>
<!-- eslint-enable svelte/no-navigation-without-resolve -->
```

The block-form applies to everything between the open and close comments regardless of how Prettier reformats the intervening lines.

Use `eslint-disable-next-line` only when the target line is guaranteed to remain a single line after reformatting (short, no inner attributes that could push it over the line-length threshold). When in doubt, use block-form. The cost is two extra comment lines; the benefit is correctness across every future reformat.

This applies to every Svelte and TypeScript file in this project — Prettier touches all of them.

---

## What Not to Do

- ❌ Do not use `style={...}` inline — Tailwind only
- ❌ Do not hardcode colors as hex — use Tailwind classes from the palette
- ❌ Do not use `!important` in class names
- ❌ Do not add `cursor-pointer` to `<a>` — redundant
- ❌ Do not create new color variants not in the palette
- ❌ Do not show a bare red text link for destructive actions
- ❌ Do not leave sibling pages with mismatched implementations
- ❌ Do not use local state for active tab/filter/toggle if the URL encodes it
- ❌ Do not render a blank page/area — always provide an empty state
- ❌ Do not copy-paste component markup across files — extract and import
- ❌ Do not wrap pill count numbers in a `bg-white rounded-full` badge — render
  counts as plain text inside the pill
- ❌ Do not apply dark borders (`border-gray-900`, `border-black`) to inputs
- ❌ Do not use bare `<input type="date">` without suppressing the native
  border — always nest in a shared styled container
- ❌ Do not forget `outline-none` on inputs — replace with `focus:ring-2 focus:ring-green-500`
- ❌ Do not add a mode toggle segment with plain text only — every segment
  must have an icon
- ❌ Do not write `href="/some/path"` — always `href={resolve('/some/path')}`
- ❌ Do not use `npm run *` — always `bun run *`
- ❌ Do not refer to Order Local users as "tenants" or "restaurants" — they
  are vendors / shops
- ❌ Do not refer to the catalog as a "menu" in code, schema, or dashboard UI
- ❌ Do not add new redirect rules from old routes — old routes 404
- ❌ Do not add restaurant-specific assumptions (tables, dine-in, delivery
  dispatch) to product features
- ❌ Do not commit code unless explicitly asked. Pause at phase gates for
  review when working on multi-phase tasks.
- ❌ Do not add tipping UI to any new checkout or payment flow without checking
  `settings.enableTips` first. Tipping is **off by default** for all vendors.
- ❌ Do not add ASAP pickup UI to any new flow without checking
  `settings.asapPickupEnabled` first. ASAP is **off by default**. The fallback
  is "Schedule" (free-form date/time); pickup windows replace this in a future
  prompt.
- ❌ Do not render `vendor.type` to customers on the public storefront or in
  any customer-facing email. Customer-facing surfaces use `vendor.tagline` if
  set, or render nothing.
- ❌ Do not add restaurant-specific business types (`quick_service`,
  `full_service`, `bar`, `cafe`) to the vendor type enum. The wedge is makers,
  bakers, growers — not restaurants.
- ❌ Do not display `preparing` to vendors as "Preparing." The display label is
  "In production." (The schema enum value remains `preparing`; the lifecycle
  will be properly reshaped with the Pickup Windows feature.)
- ❌ Do not use mutable instances of built-in `Set`, `Map`, `Date`, `URL`, or
  `URLSearchParams` in component code. Use the reactive versions from
  `svelte/reactivity`. The ESLint rule `svelte/prefer-svelte-reactivity` enforces this.
- ❌ Do not wrap a built-in `Set`/`Map`/etc. in `$state` expecting its methods
  to become reactive — `$state` tracks references, not internal mutations. Use
  the reactive class (`SvelteSet`, `SvelteMap`, etc.) instead.
- ❌ Do not use `<!-- eslint-disable-next-line ... -->` above a multi-line
  element where Prettier may reflow the line break. Use block-form
  `<!-- eslint-disable RULE_NAME -->` / `<!-- eslint-enable RULE_NAME -->`
  instead. See the dedicated section "eslint-disable: block-form over next-line"
  for rationale and examples.
- ❌ Do not apply ad-hoc `h-*` to individual form element callsites. The project
  standard is `h-8` for all text inputs, selects, and single-line inputs. Changes
  to that standard go in the shadcn primitives (`input.svelte`, `select-trigger.svelte`),
  not per-callsite.
- ❌ Do not apply `class="h-*"` to a `<Button>` to override its size variant. Pick
  the correct size variant (`default` for `h-8`, `xs` for `h-6`). If no variant
  fits the use case, surface the question — do not invent a per-callsite height.
- ❌ Do not use raw `<button>` with custom height class strings when the shadcn
  `<Button>` primitive can be used. The primitive enforces consistency. Raw `<button>`
  is acceptable only for the documented exceptions listed under "Documented raw
  `<button>` exceptions" — all flagged for the Tier 2 shadcn audit.
- ❌ Do not use `$effect` to synchronize one piece of reactive state with another.
  Use `$derived` for derivations, or restructure so both pieces share a source of
  truth. State sync inside `$effect` leads to convoluted code and update cycles.
  (See: https://svelte.dev/docs/svelte/$effect#When-not-to-use-$effect)
- ❌ Do not mutate a `$derived` value. If you need to update reactive state, change
  the source it derives from, or make it `$state` instead. For URL params: build a
  fresh `SvelteURLSearchParams` per write and navigate — the derived params instance
  recomputes from `data` automatically.
- ❌ Do not use `opacity-0 group-hover:opacity-100` for row actions in tables or
  cards. Row actions are always visible. Use `hover:bg-gray-50` on the row for
  hover feedback only.

---

## When in doubt — stop and ask

The general rule: a 30-second clarification beats a 500-line diff that doesn't match the codebase.

**Always stop and ask before:**

- Introducing a new color, even one that "looks similar" to an existing one
- Introducing a new size variant on Button, Input, or any other primitive
- Adding a redirect rule from an old route to a new one
- Adding a `style={...}` attribute (Tailwind only)
- Naming something with a forbidden vocabulary term: `menu` (referring to catalog), `tenant`, `restaurant`, `merchant`
- Adding a vendor type value not in the canonical list (`bakery`, `farm`, `butcher`, `florist`, `brewery`, `coffee_shop`, `food_truck`, `specialty_maker`, `market_vendor`, `other`)
- Modifying any primitive in `src/lib/components/ui/` — these are heavily customized; changes affect every callsite
- Adding a new external dependency (npm package, MCP server, third-party service)
- Adding a `<form>` action that performs a destructive operation without a confirmation dialog
- Inventing a "documented exception" to a rule. Documented exceptions live in CLAUDE.md and are added deliberately, not in code
- Any operation that touches `vendors.settings` schema — the settings system is gated by Vendor settings rules
- Any change that affects vendor-facing copy on the storefront (`/[vendorSlug]/catalog`) or in customer emails — these have separate voice rules

**Always stop and ask if:**

- The prompt is ambiguous about which of two valid patterns to apply
- The change you're about to make would conflict with a documented pattern (per the Workflow Rule)
- You discover that documented behavior conflicts with actual codebase behavior (see "Doc-vs-code conflicts" above)
- A change required to satisfy the prompt would break sibling parity that you can't fix in the same task
- The task as written would produce a non-trivial change to a primitive's API surface

**Mid-task ambiguity is different from prompt ambiguity.**

The triggers above mostly fire at the start of a task — when reading the prompt, you spot something unclear. But ambiguity also emerges *during* a task: the prompt was clear at the start, you've written 5 files, and now you're hitting a decision point the prompt didn't anticipate.

The temptation is to push through and ship: you're committed, you've built momentum, the question feels small. Don't. The rule:

1. **Stop at the next natural boundary** — finishing the current file or current logical unit, not mid-function.
2. **State the ambiguity in your response.** Quote what the prompt said, describe what you've built so far, describe the decision point you've hit, propose 2–3 options.
3. **Do not push through with assumptions.** Mid-task assumptions are the highest-drift category in long tasks because (a) they're not visible in the response (you assumed silently), (b) they compound (one assumption shapes the next), and (c) the user hasn't seen the early files yet to catch the drift.

If the ambiguity is small enough that pushing through is genuinely the right call, surface it anyway in a "Mid-task decisions made without confirmation" section. State each decision and its alternative. The user can flag any that should have gone the other way.
