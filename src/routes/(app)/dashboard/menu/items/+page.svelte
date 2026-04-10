<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

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
</script>

<div>
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Menu Items</h1>
			<p class="text-sm text-gray-500 mt-0.5">{data.pagination.totalItems} items total</p>
		</div>
		<div class="flex gap-2">
			<button
				onclick={() => (showImport = true)}
				class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
			>
				↑ Import CSV
			</button>
			<a
				href="/dashboard/menu/items/new"
				class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
			>
				+ New item
			</a>
		</div>
	</div>

	<!-- Filters -->
	<form method="get" class="mb-5 flex gap-3">
		<input
			type="text"
			name="search"
			value={data.search ?? ''}
			placeholder="Search items..."
			class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
		/>
		{#if data.categories.length > 0}
			<select
				name="categoryId"
				class="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			>
				<option value="">All categories</option>
				{#each data.categories as cat}
					<option value={String(cat.id)} selected={data.selectedCategoryId === cat.id}>
						{cat.name}
					</option>
				{/each}
			</select>
		{/if}
		<button
			type="submit"
			class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
		>
			Search
		</button>
	</form>

	{#if data.items.length === 0}
		<div class="rounded-xl border border-dashed border-gray-300 p-12 text-center">
			<p class="text-gray-400 text-sm">No items found.</p>
			<a href="/dashboard/menu/items/new" class="mt-3 inline-block text-sm text-blue-600 hover:underline">+ Add your first item</a>
		</div>
	{:else}
		<div class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
			<table class="w-full text-sm">
				<thead class="bg-gray-50 border-b border-gray-200">
					<tr>
						<th class="px-4 py-2.5 text-left font-medium text-gray-500">Name</th>
						<th class="px-4 py-2.5 text-left font-medium text-gray-500">Category</th>
						<th class="px-4 py-2.5 text-left font-medium text-gray-500">Price</th>
						<th class="px-4 py-2.5 text-left font-medium text-gray-500">Status</th>
						<th class="px-4 py-2.5"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each data.items as item (item.id)}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-4 py-3">
								<a href="/dashboard/menu/items/{item.id}" class="font-medium text-gray-900 hover:underline">
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
								<a href="/dashboard/menu/items/{item.id}" class="text-xs text-blue-600 hover:underline">Edit</a>
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
							href="/dashboard/menu/items?page={data.pagination.page - 1}"
							class="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 transition-colors"
						>← Prev</a>
					{/if}
					{#if data.pagination.page < data.pagination.totalPages}
						<a
							href="/dashboard/menu/items?page={data.pagination.page + 1}"
							class="rounded-md border border-gray-300 px-3 py-1.5 hover:bg-gray-50 transition-colors"
						>Next →</a>
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
					class="text-gray-400 hover:text-gray-600 transition-colors text-lg leading-none"
				>✕</button>
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
						↓ Download template CSV
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
									{#each importResult.results.filter((r) => r.status === 'skipped') as r}
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
