## Project Configuration

- **Language**: TypeScript
- **Package Manager**: bun
- **Add-ons**: prettier, eslint, vitest, playwright, tailwindcss, sveltekit-adapter, devtools-json, drizzle, better-auth, mdsvex, mcp

## Svelte href Rule

**Always** use `resolve()` from `$app/paths` for every `href` attribute that points to an internal route. Never write `href="/some/path"` — always write `href={resolve('/some/path')}`. For dynamic segments use a template literal: `href={resolve(\`/dashboard/orders/${id}\`)}`. Import `resolve` in the `<script>` block: `import { resolve } from '$app/paths';`.

---

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

## UI Consistency Rules

### Shared Components — Never Duplicate, Always Extract

When the same UI pattern appears on more than one page, it MUST be extracted into a
shared component in `components/` and imported on both pages. Never copy-paste
styles or markup between pages. If you add a feature to one page that logically
belongs on a sibling page, add it to both in the same commit.

Current shared components that must stay in sync:

- `OrdersSummaryBar` — used on `/orders` and `/orders/history`
- `OrdersFilterTabs` — used on `/orders` and `/orders/history`
- `OrdersViewToggle` — (Live | History) used on both pages
- `OrdersSearchRow` — search input, used on both pages

### Page Layout Structure — Orders Pages

Both `/orders` (live) and `/orders/history` must follow this exact section order:

1. Page header row (`<h1>` left, toggle + bell right)
2. `<OrdersSummaryBar>` — one row, divider-separated stats
3. Search input — full width, single row
4. Filter pills (left) + date range (right) — single row, space-between
5. Order cards list

Never place filter pills and date pickers on separate rows.
Never place "From" / "To" as bare text labels outside a styled input container.
The date range inputs must always be wrapped in a single bordered pill/container.

### Style Tokens — Use These Exactly

- Active filter pill: `bg-green-600 text-white rounded-full`
- Inactive filter pill: `bg-gray-100 text-gray-600 border border-gray-200 rounded-full hover:bg-gray-200`
- Summary bar container: `bg-gray-50 border border-gray-200 rounded-xl px-4 py-3`
- Summary bar divider: `border-l border-gray-200`
- Search input: `border border-gray-200 rounded-lg pl-9 py-2.5 text-sm focus:ring-2 focus:ring-green-500`
- Date range wrapper: `flex items-center border border-gray-200 rounded-lg px-3 py-2 bg-white`

### 1-to-1 Style Parity Rule

When asked to add or change a UI element on one page, check if a sibling or related
page has the same element. If it does, apply the identical change to both pages in
the same task. Do not leave sibling pages with mismatched implementations.
Explicitly confirm parity has been applied in your response.

❌ Do not wrap pill count numbers in a `bg-white rounded-full` badge span —
render counts as plain text directly inside the pill button

- ❌ Do not apply dark borders (`border-gray-900`, `border-black`) to any input
- ❌ Do not use bare `<input type="date">` without suppressing the native border
  with `border-none focus:ring-0` — always nest date inputs inside a shared
  styled container div
- ❌ Do not forget `outline-none` on inputs — browser default outlines must always
  be suppressed and replaced with `focus:ring-2 focus:ring-green-500`

## 1. Core Philosophy

- **Consistency over creativity.** When a UI pattern already exists in the codebase,
  use it exactly. Do not invent a new variant.
- **Extract, don't duplicate.** If the same component or layout appears on more than
  one page, extract it into a shared component immediately. Never copy-paste markup
  between pages.
- **Sibling parity.** When you change a UI element on one page, check every sibling
  or related page for the same element and apply the identical change. Explicitly
  confirm parity in your response.
- **Smallest diff.** Make the minimal change required. Do not refactor unrelated code,
  rename variables, or restructure files unless explicitly asked.

---

## 2. Colour Palette

Use only these values. Do not introduce new colours.

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
| Sidebar bg       | `bg-gray-900`      | #111827 |

---

## 3. Typography

