<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import type { DiscoveredItem } from '$lib/../routes/api/discover-stripe-items/+server';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { goto } from '$app/navigation';
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import Sortable from 'sortablejs';
	import CatalogViewToggle from '$lib/components/CatalogViewToggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuTrigger,
		DropdownMenuItem
	} from '$lib/components/ui/dropdown-menu';
	import {
		Table,
		TableHeader,
		TableHead,
		TableBody,
		TableRow,
		TableCell
	} from '$lib/components/ui/table';
	import {
		Select,
		SelectTrigger,
		SelectContent,
		SelectItem,
		SelectValue
	} from '$lib/components/ui/select';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import {
		Sheet,
		SheetContent,
		SheetHeader,
		SheetTitle,
		SheetDescription
	} from '$lib/components/ui/sheet';
	import CatalogItemForm from '$lib/components/CatalogItemForm.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	type CatalogItem = (typeof data)['items'][number];

	// ── Table sorting ─────────────────────────────────────────────
	type SortCol = 'name' | 'category' | 'price' | 'status';
	let sortCol = $state<SortCol>('name');
	let sortDir = $state<'asc' | 'desc'>('asc');

	function sortBy(col: SortCol) {
		if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else {
			sortCol = col;
			sortDir = 'asc';
		}
	}

	const sortedItems = $derived(
		[...data.items].sort((a, b) => {
			let cmp = 0;
			if (sortCol === 'name') cmp = a.name.localeCompare(b.name);
			else if (sortCol === 'category')
				cmp = (a.category?.name ?? '').localeCompare(b.category?.name ?? '');
			else if (sortCol === 'price') cmp = a.price - b.price;
			else if (sortCol === 'status') cmp = (a.status ?? '').localeCompare(b.status ?? '');
			return sortDir === 'asc' ? cmp : -cmp;
		})
	);

	// ── Drag-and-drop sort mode ───────────────────────────────────
	let sortMode = $state(false);
	let sortSaving = $state(false);
	let sortSaveError = $state<string | null>(null);
	let sortContainerEl = $state<HTMLElement | null>(null);

	// Group items by category for the sort view
	const groupedForSort = $derived.by(() => {
		const catMap = new SvelteMap<
			number | null,
			{ id: number | null; name: string; items: typeof data.items }
		>();
		for (const cat of data.categories) {
			catMap.set(cat.id, { id: cat.id, name: cat.name, items: [] });
		}
		catMap.set(null, { id: null, name: 'Uncategorized', items: [] });
		for (const item of data.items) {
			const key = item.category?.id ?? null;
			if (!catMap.has(key))
				catMap.set(key, { id: key, name: item.category?.name ?? 'Uncategorized', items: [] });
			catMap.get(key)!.items.push(item);
		}
		return [...catMap.values()].filter((g) => g.items.length > 0);
	});

	function sortableGroup(node: HTMLElement) {
		const s = Sortable.create(node, {
			animation: 150,
			handle: '.drag-handle',
			ghostClass: 'opacity-40'
		});
		return {
			destroy() {
				s.destroy();
			}
		};
	}

	async function saveSortOrder() {
		if (!sortContainerEl) return;
		sortSaving = true;
		sortSaveError = null;
		// Collect order per group — sortOrder is scoped within each category
		const order: { id: number; sortOrder: number }[] = [];
		sortContainerEl.querySelectorAll('[data-group]').forEach((group) => {
			group.querySelectorAll('[data-id]').forEach((el, i) => {
				order.push({ id: parseInt((el as HTMLElement).dataset.id!), sortOrder: i });
			});
		});
		try {
			const res = await fetch('/api/reorder-items', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ order })
			});
			if (!res.ok) throw new Error();
			sortMode = false;
			window.location.reload();
		} catch {
			sortSaveError = 'Failed to save. Please try again.';
		} finally {
			sortSaving = false;
		}
	}

	// ── Item drawer ────────────────────────────────────────────────
	let drawerOpen = $state(false);
	let drawerMode = $state<'new' | 'edit'>('new');
	let drawerItem = $state<CatalogItem | null>(null);
	let drawerLastCreated = $state<{ id: number; name: string } | null>(null);

	function clearDrawerParam() {
		const params = new URLSearchParams();
		if (searchValue) params.set('search', searchValue);
		if (selectedCategoryId) params.set('categoryId', selectedCategoryId);
		const qs = params.toString();
		goto(
			resolve(
				(qs ? `/dashboard/catalog/items?${qs}` : '/dashboard/catalog/items') as `/${string}`
			),
			{ replaceState: true, noScroll: true, keepFocus: true }
		);
	}

	function closeDrawer() {
		drawerOpen = false;
		clearDrawerParam();
	}

	function openNewDrawer() {
		const params = new URLSearchParams();
		if (searchValue) params.set('search', searchValue);
		if (selectedCategoryId) params.set('categoryId', selectedCategoryId);
		params.set('drawer', 'new');
		goto(resolve(`/dashboard/catalog/items?${params.toString()}` as `/${string}`), {
			noScroll: true
		});
	}

	function openEditDrawer(item: CatalogItem) {
		const params = new URLSearchParams();
		if (searchValue) params.set('search', searchValue);
		if (selectedCategoryId) params.set('categoryId', selectedCategoryId);
		params.set('drawer', String(item.id));
		goto(resolve(`/dashboard/catalog/items?${params.toString()}` as `/${string}`), {
			noScroll: true
		});
	}

	// React to server-driven drawer state
	$effect(() => {
		if (!data.drawer) return;
		if (data.drawer.mode === 'new') {
			const isAlreadyOpenNew = untrack(() => drawerOpen && drawerMode === 'new');
			drawerMode = 'new';
			drawerItem = null;
			if (!isAlreadyOpenNew) drawerLastCreated = null;
			drawerOpen = true;
		} else if (data.drawer.mode === 'edit' && data.drawer.item) {
			drawerMode = 'edit';
			drawerItem = data.drawer.item as CatalogItem;
			drawerLastCreated = null;
			drawerOpen = true;
		}
	});

	// ── Search + category filter ──────────────────────────────────
	let searchInput = $state<HTMLInputElement | null>(null);
	let searchTimer: ReturnType<typeof setTimeout> | null = null;
	let searchValue = $state(untrack(() => data.search ?? ''));
	let selectedCategoryId = $state(
		untrack(() => (data.selectedCategoryId ? String(data.selectedCategoryId) : ''))
	);

	$effect(() => {
		searchValue = data.search ?? '';
	});
	$effect(() => {
		selectedCategoryId = data.selectedCategoryId ? String(data.selectedCategoryId) : '';
	});

	function buildCatalogUrl(search: string, categoryId: string): `/${string}` {
		const params = new URLSearchParams();
		if (search) params.set('search', search);
		if (categoryId) params.set('categoryId', categoryId);
		const qs = params.toString();
		return (qs ? `/dashboard/catalog/items?${qs}` : '/dashboard/catalog/items') as `/${string}`;
	}

	function onSearchInput() {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			goto(resolve(buildCatalogUrl(searchValue, selectedCategoryId)), {
				keepFocus: true,
				noScroll: true,
				replaceState: true
			});
		}, 300);
	}

	function clearSearch() {
		searchValue = '';
		goto(resolve(buildCatalogUrl('', selectedCategoryId)), { replaceState: true });
		searchInput?.focus();
	}

	// ── CSV import ────────────────────────────────────────────────
	let showImport = $state(false);
	let showImportUpsell = $state(false);
	let importFile = $state<File | null>(null);
	let importing = $state(false);
	let importResult = $state<{
		created: number;
		updated: number;
		skipped: number;
		results: { row: number; name: string; status: string; error?: string }[];
	} | null>(null);
	let importError = $state<string | null>(null);

	function onFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		importFile = input.files?.[0] ?? null;
		importResult = null;
		importError = null;
	}

	async function runImport() {
		if (!importFile) return;
		importing = true;
		importError = null;
		importResult = null;

		const form = new FormData();
		form.append('file', importFile);

		try {
			const res = await fetch('/api/import-catalog-items', { method: 'POST', body: form });
			const json = await res.json();
			if (!res.ok) {
				importError = json.message ?? 'Import failed';
			} else {
				importResult = json;
			}
		} catch {
			importError = 'Network error. Please try again.';
		} finally {
			importing = false;
		}
	}

	function closeImport() {
		const hadChanges = (importResult?.created ?? 0) > 0 || (importResult?.updated ?? 0) > 0;
		showImport = false;
		importFile = null;
		importResult = null;
		importError = null;
		if (hadChanges) window.location.reload();
	}

	const TEMPLATE_CSV = [
		'name,price,description,category,discounted_price,tags,available',
		'"Classic Burger",12.99,"Beef patty with lettuce and tomato",Burgers,,burger|popular,true',
		'"Caesar Salad",9.50,"Romaine lettuce with caesar dressing",Salads,7.99,salad|healthy,true',
		'"Lemonade",3.00,"Freshly squeezed",Drinks,,,true'
	].join('\n');

	function downloadTemplate() {
		const blob = new Blob([TEMPLATE_CSV], { type: 'text/csv' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'catalog-items-template.csv';
		a.click();
		URL.revokeObjectURL(url);
	}

	const hasErrors = $derived(importResult?.results.some((r) => r.status === 'skipped') ?? false);

	// ── Stripe discovery ──────────────────────────────────────────
	let showDiscover = $state(false);
	let discovering = $state(false);
	let discoverError = $state<string | null>(null);
	let discoveredItems = $state<DiscoveredItem[]>([]);
	let selected = $state(new SvelteSet<string>());
	let importing2 = $state(false);
	let discoverResult = $state<{ imported: number; skipped: number } | null>(null);

	async function openDiscover() {
		showDiscover = true;
		discovering = true;
		discoverError = null;
		discoveredItems = [];
		discoverResult = null;
		selected = new SvelteSet();

		try {
			const res = await fetch('/api/discover-stripe-items');
			const json = await res.json();
			if (!res.ok) {
				discoverError = json.message ?? 'Failed to load Stripe products';
			} else {
				discoveredItems = json;
				// Pre-select everything not already imported
				selected = new SvelteSet(
					(json as DiscoveredItem[]).filter((i) => !i.alreadyImported).map((i) => i.stripeProductId)
				);
			}
		} catch {
			discoverError = 'Network error. Please try again.';
		} finally {
			discovering = false;
		}
	}

	function toggleSelected(id: string) {
		const next = new SvelteSet(selected);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		selected = next;
	}

	async function importSelected() {
		const items = discoveredItems.filter((i) => selected.has(i.stripeProductId));
		if (!items.length) return;
		importing2 = true;
		discoverError = null;

		try {
			const res = await fetch('/api/discover-stripe-items', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ items })
			});
			const json = await res.json();
			if (!res.ok) {
				discoverError = json.message ?? 'Import failed';
			} else {
				discoverResult = json;
			}
		} catch {
			discoverError = 'Network error. Please try again.';
		} finally {
			importing2 = false;
		}
	}

	function closeDiscover() {
		const hadChanges = (discoverResult?.imported ?? 0) > 0;
		showDiscover = false;
		discoveredItems = [];
		discoverError = null;
		discoverResult = null;
		selected = new SvelteSet();
		if (hadChanges) window.location.reload();
	}
