<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import { confirmDialog } from '$lib/confirm.svelte';
	import type { PageData, ActionData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const item = $derived(data.item);
	const itemModifiers = $derived(
		data.item.modifiers
			.map((m) => m.modifier)
			.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
	);

	// Image upload
	// null = no user override; fall back to the item's saved image
	type ImageEntry = { url: string; isPrimary?: boolean };
	const existingImageUrl = $derived(
		(
			(item.images as ImageEntry[] | null)?.find((img) => img.isPrimary) ??
			(item.images as ImageEntry[] | null)?.[0]
		)?.url ?? ''
	);
	let userImageUrl = $state<string | null>(null);
	const imageUrl = $derived(userImageUrl !== null ? userImageUrl : existingImageUrl);
	const imagePreview = $derived(imageUrl);
	let uploading = $state(false);
	let uploadError = $state('');

	async function onImageChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		uploading = true;
		uploadError = '';

		const fd = new FormData();
		fd.append('image', file);

		try {
			const res = await fetch('/api/upload-menu-item-image', { method: 'POST', body: fd });
			const json = await res.json();
			if (!res.ok) {
				uploadError = json.message ?? 'Upload failed';
			} else {
				userImageUrl = json.url;
			}
		} catch {
			uploadError = 'Network error. Please try again.';
		} finally {
			uploading = false;
		}
	}

	function clearImage() {
		userImageUrl = '';
		uploadError = '';
	}

	// Track which modifier group has the "add option" form open
	let addingOptionTo = $state<number | null>(null);
	// Track which modifier is in edit mode
	let editingModifier = $state<number | null>(null);
	// Controls the "add group" panel
	let showAddGroup = $state(false);

	let isSubscription = $state(untrack(() => item.isSubscription ?? false));
	let billingInterval = $state(untrack(() => item.billingInterval ?? 'monthly'));
</script>

