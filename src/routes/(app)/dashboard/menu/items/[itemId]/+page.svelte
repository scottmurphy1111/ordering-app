<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const item = $derived(data.item);
	const itemModifiers = $derived(
		data.item.modifiers.map((m) => m.modifier).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
	);

	// Track which modifier group has the "add option" form open
	let addingOptionTo = $state<number | null>(null);
	// Track which modifier is in edit mode
	let editingModifier = $state<number | null>(null);
	// Controls the "add group" panel
	let showAddGroup = $state(false);
</script>

<div class="max-w-xl">
	<div class="flex items-center gap-3 mb-6">
		<a href={resolve('/dashboard/menu/items')} class="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors"><Icon icon="mdi:arrow-left" class="h-4 w-4" /> Items</a>
		<h1 class="text-2xl font-bold text-gray-900">Edit item</h1>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{form.error}</div>
	{/if}
	{#if form?.success}
		<div class="mb-4 rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">Saved.</div>
	{/if}

	<!-- ── Item details form ─────────────────────────────────── -->
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
					{#each data.categories as cat (cat.id)}
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

	<!-- ── Modifier groups ───────────────────────────────────── -->
	<div class="mt-8">
		<div class="flex items-center justify-between mb-3">
			<div>
				<h2 class="text-base font-semibold text-gray-900">Modifier groups</h2>
				<p class="text-xs text-gray-400 mt-0.5">e.g. Size, Add-ons, Doneness</p>
			</div>
			{#if !showAddGroup}
				<button
					onclick={() => (showAddGroup = true)}
					class="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
				>
					+ Add group
				</button>
			{/if}
		</div>

		<!-- Add group form -->
		{#if showAddGroup}
			<form
				method="post"
				action="?/addModifier"
				use:enhance={() => {
					return ({ result }) => {
						if (result.type === 'success') showAddGroup = false;
					};
				}}
				class="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3"
			>
				<p class="text-sm font-medium text-gray-800">New modifier group</p>
				<div>
					<label class="block text-xs font-medium text-gray-600 mb-1" for="modifierName">Group name *</label>
					<input
						id="modifierName"
						name="modifierName"
						type="text"
						required
						placeholder="e.g. Size, Add-ons"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					/>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="block text-xs font-medium text-gray-600 mb-1" for="maxSelections">Max selections</label>
						<input
							id="maxSelections"
							name="maxSelections"
							type="number"
							min="1"
							value="1"
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						/>
					</div>
					<div class="flex items-end pb-2">
						<label class="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
							<input type="checkbox" name="isRequired" class="h-4 w-4 rounded border-gray-300" />
							Required
						</label>
					</div>
				</div>
				<div class="flex gap-2">
					<button
						type="submit"
						class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
					>
						Add group
					</button>
					<button
						type="button"
						onclick={() => (showAddGroup = false)}
						class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
					>
						Cancel
					</button>
				</div>
			</form>
		{/if}

		<!-- Existing modifier groups -->
		{#if itemModifiers.length === 0 && !showAddGroup}
			<div class="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
				No modifier groups yet. Add one to let customers customise this item.
			</div>
		{/if}

		<div class="space-y-3">
			{#each itemModifiers as mod (mod.id)}
				<div class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
					<!-- Group header -->
					{#if editingModifier === mod.id}
						<form
							method="post"
							action="?/updateModifier"
							use:enhance={() => {
								return ({ result }) => {
									if (result.type === 'success') editingModifier = null;
								};
							}}
							class="flex items-end gap-3 bg-gray-50 px-4 py-3 border-b border-gray-200"
						>
							<input type="hidden" name="modifierId" value={mod.id} />
							<div class="flex-1">
								<label class="block text-xs font-medium text-gray-600 mb-1">Group name</label>
								<input
									name="modifierName"
									type="text"
									required
									value={mod.name}
									class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
								/>
							</div>
							<div class="w-20">
								<label class="block text-xs font-medium text-gray-600 mb-1">Max</label>
								<input
									name="maxSelections"
									type="number"
									min="1"
									value={mod.maxSelections}
									class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
								/>
							</div>
							<label class="flex items-center gap-1.5 text-sm text-gray-700 pb-1.5 cursor-pointer">
								<input type="checkbox" name="isRequired" checked={mod.isRequired ?? false} class="h-4 w-4 rounded border-gray-300" />
								Required
							</label>
							<button type="submit" class="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors">Save</button>
							<button type="button" onclick={() => (editingModifier = null)} class="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
						</form>
					{:else}
						<div class="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
							<div class="flex items-center gap-2">
								<p class="font-medium text-gray-900 text-sm">{mod.name}</p>
								{#if mod.isRequired}
									<span class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Required</span>
								{:else}
									<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Optional</span>
								{/if}
								<span class="text-xs text-gray-400">max {mod.maxSelections}</span>
							</div>
							<div class="flex items-center gap-2">
								<button
									type="button"
									onclick={() => (editingModifier = mod.id)}
									class="text-xs text-gray-400 hover:text-gray-700 transition-colors"
								>
									Edit
								</button>
								<form method="post" action="?/deleteModifier" use:enhance>
									<input type="hidden" name="modifierId" value={mod.id} />
									<button
										type="submit"
										onclick={(e) => { if (!confirm(`Delete "${mod.name}"? This cannot be undone.`)) e.preventDefault(); }}
										class="text-xs text-red-400 hover:text-red-600 transition-colors"
									>
										Delete
									</button>
								</form>
							</div>
						</div>
					{/if}

					<!-- Options list -->
					<div class="divide-y divide-gray-50">
						{#each mod.options as opt (opt.id)}
							<div class="flex items-center justify-between gap-3 px-4 py-2.5">
								<div class="flex items-center gap-2 min-w-0">
									<span class="text-sm text-gray-800 truncate">{opt.name}</span>
									{#if opt.isDefault}
										<span class="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">Default</span>
									{/if}
								</div>
								<div class="flex items-center gap-3 shrink-0">
									<span class="text-sm text-gray-500">
										{(opt.priceAdjustment ?? 0) === 0
											? 'No charge'
											: (opt.priceAdjustment ?? 0) > 0
												? `+$${((opt.priceAdjustment ?? 0) / 100).toFixed(2)}`
												: `-$${(Math.abs(opt.priceAdjustment ?? 0) / 100).toFixed(2)}`}
									</span>
									<form method="post" action="?/deleteOption" use:enhance>
										<input type="hidden" name="optionId" value={opt.id} />
										<button
											type="submit"
											onclick={(e) => { if (!confirm(`Delete option "${opt.name}"?`)) e.preventDefault(); }}
											class="text-xs text-red-400 hover:text-red-600 transition-colors"
										>
											<Icon icon="mdi:close" class="h-3.5 w-3.5" />
										</button>
									</form>
								</div>
							</div>
						{/each}
					</div>

					<!-- Add option -->
					{#if addingOptionTo === mod.id}
						<form
							method="post"
							action="?/addOption"
							use:enhance={() => {
								return ({ update }) => update({ reset: true });
							}}
							class="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-2"
						>
							<input type="hidden" name="modifierId" value={mod.id} />
							<div class="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-end">
								<div>
									<label class="block text-xs font-medium text-gray-600 mb-1">Option name *</label>
									<input
										name="optionName"
										type="text"
										required
										placeholder="e.g. Large"
										class="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
									/>
								</div>
								<div class="w-24">
									<label class="block text-xs font-medium text-gray-600 mb-1">Price adj. ($)</label>
									<input
										name="priceAdjustment"
										type="number"
										step="0.01"
										value="0"
										placeholder="0.00"
										class="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
									/>
								</div>
								<label class="flex items-center gap-1 text-xs text-gray-600 pb-1.5 cursor-pointer">
									<input type="checkbox" name="isDefault" class="h-3.5 w-3.5 rounded border-gray-300" />
									Default
								</label>
								<div class="flex gap-1 pb-0.5">
									<button
										type="submit"
										class="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-700 transition-colors"
									>
										Add
									</button>
									<button
										type="button"
										onclick={() => (addingOptionTo = null)}
										class="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-white transition-colors"
									>
										✕
									</button>
								</div>
							</div>
						</form>
					{:else}
						<button
							type="button"
							onclick={() => (addingOptionTo = mod.id)}
							class="w-full px-4 py-2 text-left text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors border-t border-gray-100"
						>
							+ Add option
						</button>
					{/if}
				</div>
			{/each}
		</div>
	</div>

	<!-- ── Danger zone ───────────────────────────────────────── -->
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
