# CLAUDE.md — Order Local

This file tells Claude Code how to write code for this project. Read it before
making changes. Follow it exactly.

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

### Svelte 5 runes

This project uses Svelte 5. Use runes (`$state`, `$derived`, `$props`,
`$effect`) for reactive state. Do not use Svelte 4 `let` reactive declarations
or `$:` blocks in new code.

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
- `OrdersViewToggle` — (Live | History) used on both pages
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

Use only these values. Do not introduce new colors.

| Role             | Tailwind class     | Hex     |
| ---------------- | ------------------ | ------- |
| Primary action   | `bg-green-600`     | #16a34a |
| Primary hover    | `bg-green-700`     | #15803d |
| Primary light bg | `bg-green-50`      | #f0fdf4 |
| Primary border   | `border-green-500` | #22c55e |
| Focus ring       | `ring-green-500`   | #22c55e |
| Urgent / warning | `text-amber-500`   | #f59e0b |
| Urgent bg        | `bg-amber-50`      | #fffbeb |
| Urgent border    | `border-amber-400` | #fbbf24 |
| Destructive      | `text-red-500`     | #ef4444 |
| Destructive bg   | `bg-red-50`        | #fef2f2 |
| Positive / money | `text-green-600`   | #16a34a |
| Body text        | `text-gray-900`    | #111827 |
| Secondary text   | `text-gray-500`    | #6b7280 |
| Muted text       | `text-gray-400`    | #9ca3af |
| Border           | `border-gray-200`  | #e5e7eb |
| Subtle bg        | `bg-gray-50`       | #f9fafb |
| White            | `bg-white`         | #ffffff |

**Storefront-specific colors:** the public storefront (`/[vendorSlug]/catalog`)
uses CSS variables driven by the vendor's branding settings (background,
foreground, accent). The palette above applies only to the dashboard, marketing
site, and admin areas.

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

### Primary

```
class="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700
       text-white text-sm font-medium rounded-lg transition-colors"
```

### Secondary / outline

```
class="flex items-center gap-1.5 px-4 py-2 border border-gray-200
       bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium
       rounded-lg transition-colors"
```

### Ghost (icon-only or low-emphasis)

```
class="p-2 hover:bg-gray-100 text-gray-500 hover:text-gray-700
       rounded-lg transition-colors"
```

### Small inline action (table row actions)

```
class="px-2.5 py-1 text-xs font-medium border border-gray-200
       hover:bg-gray-50 rounded-md transition-colors"
```

### Destructive (always behind a confirmation dialog)

```
class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white
       text-sm font-medium rounded-lg transition-colors"
```

**Rules:**

- Never use bare red text as a delete/cancel action without a wrapping button.
- Destructive actions (delete, cancel order, refund) always require a
  confirmation dialog. Never single-click destructive.
- The most important action on a page is always a solid green primary button.
  Secondary actions are outline. Tertiary are ghost or text.
- Never have more than one solid primary button visible at the same time.
- When there are 3+ secondary actions, group them under a `⋯ More` dropdown.

---

## Mode Toggle (Segmented Control)

Used for switching between two views of the same page (e.g., Live/History).
Always a single bordered container with both options inside.

```svelte
<div class="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
	<a
		href={resolve(primaryHref)}
		class={cn(
			'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
			isPrimaryActive ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
		)}
	>
		<Icon icon={primaryIcon} class="h-3.5 w-3.5" />
		{primaryLabel}
	</a>
	<a
		href={resolve(secondaryHref)}
		class={cn(
			'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
			!isPrimaryActive ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
		)}
	>
		<Icon icon={secondaryIcon} class="h-3.5 w-3.5" />
		{secondaryLabel}
	</a>
</div>
```

**Rules:**

- Active segment: `bg-gray-900 text-white`
- Inactive segment: `bg-white text-gray-500 hover:bg-gray-50`
- The toggle must appear on **both** pages it controls. Use a shared component.
- Derive active state from `$page.url.pathname`. Never use local state.
- Each segment MUST include a contextual icon to the left of the label.
  Icon size: `w-3.5 h-3.5`. Gap: `gap-1.5`. Icon color inherits from text.
- Examples:
  - Live → green dot span (`w-2 h-2 rounded-full bg-green-400`)
  - History → `lucide:clock` or `lucide:history`
  - Items → `lucide:list` or `lucide:utensils-crossed`
  - Categories → `lucide:tag`

---

## Filter Pills (Status Tabs)

Used for filtering a list by status. Horizontal row of pill buttons.

```
// Active pill
class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
       bg-green-600 text-white"

// Inactive pill
class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
       bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200
       transition-colors"
```

Counts render as plain text inside the pill button — never wrapped in a
`bg-white rounded-full` badge.

**Rules:**

- Always show a count, even if 0.
- The URL query string (`?status=received`) is the source of truth.
- When a status count > 0 needs attention, add a small `w-1.5 h-1.5
rounded-full bg-amber-400` dot inside the inactive pill.
- Extract into a shared `<FilterPills>` or `<StatusTabs>` component.

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

