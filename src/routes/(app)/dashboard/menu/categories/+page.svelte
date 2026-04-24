<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import type { PageData, ActionData } from './$types';
	import Icon from '@iconify/svelte';
	import { resolve } from '$app/paths';
	import Sortable from 'sortablejs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '$lib/components/ui/table';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showForm = $state(false);
	let newIsActive = $state(true);
	let sortMode = $state(false);
	let saving = $state(false);
	let saveError = $state<string | null>(null);
	let sortListEl = $state<HTMLElement | null>(null);
	let sortable: Sortable | null = null;

	// ── Table sorting ─────────────────────────────────────────────
	type SortCol = 'name' | 'description' | 'items' | 'status';
	let sortCol = $state<SortCol>('name');
	let sortDir = $state<'asc' | 'desc'>('asc');

	function sortBy(col: SortCol) {
		if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else {
			sortCol = col;
			sortDir = 'asc';
		}
	}

	const sortedCategories = $derived(
		[...data.categories].sort((a, b) => {
			let cmp = 0;
			if (sortCol === 'name') cmp = a.name.localeCompare(b.name);
			else if (sortCol === 'description')
				cmp = (a.description ?? '').localeCompare(b.description ?? '');
			else if (sortCol === 'items') cmp = (a.itemCount as number) - (b.itemCount as number);
			else if (sortCol === 'status') cmp = Number(b.isActive) - Number(a.isActive);
			return sortDir === 'asc' ? cmp : -cmp;
		})
	);

	// ── Drag-and-drop sort mode ───────────────────────────────────
	$effect(() => {
		if (sortMode && sortListEl) {
			sortable = Sortable.create(sortListEl, {
				animation: 150,
				handle: '.drag-handle',
				ghostClass: 'opacity-40'
			});
		} else {
			sortable?.destroy();
			sortable = null;
		}
	});

	async function saveSortOrder() {
		if (!sortListEl) return;
		saving = true;
		saveError = null;
		const ids = [...sortListEl.querySelectorAll('[data-id]')].map((el, i) => ({
			id: parseInt((el as HTMLElement).dataset.id!),
			sortOrder: i
		}));
		try {
			const res = await fetch('/api/reorder-categories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ order: ids })
			});
			if (!res.ok) throw new Error('Failed to save order');
			sortMode = false;
			window.location.reload();
		} catch {
			saveError = 'Failed to save. Please try again.';
		} finally {
			saving = false;
		}
	}
</script>

