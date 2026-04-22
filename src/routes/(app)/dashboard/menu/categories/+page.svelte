<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import type { PageData, ActionData } from './$types';
	import Icon from '@iconify/svelte';
	import { onMount } from 'svelte';
	import Sortable from 'sortablejs';

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
		else { sortCol = col; sortDir = 'asc'; }
	}

	const sortedCategories = $derived([...data.categories].sort((a, b) => {
		let cmp = 0;
		if (sortCol === 'name') cmp = a.name.localeCompare(b.name);
		else if (sortCol === 'description') cmp = (a.description ?? '').localeCompare(b.description ?? '');
		else if (sortCol === 'items') cmp = (a.itemCount as number) - (b.itemCount as number);
		else if (sortCol === 'status') cmp = Number(b.isActive) - Number(a.isActive);
		return sortDir === 'asc' ? cmp : -cmp;
	}));

	// ── Drag-and-drop sort mode ───────────────────────────────────
	$effect(() => {
		if (sortMode && sortListEl) {
			sortable = Sortable.create(sortListEl, {
				animation: 150,
				handle: '.drag-handle',
				ghostClass: 'opacity-40',
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
			<a href="/dashboard/menu" class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-1">
				<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Menu
			</a>
			<h1 class="text-2xl font-bold text-gray-900">Categories</h1>
			<p class="text-sm text-gray-500 mt-0.5">Group your menu items into categories.</p>
		</div>
		<div class="flex flex-wrap gap-2 self-start sm:self-auto">
			{#if !sortMode}
				<button
					onclick={() => { sortMode = true; showForm = false; }}
					class="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
				>
					<Icon icon="mdi:drag-vertical" class="h-4 w-4" /> Reorder
				</button>
				<button
					onclick={() => (showForm = !showForm)}
					class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
				>
					+ New category
				</button>
			{:else}
				<button onclick={() => { sortMode = false; saveError = null; }}
					class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
					Cancel
				</button>
				<button onclick={saveSortOrder} disabled={saving}
					class="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50">
					<Icon icon="mdi:check" class="h-4 w-4" /> {saving ? 'Saving…' : 'Save order'}
				</button>
			{/if}
		</div>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{form.error}</div>
	{/if}
	{#if saveError}
		<div class="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{saveError}</div>
	{/if}

	{#if showForm && !sortMode}
		<form
			method="post"
			action="?/create"
			use:enhance={() => { return ({ update }) => { update(); showForm = false; }; }}
			class="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3"
		>
			<h2 class="font-medium text-gray-800">New category</h2>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1" for="name">Name</label>
				<input id="name" name="name" type="text" required placeholder="e.g. Burgers, Drinks, Desserts"
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1" for="description">Description (optional)</label>
				<input id="description" name="description" type="text" placeholder="Short description..."
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
			</div>
			<div class="flex items-center gap-2">
				<input type="checkbox" name="isActive" id="new-active" bind:checked={newIsActive} class="h-4 w-4 rounded border-gray-300" />
				<label class="text-sm text-gray-700 cursor-pointer" for="new-active">Active</label>
			</div>
			<div class="flex gap-2">
				<button type="submit" class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors">Create</button>
				<button type="button" onclick={() => (showForm = false)} class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
			</div>
		</form>
	{/if}

	{#if data.categories.length === 0}
		<div class="rounded-xl border border-dashed border-gray-300 p-12 text-center">
			<p class="text-gray-400 text-sm">No categories yet. Create one to organize your menu items.</p>
		</div>
	{:else if sortMode}
		<!-- ── Drag-and-drop reorder list ──────────────────────────── -->
		<div class="rounded-xl border border-gray-200 bg-white shadow-sm">
			<div class="border-b border-gray-100 px-4 py-3">
				<p class="text-sm text-gray-500">Drag rows to reorder, then click <strong>Save order</strong>.</p>
			</div>
			<ul bind:this={sortListEl} class="divide-y divide-gray-100">
				{#each data.categories as cat (cat.id)}
					<li data-id={cat.id} class="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors">
						<span class="drag-handle cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 transition-colors">
							<Icon icon="mdi:drag-horizontal-variant" class="h-5 w-5" />
						</span>
						<span class="flex-1 text-sm font-medium text-gray-900">{cat.name}</span>
						<span class="text-xs text-gray-400">{cat.itemCount} items</span>
						<span class="rounded-full px-2 py-0.5 text-xs font-medium {cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}">
							{cat.isActive ? 'Active' : 'Hidden'}
						</span>
					</li>
				{/each}
			</ul>
		</div>
	{:else}
		<!-- ── Normal table view ───────────────────────────────────── -->
		<div class="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
			<table class="w-full text-sm">
				<thead class="bg-gray-50 border-b border-gray-200">
					<tr>
						{#each ([['name','Name'],['description','Description'],['items','Items'],['status','Status']] as const) as [col, label]}
							<th class="px-4 py-2.5 text-left">
								<button onclick={() => sortBy(col)} class="inline-flex items-center gap-1 font-medium text-gray-500 hover:text-gray-800 transition-colors">
									{label}
									<Icon icon={sortCol === col ? (sortDir === 'asc' ? 'mdi:chevron-up' : 'mdi:chevron-down') : 'mdi:unfold-more-horizontal'} class="h-3.5 w-3.5 {sortCol === col ? 'text-gray-800' : 'text-gray-300'}" />
								</button>
							</th>
						{/each}
						<th class="px-4 py-2.5 text-left font-medium text-gray-500">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each sortedCategories as cat (cat.id)}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
							<td class="px-4 py-3 text-gray-500">{cat.description ?? '—'}</td>
							<td class="px-4 py-3 text-gray-500">{cat.itemCount}</td>
							<td class="px-4 py-3">
								<form method="post" action="?/toggleActive" use:enhance>
									<input type="hidden" name="id" value={cat.id} />
									<input type="hidden" name="isActive" value={String(cat.isActive)} />
									<button type="submit" class="rounded-full px-2 py-0.5 text-xs font-medium transition-colors {cat.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}">
										{cat.isActive ? 'Active' : 'Hidden'}
									</button>
								</form>
							</td>
							<td class="px-4 py-3">
								<div class="flex items-center gap-3">
									<a href="/dashboard/menu/categories/{cat.id}" class="text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors">Edit</a>
									<form method="post" action="?/delete" use:enhance>
										<input type="hidden" name="id" value={cat.id} />
										<button type="submit" onclick={async (e) => { e.preventDefault(); if (await confirmDialog('Delete this category?')) (e.currentTarget as HTMLButtonElement).form?.requestSubmit(); }} class="text-xs text-red-500 hover:text-red-700 transition-colors">Delete</button>
									</form>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
