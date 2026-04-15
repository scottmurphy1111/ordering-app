<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="max-w-xl">
	<div class="flex items-center gap-3 mb-6">
		<a href={resolve('/dashboard/menu/items')} class="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"><Icon icon="mdi:arrow-left" class="h-4 w-4" /> Items</a>
		<h1 class="text-2xl font-bold text-gray-900">New item</h1>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{form.error}</div>
	{/if}

	<form
		method="post"
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
				placeholder="e.g. Classic Cheeseburger"
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			/>
		</div>

		<div>
			<label class="block text-sm font-medium text-gray-700 mb-1" for="description">Description</label>
			<textarea
				id="description"
				name="description"
				rows="2"
				placeholder="Short description of the item..."
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			></textarea>
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
					placeholder="9.99"
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
					placeholder="Optional"
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
					{#each data.categories as cat (cat.id)}
						<option value={String(cat.id)}>{cat.name}</option>
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
				placeholder="spicy, popular, vegetarian (comma-separated)"
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
			/>
		</div>

		<div class="flex items-center gap-2">
			<input id="available" name="available" type="checkbox" checked class="h-4 w-4 rounded border-gray-300" />
			<label class="text-sm text-gray-700" for="available">Available for ordering</label>
		</div>

		<div class="flex gap-2 pt-1">
			<button
				type="submit"
				class="flex-1 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
			>
				Create item
			</button>
			<a
				href={resolve('/dashboard/menu/items')}
				class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
			>
				Cancel
			</a>
		</div>
	</form>
</div>