<div class="max-w-xl">
	<div class="mb-6 flex items-center gap-3">
		<a
			href={resolve('/dashboard/menu/items')}
			class="inline-flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-gray-600"
			><Icon icon="mdi:arrow-left" class="h-4 w-4" /> Items</a
		>
		<h1 class="text-2xl font-bold text-gray-900">Edit item</h1>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			{form.error}
		</div>
	{/if}
	{#if form?.success}
		<div
			class="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
		>
			Saved.
		</div>
	{/if}

	<!-- ── Item details form ─────────────────────────────────── -->
	<form
		method="post"
		action="?/update"
		use:enhance={() =>
			({ update }) =>
				update({ reset: false })}
		class="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
	>
		<!-- Image upload -->
		<div>
			<p class="mb-2 block text-sm font-medium text-gray-700">
				Image <span class="font-normal text-gray-400">(optional)</span>
			</p>
			<div class="flex items-start gap-4">
				<div
					role="button"
					tabindex="0"
					aria-label="Upload item image"
					onclick={() => (document.getElementById('image-upload') as HTMLInputElement)?.click()}
					onkeydown={(e) =>
						e.key === 'Enter' &&
						(document.getElementById('image-upload') as HTMLInputElement)?.click()}
					class="relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 transition-colors hover:border-gray-400 hover:bg-gray-100 {uploading
						? 'pointer-events-none opacity-60'
						: ''}"
				>
					{#if imagePreview}
						<img src={imagePreview} alt="Item preview" class="h-full w-full object-cover" />
						<div
							class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100"
						>
							<Icon icon="mdi:pencil" class="h-5 w-5 text-white" />
						</div>
					{:else if uploading}
						<svg class="h-5 w-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
						</svg>
					{:else}
						<div class="flex flex-col items-center gap-1 text-gray-400">
							<Icon icon="mdi:image-plus" class="h-6 w-6" />
							<span class="text-xs">Add photo</span>
						</div>
					{/if}
				</div>
				<label for="image-upload" class="sr-only">Item image</label>
				<input
					id="image-upload"
					type="file"
					accept="image/jpeg,image/png,image/webp"
					class="sr-only"
					onchange={onImageChange}
				/>
				<div class="flex-1 space-y-1.5 pt-1">
					<p class="text-xs text-gray-500">JPG, PNG, or WebP · max 5MB</p>
					{#if uploadError}
						<p class="text-xs text-red-600">{uploadError}</p>
					{/if}
					{#if imagePreview}
						<button
							type="button"
							onclick={clearImage}
							class="text-xs text-red-500 transition-colors hover:text-red-700"
						>
							Remove image
						</button>
					{/if}
				</div>
			</div>
			<input type="hidden" name="imageUrl" value={imageUrl} />
		</div>

		<div>
			<label class="mb-1 block text-sm font-medium text-gray-700" for="name">Name *</label>
			<input
				id="name"
				name="name"
				type="text"
				required
				value={item.name}
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			/>
		</div>

		<div>
			<label class="mb-1 block text-sm font-medium text-gray-700" for="description"
				>Description</label
			>
			<textarea
				id="description"
				name="description"
				rows="2"
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				>{item.description ?? ''}</textarea
			>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="mb-1 block text-sm font-medium text-gray-700" for="price">Price ($) *</label>
				<input
					id="price"
					name="price"
					type="number"
					min="0"
					step="0.01"
					required
					value={(item.price / 100).toFixed(2)}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				/>
			</div>
			<div>
				<label class="mb-1 block text-sm font-medium text-gray-700" for="discountedPrice"
					>Sale price ($)</label
				>
				<input
					id="discountedPrice"
					name="discountedPrice"
					type="number"
					min="0"
					step="0.01"
					value={item.discountedPrice ? (item.discountedPrice / 100).toFixed(2) : ''}
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				/>
			</div>
		</div>

		{#if data.categories.length > 0}
			<div>
				<label class="mb-1 block text-sm font-medium text-gray-700" for="categoryId">Category</label
				>
				<select
					id="categoryId"
					name="categoryId"
					class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				>
					<option value="">No category</option>
					{#each data.categories as cat (cat.id)}
						<option value={String(cat.id)} selected={item.category?.id === cat.id}
							>{cat.name}</option
						>
					{/each}
				</select>
			</div>
		{/if}

		<div>
			<label class="mb-1 block text-sm font-medium text-gray-700" for="tags">Tags</label>
			<input
				id="tags"
				name="tags"
				type="text"
				value={Array.isArray(item.tags) ? item.tags.join(', ') : ''}
				placeholder="spicy, popular, vegetarian"
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			/>
		</div>

		<input type="hidden" name="sortOrder" value={item.sortOrder ?? 0} />

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

		{#if data.hasSubscriptionsAddon}
			<div class="space-y-3 rounded-lg border border-gray-200 p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-700">Recurring subscription</p>
						<p class="text-xs text-gray-400">
							Customers subscribe and are billed on a set interval.
						</p>
					</div>
					<button
						type="button"
						onclick={() => (isSubscription = !isSubscription)}
						aria-label={isSubscription ? 'Disable subscription' : 'Enable subscription'}
						class="flex items-center"
					>
						<div
							class="relative h-6 w-11 rounded-full transition-colors duration-200 {isSubscription
								? 'bg-green-600'
								: 'bg-gray-300'}"
						>
							<span
								class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 {isSubscription
									? 'translate-x-5'
									: 'translate-x-0'}"
							></span>
						</div>
					</button>
				</div>
				<input type="hidden" name="isSubscription" value={isSubscription ? 'on' : ''} />
				{#if isSubscription}
					<div>
						<p class="mb-2 text-xs font-medium text-gray-600">Billing interval</p>
						<div class="flex gap-2">
							{#each [{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }] as opt (opt.value)}
								<button
									type="button"
									onclick={() => (billingInterval = opt.value)}
									class="rounded-md border px-4 py-1.5 text-sm transition-colors {billingInterval ===
									opt.value
										? 'border-green-500 bg-green-50 font-medium text-green-700'
										: 'border-gray-200 text-gray-500 hover:border-gray-300'}"
								>
									{opt.label}
								</button>
							{/each}
						</div>
						<input type="hidden" name="billingInterval" value={billingInterval} />
					</div>
				{/if}
			</div>
		{/if}

		<div class="flex gap-2 pt-1">
			<button
				type="submit"
				disabled={uploading}
				class="flex-1 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
			>
				Save changes
			</button>
		</div>
	</form>

	<!-- ── Modifier groups ───────────────────────────────────── -->
	<div class="mt-8">
		<div class="mb-3 flex items-center justify-between">
			<div>
				<h2 class="text-base font-semibold text-gray-900">Modifier groups</h2>
				<p class="mt-0.5 text-xs text-gray-400">e.g. Size, Add-ons, Doneness</p>
			</div>
			{#if !showAddGroup}
				<button
					onclick={() => (showAddGroup = true)}
					class="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-100"
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
					return ({ result, update }) => {
						if (result.type === 'success') showAddGroup = false;
						return update({ reset: false });
					};
				}}
				class="mb-4 space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4"
			>
				<p class="text-sm font-medium text-gray-800">New modifier group</p>
				<div>
					<label class="mb-1 block text-xs font-medium text-gray-600" for="modifierName"
						>Group name *</label
					>
					<input
						id="modifierName"
						name="modifierName"
						type="text"
						required
						placeholder="e.g. Size, Add-ons"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					/>
				</div>
				<div class="grid grid-cols-2 gap-3">
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600" for="maxSelections"
							>Max selections</label
						>
						<input
							id="maxSelections"
							name="maxSelections"
							type="number"
							min="1"
							value="1"
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						/>
					</div>
					<div class="flex items-end pb-2">
						<label class="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
							<input type="checkbox" name="isRequired" class="h-4 w-4 rounded border-gray-300" />
							Required
						</label>
					</div>
				</div>
				<div class="flex gap-2">
					<button
						type="submit"
						class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
					>
						Add group
					</button>
					<button
						type="button"
						onclick={() => (showAddGroup = false)}
						class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-100"
					>
						Cancel
					</button>
				</div>
			</form>
		{/if}

		<!-- Existing modifier groups -->
		{#if itemModifiers.length === 0 && !showAddGroup}
			<div
				class="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400"
			>
				No modifier groups yet. Add one to let customers customise this item.
			</div>
		{/if}

		<div class="space-y-3">
			{#each itemModifiers as mod (mod.id)}
				<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
					<!-- Group header -->
					{#if editingModifier === mod.id}
						<form
							method="post"
							action="?/updateModifier"
							use:enhance={() => {
								return ({ result, update }) => {
									if (result.type === 'success') editingModifier = null;
									return update({ reset: false });
								};
							}}
							class="flex items-end gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3"
						>
							<input type="hidden" name="modifierId" value={mod.id} />
							<div class="flex-1">
								<label
									class="mb-1 block text-xs font-medium text-gray-600"
									for="edit-modifier-name-{mod.id}">Group name</label
								>
								<input
									id="edit-modifier-name-{mod.id}"
									name="modifierName"
									type="text"
									required
									value={mod.name}
									class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
								/>
							</div>
							<div class="w-20">
								<label
									class="mb-1 block text-xs font-medium text-gray-600"
									for="edit-max-selections-{mod.id}">Max</label
								>
								<input
									id="edit-max-selections-{mod.id}"
									name="maxSelections"
									type="number"
									min="1"
									value={mod.maxSelections}
									class="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
								/>
							</div>
							<label class="flex cursor-pointer items-center gap-1.5 pb-1.5 text-sm text-gray-700">
								<input
									type="checkbox"
									name="isRequired"
									checked={mod.isRequired ?? false}
									class="h-4 w-4 rounded border-gray-300"
								/>
								Required
							</label>
							<button
								type="submit"
								class="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
								>Save</button
							>
							<button
								type="button"
								onclick={() => (editingModifier = null)}
								class="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-100"
								>Cancel</button
							>
						</form>
					{:else}
						<div class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
							<div class="flex items-center gap-2">
								<p class="text-sm font-medium text-gray-900">{mod.name}</p>
								{#if mod.isRequired}
									<span class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
										>Required</span
									>
								{:else}
									<span class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500"
										>Optional</span
									>
								{/if}
								<span class="text-xs text-gray-400">max {mod.maxSelections}</span>
							</div>
							<div class="flex items-center gap-2">
								<button
									type="button"
									onclick={() => (editingModifier = mod.id)}
									class="text-xs text-gray-400 transition-colors hover:text-gray-700"
								>
									Edit
								</button>
								<form method="post" action="?/deleteModifier" use:enhance>
									<input type="hidden" name="modifierId" value={mod.id} />
									<button
										type="submit"
										onclick={async (e) => {
											e.preventDefault();
											if (await confirmDialog(`Delete "${mod.name}"? This cannot be undone.`))
												(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
										}}
										class="text-xs text-red-400 transition-colors hover:text-red-600"
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
								<div class="flex min-w-0 items-center gap-2">
									<span class="truncate text-sm text-gray-800">{opt.name}</span>
									{#if opt.isDefault}
										<span class="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600"
											>Default</span
										>
									{/if}
								</div>
								<div class="flex shrink-0 items-center gap-3">
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
											onclick={async (e) => {
												e.preventDefault();
												if (await confirmDialog(`Delete option "${opt.name}"?`))
													(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
											}}
											class="text-xs text-red-400 transition-colors hover:text-red-600"
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
							class="space-y-2 border-t border-gray-100 bg-gray-50 px-4 py-3"
						>
							<input type="hidden" name="modifierId" value={mod.id} />
							<div class="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2">
								<div>
									<label
										class="mb-1 block text-xs font-medium text-gray-600"
										for="option-name-{mod.id}">Option name *</label
									>
									<input
										id="option-name-{mod.id}"
										name="optionName"
										type="text"
										required
										placeholder="e.g. Large"
										class="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
									/>
								</div>
								<div class="w-24">
									<label
										class="mb-1 block text-xs font-medium text-gray-600"
										for="price-adj-{mod.id}">Price adj. ($)</label
									>
									<input
										id="price-adj-{mod.id}"
										name="priceAdjustment"
										type="number"
										step="0.01"
										value="0"
										placeholder="0.00"
										class="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
									/>
								</div>
								<label class="flex cursor-pointer items-center gap-1 pb-1.5 text-xs text-gray-600">
									<input
										type="checkbox"
										name="isDefault"
										class="h-3.5 w-3.5 rounded border-gray-300"
									/>
									Default
								</label>
								<div class="flex gap-1 pb-0.5">
									<button
										type="submit"
										class="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700"
									>
										Add
									</button>
									<button
										type="button"
										onclick={() => (addingOptionTo = null)}
										class="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-600 transition-colors hover:bg-white"
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
							class="w-full border-t border-gray-100 px-4 py-2 text-left text-xs text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
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
		<h2 class="mb-2 text-sm font-semibold text-red-700">Danger zone</h2>
		<form method="post" action="?/delete" use:enhance>
			<button
				type="submit"
				onclick={async (e) => {
					e.preventDefault();
					if (await confirmDialog('Delete this item? This cannot be undone.'))
						(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
				}}
				class="rounded-md border border-red-300 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
			>
				Delete item
			</button>
		</form>
	</div>
</div>
