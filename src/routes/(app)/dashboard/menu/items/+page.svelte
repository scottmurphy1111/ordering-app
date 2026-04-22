<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import type { DiscoveredItem } from '$lib/../routes/api/discover-stripe-items/+server';
	import { SvelteSet } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { afterNavigate } from '$app/navigation';
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import Sortable from 'sortablejs';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// ── Table sorting ─────────────────────────────────────────────
	type SortCol = 'name' | 'category' | 'price' | 'status';
	let sortCol = $state<SortCol>('name');
	let sortDir = $state<'asc' | 'desc'>('asc');

	function sortBy(col: SortCol) {
		if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else { sortCol = col; sortDir = 'asc'; }
	}

	const sortedItems = $derived([...data.items].sort((a, b) => {
		let cmp = 0;
		if (sortCol === 'name') cmp = a.name.localeCompare(b.name);
		else if (sortCol === 'category') cmp = (a.category?.name ?? '').localeCompare(b.category?.name ?? '');
		else if (sortCol === 'price') cmp = a.price - b.price;
		else if (sortCol === 'status') cmp = Number(b.available) - Number(a.available);
		return sortDir === 'asc' ? cmp : -cmp;
	}));

	// ── Drag-and-drop sort mode ───────────────────────────────────
	let sortMode = $state(false);
	let sortSaving = $state(false);
	let sortSaveError = $state<string | null>(null);
	let sortContainerEl = $state<HTMLElement | null>(null);

	// Group items by category for the sort view
	const groupedForSort = $derived(() => {
		const catMap = new Map<number | null, { id: number | null; name: string; items: typeof data.items }>();
		for (const cat of data.categories) {
			catMap.set(cat.id, { id: cat.id, name: cat.name, items: [] });
		}
		catMap.set(null, { id: null, name: 'Uncategorized', items: [] });
		for (const item of data.items) {
			const key = item.category?.id ?? null;
			if (!catMap.has(key)) catMap.set(key, { id: key, name: item.category?.name ?? 'Uncategorized', items: [] });
			catMap.get(key)!.items.push(item);
		}
		return [...catMap.values()].filter(g => g.items.length > 0);
	});

	function sortableGroup(node: HTMLElement) {
		const s = Sortable.create(node, { animation: 150, handle: '.drag-handle', ghostClass: 'opacity-40' });
		return { destroy() { s.destroy(); } };
	}

	async function saveSortOrder() {
		if (!sortContainerEl) return;
		sortSaving = true;
		sortSaveError = null;
		// Collect order per group — sortOrder is scoped within each category
		const order: { id: number; sortOrder: number }[] = [];
		sortContainerEl.querySelectorAll('[data-group]').forEach(group => {
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

	// ── Inline create form ────────────────────────────────────────
	let showForm = $state(false);
	let newImageUrl = $state('');
	let newImagePreview = $state('');
	let newUploading = $state(false);
	let newUploadError = $state('');
	let lastCreated = $state<{ id: number; name: string } | null>(null);
	let createFormEl = $state<HTMLFormElement | null>(null);

	$effect(() => {
		if (form?.success && form.item) {
			lastCreated = form.item as { id: number; name: string };
			newImageUrl = '';
			newImagePreview = '';
			createFormEl?.reset();
		}
	});

	async function onNewImageChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		newUploading = true;
		newUploadError = '';
		const fd = new FormData();
		fd.append('image', file);
		try {
			const res = await fetch('/api/upload-menu-item-image', { method: 'POST', body: fd });
			const json = await res.json();
			if (!res.ok) { newUploadError = json.message ?? 'Upload failed'; }
			else { newImageUrl = json.url; newImagePreview = json.url; }
		} catch {
			newUploadError = 'Network error. Please try again.';
		} finally {
			newUploading = false;
		}
	}

	// ── Search ────────────────────────────────────────────────────
	let searchForm = $state<HTMLFormElement | null>(null);
	let searchInput = $state<HTMLInputElement | null>(null);
	let searchTimer: ReturnType<typeof setTimeout> | null = null;
	let refocusAfterNav = false;

	afterNavigate(() => {
		if (refocusAfterNav) {
			refocusAfterNav = false;
			tick().then(() => {
				if (!searchInput) return;
				searchInput.focus();
				const len = searchInput.value.length;
				searchInput.setSelectionRange(len, len);
			});
		}
	});

	function onSearchInput() {
		if (searchTimer) clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			refocusAfterNav = true;
			searchForm?.requestSubmit();
		}, 300);
	}

	function onCategoryChange() {
		searchForm?.requestSubmit();
	}

	// ── CSV import ────────────────────────────────────────────────
	let showImport = $state(false);
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
			const res = await fetch('/api/import-menu-items', { method: 'POST', body: form });
			const json = await res.json();
			if (!res.ok) { importError = json.message ?? 'Import failed'; }
			else { importResult = json; }
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
		a.download = 'menu-items-template.csv';
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
			if (!res.ok) { discoverError = json.message ?? 'Failed to load Stripe products'; }
			else {
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
			if (!res.ok) { discoverError = json.message ?? 'Import failed'; }
			else { discoverResult = json; }
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
	<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<a href="/dashboard/menu" class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-1">
				<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Menu
			</a>
			<h1 class="text-2xl font-bold text-gray-900">Menu Items</h1>
			<p class="text-sm text-gray-500 mt-0.5">{data.pagination.totalItems} items total</p>
		</div>
		<div class="flex flex-wrap gap-2">
			{#if !sortMode}
				<button onclick={openDiscover}
					class="inline-flex items-center gap-1.5 rounded-md border border-purple-300 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors">
					<Icon icon="mdi:lightning-bolt" class="h-4 w-4" /><span class="hidden sm:inline">Discover from Stripe</span><span class="sm:hidden">Discover</span>
				</button>
				<button onclick={() => (showImport = true)}
					class="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
					<Icon icon="mdi:upload" class="h-4 w-4" /><span class="hidden sm:inline">Import CSV</span><span class="sm:hidden">Import</span>
				</button>
				<button onclick={() => { sortMode = true; showForm = false; }}
					class="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
					<Icon icon="mdi:drag-vertical" class="h-4 w-4" /> Reorder
				</button>
				<button onclick={() => { showForm = !showForm; lastCreated = null; }}
					class="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
					<Icon icon={showForm ? 'mdi:close' : 'mdi:plus'} class="h-4 w-4" /> {showForm ? 'Cancel' : 'New item'}
				</button>
			{:else}
				<button onclick={() => { sortMode = false; sortSaveError = null; }}
					class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
					Cancel
				</button>
				<button onclick={saveSortOrder} disabled={sortSaving}
					class="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50">
					<Icon icon="mdi:check" class="h-4 w-4" /> {sortSaving ? 'Saving…' : 'Save order'}
				</button>
			{/if}
		</div>
	</div>

	<!-- ── Inline create form ────────────────────────────────────── -->
	{#if showForm}
		{#if lastCreated}
			<div class="mb-3 flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-700">
				<span>✓ <strong>{lastCreated.name}</strong> created — <a href={resolve(`/dashboard/menu/items/${lastCreated.id}`)} class="underline hover:text-green-900">edit item</a></span>
				<button onclick={() => (lastCreated = null)} class="ml-4 text-green-500 hover:text-green-700"><Icon icon="mdi:close" class="h-4 w-4" /></button>
			</div>
		{/if}
		{#if form?.error}
			<div class="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{form.error}</div>
		{/if}
		<form
			method="post"
			action="?/create"
			bind:this={createFormEl}
			use:enhance={() => ({ update }) => update({ reset: false })}
			class="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
		>
			<h2 class="font-semibold text-gray-800">New item</h2>

			<!-- Image -->
			<div class="flex items-start gap-4">
				<div
					role="button" tabindex="0" aria-label="Upload item image"
					onclick={() => (document.getElementById('new-image-upload') as HTMLInputElement)?.click()}
					onkeydown={(e) => e.key === 'Enter' && (document.getElementById('new-image-upload') as HTMLInputElement)?.click()}
					class="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 transition-colors {newUploading ? 'pointer-events-none opacity-60' : ''}"
				>
					{#if newImagePreview}
						<img src={newImagePreview} alt="Preview" class="h-full w-full object-cover" />
						<div class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity">
							<Icon icon="mdi:pencil" class="h-4 w-4 text-white" />
						</div>
					{:else if newUploading}
						<svg class="h-4 w-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
					{:else}
						<Icon icon="mdi:image-plus" class="h-5 w-5 text-gray-400" />
					{/if}
				</div>
				<input id="new-image-upload" type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" onchange={onNewImageChange} />
				<input type="hidden" name="imageUrl" value={newImageUrl} />
				<div class="flex-1 pt-1 space-y-1">
					<p class="text-xs text-gray-400">JPG, PNG, WebP · max 5MB</p>
					{#if newUploadError}<p class="text-xs text-red-600">{newUploadError}</p>{/if}
					{#if newImagePreview}<button type="button" onclick={() => { newImageUrl = ''; newImagePreview = ''; }} class="text-xs text-red-500 hover:text-red-700">Remove</button>{/if}
				</div>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="sm:col-span-2">
					<label class="block text-sm font-medium text-gray-700 mb-1" for="new-name">Name *</label>
					<input id="new-name" name="name" type="text" required placeholder="e.g. Classic Cheeseburger"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
				</div>
				<div class="sm:col-span-2">
					<label class="block text-sm font-medium text-gray-700 mb-1" for="new-description">Description</label>
					<textarea id="new-description" name="description" rows="2" placeholder="Short description..."
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"></textarea>
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1" for="new-price">Price ($) *</label>
					<input id="new-price" name="price" type="number" min="0" step="0.01" required placeholder="9.99"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
				</div>
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1" for="new-sale">Sale price ($)</label>
					<input id="new-sale" name="discountedPrice" type="number" min="0" step="0.01" placeholder="Optional"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
				</div>
				{#if data.categories.length > 0}
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1" for="new-category">Category</label>
						<select id="new-category" name="categoryId"
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
							<option value="">No category</option>
							{#each data.categories as cat (cat.id)}<option value={String(cat.id)}>{cat.name}</option>{/each}
						</select>
					</div>
				{/if}
				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1" for="new-tags">Tags</label>
					<input id="new-tags" name="tags" type="text" placeholder="spicy, popular (comma-separated)"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
				</div>
			</div>

			<div class="flex items-center gap-2">
				<input id="new-available" name="available" type="checkbox" checked class="h-4 w-4 rounded border-gray-300" />
				<label class="text-sm text-gray-700" for="new-available">Available for ordering</label>
			</div>

			<div class="flex gap-2 pt-1">
				<button type="submit" disabled={newUploading}
					class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50">
					Save &amp; add another
				</button>
				<button type="submit" name="closeAfter" value="1" disabled={newUploading}
					class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
					onclick={() => setTimeout(() => { showForm = false; }, 100)}>
					Save &amp; close
				</button>
			</div>
		</form>
	{/if}

	<!-- Filters -->
	<form bind:this={searchForm} method="get" class="mb-5 flex min-w-0 gap-2">
		<input
			bind:this={searchInput}
			type="text"
			name="search"
			value={data.search ?? ''}
			placeholder="Search items..."
			oninput={onSearchInput}
			class="min-w-0 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
		/>
		{#if data.categories.length > 0}
			<select
				name="categoryId"
				onchange={onCategoryChange}
				class="w-36 shrink-0 truncate rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			>
				<option value="">All categories</option>
				{#each data.categories as cat (cat.id)}
					<option value={String(cat.id)} selected={data.selectedCategoryId === cat.id}>
						{cat.name}
					</option>
				{/each}
			</select>
		{/if}
	</form>

	{#if sortSaveError}
		<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{sortSaveError}</div>
	{/if}

	{#if sortMode}
		<!-- ── Drag-and-drop reorder — grouped by category ─────────── -->
		<div class="space-y-4" bind:this={sortContainerEl}>
			<p class="text-sm text-gray-500">Drag items within each category to reorder, then click <strong>Save order</strong>.</p>
			{#each groupedForSort() as group (group.id)}
				<div class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
					<div class="border-b border-gray-100 bg-gray-50 px-4 py-2.5">
						<span class="text-xs font-semibold uppercase tracking-wide text-gray-500">{group.name}</span>
					</div>
					<ul use:sortableGroup data-group={group.id ?? 'null'} class="divide-y divide-gray-100">
						{#each group.items as item (item.id)}
							{@const primaryImage = (item.images as { url: string; isPrimary?: boolean }[] | null)?.find(i => i.isPrimary) ?? (item.images as { url: string }[] | null)?.[0]}
							<li data-id={item.id} class="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
								<span class="drag-handle cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors">
									<Icon icon="mdi:drag-horizontal-variant" class="h-5 w-5" />
								</span>
								{#if primaryImage}
									<img src={primaryImage.url} alt={item.name} class="h-9 w-9 shrink-0 rounded-md object-cover" />
								{:else}
									<div class="h-9 w-9 shrink-0 rounded-md bg-gray-100 flex items-center justify-center">
										<Icon icon="mdi:silverware-fork-knife" class="h-4 w-4 text-gray-300" />
									</div>
								{/if}
								<span class="flex-1 text-sm font-medium text-gray-900">{item.name}</span>
								<span class="text-xs font-medium text-gray-700">${(item.price / 100).toFixed(2)}</span>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>
	{:else if data.items.length === 0}
		<div class="rounded-xl border border-dashed border-gray-300 p-12 text-center">
			<p class="text-gray-400 text-sm">No items found.</p>
			<button onclick={() => { showForm = true; }} class="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"><Icon icon="mdi:plus" class="h-3.5 w-3.5" /> Add your first item</button>
		</div>
	{:else}
		<div class="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
			<table class="w-full text-sm">
				<thead class="bg-gray-50 border-b border-gray-200">
					<tr>
						<th class="px-4 py-2.5 w-12"></th>
						{#each ([['name','Name'],['category','Category'],['price','Price'],['status','Status']] as const) as [col, label]}
							<th class="px-4 py-2.5 text-left">
								<button onclick={() => sortBy(col)} class="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-gray-800 transition-colors">
									{label}
									<Icon icon={sortCol === col ? (sortDir === 'asc' ? 'mdi:chevron-up' : 'mdi:chevron-down') : 'mdi:unfold-more-horizontal'} class="h-3.5 w-3.5 {sortCol === col ? 'text-gray-800' : 'text-gray-300'}" />
								</button>
							</th>
						{/each}
						<th class="px-4 py-2.5"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each sortedItems as item (item.id)}
						{@const primaryImage = (item.images as { url: string; isPrimary?: boolean }[] | null)?.find((img) => img.isPrimary) ?? (item.images as { url: string }[] | null)?.[0]}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-4 py-3">
								{#if primaryImage}
									<img src={primaryImage.url} alt={item.name} class="h-10 w-10 rounded-md object-cover" />
								{:else}
									<div class="h-10 w-10 rounded-md bg-gray-100 flex items-center justify-center">
										<Icon icon="mdi:silverware-fork-knife" class="h-5 w-5 text-gray-300" />
									</div>
								{/if}
							</td>
							<td class="px-4 py-3">
								<a href={resolve(`/dashboard/menu/items/${item.id}`)} class="font-medium text-gray-900 hover:underline">
									{item.name}
								</a>
								{#if item.description}
									<p class="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.description}</p>
								{/if}
							</td>
							<td class="px-4 py-3 text-gray-500">{item.category?.name ?? '—'}</td>
							<td class="px-4 py-3 text-gray-900">
								${(item.price / 100).toFixed(2)}
								{#if item.discountedPrice}
									<span class="text-xs text-green-600 ml-1">(sale ${(item.discountedPrice / 100).toFixed(2)})</span>
								{/if}
							</td>
							<td class="px-4 py-3">
								<form method="post" action="?/toggleAvailable" use:enhance={() => ({ update }) => update({ reset: false })}>
									<input type="hidden" name="id" value={item.id} />
									<input type="hidden" name="available" value={String(!item.available)} />
									<button type="submit" class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors
										{item.available ? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600' : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-700'}">
										<Icon icon={item.available ? 'mdi:check-circle-outline' : 'mdi:close-circle-outline'} class="h-3.5 w-3.5" />
										{item.available ? 'Available' : '86\'d'}
									</button>
								</form>
							</td>
							<td class="px-4 py-3">
								<div class="flex items-center gap-3">
									<a href={resolve(`/dashboard/menu/items/${item.id}`)} class="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors">Edit</a>
									<form method="post" action="?/delete" use:enhance>
										<input type="hidden" name="id" value={item.id} />
										<button
											type="submit"
											onclick={async (e) => { e.preventDefault(); if (await confirmDialog('Delete this item?')) (e.currentTarget as HTMLButtonElement).form?.requestSubmit(); }}
											class="text-xs text-red-500 hover:text-red-700 transition-colors"
										>Delete</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		{#if data.pagination.totalPages > 1}
			<div class="mt-4 flex items-center justify-between text-sm text-gray-500">
				<span>Page {data.pagination.page} of {data.pagination.totalPages}</span>
				<div class="flex gap-2">
					{#if data.pagination.page > 1}
						<a
							href={resolve(`/dashboard/menu/items?page=${data.pagination.page - 1}`)}
							class="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 transition-colors"
						><Icon icon="mdi:chevron-left" class="h-4 w-4" /> Prev</a>
					{/if}
					{#if data.pagination.page < data.pagination.totalPages}
						<a
							href={resolve(`/dashboard/menu/items?page=${data.pagination.page + 1}`)}
							class="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 transition-colors"
						>Next <Icon icon="mdi:chevron-right" class="h-4 w-4" /></a>
					{/if}
				</div>
			</div>
		{/if}
	{/if}
</div>

<!-- ── Import modal ───────────────────────────────────────────── -->
{#if showImport}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-40 bg-black/40"
		role="presentation"
		onclick={closeImport}
	></div>

	<!-- Panel -->
	<div class="fixed inset-0 z-50 flex items-center justify-center p-4">
		<div class="w-full max-w-lg rounded-2xl bg-white shadow-xl">
			<div class="flex items-center justify-between border-b border-gray-100 px-6 py-4">
				<h2 class="text-base font-semibold text-gray-900">Import menu items from CSV</h2>
				<button
					onclick={closeImport}
					class="text-gray-400 hover:text-gray-600 transition-colors"
				><Icon icon="mdi:close" class="h-5 w-5" /></button>
			</div>

			<div class="px-6 py-5 space-y-4">
				{#if !importResult}
					<!-- Instructions -->
					<div class="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600 space-y-1.5">
						<p class="font-medium text-gray-800">CSV format</p>
						<p>Required columns: <code class="rounded bg-gray-200 px-1 text-xs">name</code>, <code class="rounded bg-gray-200 px-1 text-xs">price</code></p>
						<p>Optional: <code class="rounded bg-gray-200 px-1 text-xs">description</code> <code class="rounded bg-gray-200 px-1 text-xs">category</code> <code class="rounded bg-gray-200 px-1 text-xs">discounted_price</code> <code class="rounded bg-gray-200 px-1 text-xs">tags</code> <code class="rounded bg-gray-200 px-1 text-xs">available</code></p>
						<p class="text-xs text-gray-400">Separate multiple tags with <code class="rounded bg-gray-200 px-1">|</code>. Existing items are updated by name. New categories are created automatically. Max 500 rows.</p>
					</div>

					<button
						onclick={downloadTemplate}
						class="text-sm text-blue-600 hover:underline"
					>
						<Icon icon="mdi:download" class="inline h-4 w-4 mr-0.5" /> Download template CSV
					</button>

					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1.5" for="csv-file">
							Select CSV file
						</label>
						<input
							id="csv-file"
							type="file"
							accept=".csv"
							onchange={onFileChange}
							class="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-50 file:transition-colors"
						/>
						{#if importFile}
							<p class="mt-1.5 text-xs text-gray-400">{importFile.name} · {(importFile.size / 1024).toFixed(1)} KB</p>
						{/if}
					</div>

					{#if importError}
						<div class="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{importError}</div>
					{/if}

					<div class="flex justify-end gap-2 pt-1">
						<button
							onclick={closeImport}
							class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
						>
							Cancel
						</button>
						<button
							onclick={runImport}
							disabled={!importFile || importing}
							class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
						>
							{importing ? 'Importing…' : 'Import'}
						</button>
					</div>
				{:else}
					<!-- Results -->
					<div class="flex items-center gap-4 rounded-lg border border-gray-200 px-4 py-3">
						<div class="text-center">
							<p class="text-2xl font-bold text-green-700">{importResult.created}</p>
							<p class="text-xs text-gray-500 mt-0.5">Created</p>
						</div>
						<div class="h-8 w-px bg-gray-200"></div>
						<div class="text-center">
							<p class="text-2xl font-bold text-blue-700">{importResult.updated}</p>
							<p class="text-xs text-gray-500 mt-0.5">Updated</p>
						</div>
						<div class="h-8 w-px bg-gray-200"></div>
						<div class="text-center">
							<p class="text-2xl font-bold {importResult.skipped > 0 ? 'text-red-600' : 'text-gray-400'}">{importResult.skipped}</p>
							<p class="text-xs text-gray-500 mt-0.5">Skipped</p>
						</div>
					</div>

					{#if hasErrors}
						<div class="max-h-52 overflow-y-auto rounded-lg border border-red-100 bg-red-50">
							<table class="w-full text-xs">
								<thead class="bg-red-100 sticky top-0">
									<tr>
										<th class="px-3 py-2 text-left font-medium text-red-700">Row</th>
										<th class="px-3 py-2 text-left font-medium text-red-700">Name</th>
										<th class="px-3 py-2 text-left font-medium text-red-700">Reason</th>
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

					<div class="flex justify-end">
						<button
							onclick={closeImport}
							class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
						>
							Done
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<!-- ── Stripe discover modal ─── -->
{#if showDiscover}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
		<div class="flex w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl" style="max-height: 90vh;">
			<!-- Header -->
			<div class="flex items-center justify-between border-b border-gray-200 px-5 py-4">
				<div>
					<h2 class="text-lg font-semibold text-gray-900">Discover Stripe Products</h2>
					<p class="text-xs text-gray-500 mt-0.5">Select products from your Stripe account to import as menu items.</p>
				</div>
				<button onclick={closeDiscover} class="text-gray-400 hover:text-gray-600 transition-colors"><Icon icon="mdi:close" class="h-5 w-5" /></button>
			</div>

			<!-- Body -->
			<div class="flex-1 overflow-y-auto px-5 py-4">
				{#if discovering}
					<div class="flex flex-col items-center justify-center py-12 text-gray-400">
						<svg class="mb-3 h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
						</svg>
						<p class="text-sm">Loading products from Stripe…</p>
					</div>
				{:else if discoverError}
					<div class="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{discoverError}</div>
				{:else if discoverResult}
					<div class="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
						<p class="font-medium">Import complete</p>
						<p class="mt-0.5">{discoverResult.imported} item{discoverResult.imported !== 1 ? 's' : ''} imported{discoverResult.skipped > 0 ? `, ${discoverResult.skipped} skipped (already exist)` : ''}.</p>
					</div>
				{:else if discoveredItems.length === 0}
					<div class="py-10 text-center text-sm text-gray-500">No active one-time products found in your Stripe account.</div>
				{:else}
					<!-- Select-all toggle -->
					<div class="mb-3 flex items-center justify-between">
						<p class="text-sm text-gray-600">{discoveredItems.length} product{discoveredItems.length !== 1 ? 's' : ''} found</p>
						<button
							onclick={() => {
								const unimported = discoveredItems.filter((i) => !i.alreadyImported).map((i) => i.stripeProductId);
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
							class="text-xs text-gray-500 hover:text-gray-800 underline transition-colors"
						>
							{discoveredItems.filter((i) => !i.alreadyImported).every((i) => selected.has(i.stripeProductId)) ? 'Deselect all' : 'Select all'}
						</button>
					</div>

					<!-- Product list -->
					<ul class="divide-y divide-gray-100 rounded-lg border border-gray-200">
						{#each discoveredItems as item (item.stripeProductId)}
							<li class="flex items-center gap-3 px-4 py-3 {item.alreadyImported ? 'opacity-60' : ''}">
								<input
									type="checkbox"
									id="discover-{item.stripeProductId}"
									checked={selected.has(item.stripeProductId)}
									disabled={item.alreadyImported}
									onchange={() => toggleSelected(item.stripeProductId)}
									class="h-4 w-4 rounded border-gray-300 accent-gray-900"
								/>
								{#if item.imageUrl}
									<img src={item.imageUrl} alt={item.name} class="h-10 w-10 rounded object-cover shrink-0" />
								{:else}
									<div class="h-10 w-10 rounded bg-gray-100 flex items-center justify-center shrink-0">
										<Icon icon="mdi:silverware-fork-knife" class="h-5 w-5 text-gray-400" />
									</div>
								{/if}
								<label for="discover-{item.stripeProductId}" class="flex-1 min-w-0 cursor-pointer">
									<p class="text-sm font-medium text-gray-900 truncate">{item.name}</p>
									{#if item.description}
										<p class="text-xs text-gray-500 truncate">{item.description}</p>
									{/if}
								</label>
								<div class="flex flex-col items-end gap-1 shrink-0">
									<span class="text-sm font-semibold text-gray-800">${(item.price / 100).toFixed(2)}</span>
									{#if item.alreadyImported}
										<span class="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Already imported</span>
									{/if}
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</div>

			<!-- Footer -->
			{#if !discovering && !discoverResult}
				<div class="flex items-center justify-between border-t border-gray-200 px-5 py-4">
					<p class="text-xs text-gray-500">{selected.size} item{selected.size !== 1 ? 's' : ''} selected</p>
					<div class="flex gap-2">
						<button
							onclick={closeDiscover}
							class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
						>
							Cancel
						</button>
						<button
							onclick={importSelected}
							disabled={selected.size === 0 || importing2}
							class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{importing2 ? 'Importing…' : `Import ${selected.size > 0 ? selected.size : ''} item${selected.size !== 1 ? 's' : ''}`}
						</button>
					</div>
				</div>
			{:else if discoverResult}
				<div class="flex justify-end border-t border-gray-200 px-5 py-4">
					<button
						onclick={closeDiscover}
						class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
					>
						Done
					</button>
				</div>
			{/if}
		</div>
	</div>
{/if}
