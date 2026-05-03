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

| Role               | Tailwind class     | Hex     |
| ------------------ | ------------------ | ------- |
| Primary action     | `bg-green-600`     | #16a34a |
| Primary hover      | `bg-green-700`     | #15803d |
| Primary light bg   | `bg-green-50`      | #f0fdf4 |
| Primary border     | `border-green-500` | #22c55e |
| Focus ring         | `ring-green-500`   | #22c55e |
| Urgent / warning   | `text-amber-500`   | #f59e0b |
| Urgent text (dark) | `text-amber-700`   | #b45309 |
| Urgent bg          | `bg-amber-50`      | #fffbeb |
| Urgent border      | `border-amber-400` | #fbbf24 |
| Destructive        | `text-red-500`     | #ef4444 |
| Destructive bg     | `bg-red-50`        | #fef2f2 |
| Positive / money   | `text-green-600`   | #16a34a |
| Body text          | `text-gray-900`    | #111827 |
| Secondary text     | `text-gray-500`    | #6b7280 |
| Muted text         | `text-gray-400`    | #9ca3af |
| Border             | `border-gray-200`  | #e5e7eb |
| Subtle bg          | `bg-gray-50`       | #f9fafb |
| White              | `bg-white`         | #ffffff |

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

**Size determines dimensions. For text buttons, that's height. For icon-only buttons, that's a square dimension. Variant determines color/style. They compose.**

### Sizes

| Size         | Height                         | `size` prop                         | Used for                                                                                                              |
| ------------ | ------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Default      | `h-10` (40px / 40×40 for icon) | `default` (text) · `icon-lg` (icon) | Standard — toolbars, page CTAs, form submits, modal footers; icon buttons sitting next to h-10 inputs or text buttons |
| Small        | `h-8` (32px / 32×32 for icon)  | `sm` (text) · `icon` (icon)         | Compact — table row actions, card action strips; icon buttons in dense rows                                           |
| Tight inline | — (28×28 for icon)             | `icon-sm`                           | Input field decorations, dialog/sheet close buttons, banner dismiss affordances                                       |

Icon buttons match their context. A delete icon in a table row uses `size="icon"` (32×32) so it aligns with `sm` text buttons in the same row. A toolbar icon button uses `size="icon-lg"` (40×40) so it aligns with `default` text buttons and inputs. The size system handles alignment automatically — pick the size based on what's adjacent.

**Height is a property of the size variant, not negotiable per callsite.** A `default` button is `h-10` everywhere. A `sm` button is `h-8` everywhere. When a `<Button>` sits next to a form input or select, they align automatically — `default` and `h-10` inputs are the same height. No special handling needed.

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

<!-- Compact secondary in a table row -->
<Button size="sm" variant="outline">Edit</Button>

<!-- Destructive form footer -->
<Button variant="destructive">Delete account</Button>

<!-- Icon button in a toolbar (matches h-10 text buttons and inputs) -->
<Button size="icon-lg" variant="ghost"><Icon icon="mdi:bell-outline" /></Button>

<!-- Icon button in a row action (matches h-8 sm text buttons) -->
<Button size="icon" variant="ghost" class="text-red-400 hover:text-red-600"
	><Icon icon="mdi:trash-can-outline" /></Button
