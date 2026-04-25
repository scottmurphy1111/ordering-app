<script lang="ts">
	import { enhance } from'$app/forms';
	import type { PageData, ActionData } from'./$types';
	import { resolve } from'$app/paths';
	import Icon from'@iconify/svelte';
	import { Button } from'$lib/components/ui/button';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';

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
		uploadError ='';

		const fd = new FormData();
		fd.append('image', file);

		try {
			const res = await fetch('/api/upload-menu-item-image', { method:'POST', body: fd });
			const json = await res.json();
			if (!res.ok) {
				uploadError = json.message ??'Upload failed';
			} else {
				imageUrl = json.url;
				imagePreview = json.url;
			}
		} catch {
			uploadError ='Network error. Please try again.';
		} finally {
			uploading = false;
		}
	}

	function clearImage() {
		imageUrl ='';
		imagePreview ='';
		uploadError ='';
	}
</script>

<div class="max-w-xl">
	<div class="mb-6 flex items-center gap-3">
		<a
			href={resolve('/dashboard/menu/items')}
			class="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-muted-foreground"
			><Icon icon="mdi:arrow-left" class="h-4 w-4" /> Items</a
		>
		<h1 class="text-2xl font-bold text-foreground">New item</h1>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
			{form.error}
		</div>
	{/if}

	<Card class="shadow-sm">
	<form method="post" use:enhance>
	<CardContent class="space-y-5 pt-6 pb-2">
		<!-- Image upload -->
		<div>
			<p class="mb-2 block text-sm font-medium text-muted-foreground">
				Image <span class="font-normal text-muted-foreground">(optional)</span>
			</p>
			<div class="flex items-start gap-4">
				<!-- Square preview / upload target -->
				<div
					role="button"
					tabindex="0"
					aria-label="Upload item image"
					onclick={() => (document.getElementById('image-upload') as HTMLInputElement)?.click()}
					onkeydown={(e) =>
						e.key ==='Enter' &&
						(document.getElementById('image-upload') as HTMLInputElement)?.click()}
					class="relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted/50 transition-colors hover:border-gray-400 hover:bg-muted {uploading
						?'pointer-events-none opacity-60'
						:''}"
				>
					{#if imagePreview}
						<img src={imagePreview} alt="Item preview" class="h-full w-full object-cover" />
						<div
							class="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity hover:opacity-100"
						>
							<Icon icon="mdi:pencil" class="h-5 w-5 text-white" />
						</div>
					{:else if uploading}
						<svg class="h-5 w-5 animate-spin text-muted-foreground" fill="none" viewBox="0 0 24 24">
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
						<div class="flex flex-col items-center gap-1 text-muted-foreground">
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
					<p class="text-xs text-muted-foreground">JPG, PNG, or WebP · max 5MB</p>
					{#if uploadError}
						<p class="text-xs text-red-600">{uploadError}</p>
					{/if}
					{#if imagePreview}
						<Button type="button" onclick={clearImage} variant="ghost" size="sm" class="h-auto p-0 text-xs text-destructive hover:text-destructive/80">
							Remove image
						</Button>
					{/if}
				</div>
			</div>
			<input type="hidden" name="imageUrl" value={imageUrl} />
		</div>

		<div>
			<label class="mb-1 block text-sm font-medium text-muted-foreground" for="name">Name *</label>
			<input
				id="name"
				name="name"
				type="text"
				required
				placeholder="e.g. Classic Cheeseburger"
				class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
			/>
		</div>

		<div>
			<label class="mb-1 block text-sm font-medium text-muted-foreground" for="description"
				>Description</label
			>
			<textarea
				id="description"
				name="description"
				rows="2"
				placeholder="Short description of the item..."
				class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
			></textarea>
		</div>

		<div class="grid grid-cols-2 gap-4">
			<div>
				<label class="mb-1 block text-sm font-medium text-muted-foreground" for="price">Price ($) *</label>
				<input
					id="price"
					name="price"
					type="number"
					min="0"
					step="0.01"
					required
					placeholder="9.99"
					class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
				/>
			</div>
			<div>
				<label class="mb-1 block text-sm font-medium text-muted-foreground" for="discountedPrice"
					>Sale price ($)</label
				>
				<input
					id="discountedPrice"
					name="discountedPrice"
					type="number"
					min="0"
					step="0.01"
					placeholder="Optional"
					class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
				/>
			</div>
		</div>

		{#if data.categories.length > 0}
			<div>
				<label class="mb-1 block text-sm font-medium text-muted-foreground" for="categoryId">Category</label
				>
				<select
					id="categoryId"
					name="categoryId"
					class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
				>
					<option value="">No category</option>
					{#each data.categories as cat (cat.id)}
						<option value={String(cat.id)}>{cat.name}</option>
					{/each}
				</select>
			</div>
		{/if}

		<div>
			<label class="mb-1 block text-sm font-medium text-muted-foreground" for="tags">Tags</label>
			<input
				id="tags"
				name="tags"
				type="text"
				placeholder="spicy, popular, vegetarian (comma-separated)"
				class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
			/>
		</div>

		<input type="hidden" name="sortOrder" value="0" />

		<div class="flex items-center gap-2">
			<input
				id="available"
				name="available"
				type="checkbox"
				checked
				class="h-4 w-4 rounded"
			/>
			<label class="text-sm text-muted-foreground" for="available">Available for ordering</label>
		</div>

		{#if data.hasSubscriptionsAddon}
			<div class="space-y-3 rounded-lg border p-4">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Recurring subscription</p>
						<p class="text-xs text-muted-foreground">
							Customers subscribe and are billed on a set interval.
						</p>
					</div>
					<button
						type="button"
						onclick={() => (isSubscription = !isSubscription)}
						aria-label={isSubscription ?'Disable subscription' :'Enable subscription'}
						class="flex items-center"
					>
						<div
							class="relative h-6 w-11 rounded-full transition-colors duration-200 {isSubscription
								?'bg-primary'
								:'bg-muted'}"
						>
							<span
								class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform duration-200 {isSubscription
									?'translate-x-5'
									:'translate-x-0'}"
							></span>
						</div>
					</button>
				</div>
				<input type="hidden" name="isSubscription" value={isSubscription ?'on' :''} />
				{#if isSubscription}
					<div>
						<p class="mb-2 text-xs font-medium text-muted-foreground">Billing interval</p>
						<div class="flex gap-2">
							{#each [{ value:'monthly', label:'Monthly' }, { value:'yearly', label:'Yearly' }] as opt (opt.value)}
								<button
									type="button"
									onclick={() => (billingInterval = opt.value)}
									class="rounded-md border px-4 py-1.5 text-sm transition-colors {billingInterval ===
									opt.value
										?'border-primary bg-primary/5 font-medium text-primary'
										:' text-muted-foreground hover:border-gray-300'}"
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

		</CardContent>
		<CardFooter class="gap-3">
			<Button type="submit" disabled={uploading} variant="default">
				Create item
			</Button>
			<Button href={resolve('/dashboard/menu/items')} variant="outline">Cancel</Button>
		</CardFooter>
	</form>
	</Card>
</div>
