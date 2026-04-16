<script lang="ts">
	import type { PageData } from './$types';
	import type { DiscoveredItem } from '$lib/../routes/api/discover-stripe-items/+server';
	import { SvelteSet } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { afterNavigate } from '$app/navigation';
	import { tick } from 'svelte';

	let { data }: { data: PageData } = $props();

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
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Menu Items</h1>
			<p class="text-sm text-gray-500 mt-0.5">{data.pagination.totalItems} items total</p>
		</div>
		<div class="flex gap-2">
			<button
				onclick={openDiscover}
				class="inline-flex items-center gap-1.5 rounded-md border border-purple-300 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors"
			>
				<Icon icon="mdi:lightning-bolt" class="h-4 w-4" /> Discover from Stripe
			</button>
			<button
				onclick={() => (showImport = true)}
				class="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
			>
				<Icon icon="mdi:upload" class="h-4 w-4" /> Import CSV
			</button>
			<a
				href={resolve('/dashboard/menu/items/new')}
				class="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
			>
				<Icon icon="mdi:plus" class="h-4 w-4" /> New item
			</a>
		</div>
	</div>

	<!-- Filters -->
	<form bind:this={searchForm} method="get" class="mb-5 flex gap-3">
		<input
			bind:this={searchInput}
			type="text"
			name="search"
			value={data.search ?? ''}
			placeholder="Search items..."
			oninput={onSearchInput}
			class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
		/>
		{#if data.categories.length > 0}
			<select
				name="categoryId"
				onchange={onCategoryChange}
				class="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

	{#if data.items.length === 0}
		<div class="rounded-xl border border-dashed border-gray-300 p-12 text-center">
			<p class="text-gray-400 text-sm">No items found.</p>
			<a href={resolve('/dashboard/menu/items/new')} class="mt-3 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"><Icon icon="mdi:plus" class="h-3.5 w-3.5" /> Add your first item</a>
		</div>
	{:else}
		<div class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
			<table class="w-full text-sm">
				<thead class="bg-gray-50 border-b border-gray-200">
					<tr>
						<th class="px-4 py-2.5 w-12"></th>
						<th class="px-4 py-2.5 text-left font-medium text-gray-500">Name</th>
						<th class="px-4 py-2.5 text-left font-medium text-gray-500">Category</th>
						<th class="px-4 py-2.5 text-left font-medium text-gray-500">Price</th>
						<th class="px-4 py-2.5 text-left font-medium text-gray-500">Status</th>
						<th class="px-4 py-2.5"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each data.items as item (item.id)}
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
								<span class="rounded-full px-2 py-0.5 text-xs font-medium {item.available ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
									{item.available ? 'Available' : 'Hidden'}
								</span>
							</td>
							<td class="px-4 py-3 text-right">
								<a href={resolve(`/dashboard/menu/items/${item.id}`)} class="text-xs text-blue-600 hover:underline">Edit</a>
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