<div>
	<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<a
				href={resolve('/dashboard/menu')}
				class="mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
			>
				<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Menu
			</a>
			<h1 class="text-2xl font-bold text-gray-900">Categories</h1>
			<p class="mt-0.5 text-sm text-gray-500">Group your menu items into categories.</p>
		</div>
		<div class="flex flex-wrap gap-2 self-start sm:self-auto">
			{#if !sortMode}
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
				<Button onclick={() => (showForm = !showForm)} variant="default">
					+ New category
				</Button>
			{:else}
				<Button
					onclick={() => {
						sortMode = false;
						saveError = null;
					}}
					variant="outline"
				>
					Cancel
				</Button>
				<Button
					onclick={saveSortOrder}
					disabled={saving}
					variant="default"
					class="gap-1.5"
				>
					<Icon icon="mdi:check" class="h-4 w-4" />
					{saving ? 'Saving…' : 'Save order'}
				</Button>
			{/if}
		</div>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			{form.error}
		</div>
	{/if}
	{#if saveError}
		<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			{saveError}
		</div>
	{/if}

	{#if showForm && !sortMode}
		<form
			method="post"
			action="?/create"
			use:enhance={() => {
				return ({ update }) => {
					update();
					showForm = false;
				};
			}}
			class="mb-6 space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
		>
			<h2 class="font-medium text-gray-800">New category</h2>
			<div>
				<Label class="mb-1 block" for="name">Name</Label>
				<Input
					id="name"
					name="name"
					type="text"
					required
					placeholder="e.g. Burgers, Drinks, Desserts"
				/>
			</div>
			<div>
				<Label class="mb-1 block" for="description">Description (optional)</Label>
				<Input
					id="description"
					name="description"
					type="text"
					placeholder="Short description..."
				/>
			</div>
			<div class="flex items-center gap-2">
				<input
					type="checkbox"
					name="isActive"
					id="new-active"
					bind:checked={newIsActive}
					class="h-4 w-4 rounded border-gray-300"
				/>
				<label class="cursor-pointer text-sm text-gray-700" for="new-active">Active</label>
			</div>
			<div class="flex gap-2">
				<Button type="submit" variant="default">Create</Button>
				<Button type="button" onclick={() => (showForm = false)} variant="outline">Cancel</Button>
			</div>
		</form>
	{/if}

	{#if data.categories.length === 0}
		<div class="rounded-xl border border-dashed border-gray-300 p-12 text-center">
			<p class="text-sm text-gray-400">
				No categories yet. Create one to organize your menu items.
			</p>
		</div>
	{:else if sortMode}
		<!-- ── Drag-and-drop reorder list ──────────────────────────── -->
		<Card class="shadow-sm">
			<CardContent class="border-b border-gray-100 py-3">
				<p class="text-sm text-gray-500">
					Drag rows to reorder, then click <strong>Save order</strong>.
				</p>
			</CardContent>
			<ul bind:this={sortListEl} class="divide-y divide-gray-100">
				{#each data.categories as cat (cat.id)}
					<li
						data-id={cat.id}
						class="flex items-center gap-3 bg-white px-4 py-3 transition-colors hover:bg-gray-50"
					>
						<span
							class="drag-handle cursor-grab text-gray-300 transition-colors hover:text-gray-500 active:cursor-grabbing"
						>
							<Icon icon="mdi:drag-horizontal-variant" class="h-5 w-5" />
						</span>
						<span class="flex-1 text-sm font-medium text-gray-900">{cat.name}</span>
						<span class="text-xs text-gray-400">{cat.itemCount} items</span>
						<Badge class={cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}>
							{cat.isActive ? 'Active' : 'Hidden'}
						</Badge>
					</li>
				{/each}
			</ul>
		</Card>
	{:else}
		<!-- ── Normal table view ───────────────────────────────────── -->
		<Card class="shadow-sm">
			<Table>
				<TableHeader class="bg-gray-50">
					<TableRow class="hover:bg-transparent">
						{#each [['name', 'Name'], ['description', 'Description'], ['items', 'Items'], ['status', 'Status']] as const as [col, label] (col)}
							<TableHead class="px-4 py-2.5">
								<button
									onclick={() => sortBy(col)}
									class="inline-flex items-center gap-1 font-medium text-gray-500 transition-colors hover:text-gray-800"
								>
									{label}
									<Icon
										icon={sortCol === col
											? sortDir === 'asc'
												? 'mdi:chevron-up'
												: 'mdi:chevron-down'
											: 'mdi:unfold-more-horizontal'}
										class="h-3.5 w-3.5 {sortCol === col ? 'text-gray-800' : 'text-gray-300'}"
									/>
								</button>
							</TableHead>
						{/each}
						<TableHead class="px-4 py-2.5 text-gray-500">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each sortedCategories as cat (cat.id)}
						<TableRow>
							<TableCell class="px-4 py-3">
								<a
									href={resolve(`/dashboard/menu/categories/${cat.id}` as `/${string}`)}
									class="font-medium text-gray-900 hover:underline">{cat.name}</a
								>
							</TableCell>
							<TableCell class="px-4 py-3 text-gray-500">{cat.description ?? '—'}</TableCell>
							<TableCell class="px-4 py-3 text-gray-500">{cat.itemCount}</TableCell>
							<TableCell class="px-4 py-3">
								<form method="post" action="?/toggleActive" use:enhance>
									<input type="hidden" name="id" value={cat.id} />
									<input type="hidden" name="isActive" value={String(cat.isActive)} />
									<button
										type="submit"
										class="rounded-full px-2 py-0.5 text-xs font-medium transition-colors {cat.isActive
											? 'bg-green-100 text-green-700 hover:bg-green-200'
											: 'bg-gray-100 text-gray-500 hover:bg-gray-200'}"
									>
										{cat.isActive ? 'Active' : 'Hidden'}
									</button>
								</form>
							</TableCell>
							<TableCell class="px-4 py-3">
								<div class="flex items-center gap-3">
									<a
										href={resolve(`/dashboard/menu/categories/${cat.id}`)}
										class="text-xs font-medium text-gray-600 transition-colors hover:text-gray-900"
										>Edit</a
									>
									<form method="post" action="?/delete" use:enhance>
										<input type="hidden" name="id" value={cat.id} />
										<Button
											type="submit"
											onclick={async (e) => {
												e.preventDefault();
												if (await confirmDialog('Delete this category?'))
													(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
											}}
											variant="ghost"
											size="sm"
											class="text-red-500 hover:text-red-700"
										>Delete</Button>
									</form>
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</Card>
	{/if}
</div>