- Page titles (`<h1>`): `text-2xl font-bold text-gray-900`
- Section headings (`<h2>`): `text-sm font-medium text-gray-500 uppercase tracking-wide`
- Card titles: `text-base font-semibold text-gray-900`
- Body: `text-sm text-gray-700`
- Secondary / meta: `text-sm text-gray-500`
- Muted / timestamps: `text-xs text-gray-400`
- Monospace (order IDs, codes): `font-mono text-xs text-gray-400`
- Currency values: `font-semibold text-gray-900` (large: `text-lg` or `text-2xl`)

---

## 4. Spacing & Layout

- Main content area left padding: the sidebar is fixed-width; main content starts
  after it with `p-6` or `px-6 py-6`.
- Between page header and first content section: `mb-6`
- Between major sections: `mb-6` or `gap-6` in a grid
- Between related elements within a section: `mb-3` or `gap-3`
- Card internal padding: `p-4` (compact) or `p-6` (spacious)
- Standard border radius: `rounded-xl` for cards, `rounded-lg` for inputs/buttons,
  `rounded-full` for pills/badges

---

## 5. Page Header Pattern

Every dashboard page must follow this exact header structure:

```tsx

  {/* Left: title + optional subtitle */}

    {title}
    {subtitle && {subtitle}}

  {/* Right: mode toggle (if applicable) + primary CTA */}

    {modeToggle}
    {primaryAction}


```

- The primary CTA button always sits at the far right.
- Mode toggles (e.g. Live/History, Items/Categories) sit immediately left of the CTA.
- Do not put breadcrumbs inside the main content area. Use the header left side only.
- Do not stack a separate `<p>` subtitle unless it adds real context — page titles
  should be self-explanatory.

---

## 6. Buttons

### Primary button

```tsx
className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700
           text-white text-sm font-medium rounded-lg transition-colors"
```

### Secondary / outline button

```tsx
className="flex items-center gap-1.5 px-4 py-2 border border-gray-200
           bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium
           rounded-lg transition-colors"
```

### Ghost button (icon-only or low-emphasis)

```tsx
className="p-2 hover:bg-gray-100 text-gray-500 hover:text-gray-700
           rounded-lg transition-colors"
```

### Small inline action (e.g. table row actions)

```tsx
className="px-2.5 py-1 text-xs font-medium border border-gray-200
           hover:bg-gray-50 rounded-md transition-colors"
```

### Destructive button (always behind a confirmation dialog)

```tsx
className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white
           text-sm font-medium rounded-lg transition-colors"
```

**Rules:**

- Never use bare red text as a delete/cancel action without a wrapping button element.
- Destructive actions (delete, cancel order, refund) always require a confirmation
  dialog before executing. Never execute them on a single click.
- The most important action on a page is always a solid green primary button.
  Secondary actions are outline. Tertiary actions are ghost or text links.
- Never have more than one solid primary button visible at the same time.
- When there are 3+ secondary actions, group them under a `⋯ More` dropdown.

---

## 7. Mode Toggle (Segmented Control)

Used for switching between two views of the same page (e.g. Live/History,
Items/Categories). Always a single bordered container with both options inside.

```tsx


    {primaryLabel}


    {secondaryLabel}


```

**Rules:**

- Active segment: `bg-gray-900 text-white`
- Inactive segment: `bg-white text-gray-500 hover:bg-gray-50`
- The toggle must appear on **both** pages it controls. If page A has the toggle,
  page B must also have it — using the same shared component.
- Use `useLocation()` to derive the active state from the URL. Never use local state
  for the active toggle — the URL is the source of truth.

// In Section 7 — Mode Toggle, add:
// Each segment MUST include a contextual icon to the left of the label.
// Icon size: w-3.5 h-3.5. Gap: gap-1.5. Icon inherits color from parent text.
// Examples:
// Live → green dot span (w-2 h-2 rounded-full bg-green-400)
// History → ClockIcon / HistoryIcon
// Items → UtensilsIcon / ForkKnifeIcon
// Categories → TagIcon

// In Section 21 — What Not to Do, add:

- ❌ Do not add a mode toggle segment with plain text only — every segment
  must have an icon that visually communicates what the view contains

---

## 8. Filter Pills (Status Tabs)

Used for filtering a list by status. Always a horizontal row of pill buttons.

