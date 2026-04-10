<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const item = $derived(data.item);
</script>

<div class="max-w-xl">
	<div class="flex items-center gap-3 mb-6">
		<a href="/dashboard/menu/items" class="text-sm text-gray-400 hover:text-gray-600 transition-colors">← Items</a>
		<h1 class="text-2xl font-bold text-gray-900">Edit item</h1>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{form.error}</div>
	{/if}
	{#if form?.success}
		<div class="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">Saved.</div>
	{/if}

	<form
		method="post"
		action="?/update"
		use:enhance
		class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-5"
	>
		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1" for="name">Name *</label>
			<input
				id="name"
				name="name"
				type="text"
				required
				value={item.name}
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			/>
		</div>

		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1" for="description">Description</label>
			<textarea
				id="description"
				name="description"
				rows="2"
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			>{item.description ?? ''}</textarea>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1" for="price">Price ($) *</label>
				<input
					id="price"
					name="price"
					type="number"
					min="0"
					step="0.01"
					required
					value={(item.price / 100).toFixed(2)}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				/>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1" for="discountedPrice">Sale price ($)</label>
				<input
					id="discountedPrice"
					name="discountedPrice"
					type="number"
					min="0"
					step="0.01"
					value={item.discountedPrice ? (item.discountedPrice / 100).toFixed(2) : ''}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				/>
			</div>
		</div>

		{#if data.categories.length > 0}
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1" for="categoryId">Category</label>
				<select
					id="categoryId"
					name="categoryId"
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				>
					<option value="">No category</option>
					{#each data.categories as cat}
						<option value={String(cat.id)} selected={item.category?.id === cat.id}>{cat.name}</option>
					{/each}
				</select>
			</div>
		{/if}

		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1" for="tags">Tags</label>
			<input
				id="tags"
				name="tags"
				type="text"
				value={Array.isArray(item.tags) ? item.tags.join(', ') : ''}
				placeholder="spicy, popular, vegetarian"
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			/>
		</div>

		<div class="flex items-center gap-2">
			<input
				id="available"
				name="available"
				type="checkbox"
				checked={item.available ?? true}
				class="h-4 w-4 rounded border-gray-300"
			/>
			<label class="text-sm text-gray-700" for="available">Available for ordering</label>
		</div>

		<div class="flex gap-2 pt-1">
			<button
				type="submit"
				class="flex-1 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
			>
				Save changes
			</button>
		</div>
	</form>

	<!-- Danger zone -->
	<div class="mt-6 rounded-xl border border-red-200 bg-white p-4">
		<h2 class="text-sm font-semibold text-red-700 mb-2">Danger zone</h2>
		<form method="post" action="?/delete" use:enhance>
			<button
				type="submit"
				onclick={(e) => { if (!confirm('Delete this item? This cannot be undone.')) e.preventDefault(); }}
				class="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
			>
				Delete item
			</button>
		</form>
	</div>
</div>
