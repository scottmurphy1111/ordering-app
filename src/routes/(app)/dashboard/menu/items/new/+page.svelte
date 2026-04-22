<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let imageUrl = $state('');
	let imagePreview = $state('');
	let uploading = $state(false);
	let uploadError = $state('');
	let isSubscription = $state(false);
	let billingInterval = $state('monthly');

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
				imageUrl = json.url;
				imagePreview = json.url;
			}
		} catch {
			uploadError = 'Network error. Please try again.';
		} finally {
			uploading = false;
		}
	}

	function clearImage() {
		imageUrl = '';
		imagePreview = '';
		uploadError = '';
	}
</script>

<div class="max-w-xl">
	<div class="mb-6 flex items-center gap-3">
		<a
			href={resolve('/dashboard/menu/items')}
			class="inline-flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-gray-600"
			><Icon icon="mdi:arrow-left" class="h-4 w-4" /> Items</a
		>
		<h1 class="text-2xl font-bold text-gray-900">New item</h1>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			{form.error}
		</div>
	{/if}

	<form
		method="post"
		use:enhance
		class="space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
	>
		<!-- Image upload -->
		<div>
			<p class="mb-2 block text-sm font-medium text-gray-700">
				Image <span class="font-normal text-gray-400">(optional)</span>
			</p>
			<div class="flex items-start gap-4">
				<!-- Square preview / upload target -->
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
				placeholder="e.g. Classic Cheeseburger"
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
				placeholder="Short description of the item..."
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			></textarea>
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
					placeholder="9.99"
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
					placeholder="Optional"
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
						<option value={String(cat.id)}>{cat.name}</option>
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
				placeholder="spicy, popular, vegetarian (comma-separated)"
				class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
			/>
		</div>

		<input type="hidden" name="sortOrder" value="0" />

		<div class="flex items-center gap-2">
			<input
				id="available"
				name="available"
				type="checkbox"
				checked
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
				Create item
			</button>
			<a
				href={resolve('/dashboard/menu/items')}
				class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-100"
			>
				Cancel
			</a>
		</div>
	</form>
</div>