```tsx
// Active pill
className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
           bg-green-600 text-white"

// Inactive pill
className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium
           bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200
           transition-colors"

// Count badge inside pill
// Active:   className="text-xs px-1.5 py-0.5 rounded-full bg-white/20 text-white font-semibold"
// Inactive: className="text-xs px-1.5 py-0.5 rounded-full bg-white text-gray-500 font-semibold"
```

**Rules:**

- Always show a count on every pill, even if 0.
- Use the URL query string (`?status=received`) as the source of truth for the active
  filter, not local state.
- When a status count > 0 and represents something needing attention, add a small
  `w-1.5 h-1.5 rounded-full bg-amber-400` dot inside the inactive pill.
- Extract into a shared `<FilterPills>` or `<StatusTabs>` component. Never
  re-implement pill styling inline on individual pages.

---

## 9. Summary / Stats Bar

A single horizontal row of key stats shown at the top of list pages.
Used on Orders (live and history). Apply consistently to any list page that
has meaningful aggregate data.

```tsx

  {stats.map((stat, i) => (
    <div key={stat.label} className={cn("flex flex-col", i > 0 && "ml-6 pl-6 border-l border-gray-200")}>
      {stat.label}
      <span className={cn("text-lg font-semibold",
        stat.urgent   && "text-amber-500",
        stat.positive && "text-green-600",
        !stat.urgent && !stat.positive && "text-gray-900"
      )}>
        {stat.value}


  ))}

```

**Rules:**

- Never use a grid of individual bordered cards for this. Always use the inline
  divider-separated row shown above.
- Stats update reactively when filters or date ranges change.

---

## 10. Search + Filter Toolbar Pattern

Any page with a filterable list must follow this exact two-row layout:

```
Row 1: [ Search input — full width                              ]
Row 2: [ Filter pills (left)          Date range picker (right) ]
```

```tsx
{/* Row 1 */}





{/* Row 2 */}


  {showDateRange && (

      {/* Both date inputs inside ONE styled container */}



        →


      {hasActiveDate && (
        Clear
      )}

  )}

```

**Rules:**

- Filter pills and date range are **always on the same row**, space-between.
- Date inputs are **always inside a single shared container** — never bare native
  inputs with floating "From"/"To" text labels.
- Search is **always above** on its own row, never on the same row as pills.
- If a page has no date filter, the second row is just pills left-aligned.
- Never omit the search bar from a list page. If search isn't wired up yet, render
  it as a disabled placeholder.

---

## 11. Cards

### Content / navigation card (e.g. Settings hub, Menu hub)

```tsx





    {title}
    {description}


```

### Data / list card (e.g. order cards)

```tsx

  {/* card body — clickable, navigates to detail */}

    ...

  {/* action strip — NOT inside the Link */}

    ...


```

### Stat card (e.g. dashboard overview)

```tsx

  {label}
  {value}

    {cta} →


```

---

## 12. Badges & Status Pills

```tsx
// Status-to-style map — always use these, never invent new colours
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
  // Availability
  active:    "bg-green-100 text-green-700",
  inactive:  "bg-gray-100 text-gray-500",
  hidden:    "bg-gray-100 text-gray-400",
  // Sale
  sale:      "bg-red-100 text-red-600",
}

// Base badge classes
className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium capitalize",
              statusStyles[status])}
```

**Rules:**

- Always use `capitalize` so casing in the data doesn't matter.
- Never show a badge when all items in a list share the same status — it adds noise
  without information. Instead use an inline toggle (see Section 13).
- Payment status must always be shown on history order cards, even if "unpaid".

---

## 13. Inline Toggle Switches

Used for boolean states (available/unavailable, active/inactive) directly in list
rows, so users don't need to navigate into an edit page.

```tsx
<button
  onClick={() => handleToggle(id)}
  className={cn(
    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
    isOn ? "bg-green-500" : "bg-gray-200"
  )}
  aria-label={isOn ? "Disable" : "Enable"}
>


```

Use instead of static "Active"/"Available" badges wherever the state is toggleable.

---

## 14. Tables

```tsx





          Name

        ...



      {rows.map(row => (

          ...
          {/* Row actions: hidden until hover */}


              Edit






      ))}



```

