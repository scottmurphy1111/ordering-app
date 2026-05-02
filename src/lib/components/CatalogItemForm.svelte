<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';

	type ImageEntry = { url: string; isPrimary?: boolean };

	interface ItemData {
		name: string;
		description: string | null;
		price: number;
		discountedPrice: number | null;
		category?: { id: number } | null;
		tags: unknown;
		images: unknown;
		sortOrder?: number | null;
		status: 'available' | 'sold_out' | 'hidden' | 'draft';
		isSubscription?: boolean | null;
		billingInterval?: string | null;
	}

	interface Props {
		mode: 'new' | 'edit';
		formAction: string;
		item?: ItemData;
		categories: { id: number; name: string }[];
		hasSubscriptionsAddon: boolean;
		onSuccess?: (item: { id: number; name: string }) => void;
		onCancel?: () => void;
	}

	let {
		mode,
		formAction,
		item,
		categories,
		hasSubscriptionsAddon,
		onSuccess,
		onCancel
	}: Props = $props();

	// Image
	const existingImageUrl = $derived(
		mode === 'edit' && item
			? (((item.images as ImageEntry[] | null)?.find((img) => img.isPrimary) ??
					(item.images as ImageEntry[] | null)?.[0])?.url ?? '')
			: ''
	);
	let userImageUrl = $state<string | null>(null);
	const imageUrl = $derived(userImageUrl !== null ? userImageUrl : existingImageUrl);
	const imagePreview = $derived(imageUrl);
	let uploading = $state(false);
	let uploadError = $state('');

	// Subscription
	let isSubscription = $state(untrack(() => item?.isSubscription ?? false));
	let billingInterval = $state(untrack(() => item?.billingInterval ?? 'monthly'));

	// Internal feedback
	let internalError = $state<string | null>(null);
	let internalSuccess = $state(false);

	async function onImageChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		uploading = true;
		uploadError = '';

		const fd = new FormData();
		fd.append('image', file);

		try {
			const res = await fetch('/api/upload-catalog-item-image', { method: 'POST', body: fd });
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

	function handleEnhance({ submitter }: { submitter: HTMLElement | null; [key: string]: unknown }) {
		const shouldClose = submitter?.getAttribute('data-close') === '1';

		return async ({ result, update }: { result: { type: string; data?: Record<string, unknown> }; update: (opts?: { reset?: boolean }) => Promise<void> }) => {
			internalSuccess = false;

			if (result.type === 'failure') {
				internalError = (result.data?.error as string) ?? 'Something went wrong.';
				return;
			}

			internalError = null;

			if (mode === 'edit') {
				internalSuccess = true;
				await update({ reset: false });
			} else if (onSuccess && result.type === 'success') {
				onSuccess(result.data?.item as { id: number; name: string });
				userImageUrl = null;
				await update({ reset: true });
				if (shouldClose && onCancel) onCancel();
			} else {
				await update();
			}
		};
	}
</script>

{#if internalError}
	<div
		class="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
	>
		{internalError}
	</div>
{/if}
{#if internalSuccess}
	<div
		class="mb-4 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary/90"
	>
		Saved.
	</div>
{/if}

<Card class="shadow-sm">
	<form method="post" action={formAction} use:enhance={handleEnhance}>
		<CardContent class="space-y-5 pt-6 pb-2">
			<!-- Image upload -->
			<div>
				<p class="mb-2 block text-sm font-medium text-muted-foreground">
					Image <span class="font-normal text-muted-foreground">(optional)</span>
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
						class="relative flex h-24 w-24 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed bg-muted/50 transition-colors hover:border-gray-400 hover:bg-muted {uploading
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
							<Button
								type="button"
								onclick={clearImage}
								variant="ghost"
								size="sm"
								class="text-xs text-destructive hover:text-destructive/80"
							>
								Remove image
							</Button>
						{/if}
					</div>
				</div>
				<input type="hidden" name="imageUrl" value={imageUrl} />
			</div>

			<!-- Name -->
			<div>
				<label class="mb-1 block text-sm font-medium text-muted-foreground" for="name"
					>Name *</label
				>
				<input
					id="name"
					name="name"
					type="text"
					required
					value={item?.name ?? ''}
					placeholder="e.g. Sourdough Loaf"
					class="w-full rounded-md border h-10 px-3 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
				/>
			</div>

			<!-- Description -->
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
					>{item?.description ?? ''}</textarea
				>
			</div>

			<!-- Price / Sale price -->
			<div class="grid grid-cols-2 gap-4">
				<div>
					<label class="mb-1 block text-sm font-medium text-muted-foreground" for="price"
						>Price ($) *</label
					>
					<input
						id="price"
						name="price"
						type="number"
						min="0"
						step="0.01"
						required
						value={item ? (item.price / 100).toFixed(2) : ''}
						placeholder="9.99"
						class="w-full rounded-md border h-10 px-3 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
					/>
				</div>
				<div>
					<label
						class="mb-1 block text-sm font-medium text-muted-foreground"
						for="discountedPrice">Sale price ($)</label
					>
					<input
						id="discountedPrice"
						name="discountedPrice"
						type="number"
						min="0"
						step="0.01"
						value={item?.discountedPrice ? (item.discountedPrice / 100).toFixed(2) : ''}
						placeholder="Optional"
						class="w-full rounded-md border h-10 px-3 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
					/>
				</div>
			</div>

			<!-- Category -->
			{#if categories.length > 0}
				<div>
					<label class="mb-1 block text-sm font-medium text-muted-foreground" for="categoryId"
						>Category</label
					>
					<select
						id="categoryId"
						name="categoryId"
						class="w-full rounded-md border h-10 px-3 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
					>
						<option value="">No category</option>
						{#each categories as cat (cat.id)}
							<option value={String(cat.id)} selected={item?.category?.id === cat.id}
								>{cat.name}</option
							>
						{/each}
					</select>
				</div>
			{/if}

			<!-- Tags -->
			<div>
				<label class="mb-1 block text-sm font-medium text-muted-foreground" for="tags">Tags</label>
				<input
					id="tags"
					name="tags"
					type="text"
					value={Array.isArray(item?.tags) ? (item.tags as string[]).join(',') : (typeof item?.tags === 'string' ? item.tags : '')}
					placeholder="seasonal, gluten-free, popular"
					class="w-full rounded-md border h-10 px-3 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
				/>
			</div>

			<input type="hidden" name="sortOrder" value={item?.sortOrder ?? 0} />

			<!-- Status -->
			<div>
				<label class="mb-1 block text-sm font-medium text-muted-foreground" for="status"
					>Status</label
				>
				<select
					id="status"
					name="status"
					class="w-full rounded-md border h-10 px-3 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
				>
					{#each [['available', 'Available'], ['sold_out', 'Sold out'], ['hidden', 'Hidden'], ['draft', 'Draft']] as [val, label] (val)}
						<option
							value={val}
							selected={mode === 'edit' ? item?.status === val : val === 'available'}
							>{label}</option
						>
					{/each}
				</select>
				<p class="mt-1 text-xs text-muted-foreground">
					Available — visible with Add button · Sold out — visible but can't order · Hidden — not
					shown to customers
				</p>
			</div>

			<!-- Subscription -->
			{#if hasSubscriptionsAddon}
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
							aria-label={isSubscription ? 'Disable subscription' : 'Enable subscription'}
							class="flex items-center"
						>
							<div
								class="relative h-6 w-11 rounded-full transition-colors duration-200 {isSubscription
									? 'bg-primary'
									: 'bg-muted'}"
							>
								<span
									class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform duration-200 {isSubscription
										? 'translate-x-5'
										: 'translate-x-0'}"
								></span>
							</div>
						</button>
					</div>
					<input type="hidden" name="isSubscription" value={isSubscription ? 'on' : ''} />
					{#if isSubscription}
						<div>
							<p class="mb-2 text-xs font-medium text-muted-foreground">Billing interval</p>
							<div class="flex gap-2">
								{#each [{ value: 'monthly', label: 'Monthly' }, { value: 'yearly', label: 'Yearly' }] as opt (opt.value)}
									<button
										type="button"
										onclick={() => (billingInterval = opt.value)}
										class="rounded-md border px-4 py-1.5 text-sm transition-colors {billingInterval ===
										opt.value
											? 'border-primary bg-primary/5 font-medium text-primary'
											: ' text-muted-foreground hover:border-gray-300'}"
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
			{#if mode === 'edit'}
				<Button type="submit" disabled={uploading} variant="default">Save changes</Button>
			{:else if onSuccess}
				<Button type="submit" disabled={uploading} variant="default"
					>Save &amp; add another</Button
				>
				<Button type="submit" data-close="1" disabled={uploading} variant="outline"
					>Save &amp; close</Button
				>
			{:else}
				<Button type="submit" disabled={uploading} variant="default">Create item</Button>
				{#if onCancel}
					<Button type="button" onclick={onCancel} variant="outline">Cancel</Button>
				{/if}
			{/if}
		</CardFooter>
	</form>
</Card>