</script>

<div>
	<div class="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
		<h1 class="text-2xl font-bold text-foreground">Catalog</h1>
		{#if !sortMode}
			<div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-2">
				<div class="flex items-center justify-between gap-2 md:justify-start">
					<CatalogViewToggle />
					<DropdownMenu>
						<DropdownMenuTrigger>
							<button
								type="button"
								class="flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
							>
								<Icon icon="mdi:dots-horizontal" class="h-4 w-4" /> More
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onclick={openDiscover}>
								<Icon icon="mdi:lightning-bolt" class="h-4 w-4 text-primary" /> Discover from Stripe
							</DropdownMenuItem>
							<DropdownMenuItem
								onclick={() => (data.canImportCsv ? (showImport = true) : (showImportUpsell = true))}
							>
								<Icon icon="mdi:upload" class="h-4 w-4" /> Import CSV
							</DropdownMenuItem>
							<DropdownMenuItem
								onclick={() => {
								sortMode = true;
								closeDrawer();
							}}
							>
								<Icon icon="mdi:drag-vertical" class="h-4 w-4" /> Reorder items
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				<Button onclick={() => openNewDrawer()} variant="default" class="w-full gap-1.5 md:w-auto">
					<Icon icon="mdi:plus" class="h-4 w-4" />
					New item
				</Button>
			</div>
		{:else}
			<div class="flex gap-2">
				<Button
					onclick={() => {
						sortMode = false;
						sortSaveError = null;
					}}
					variant="outline"
				>
					Cancel
				</Button>
				<Button onclick={saveSortOrder} disabled={sortSaving} variant="default" class="gap-1.5">
					<Icon icon="mdi:check" class="h-4 w-4" />
					{sortSaving ? 'Saving…' : 'Save order'}
				</Button>
			</div>
		{/if}
	</div>

	<!-- Filters -->
	<form method="get" class="mb-5 flex min-w-0 gap-2">
		<div class="relative min-w-0 flex-1">
			<Icon
				icon="mdi:magnify"
				class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
			/>
			<input
				bind:this={searchInput}
				type="text"
				name="search"
				bind:value={searchValue}
				placeholder="Search items..."
				oninput={onSearchInput}
				class="h-10 w-full rounded-lg border border-gray-200 bg-background {searchValue
					? 'pr-8'
					: 'pr-4'} pl-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-transparent focus:ring-2 focus:ring-primary/50"
			/>
			{#if searchValue}
				<button
					type="button"
					onclick={clearSearch}
					aria-label="Clear search"
					class="absolute top-1/2 right-2.5 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-600"
				>
					<Icon icon="mdi:close" class="h-3.5 w-3.5" />
				</button>
			{/if}
		</div>
		{#if data.categories.length > 0}
			<Select
				type="single"
				name="categoryId"
				value={selectedCategoryId}
				onValueChange={(val) => {
					selectedCategoryId = val;
					goto(resolve(buildCatalogUrl(searchValue, val)), { replaceState: true });
				}}
			>
				<SelectTrigger class="w-44 shrink-0 border-gray-200">
					<SelectValue>
						{data.categories.find((c) => String(c.id) === selectedCategoryId)?.name ??
							(selectedCategoryId === 'uncategorized' ? '— Uncategorized' : 'All categories')}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="">All categories</SelectItem>
					{#each data.categories as cat (cat.id)}
						<SelectItem value={String(cat.id)}>{cat.name}</SelectItem>
					{/each}
					<SelectItem value="uncategorized">— Uncategorized</SelectItem>
				</SelectContent>
			</Select>
		{/if}
	</form>

	{#if data.search || data.selectedCategoryId}
		<p class="mb-4 text-sm text-muted-foreground">
			Showing {data.pagination.totalItems} of {data.totalItemsUnfiltered} items
		</p>
	{/if}

	{#if sortSaveError}
		<div
			class="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
		>
			{sortSaveError}
		</div>
	{/if}

	{#if sortMode}
		<!-- ── Drag-and-drop reorder — grouped by category ─────────── -->
		<div class="space-y-4" bind:this={sortContainerEl}>
			<p class="text-sm text-muted-foreground">
				Drag items within each category to reorder, then click <strong>Save order</strong>.
			</p>
			{#each groupedForSort as group (group.id)}
				<div class="overflow-hidden rounded-xl border bg-background shadow-sm">
					<div class="border-b bg-muted/50 px-4 py-2.5">
						<span class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
							>{group.name}</span
						>
					</div>
					<ul use:sortableGroup data-group={group.id ?? 'null'} class="divide-y divide-border">
						{#each group.items as item (item.id)}
							{@const primaryImage =
								(item.images as { url: string; isPrimary?: boolean }[] | null)?.find(
									(i) => i.isPrimary
								) ?? (item.images as { url: string }[] | null)?.[0]}
							<li
								data-id={item.id}
								class="flex items-center gap-3 bg-background px-4 py-3 transition-colors hover:bg-muted/50"
							>
								<span
									class="drag-handle cursor-grab text-muted-foreground/40 transition-colors hover:text-muted-foreground active:cursor-grabbing"
								>
									<Icon icon="mdi:drag-horizontal-variant" class="h-5 w-5" />
								</span>
								{#if primaryImage}
									<img
										src={primaryImage.url}
										alt={item.name}
										class="h-9 w-9 shrink-0 rounded-md object-cover"
									/>
								{:else}
									<div
										class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted"
									>
										<Icon
											icon="mdi:silverware-fork-knife"
											class="h-4 w-4 text-muted-foreground/40"
										/>
									</div>
								{/if}
								<span class="flex-1 text-sm font-medium text-foreground">{item.name}</span>
								<span class="text-xs font-medium text-muted-foreground"
									>${(item.price / 100).toFixed(2)}</span
								>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	{:else if data.items.length === 0}
		{#if data.search || data.selectedCategoryId}
			<div class="rounded-xl border border-gray-200 bg-white p-12 text-center">
				<h3 class="mb-1 text-base font-semibold text-gray-900">No results match your filters</h3>
				<p class="mb-4 text-sm text-gray-500">Try adjusting your search or category filter.</p>
				<button
					type="button"
					onclick={() => {
						searchValue = '';
						selectedCategoryId = '';
						goto(resolve('/dashboard/catalog/items'), { replaceState: true });
					}}
					class="text-sm font-medium text-green-600 hover:text-green-700"
				>
					Clear filters →
				</button>
			</div>
		{:else}
			<div class="flex flex-col items-center py-16 text-center">
				<div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
					<Icon icon="mdi:silverware-fork-knife" class="h-8 w-8 text-muted-foreground/40" />
				</div>
				<h2 class="mt-4 text-base font-semibold text-foreground">No items yet</h2>
				<p class="mt-1 text-sm text-muted-foreground">
					Add your first item to start building your catalog.
				</p>
				<Button onclick={() => openNewDrawer()} class="mt-6 gap-1.5">
					<Icon icon="mdi:plus" class="h-4 w-4" /> Add your first item
				</Button>
			</div>
		{/if}
	{:else}
		{#snippet statusDropdown(item: CatalogItem)}
			<DropdownMenu>
				<DropdownMenuTrigger>
					<button
						type="button"
						class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize transition-colors hover:opacity-80 {item.status ===
						'available'
							? 'bg-green-100 text-green-700'
							: item.status === 'sold_out'
								? 'bg-amber-100 text-amber-700'
								: item.status === 'hidden'
									? 'bg-gray-100 text-gray-400'
									: 'bg-gray-100 text-gray-500'}"
					>
						{item.status.replace('_', ' ')}
						<Icon icon="mdi:chevron-down" class="h-3 w-3" />
					</button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					{#each [['available', 'Available'], ['sold_out', 'Sold out'], ['hidden', 'Hidden']] as [val, label] (val)}
						<DropdownMenuItem>
							<form
								method="post"
								action="?/setStatus"
								use:enhance={() =>
									({ update }) =>
										update({ reset: false })}
								class="w-full"
							>
								<input type="hidden" name="id" value={item.id} />
								<input type="hidden" name="status" value={val} />
								<button
									type="submit"
									class="flex w-full items-center gap-2 text-sm {item.status === val
										? 'font-semibold'
										: ''}"
								>
									<span
										class="h-2 w-2 rounded-full {val === 'available'
											? 'bg-green-500'
											: val === 'sold_out'
												? 'bg-amber-400'
												: 'bg-gray-300'}"
									></span>
									{label}
								</button>
							</form>
						</DropdownMenuItem>
					{/each}
				</DropdownMenuContent>
			</DropdownMenu>
		{/snippet}

		<!-- Mobile card list — hidden at md+ -->
		<div class="block space-y-2 md:hidden">
			{#each sortedItems as item (item.id)}
				{@const primaryImage =
					(item.images as { url: string; isPrimary?: boolean }[] | null)?.find(
						(img) => img.isPrimary
					) ?? (item.images as { url: string }[] | null)?.[0]}
				<div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
					<a href={resolve(`/dashboard/catalog/items/${item.id}`)} class="block">
						<div class="flex flex-row gap-3 px-4 pt-3 pb-2">
							{#if primaryImage}
								<img
									src={primaryImage.url}
									alt={item.name}
									class="h-10 w-10 shrink-0 rounded-md object-cover"
								/>
							{:else}
								<div
									class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100"
								>
									<Icon icon="mdi:image-outline" class="h-4 w-4 text-gray-300" />
								</div>
							{/if}
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium text-gray-900">{item.name}</p>
								<p class="truncate text-xs text-gray-500">
									{item.category?.name ?? 'Uncategorized'} · ${item.discountedPrice
										? (item.discountedPrice / 100).toFixed(2)
										: (item.price / 100).toFixed(2)}
								</p>
							</div>
						</div>
					</a>
					<div class="flex items-center justify-between gap-2 border-t border-gray-100 px-4 py-2">
						{@render statusDropdown(item)}
						<div class="flex items-center gap-1">
							<button
								type="button"
								onclick={() => openEditDrawer(item)}
								class="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
							>
								Edit
							</button>
							<form method="post" action="?/delete" use:enhance>
								<input type="hidden" name="id" value={item.id} />
								<button
									type="submit"
									onclick={async (e) => {
										e.preventDefault();
										if (await confirmDialog('Delete this item?'))
											(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
									}}
									aria-label="Delete {item.name}"
									class="flex h-8 w-8 items-center justify-center rounded-md text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
								>
									<Icon icon="mdi:trash-can-outline" class="h-4 w-4" />
								</button>
							</form>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Desktop table — hidden below md -->
		<div
			class="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block"
		>
			<Table>
				<TableHeader>
					<TableRow class="hover:bg-transparent">
						<TableHead class="w-14 px-4 py-2.5"></TableHead>
						{#each [['name', 'Name'], ['category', 'Category'], ['price', 'Price'], ['status', 'Status']] as const as [col, label] (col)}
							<TableHead class="px-4 py-2.5">
								<button
									onclick={() => sortBy(col)}
									class="inline-flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-foreground"
								>
									{label}
									<Icon
										icon={sortCol === col
											? sortDir === 'asc'
												? 'mdi:chevron-up'
												: 'mdi:chevron-down'
											: 'mdi:unfold-more-horizontal'}
										class="h-3.5 w-3.5 {sortCol === col
											? 'text-foreground'
											: 'text-muted-foreground/40'}"
									/>
								</button>
							</TableHead>
						{/each}
						<TableHead class="px-4 py-2.5 text-muted-foreground">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each sortedItems as item (item.id)}
						{@const primaryImage =
							(item.images as { url: string; isPrimary?: boolean }[] | null)?.find(
								(img) => img.isPrimary
							) ?? (item.images as { url: string }[] | null)?.[0]}
						<TableRow class="hover:bg-gray-50">
							<TableCell class="w-14 px-4 py-3">
								{#if primaryImage}
									<img
										src={primaryImage.url}
										alt={item.name}
										class="h-10 w-10 rounded-md object-cover"
									/>
								{:else}
									<div class="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100">
										<Icon icon="mdi:image-outline" class="h-4 w-4 text-gray-300" />
									</div>
								{/if}
							</TableCell>
							<TableCell class="max-w-0 px-4 py-3 whitespace-normal">
								<div class="min-w-0">
									<a
										href={resolve(`/dashboard/catalog/items/${item.id}`)}
										class="block truncate text-sm font-medium text-gray-900 hover:text-gray-700"
									>
										{item.name}
									</a>
									{#if item.description}
										<p class="block truncate text-xs text-gray-500">{item.description}</p>
									{/if}
								</div>
							</TableCell>
							<TableCell class="w-36 px-4 py-3 text-sm text-gray-500">
								{item.category?.name ?? '—'}
							</TableCell>
							<TableCell class="w-20 px-4 py-3">
								{#if item.discountedPrice}
									<div class="flex flex-col gap-0.5">
										<span class="text-xs text-gray-400 line-through"
											>${(item.price / 100).toFixed(2)}</span
										>
										<span class="text-sm font-semibold text-green-600"
											>${(item.discountedPrice / 100).toFixed(2)}</span
										>
									</div>
								{:else}
									<span class="text-sm text-gray-900">${(item.price / 100).toFixed(2)}</span>
								{/if}
							</TableCell>
							<TableCell class="w-28 px-4 py-3">
								{@render statusDropdown(item)}
							</TableCell>
							<TableCell class="w-20 px-4 py-3 text-right">
								<div class="flex items-center justify-end gap-1">
									<button
										type="button"
										onclick={() => openEditDrawer(item)}
										class="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
									>
										Edit
									</button>
									<form method="post" action="?/delete" use:enhance>
										<input type="hidden" name="id" value={item.id} />
										<button
											type="submit"
											onclick={async (e) => {
												e.preventDefault();
												if (await confirmDialog('Delete this item?'))
													(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
											}}
											aria-label="Delete item"
											class="flex h-8 w-8 items-center justify-center rounded-md text-red-400 transition-colors hover:bg-red-50 hover:text-red-600"
										>
											<Icon icon="mdi:trash-can-outline" class="h-3.5 w-3.5" />
										</button>
									</form>
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</div>

		<!-- Pagination -->
		{#if data.pagination.totalPages > 1}
			<div class="mt-4 flex items-center justify-between text-sm text-muted-foreground">
				<span>Page {data.pagination.page} of {data.pagination.totalPages}</span>
				<div class="flex gap-2">
					{#if data.pagination.page > 1}
						<a
							href={resolve(`/dashboard/catalog/items?page=${data.pagination.page - 1}`)}
							class="rounded-md border px-3 py-1.5 transition-colors hover:border-gray-400 hover:bg-muted"
							><Icon icon="mdi:chevron-left" class="h-4 w-4" /> Prev</a
						>
					{/if}
					{#if data.pagination.page < data.pagination.totalPages}
						<a
							href={resolve(`/dashboard/catalog/items?page=${data.pagination.page + 1}`)}
							class="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 transition-colors hover:border-gray-400 hover:bg-muted"
							>Next <Icon icon="mdi:chevron-right" class="h-4 w-4" /></a
						>
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- ── CSV import upsell ──────────────────────────────────────── -->
<Dialog bind:open={showImportUpsell}>
	<DialogContent class="max-w-sm">
		<DialogHeader>
			<DialogTitle>Pro plan required</DialogTitle>
			<DialogDescription class="sr-only">Upgrade to import items via CSV</DialogDescription>
		</DialogHeader>
		<div class="space-y-3">
			<div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
				<Icon icon="mdi:upload" class="h-6 w-6 text-primary" />
			</div>
			<p class="text-sm text-muted-foreground">
				CSV import is available on the <span class="font-semibold text-foreground">Pro plan</span>.
				Upgrade to bulk-import unlimited items from a spreadsheet.
			</p>
		</div>
		<DialogFooter class="flex gap-2 sm:flex-row">
			<Button onclick={() => (showImportUpsell = false)} variant="outline">Cancel</Button>
			<a
				href={resolve('/dashboard/account/billing')}
				class="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
			>
				<Icon icon="mdi:arrow-right" class="h-4 w-4" /> Upgrade to Pro
			</a>
		</DialogFooter>
	</DialogContent>
</Dialog>

<!-- ── Import modal ───────────────────────────────────────────── -->
<Dialog
	bind:open={showImport}
	onOpenChange={(open) => {
		if (!open) closeImport();
	}}
>
	<DialogContent class="max-w-lg">
		<DialogHeader>
			<DialogTitle>Import items from CSV</DialogTitle>
			<DialogDescription class="sr-only">Upload a CSV file to import items</DialogDescription>
		</DialogHeader>

		<div class="space-y-4">
			{#if !importResult}
				<!-- Instructions -->
				<div
					class="space-y-1.5 rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground"
				>
					<p class="font-medium text-foreground">CSV format</p>
					<p>
						Required columns: <code class="rounded bg-muted px-1 text-xs">name</code>,
						<code class="rounded bg-muted px-1 text-xs">price</code>
					</p>
					<p>
						Optional: <code class="rounded bg-muted px-1 text-xs">description</code>
						<code class="rounded bg-muted px-1 text-xs">category</code>
						<code class="rounded bg-muted px-1 text-xs">discounted_price</code>
						<code class="rounded bg-muted px-1 text-xs">tags</code>
						<code class="rounded bg-muted px-1 text-xs">available</code>
					</p>
					<p class="text-xs text-muted-foreground">
						Separate multiple tags with <code class="rounded bg-muted px-1">|</code>. Existing items
						are updated by name. New categories are created automatically. Max 500 rows.
					</p>
				</div>

				<Button onclick={downloadTemplate} variant="link" class="gap-0.5">
					<Icon icon="mdi:download" class="mr-0.5 inline h-4 w-4" /> Download template CSV
				</Button>

				<div>
					<label class="mb-1.5 block text-sm font-medium text-muted-foreground" for="csv-file">
						Select CSV file
					</label>
					<input
						id="csv-file"
						type="file"
						accept=".csv"
						onchange={onFileChange}
						class="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-muted-foreground file:transition-colors hover:file:bg-muted/50"
					/>
					{#if importFile}
						<p class="mt-1.5 text-xs text-muted-foreground">
							{importFile.name} · {(importFile.size / 1024).toFixed(1)} KB
						</p>
					{/if}
				</div>

				{#if importError}
					<div
						class="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
					>
						{importError}
					</div>
				{/if}

				<DialogFooter class="flex gap-2 sm:flex-row">
					<Button onclick={closeImport} variant="outline">Cancel</Button>
					<Button onclick={runImport} disabled={!importFile || importing} variant="default">
						{importing ? 'Importing…' : 'Import'}
					</Button>
				</DialogFooter>
			{:else}
				<!-- Results -->
				<div class="flex items-center gap-4 rounded-lg border px-4 py-3">
					<div class="text-center">
						<p class="text-2xl font-bold text-primary">{importResult.created}</p>
						<p class="mt-0.5 text-xs text-muted-foreground">Created</p>
					</div>
					<div class="h-8 w-px bg-muted"></div>
					<div class="text-center">
						<p class="text-2xl font-bold text-blue-700">{importResult.updated}</p>
						<p class="mt-0.5 text-xs text-muted-foreground">Updated</p>
					</div>
					<div class="h-8 w-px bg-muted"></div>
					<div class="text-center">
						<p
							class="text-2xl font-bold {importResult.skipped > 0
								? 'text-red-600'
								: 'text-muted-foreground'}"
						>
							{importResult.skipped}
						</p>
						<p class="mt-0.5 text-xs text-muted-foreground">Skipped</p>
					</div>
				</div>

				{#if hasErrors}
					<div class="max-h-52 overflow-y-auto rounded-lg border border-red-100 bg-destructive/10">
						<table class="w-full text-xs">
							<thead class="sticky top-0 bg-red-100">
								<tr>
									<th class="px-3 py-2 text-left font-medium text-destructive">Row</th>
									<th class="px-3 py-2 text-left font-medium text-destructive">Name</th>
									<th class="px-3 py-2 text-left font-medium text-destructive">Reason</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-red-100">
								{#each importResult.results.filter((r) => r.status === 'skipped') as r (r.row)}
									<tr>
										<td class="px-3 py-2 text-red-600">{r.row}</td>
										<td class="px-3 py-2 text-red-800">{r.name}</td>
										<td class="px-3 py-2 text-red-600">{r.error}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/if}

				<DialogFooter>
					<Button onclick={closeImport} variant="default">Done</Button>
				</DialogFooter>
			{/if}
		</div>
	</DialogContent>
</Dialog>

<!-- ── Stripe discover modal ─── -->
<Dialog
	bind:open={showDiscover}
	onOpenChange={(open) => {
		if (!open) closeDiscover();
	}}
>
	<DialogContent class="flex max-h-[90vh] max-w-2xl flex-col">
		<DialogHeader>
			<DialogTitle>Discover Stripe Products</DialogTitle>
			<DialogDescription>
				Select products from your Stripe account to import as catalog items.
			</DialogDescription>
		</DialogHeader>

		<!-- Body -->
		<div class="flex-1 overflow-y-auto">
			{#if discovering}
				<div class="flex flex-col items-center justify-center py-12 text-muted-foreground">
					<svg class="mb-3 h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
					</svg>
					<p class="text-sm">Loading products from Stripe…</p>
				</div>
			{:else if discoverError}
				<div
					class="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
				>
					{discoverError}
				</div>
			{:else if discoverResult}
				<div
					class="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary/90"
				>
					<p class="font-medium">Import complete</p>
					<p class="mt-0.5">
						{discoverResult.imported} item{discoverResult.imported !== 1 ? 's' : ''} imported{discoverResult.skipped >
						0
							? `, ${discoverResult.skipped} skipped (already exist)`
							: ''}.
					</p>
				</div>
			{:else if discoveredItems.length === 0}
				<div class="py-10 text-center text-sm text-muted-foreground">
					No active one-time products found in your Stripe account.
				</div>
			{:else}
				<!-- Select-all toggle -->
				<div class="mb-3 flex items-center justify-between">
					<p class="text-sm text-muted-foreground">
						{discoveredItems.length} product{discoveredItems.length !== 1 ? 's' : ''} found
					</p>
					<Button
						onclick={() => {
							const unimported = discoveredItems
								.filter((i) => !i.alreadyImported)
								.map((i) => i.stripeProductId);
							if (unimported.every((id) => selected.has(id))) {
								const next = new SvelteSet(selected);
								unimported.forEach((id) => next.delete(id));
								selected = next;
							} else {
								const next = new SvelteSet(selected);
								unimported.forEach((id) => next.add(id));
								selected = next;
							}
						}}
						variant="ghost"
						size="sm"
						class="h-auto p-0 text-xs text-muted-foreground underline hover:text-foreground"
					>
						{discoveredItems
							.filter((i) => !i.alreadyImported)
							.every((i) => selected.has(i.stripeProductId))
							? 'Deselect all'
							: 'Select all'}
					</Button>
				</div>

				<!-- Product list -->
				<ul class="divide-y divide-border rounded-lg border">
					{#each discoveredItems as item (item.stripeProductId)}
						<li
							class="flex items-center gap-3 px-4 py-3 {item.alreadyImported ? 'opacity-60' : ''}"
						>
							<input
								type="checkbox"
								id="discover-{item.stripeProductId}"
								checked={selected.has(item.stripeProductId)}
								disabled={item.alreadyImported}
								onchange={() => toggleSelected(item.stripeProductId)}
								class="h-4 w-4 rounded accent-gray-900"
							/>
							{#if item.imageUrl}
								<img
									src={item.imageUrl}
									alt={item.name}
									class="h-10 w-10 shrink-0 rounded object-cover"
								/>
							{:else}
								<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
									<Icon icon="mdi:silverware-fork-knife" class="h-5 w-5 text-muted-foreground" />
								</div>
							{/if}
							<label for="discover-{item.stripeProductId}" class="min-w-0 flex-1 cursor-pointer">
								<p class="truncate text-sm font-medium text-foreground">{item.name}</p>
								{#if item.description}
									<p class="truncate text-xs text-muted-foreground">{item.description}</p>
								{/if}
							</label>
							<div class="flex shrink-0 flex-col items-end gap-1">
								<span class="text-sm font-semibold text-foreground"
									>${(item.price / 100).toFixed(2)}</span
								>
								{#if item.alreadyImported}
									<Badge class="bg-muted text-muted-foreground">Already imported</Badge>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<!-- Footer -->
		{#if !discovering && !discoverResult}
			<DialogFooter class="flex items-center justify-between sm:justify-between">
				<p class="text-xs text-muted-foreground">
					{selected.size} item{selected.size !== 1 ? 's' : ''} selected
				</p>
				<div class="flex gap-2">
					<Button onclick={closeDiscover} variant="outline">Cancel</Button>
					<Button
						onclick={importSelected}
						disabled={selected.size === 0 || importing2}
						variant="default"
					>
						{importing2
							? 'Importing…'
							: `Import ${selected.size > 0 ? selected.size : ''} item${selected.size !== 1 ? 's' : ''}`}
					</Button>
				</div>
			</DialogFooter>
		{:else if discoverResult}
			<DialogFooter>
				<Button onclick={closeDiscover} variant="default">Done</Button>
			</DialogFooter>
		{/if}
	</DialogContent>
</Dialog>
<!-- ── Item drawer ─────────────────────────────────────────────── -->
<Sheet bind:open={drawerOpen} onOpenChange={(open) => { if (!open) clearDrawerParam(); }}>
	<SheetContent
		side="right"
		class="data-[side=right]:w-full data-[side=right]:sm:max-w-none data-[side=right]:md:max-w-[720px] flex flex-col gap-0 p-0"
	>
		<SheetHeader class="shrink-0 border-b px-6 py-4">
			<SheetTitle>{drawerMode === 'new' ? 'New item' : 'Edit item'}</SheetTitle>
			<SheetDescription class="sr-only">
				{drawerMode === 'new' ? 'Create a new catalog item' : 'Edit catalog item details'}
			</SheetDescription>
		</SheetHeader>
		<div class="flex-1 overflow-y-auto px-6 py-5">
			{#if drawerMode === 'new'}
				{#if drawerLastCreated}
					<div
						class="mb-4 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-primary/90"
					>
						<span>
							✓ <strong>{drawerLastCreated.name}</strong> created —
							<a
								href={resolve(`/dashboard/catalog/items/${drawerLastCreated.id}`)}
								class="underline hover:text-primary/80"
							>edit item</a>
						</span>
						<Button
							onclick={() => (drawerLastCreated = null)}
							variant="ghost"
							size="icon-sm"
							class="ml-4 text-primary/80 hover:text-primary"
						>
							<Icon icon="mdi:close" class="h-4 w-4" />
						</Button>
					</div>
				{/if}
				<CatalogItemForm
					mode="new"
					formAction="?/create"
					categories={data.categories}
					hasSubscriptionsAddon={data.hasSubscriptionsAddon}
					twoColumn={true}
					variant="flat"
					onSuccess={(item) => { drawerLastCreated = item; }}
					onCancel={() => closeDrawer()}
				/>
			{:else if drawerMode === 'edit' && drawerItem}
				<CatalogItemForm
					mode="edit"
					formAction="?/update"
					item={drawerItem}
					itemId={drawerItem.id}
					categories={data.categories}
					hasSubscriptionsAddon={data.hasSubscriptionsAddon}
					twoColumn={true}
					variant="flat"
					onCancel={() => closeDrawer()}
				/>
			{/if}
		</div>
	</SheetContent>
</Sheet>