**Rules:**

- Table container always has `rounded-xl` and `overflow-hidden` — never raw `<table>`
  without a wrapper.
- Destructive row actions (Delete) are always icon-only with `text-red-400`, hidden
  until hover, and always behind a confirmation dialog.
- Never show a prominent red "Delete" text link inline in a table row.
- Row actions appear on `group-hover` opacity transition — never permanent buttons.
- Add `group` class to `<tr>` and `opacity-0 group-hover:opacity-100` to action container.

---

## 15. Empty States

Every list, table, or filtered view must have an empty state. Never show a blank page.

```tsx
{items.length === 0 && (


    {title}
    {description}
    {cta && (

        {cta.label} →

    )}

)}
```

When an active search/filter produces no results, the empty state copy must
reflect the active filter: `No results for "scott"` or
`No cancelled orders in this date range.`

---

## 16. Forms & Inputs

```tsx
// Text input
className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white
           placeholder:text-gray-400 focus:outline-none focus:ring-2
           focus:ring-green-500 focus:border-transparent"

// Select
className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white
           focus:outline-none focus:ring-2 focus:ring-green-500"

// Textarea
className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg bg-white
           resize-none focus:outline-none focus:ring-2 focus:ring-green-500"

// Label
className="block text-sm font-medium text-gray-700 mb-1.5"

// Helper text
className="text-xs text-gray-400 mt-1.5"

// Error text
className="text-xs text-red-500 mt-1.5"

// Error input state (add to input)
className="border-red-300 focus:ring-red-500"
```

**Rules:**

- Never use native browser date inputs with default styling. Always wrap them in a
  styled container (see Section 10).
- Every input must have a visible label. Placeholder text alone is not a label.
- Error messages appear below the input in red, never as alerts or toasts for
  inline validation.

---

## 17. Confirmation Dialogs

Required before any destructive or irreversible action (delete, cancel order,
refund, bulk operations).

```tsx

  {title}       // "Delete 'Burgers'?"
  {description}   // "This category contains 2 items..."

    Cancel

      {confirmLabel}  // "Delete", "Cancel order", "Issue refund"



```

**Rules:**

- The confirm button label must name the action ("Delete", not "Yes" or "OK").
- The cancel button always dismisses without action.
- Never auto-execute destructive actions on single click.

---

## 18. Navigation & Routing

- The active nav item in the sidebar uses `bg-green-600 text-white rounded-lg`.
- Inactive nav items use `text-gray-400 hover:text-white hover:bg-gray-800`.
- Use `<Link>` from react-router-dom for all internal navigation. Never use
  `window.location` or `<a href>` for internal routes.
- Use `useLocation().pathname` to derive active states. Never use local state
  to track which page/tab is active if the URL already encodes it.
- Query params (`?status=received`, `?category=burgers`) are always the source
  of truth for filter state. Initialize filter state from `useSearchParams()`.

---

## 19. Loading & Skeleton States

Every data-fetching component must show a skeleton while loading, not a spinner
or blank space.

```tsx
// Skeleton line


// Skeleton card









```

Skeleton count should match the expected result count (e.g. show 5 skeleton cards
if the page typically shows ~5 orders).

---

## 20. Component File Conventions

- Shared components live in `src/components/`
- Page-specific components live colocated with their page file
- Component names are PascalCase, file names match component name
- Extract a component when the same markup appears in 2+ places
- Shared components must have TypeScript interfaces for all props
- Prefer named exports over default exports for shared components

---

## 21. What Not to Do

- ❌ Do not use inline `style={{}}` — use Tailwind classes only
- ❌ Do not hardcode colours as hex — use Tailwind classes from Section 2
- ❌ Do not use `!important` in class names
- ❌ Do not add `cursor-pointer` to `<Link>` or `<a>` — it's redundant
- ❌ Do not create new colour variants not in Section 2
- ❌ Do not show a bare red text link for destructive actions
- ❌ Do not leave sibling pages with mismatched implementations after a change
- ❌ Do not use local state for active tab/filter/toggle if the URL encodes it
- ❌ Do not render a blank page/area — always provide an empty state
- ❌ Do not copy-paste component markup across files — extract and import
