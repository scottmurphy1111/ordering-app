<script lang="ts">
	import { enhance } from '$app/forms';
	import { SvelteMap } from 'svelte/reactivity';
	import type { PageData, ActionData } from './$types';
	import Icon from '@iconify/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let isActiveOverride = $state<boolean | null>(null);
	const isActive = $derived(isActiveOverride ?? data.category.isActive ?? true);

	// Explicit user toggles; undefined = follow server data
	let overrides = new SvelteMap<number, boolean>();

	const selections = $derived(
		new Set(
			data.items
				.filter((i) => overrides.get(i.id) ?? i.categoryId === data.category.id)
				.map((i) => i.id)
		)
	);

	function toggleItem(id: number) {
		overrides.set(id, !selections.has(id));
	}

	function resetOverrides() {
		overrides.clear();
	}
</script>

<div class="max-w-2xl space-y-8">
	<div class="flex items-center gap-3">
		<a
			href="/dashboard/menu/categories"
			class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 transition-colors"
		>
			<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Categories
		</a>
		<span class="text-gray-300">/</span>
		<h1 class="text-2xl font-bold text-gray-900">{data.category.name}</h1>
	</div>

	{#if form?.error}
		<div class="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{form.error}</div>
	{/if}
	{#if form?.success}
		<div class="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">Saved.</div>
	{/if}

	<!-- Category details -->
	<section class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
		<h2 class="font-semibold text-gray-800">Details</h2>
		<form
			method="post"
			action="?/update"
			use:enhance={() => ({ update }) => update({ reset: false })}
			class="space-y-4"
		>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1" for="name">Name</label>
				<input
					id="name"
					name="name"
					type="text"
					required
					value={data.category.name}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
				/>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1" for="description">Description</label>
				<input
					id="description"
					name="description"
					type="text"
					value={data.category.description ?? ''}
					placeholder="Optional"
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
				/>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1" for="sortOrder">Sort order</label>
				<input
					id="sortOrder"
					name="sortOrder"
					type="number"
					min="0"
					value={data.category.sortOrder ?? 0}
					class="w-28 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
				/>
				<p class="mt-1 text-xs text-gray-400">Lower numbers appear first on the menu.</p>
			</div>

			<!-- Active / Inactive toggle -->
			<div class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
				<div>
					<p class="text-sm font-medium text-gray-700">Status</p>
					<p class="text-xs text-gray-400">Controls visibility on your public menu</p>
				</div>
				<input type="hidden" name="isActive" value={isActive ? 'on' : ''} />
				<button
					type="button"
					onclick={() => (isActiveOverride = !isActive)}
					class="flex cursor-pointer items-center gap-3"
				>
					<div
						class="relative h-6 w-11 rounded-full transition-colors duration-200 {isActive
							? 'bg-green-600'
							: 'bg-gray-300'}"
					>
						<span
							class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 {isActive
								? 'translate-x-5'
								: 'translate-x-0'}"
						></span>
					</div>
					<span class="w-14 text-sm font-medium {isActive ? 'text-green-700' : 'text-gray-500'}">
						{isActive ? 'Active' : 'Inactive'}
					</span>
				</button>
			</div>

			<button
				type="submit"
				class="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
			>
				Save changes
			</button>
		</form>
	</section>

	<!-- Item assignment -->
	<section class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
		<div>
			<h2 class="font-semibold text-gray-800">Assign items</h2>
			<p class="text-sm text-gray-500 mt-0.5">Check items that belong to this category.</p>
		</div>
		{#if data.items.length === 0}
			<p class="text-sm text-gray-400">No menu items yet.</p>
		{:else}
			<form
				method="post"
				action="?/assignItems"
				use:enhance={() => ({ result, update }) => {
					if (result.type === 'success') resetOverrides();
					return update({ reset: false });
				}}
			>
				<div class="space-y-2 mb-4">
					{#each data.items as item (item.id)}
						<label
							class="flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors
								{selections.has(item.id) ? 'border-gray-400 bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}"
						>
							<input
								type="checkbox"
								name="itemId"
								value={item.id}
								checked={selections.has(item.id)}
								onchange={() => toggleItem(item.id)}
								class="h-4 w-4 rounded"
							/>
							<span class="flex-1 text-sm text-gray-800">{item.name}</span>
							<span class="text-xs text-gray-400">${(item.price / 100).toFixed(2)}</span>
							{#if item.categoryId !== null && item.categoryId !== data.category.id}
								<span class="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">Other category</span>
							{/if}
						</label>
					{/each}
				</div>
				<button
					type="submit"
					class="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
				>
					Save assignments
				</button>
			</form>
		{/if}
	</section>
</div>
