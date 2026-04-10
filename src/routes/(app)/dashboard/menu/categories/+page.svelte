<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showForm = $state(false);
</script>

<div>
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Categories</h1>
			<p class="text-sm text-gray-500 mt-0.5">Group your menu items into categories.</p>
		</div>
		<button
			onclick={() => (showForm = !showForm)}
			class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
		>
			+ New category
		</button>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{form.error}</div>
	{/if}

	{#if showForm}
		<form
			method="post"
			action="?/create"
			use:enhance={() => { return ({ update }) => { update(); showForm = false; }; }}
			class="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-3"
		>
			<h2 class="font-medium text-gray-800">New category</h2>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1" for="name">Name</label>
				<input
					id="name"
					name="name"
					type="text"
					required
					placeholder="e.g. Burgers, Drinks, Desserts"
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				/>
			</div>
			<div>
				<label class="block text-sm font-medium text-gray-700 mb-1" for="description">Description (optional)</label>
				<input
					id="description"
					name="description"
					type="text"
					placeholder="Short description..."
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
				/>
			</div>
			<div class="flex gap-2">
				<button
					type="submit"
					class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
				>
					Create
				</button>
				<button
					type="button"
					onclick={() => (showForm = false)}
					class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
				>
					Cancel
				</button>
			</div>
		</form>
	{/if}

	{#if data.categories.length === 0}
		<div class="rounded-xl border border-dashed border-gray-300 p-12 text-center">
			<p class="text-gray-400 text-sm">No categories yet. Create one to organize your menu items.</p>
		</div>
	{:else}
		<div class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
			<table class="w-full text-sm">
				<thead class="bg-gray-50 border-b border-gray-200">
					<tr>
						<th class="px-4 py-2.5 text-left font-medium text-gray-500">Name</th>
						<th class="px-4 py-2.5 text-left font-medium text-gray-500">Description</th>
						<th class="px-4 py-2.5 text-left font-medium text-gray-500">Items</th>
						<th class="px-4 py-2.5 text-left font-medium text-gray-500">Status</th>
						<th class="px-4 py-2.5"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each data.categories as cat}
						<tr class="hover:bg-gray-50 transition-colors">
							<td class="px-4 py-3 font-medium text-gray-900">{cat.name}</td>
							<td class="px-4 py-3 text-gray-500">{cat.description ?? '—'}</td>
							<td class="px-4 py-3 text-gray-500">{cat.itemCount}</td>
							<td class="px-4 py-3">
								<form method="post" action="?/toggleActive" use:enhance>
									<input type="hidden" name="id" value={cat.id} />
									<input type="hidden" name="isActive" value={String(cat.isActive)} />
									<button
										type="submit"
										class="rounded-full px-2 py-0.5 text-xs font-medium transition-colors
											{cat.isActive ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}"
									>
										{cat.isActive ? 'Active' : 'Hidden'}
									</button>
								</form>
							</td>
							<td class="px-4 py-3 text-right">
								<form method="post" action="?/delete" use:enhance>
									<input type="hidden" name="id" value={cat.id} />
									<button
										type="submit"
										onclick={(e) => { if (!confirm('Delete this category?')) e.preventDefault(); }}
										class="text-xs text-red-500 hover:text-red-700 transition-colors"
									>
										Delete
									</button>
								</form>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