```svelte
<div
	class="overflow-hidden rounded-xl border border-gray-200 bg-white transition-colors hover:border-gray-300"
>
	<a href={resolve(`/dashboard/orders/${order.id}`)} class="block p-4">
		<!-- card body — clickable, navigates to detail -->
	</a>
	<div class="flex items-center gap-2 border-t border-gray-100 px-4 py-2">
		<!-- action strip — NOT inside the link -->
	</div>
</div>
```

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
				<tr class="group hover:bg-gray-50">
					<td class="px-4 py-3 text-sm text-gray-900">{row.name}</td>
					<!-- Row actions: hidden until hover -->
					<td class="px-4 py-3 text-right">
						<div
							class="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100"
						>
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
- Destructive row actions are icon-only with `text-red-400`, hidden until hover,
  always behind a confirmation dialog.
- Never show a prominent red "Delete" text link inline.
- Row actions appear on `group-hover` opacity transition, never permanent.

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
// Text input
class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white
       placeholder:text-gray-400 focus:outline-none focus:ring-2
       focus:ring-green-500 focus:border-transparent"

// Select
class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white
       focus:outline-none focus:ring-2 focus:ring-green-500"

// Textarea
class="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white
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

**Rules:**

- Never use native browser date inputs with default styling. Wrap in a styled
  container.
- Every input has a visible label. Placeholder is not a label.
- Error messages appear below the input in red, never as alerts or toasts for
  inline validation.

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

## Navigation & Routing

- Active sidebar nav item: `bg-green-600 text-white rounded-lg`
- Inactive sidebar nav: `text-gray-400 hover:text-white hover:bg-gray-800`
- All internal navigation uses `<a href={resolve(...)}>` or `goto(resolve(...))`.
  Never `window.location` for internal routes.
- Use `$page.url.pathname` for active states. Never local state if the URL
  encodes it.
- Query params (`?status=received`, `?category=breads`) are always the source
  of truth for filter state. Read via `$page.url.searchParams`.

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
  itemId: number;              // catalogItems.id at purchase — used as FK hint only
  name: string;                // display name, denormalised from catalogItems
  basePrice: number;           // unit base price in cents, BEFORE modifier adjustments
  quantity: number;
  selectedModifiers: Array<{
    group: string;             // modifier group display name
    name: string;              // selected option display name
    priceAdjustment: number;   // cents, added to basePrice (can be negative)
  }>;
  imageUrl?: string;           // optional storefront image URL
  isSubscription?: boolean;    // true for recurring items
  billingInterval?: string;    // 'monthly' | 'yearly', only when isSubscription=true
};
```

**Required at all write sites:** `name`, `basePrice`, `quantity`,
`selectedModifiers` (array — pass `[]` when there are no modifiers, never
omit).

**Optional:** `itemId`, `imageUrl`, `isSubscription`, `billingInterval`.

### Snapshot → `orderItems` table mapping

A parallel `order_items` row is inserted alongside every snapshot line
item. The mapping is:

| Snapshot field | `orderItems` column | Notes |
| --- | --- | --- |
| `name` | `name` | verbatim |
| `quantity` | `quantity` | verbatim |
| `basePrice + Σ(selectedModifiers.priceAdjustment)` | `unitPrice` | effective unit price |
| `selectedModifiers` | `selectedModifiers` | stored verbatim as JSONB |
| `itemId` | `catalogItemId` | nullable; `null` if item was deleted |

The `orderItems` table is the queryable, relational copy. The JSONB
snapshot is the immutable receipt. When displaying order details to vendors
or customers, read from the snapshot, not `orderItems`.

### Who reads and writes this today

| Code path | Reads | Writes |
| --- | --- | --- |
| `routes/api/create-checkout/+server.ts` | — | snapshot + `orderItems` (source: `CartItem[]`) |
| `routes/api/create-payment-intent/+server.ts` | — | snapshot + `orderItems` (same shape) |
| `lib/server/seed-demo.ts` | — | snapshot only (minimal shape: `name`, `basePrice`, `quantity`, `selectedModifiers`) |
| `dashboard/orders/[orderId]/+page.svelte` | `name`, `quantity`, `basePrice`, `selectedModifiers[].name`, `selectedModifiers[].priceAdjustment` | — |
| `routes/api/webhooks/stripe/[vendorId]/+server.ts` | `order.items` cast to email template shape | — |

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
  windowId: number;      // pickupWindows.id at purchase time
  name: string;          // window display name, denormalised
  startsAt: string;      // ISO 8601 UTC
  endsAt: string;        // ISO 8601 UTC
  notes: string | null;  // window-level notes
  location: {
    name: string;
    address: unknown | null;  // structured address JSONB
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

### Why this exists

Static verification has caught zero load-bearing bugs in this codebase. Every real bug found through verification was found by behavioral testing — actual database queries, real browser clicks, observed runtime values. Treating "PASS by inspection" as equivalent to "PASS by observation" has hidden bugs that would have shipped to production. The protocol prevents that.

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

---

## When in doubt

If you're about to write something and you're not sure whether it matches the
project's conventions: **stop and ask.** A 30-second clarification beats a
500-line diff that doesn't match the codebase.
