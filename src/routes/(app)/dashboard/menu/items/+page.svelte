<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import type { DiscoveredItem } from '$lib/../routes/api/discover-stripe-items/+server';
	import { SvelteMap, SvelteSet } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { afterNavigate } from '$app/navigation';
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import Sortable from 'sortablejs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import {
		Table,
		TableHeader,
		TableHead,
		TableBody,
		TableRow,
		TableCell
	} from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
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

	let { data, form }: { data: PageData; form: ActionData } = $props();

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
			else if (sortCol === 'status') cmp = Number(b.available) - Number(a.available);
			return sortDir === 'asc' ? cmp : -cmp;
		})
	);

	// ── Drag-and-drop sort mode ───────────────────────────────────
	let sortMode = $state(false);
	let sortSaving = $state(false);
	let sortSaveError = $state<string | null>(null);
	let sortContainerEl = $state<HTMLElement | null>(null);

	// Group items by category for the sort view
	const groupedForSort = $derived(() => {
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
			if (!res.ok) {
				newUploadError = json.message ?? 'Upload failed';
			} else {
				newImageUrl = json.url;
				newImagePreview = json.url;
			}
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
			const res = await fetch('/api/import-menu-items', { method: 'POST', body: form });
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
	<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<a
				href={resolve('/dashboard/menu')}
				class="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-muted-foreground"
			>
				<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Menu
			</a>
			<h1 class="text-2xl font-bold text-foreground">Menu Items</h1>
			<p class="mt-0.5 text-sm text-muted-foreground">{data.pagination.totalItems} items total</p>
		</div>
		<div class="flex flex-wrap gap-2">
			{#if !sortMode}
				<Button
					onclick={openDiscover}
					variant="outline"
					class="gap-1.5 border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100"
				>
					<Icon icon="mdi:lightning-bolt" class="h-4 w-4" /><span class="hidden sm:inline"
						>Discover from Stripe</span
					><span class="sm:hidden">Discover</span>
				</Button>
				<Button
					onclick={() => (data.canImportCsv ? (showImport = true) : (showImportUpsell = true))}
					variant="outline"
					class="gap-1.5"
				>
					<Icon icon="mdi:upload" class="h-4 w-4" /><span class="hidden sm:inline">Import CSV</span
					><span class="sm:hidden">Import</span>
				</Button>
				<Button
					onclick={() => {
						sortMode = true;
						showForm = false;
					}}
					variant="outline"
					class="gap-1.5"
				>
					<Icon icon="mdi:drag-vertical" class="h-4 w-4" /> Reorder
				</Button>
				<Button
					onclick={() => {
						showForm = !showForm;
						lastCreated = null;
					}}
					variant="default"
					class="gap-1.5"
				>
					<Icon icon={showForm ? 'mdi:close' : 'mdi:plus'} class="h-4 w-4" />
					{showForm ? 'Cancel' : 'New item'}
				</Button>
			{:else}
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
			{/if}
		</div>
	</div>

	<!-- ── Inline create form ────────────────────────────────────── -->
	{#if showForm}
		{#if lastCreated}
			<div
				class="mb-3 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm text-primary/90"
			>
				<span
					>✓ <strong>{lastCreated.name}</strong> created —
					<a
						href={resolve(`/dashboard/menu/items/${lastCreated.id}`)}
						class="underline hover:text-primary/80">edit item</a
					></span
				>
				<Button
					onclick={() => (lastCreated = null)}
					variant="ghost"
					size="icon-sm"
					class="ml-4 text-primary/80 hover:text-primary"
					><Icon icon="mdi:close" class="h-4 w-4" /></Button
				>
			</div>
		{/if}
		{#if form?.error}
			<div
				class="mb-3 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
			>
				{form.error}
			</div>
		{/if}
		<Card class="mb-6 shadow-sm">
		<form
			method="post"
			action="?/create"
			bind:this={createFormEl}
			use:enhance={() =>
				({ update }) =>
					update({ reset: false })}
		>
		<CardContent class="space-y-4 pt-6 pb-2">
			<h2 class="font-semibold text-foreground">New item</h2>

			<!-- Image -->
			<div class="flex items-start gap-4">
				<div
					role="button"
					tabindex="0"
					aria-label="Upload item image"
					onclick={() => (document.getElementById('new-image-upload') as HTMLInputElement)?.click()}
					onkeydown={(e) =>
						e.key === 'Enter' &&
						(document.getElementById('new-image-upload') as HTMLInputElement)?.click()}
					class="relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted/50 transition-colors hover:border-gray-400 hover:bg-muted {newUploading
						? 'pointer-events-none opacity-60'
						: ''}"
				>
					{#if newImagePreview}
						<img src={newImagePreview} alt="Preview" class="h-full w-full object-cover" />
						<div
							class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100"
						>
							<Icon icon="mdi:pencil" class="h-4 w-4 text-white" />
						</div>
					{:else if newUploading}
						<svg class="h-4 w-4 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24"
							><circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"
							></path></svg
						>
					{:else}
						<Icon icon="mdi:image-plus" class="h-5 w-5 text-muted-foreground" />
					{/if}
				</div>
				<input
					id="new-image-upload"
					type="file"
					accept="image/jpeg,image/png,image/webp"
					class="sr-only"
					onchange={onNewImageChange}
				/>
				<input type="hidden" name="imageUrl" value={newImageUrl} />
				<div class="flex-1 space-y-1 pt-1">
					<p class="text-xs text-muted-foreground">JPG, PNG, WebP · max 5MB</p>
					{#if newUploadError}<p class="text-xs text-red-600">{newUploadError}</p>{/if}
					{#if newImagePreview}<Button
							type="button"
							onclick={() => {
								newImageUrl = '';
								newImagePreview = '';
							}}
							variant="ghost"
							size="sm"
							class="text-destructive hover:text-destructive/80">Remove</Button
						>{/if}
				</div>
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div class="sm:col-span-2">
					<Label class="mb-1 block" for="new-name">Name *</Label>
					<Input
						id="new-name"
						name="name"
						type="text"
						required
						placeholder="e.g. Classic Cheeseburger"
					/>
				</div>
				<div class="sm:col-span-2">
					<Label class="mb-1 block" for="new-description">Description</Label>
					<Textarea
						id="new-description"
						name="description"
						rows={2}
						placeholder="Short description..."
					/>
				</div>
				<div>
					<Label class="mb-1 block" for="new-price">Price ($) *</Label>
					<Input
						id="new-price"
						name="price"
						type="number"
						min={0}
						step="0.01"
						required
						placeholder="9.99"
					/>
				</div>
				<div>
					<Label class="mb-1 block" for="new-sale">Sale price ($)</Label>
					<Input
						id="new-sale"
						name="discountedPrice"
						type="number"
						min={0}
						step="0.01"
						placeholder="Optional"
					/>
				</div>
				{#if data.categories.length > 0}
					<div>
						<Label class="mb-1 block" for="new-category">Category</Label>
						<Select type="single" name="categoryId">
							<SelectTrigger id="new-category" class="w-full">
								<SelectValue placeholder="No category" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="">No category</SelectItem>
								{#each data.categories as cat (cat.id)}
									<SelectItem value={String(cat.id)}>{cat.name}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
				{/if}
				<div>
					<Label class="mb-1 block" for="new-tags">Tags</Label>
					<Input
						id="new-tags"
						name="tags"
						type="text"
						placeholder="spicy, popular (comma-separated)"
					/>
				</div>
			</div>

			<div class="flex items-center gap-2">
				<input
					id="new-available"
					name="available"
					type="checkbox"
					checked
					class="h-4 w-4 rounded"
				/>
				<label class="text-sm text-muted-foreground" for="new-available"
					>Available for ordering</label
				>
			</div>

		</CardContent>
		<CardFooter class="gap-2">
			<Button type="submit" disabled={newUploading} variant="default">
				Save &amp; add another
			</Button>
			<Button
				type="submit"
				name="closeAfter"
				value="1"
				disabled={newUploading}
				variant="outline"
				onclick={() =>
					setTimeout(() => {
						showForm = false;
					}, 100)}
			>
				Save &amp; close
			</Button>
		</CardFooter>
		</form>
		</Card>
	{/if}

	<!-- Filters -->
	<form bind:this={searchForm} method="get" class="mb-5 flex min-w-0 gap-2">
		<Input
			bind:ref={searchInput}
			type="text"
			name="search"
			value={data.search ?? ''}
			placeholder="Search items..."
			oninput={onSearchInput}
			class="min-w-0 flex-1"
		/>
		{#if data.categories.length > 0}
			<Select
				type="single"
				name="categoryId"
				value={data.selectedCategoryId ? String(data.selectedCategoryId) : ''}
				onValueChange={onCategoryChange}
			>
				<SelectTrigger class="w-36 shrink-0">
					<SelectValue placeholder="All categories" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="">All categories</SelectItem>
					{#each data.categories as cat (cat.id)}
						<SelectItem value={String(cat.id)}>{cat.name}</SelectItem>
					{/each}
				</SelectContent>
			</Select>
		{/if}
	</form>

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
			{#each groupedForSort() as group (group.id)}
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
		<div class="rounded-xl border border-dashed p-12 text-center">
			<p class="text-sm text-muted-foreground">No items found.</p>
			<Button
				onclick={() => {
					showForm = true;
				}}
				variant="link"
				class="mt-3 gap-1"><Icon icon="mdi:plus" class="h-3.5 w-3.5" /> Add your first item</Button
			>
		</div>
	{:else}
		<Card class="p-0 shadow-sm">
			<CardContent>
				<Table>
					<TableHeader class="">
						<TableRow class="hover:bg-transparent">
							<TableHead class="w-12 px-4 py-2.5"></TableHead>
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
							<TableHead class="px-4 py-2.5"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each sortedItems as item (item.id)}
							{@const primaryImage =
								(item.images as { url: string; isPrimary?: boolean }[] | null)?.find(
									(img) => img.isPrimary
								) ?? (item.images as { url: string }[] | null)?.[0]}
							<TableRow>
								<TableCell class="px-4 py-3">
									{#if primaryImage}
										<img
											src={primaryImage.url}
											alt={item.name}
											class="h-10 w-10 rounded-md object-cover"
										/>
									{:else}
										<div class="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
											<Icon
												icon="mdi:silverware-fork-knife"
												class="h-5 w-5 text-muted-foreground/40"
											/>
										</div>
									{/if}
								</TableCell>
								<TableCell class="px-4 py-3">
									<a
										href={resolve(`/dashboard/menu/items/${item.id}`)}
										class="font-medium text-foreground hover:underline"
									>
										{item.name}
									</a>
									{#if item.description}
										<p class="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
											{item.description}
										</p>
									{/if}
								</TableCell>
								<TableCell class="px-4 py-3 text-muted-foreground"
									>{item.category?.name ?? '—'}</TableCell
								>
								<TableCell class="px-4 py-3 text-foreground">
									${(item.price / 100).toFixed(2)}
									{#if item.discountedPrice}
										<span class="ml-1 text-xs text-primary"
											>(sale ${(item.discountedPrice / 100).toFixed(2)})</span
										>
									{/if}
								</TableCell>
								<TableCell class="px-4 py-3">
									<form
										method="post"
										action="?/toggleAvailable"
										use:enhance={() =>
											({ update }) =>
												update({ reset: false })}
									>
										<input type="hidden" name="id" value={item.id} />
										<input type="hidden" name="available" value={String(!item.available)} />
										<button
											type="submit"
											class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors
										{item.available
												? 'bg-primary/10 text-primary hover:bg-destructive/10 hover:text-red-600'
												: 'bg-red-100 text-red-600 hover:bg-primary/5 hover:text-primary'}"
										>
											<Icon
												icon={item.available
													? 'mdi:check-circle-outline'
													: 'mdi:close-circle-outline'}
												class="h-3.5 w-3.5"
											/>
											{item.available ? 'Available' : "86'd"}
										</button>
									</form>
								</TableCell>
								<TableCell class="px-4 py-3">
									<div class="flex items-center gap-3">
										<a
											href={resolve(`/dashboard/menu/items/${item.id}`)}
											class="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
											>Edit</a
										>
										<form method="post" action="?/delete" use:enhance>
											<input type="hidden" name="id" value={item.id} />
											<Button
												type="submit"
												onclick={async (e) => {
													e.preventDefault();
													if (await confirmDialog('Delete this item?'))
														(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
												}}
												variant="ghost"
												size="sm"
												class="text-destructive hover:text-destructive/80">Delete</Button
											>
										</form>
									</div>
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			</CardContent>
		</Card>

		<!-- Pagination -->
		{#if data.pagination.totalPages > 1}
			<div class="mt-4 flex items-center justify-between text-sm text-muted-foreground">
				<span>Page {data.pagination.page} of {data.pagination.totalPages}</span>
				<div class="flex gap-2">
					{#if data.pagination.page > 1}
						<a
							href={resolve(`/dashboard/menu/items?page=${data.pagination.page - 1}`)}
							class="rounded-md border px-3 py-1.5 transition-colors hover:border-gray-400 hover:bg-muted"
							><Icon icon="mdi:chevron-left" class="h-4 w-4" /> Prev</a
						>
					{/if}
					{#if data.pagination.page < data.pagination.totalPages}
						<a
							href={resolve(`/dashboard/menu/items?page=${data.pagination.page + 1}`)}
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
			<DialogDescription class="sr-only">Upgrade to import menu items via CSV</DialogDescription>
		</DialogHeader>
		<div class="space-y-3">
			<div class="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
				<Icon icon="mdi:upload" class="h-6 w-6 text-primary" />
			</div>
			<p class="text-sm text-muted-foreground">
				CSV import is available on the <span class="font-semibold text-foreground">Pro plan</span>.
				Upgrade to bulk-import unlimited menu items from a spreadsheet.
			</p>
		</div>
		<DialogFooter class="flex gap-2 sm:flex-row">
			<Button onclick={() => (showImportUpsell = false)} variant="outline">Cancel</Button>
			<a
				href={resolve('/dashboard/settings/billing')}
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
			<DialogTitle>Import menu items from CSV</DialogTitle>
			<DialogDescription class="sr-only">Upload a CSV file to import menu items</DialogDescription>
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
	<DialogContent class="flex max-w-2xl flex-col" style="max-height: 90vh;">
		<DialogHeader>
			<DialogTitle>Discover Stripe Products</DialogTitle>
			<DialogDescription>
				Select products from your Stripe account to import as menu items.
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