>
```

### Raw `<button>` exceptions

Two patterns that stay as raw `<button>` due to color conflicts with existing shadcn variants:

- **State-transition buttons** ("Mark as confirmed", "Mark as in production", etc.): `rounded-md h-10 px-4 text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors` (detail page) or `rounded-md h-8 px-2.5 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors` (list row). Brand green is reserved for primary page CTAs; blue signals the state-transition category.
- **Outlined-destructive** (Cancel order, Refund on list and detail): `rounded-md h-10 px-4 text-sm font-semibold border border-red-200 text-red-500 hover:bg-red-50 transition-colors` (standard) or `rounded-md h-8 px-2.5 text-xs font-medium border border-red-200 text-red-500 hover:bg-red-50 transition-colors` (compact). The destructive variant uses filled red, which competes visually with adjacent primary blue actions.

Both are flagged for the Tier 2 shadcn audit to add dedicated variants. For all other cases, use `<Button>` over raw `<button>`.

The mobile hamburger is also a documented raw exception (dark-surface hover — see Mobile header section).

### Rules

- Never use bare red text as a delete/cancel action without a wrapping button.
- Destructive actions (delete, cancel order, refund) always require a confirmation dialog. Never single-click destructive.
- The most important action on a page is always a solid green primary button. Secondary actions are outline. Tertiary are ghost or text.
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
class="h-10 w-full px-3 text-sm border border-gray-200 rounded-lg bg-white
       placeholder:text-gray-400 focus:outline-none focus:ring-2
       focus:ring-green-500 focus:border-transparent"

// Select (raw)
class="h-10 w-full px-3 text-sm border border-gray-200 rounded-lg bg-white
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

All single-line form inputs (text, email, number, search, password, date) and selects use `h-10`
(40px). The shadcn `<Input>` and `<SelectTrigger>` primitives default to `h-10` — do not override
to a different height per-callsite. Textareas are multi-line and are not subject to this rule;
use `min-h-*` instead.

**Raw vs shadcn migration:** The shadcn `<Input>` and `<SelectTrigger>` primitives have been
updated to `h-10` as the default. New code should prefer the shadcn primitives. Raw `<input>`/
`<select>` elements that exist today (settings, forms, etc.) follow the `h-10` rule via
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

## Navigation & Routing

- Active sidebar nav item: `bg-green-600 text-white rounded-lg`
- Inactive sidebar nav: `text-gray-400 hover:text-white hover:bg-gray-800`
- All internal navigation uses `<a href={resolve(...)}>` or `goto(resolve(...))`.
  Never `window.location` for internal routes.
- Use `$page.url.pathname` for active states. Never local state if the URL
  encodes it.
- Query params (`?status=received`, `?category=breads`) are always the source
  of truth for filter state. Read via `$page.url.searchParams`.

### Order state-transition buttons

Order state-transition buttons ("Mark as confirmed", "Mark as in production", "Mark as ready", "Mark as fulfilled") all use `bg-blue-600 hover:bg-blue-700 text-white` for consistency across both the orders list and order detail page. Brand green is reserved for primary page-level CTAs (setup checklist's "Set up →", create-new affordances). Per-stage color differentiation (blue/amber/violet/green per stage) was considered and deferred — labels carry the information; color carries the action category (state transition vs primary CTA vs destructive).

Currently implemented as plain `<button>` elements with explicit classes. Height follows the size system: `h-10` on the order detail page (standard), `h-8` on the orders list (compact row action). Shadcn's `variant="default"` applies brand green, which conflicts with this convention. Tier 2 shadcn audit should add a Button variant for state-transition actions.

### Destructive actions on order detail (Cancel order)

The "Cancel order" and "Refund" buttons on the order detail page and list both use a plain `<button>` with outlined red classes rather than `<Button variant="destructive">`. The destructive variant applies filled `bg-red-600`, which competes visually with the blue state-transition primary action sitting beside them. Outlined red (`border-red-200 text-red-500 hover:bg-red-50`) is the quieter destructive treatment. Height: `h-10` on the detail page, `h-8` on the list card.

The mobile hamburger uses a plain `<button>` instead of `<Button variant="ghost">` due to dark-surface hover conflict. Cancel order and Refund use a plain `<button>` instead of `<Button variant="destructive">` for the same reason — the filled variant conflicts with adjacent primary actions. All are flagged for the Tier 2 shadcn audit: consider adding "dark-surface" and "outlined-destructive" Button variants to resolve these cases properly.

### Mobile header

The mobile header (`md:hidden` in `+layout.svelte`) is `sticky top-0 z-30` so the hamburger remains accessible during scroll. Desktop is `md:static md:z-auto` — the persistent sidebar provides navigation and a sticky decorative header would steal vertical space. The Sheet/drawer overlay sits at `z-50`, above the sticky header.

The hamburger uses a plain `<button>` rather than shadcn `<Button variant="ghost">` because ghost's `hover:bg-accent` conflicts unpredictably with explicit dark-surface hover overrides. Hover convention matches sidebar nav links: `hover:bg-gray-800`. Tier 2 shadcn audit should add a "dark surface" Button variant to resolve this properly.

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

### Why this exists

Static verification has caught zero load-bearing bugs in this codebase. Every real bug found through verification was found by behavioral testing — actual database queries, real browser clicks, observed runtime values. Treating "PASS by inspection" as equivalent to "PASS by observation" has hidden bugs that would have shipped to production. The protocol prevents that.

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
- ❌ Do not apply ad-hoc `h-*` to individual form element callsites. The project
  standard is `h-10` for all text inputs, selects, and single-line inputs. Changes
  to that standard go in the shadcn primitives (`input.svelte`, `select-trigger.svelte`),
  not per-callsite.
- ❌ Do not apply `class="h-*"` to a `<Button>` to override its size variant. Pick
  the correct size variant (`default` for `h-10`, `sm` for `h-8`). If no variant
  fits the use case, surface the question — do not invent a per-callsite height.
- ❌ Do not use raw `<button>` with custom height class strings when the shadcn
  `<Button>` primitive can be used. The primitive enforces consistency. Raw `<button>`
  is acceptable only for documented exceptions (state-transition blue, outlined-destructive
  red, and the dark-surface mobile hamburger — all flagged for Tier 2 shadcn audit).
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

## When in doubt

If you're about to write something and you're not sure whether it matches the
project's conventions: **stop and ask.** A 30-second clarification beats a
500-line diff that doesn't match the codebase.
