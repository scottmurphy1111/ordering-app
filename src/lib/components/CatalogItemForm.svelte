<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import {
		Select,
		SelectTrigger,
		SelectContent,
		SelectItem,
		SelectValue
	} from '$lib/components/ui/select';
	import { Switch } from '$lib/components/ui/switch';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Alert } from '$lib/components/ui/alert';
	import { toast } from '$lib/toast';

	type ImageEntry = { url: string; isPrimary?: boolean };

	type PickupType = 'windowed' | 'custom_date';
	type AvailabilityMode = 'always' | 'storefront_only' | 'events_only' | 'special_order';

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
		fulfillmentNote?: string | null;
		pickupType?: PickupType | null;
		customDateLeadDays?: number | null;
		availabilityMode?: AvailabilityMode | null;
	}

	interface Props {
		mode: 'new' | 'edit';
		formAction: string;
		item?: ItemData;
		categories: { id: number; name: string }[];
		hasSubscriptionsAddon: boolean;
		onSuccess?: (item: { id: number; name: string }, opts: { addAnother: boolean }) => void;
		onCancel?: () => void;
		twoColumn?: boolean;
		itemId?: number;
		variant?: 'card' | 'flat';
	}

	let {
		mode,
		formAction,
		item,
		categories,
		hasSubscriptionsAddon,
		onSuccess,
		onCancel,
		twoColumn = false,
		itemId,
		variant = 'card'
	}: Props = $props();

	// Image
	const existingImageUrl = $derived(
		mode === 'edit' && item
			? ((
					(item.images as ImageEntry[] | null)?.find((img) => img.isPrimary) ??
					(item.images as ImageEntry[] | null)?.[0]
				)?.url ?? '')
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
	let fulfillmentNote = $state(untrack(() => item?.fulfillmentNote ?? ''));

	// Pickup type
	let pickupType = $state<PickupType>(
		untrack(() => (item?.pickupType as PickupType | null | undefined) ?? 'windowed')
	);
	let customDateLeadDays = $state(untrack(() => item?.customDateLeadDays ?? 14));

	// Availability mode
	let availabilityMode = $state<AvailabilityMode>(
		untrack(() => (item?.availabilityMode as AvailabilityMode | null | undefined) ?? 'always')
	);

	// Internal feedback
	let internalError = $state<string | null>(null);
	let isSubmitting = $state(false);

	// Controlled select mirrors — must be $state so bind:value propagates user selections
	let categoryValue = $state(untrack(() => String(item?.category?.id ?? '')));
	let statusValue = $state(
		untrack(() => (mode === 'edit' ? (item?.status ?? 'available') : 'available'))
	);

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
		const addAnother = submitter?.getAttribute('data-add-another') === '1';
		isSubmitting = true;

		return async ({
			result,
			update
		}: {
			result: {
				type: string;
				data?: Record<string, unknown>;
				error?: { message?: string };
			};
			update: (opts?: { reset?: boolean }) => Promise<void>;
		}) => {
			isSubmitting = false;

			if (result.type === 'failure') {
				internalError = (result.data?.error as string) ?? 'Something went wrong.';
				toast.error(internalError);
				return;
			}
			if (result.type === 'error') {
				internalError = result.error?.message ?? 'Something went wrong. Please try again.';
				toast.error(internalError);
				return;
			}

			internalError = null;

			if (mode === 'edit') {
				await update({ reset: false });
				if (result.type === 'success') toast.success('Item saved');
				onSuccess?.((result.data?.item as { id: number; name: string }) ?? { id: 0, name: '' }, {
					addAnother: false
				});
			} else if (onSuccess && result.type === 'success') {
				const item = result.data?.item as { id: number; name: string };
				if (addAnother) {
					userImageUrl = null;
					await update({ reset: true });
				}
				toast.success('Item created');
				// "Save & add modifiers" path: parent handles the navigation,
				// no local form reset needed because the page will re-render in edit mode.
				onSuccess(item, { addAnother });
			} else {
				await update();
				if (result.type === 'success') toast.success('Item created');
			}
		};
	}
</script>

{#snippet fieldImage()}
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
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
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
						class="text-xs text-red-500 hover:bg-red-50 hover:text-red-600"
					>
						Remove image
					</Button>
				{/if}
			</div>
		</div>
		<input type="hidden" name="imageUrl" value={imageUrl} />
	</div>
{/snippet}

{#snippet fieldName()}
	<div>
		<label class="mb-1 block text-sm font-medium text-muted-foreground" for="name">Name *</label>
		<Input
			id="name"
			name="name"
			type="text"
			required
			value={item?.name ?? ''}
			placeholder="e.g. Sourdough Loaf"
		/>
	</div>
{/snippet}

{#snippet fieldDescription()}
	<div>
		<label class="mb-1 block text-sm font-medium text-muted-foreground" for="description"
			>Description</label
		>
		<Textarea
			id="description"
			name="description"
			placeholder="Short description of the item..."
			class="min-h-18"
			value={item?.description ?? ''}
		/>
	</div>
{/snippet}

{#snippet fieldPrice()}
	<div class="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
		<div>
			<label class="mb-1 block text-sm font-medium text-muted-foreground" for="price"
				>Price ($) *</label
			>
			<Input
				id="price"
				name="price"
				type="number"
				min={0}
				step={0.01}
				required
				value={item ? (item.price / 100).toFixed(2) : ''}
				placeholder="9.99"
			/>
		</div>
		<div>
			<label class="mb-1 block text-sm font-medium text-muted-foreground" for="discountedPrice"
				>Sale price ($)</label
			>
			<Input
				id="discountedPrice"
				name="discountedPrice"
				type="number"
				min={0}
				step={0.01}
				value={item?.discountedPrice ? (item.discountedPrice / 100).toFixed(2) : ''}
				placeholder="Optional"
			/>
		</div>
	</div>
{/snippet}

{#snippet fieldCategory()}
	<div>
		<label class="mb-1 block text-sm font-medium text-muted-foreground" for="categoryId"
			>Category</label
		>
		<Select type="single" name="categoryId" bind:value={categoryValue}>
			<SelectTrigger id="categoryId" class="w-full">
				<SelectValue>
					{categories.find((c) => String(c.id) === categoryValue)?.name ?? 'No category'}
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="">No category</SelectItem>
				{#each categories as cat (cat.id)}
					<SelectItem value={String(cat.id)}>{cat.name}</SelectItem>
				{/each}
			</SelectContent>
		</Select>
	</div>
{/snippet}

{#snippet fieldTags()}
	<div>
		<label class="mb-1 block text-sm font-medium text-muted-foreground" for="tags">Tags</label>
		<Input
			id="tags"
			name="tags"
			type="text"
			value={Array.isArray(item?.tags)
				? (item.tags as string[]).join(',')
				: typeof item?.tags === 'string'
					? item.tags
					: ''}
			placeholder="seasonal, gluten-free, popular"
		/>
	</div>
{/snippet}

{#snippet fieldPickupType()}
	<div class="space-y-3 rounded-lg border p-4">
		<p class="text-sm font-medium text-muted-foreground">Pickup type</p>
		<Tabs
			value={pickupType}
			onValueChange={(v) => (pickupType = v as PickupType)}
			aria-label="Choose pickup type"
		>
			<TabsList>
				<TabsTrigger value="windowed">Windowed</TabsTrigger>
				<TabsTrigger value="custom_date">
					<Icon icon="mdi:calendar-edit" class="h-3.5 w-3.5" />
					Custom date
				</TabsTrigger>
			</TabsList>
		</Tabs>
		<input type="hidden" name="pickupType" value={pickupType} />
		<p class="text-xs text-gray-500">
			{#if pickupType === 'windowed'}
				Customer picks a pickup window at checkout. Use this for items you sell at scheduled pickup
				times — including today's inventory if you have a daily window configured.
			{:else}
				Customer picks a future date. You review and approve each order before payment is charged.
				Use this for wedding cakes, custom catering, and special-order goods.
			{/if}
		</p>
		{#if pickupType === 'custom_date'}
			<div>
				<label
					class="mb-1.5 block text-sm font-medium text-muted-foreground"
					for="customDateLeadDays"
				>
					Lead time (days)
				</label>
				<Input
					id="customDateLeadDays"
					name="customDateLeadDays"
					type="number"
					min={1}
					max={365}
					required
					value={customDateLeadDays}
					oninput={(e) =>
						(customDateLeadDays = parseInt((e.target as HTMLInputElement).value) || 14)}
				/>
				<p class="mt-1.5 text-xs text-gray-400">Minimum days between order and fulfillment.</p>
			</div>
		{/if}
	</div>
{/snippet}

{#snippet fieldAvailabilityMode()}
	{@const AVAILABILITY_OPTIONS = [
		['always', 'Always available', 'Show to all customers regardless of how they are ordering.'],
		[
			'storefront_only',
			'Storefront only',
			'Only shown when ordering for storefront / ASAP pickup.'
		],
		['events_only', 'Events only', 'Only shown when ordering for a scheduled pickup event.'],
		['special_order', 'Special order', 'Hidden from the catalog — must be ordered directly.']
	] as const}
	<div class="space-y-2 rounded-lg border p-4">
		<p class="text-sm font-medium text-muted-foreground">Availability</p>
		<Select
			type="single"
			name="availabilityMode"
			value={availabilityMode}
			onValueChange={(v) => (availabilityMode = v as AvailabilityMode)}
		>
			<SelectTrigger class="w-full">
				<SelectValue>
					{AVAILABILITY_OPTIONS.find(([v]) => v === availabilityMode)?.[1] ?? 'Always available'}
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{#each AVAILABILITY_OPTIONS as [val, label] (val)}
					<SelectItem value={val}>{label}</SelectItem>
				{/each}
			</SelectContent>
		</Select>
		<p class="text-xs text-muted-foreground">
			{AVAILABILITY_OPTIONS.find(([v]) => v === availabilityMode)?.[2] ?? ''}
		</p>
	</div>
{/snippet}

{#snippet fieldStatus()}
	{@const STATUS_OPTIONS = [
		['available', 'Available'],
		['sold_out', 'Sold out'],
		['hidden', 'Hidden'],
		['draft', 'Draft']
	] as const}
	<div>
		<label class="mb-1 block text-sm font-medium text-muted-foreground" for="status">Status</label>
		<Select type="single" name="status" bind:value={statusValue}>
			<SelectTrigger id="status" class="w-full">
				<SelectValue>
					{STATUS_OPTIONS.find(([v]) => v === statusValue)?.[1] ?? 'Available'}
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{#each STATUS_OPTIONS as [val, label] (val)}
					<SelectItem value={val}>{label}</SelectItem>
				{/each}
			</SelectContent>
		</Select>
		<p class="mt-1 text-xs text-muted-foreground">
			Available — visible with Add button · Sold out — visible but can't order · Hidden — not shown
			to customers
		</p>
	</div>
{/snippet}

{#snippet fieldSubscription()}
	<div class="space-y-3 rounded-lg border p-4">
		<div class="flex items-center justify-between">
			<div>
				<p class="text-sm font-medium text-muted-foreground">Recurring subscription</p>
				<p class="text-xs text-muted-foreground">
					Customers subscribe and are billed on a set interval.
				</p>
			</div>
			<Switch bind:checked={isSubscription} />
		</div>
		<input type="hidden" name="isSubscription" value={isSubscription ? 'on' : ''} />
		{#if isSubscription}
			<div>
				<p class="mb-2 text-xs font-medium text-muted-foreground">Billing interval</p>
				<Tabs bind:value={billingInterval}>
					<TabsList>
						<TabsTrigger value="monthly">Monthly</TabsTrigger>
						<TabsTrigger value="yearly">Yearly</TabsTrigger>
					</TabsList>
				</Tabs>
				<input type="hidden" name="billingInterval" value={billingInterval} />
			</div>
			<div>
				<p class="mb-1 text-xs font-medium text-muted-foreground">Drop-off / delivery info</p>
				<p class="mb-2 text-xs text-muted-foreground">
					Optional. Explain how customers receive this — e.g. doorstep delivery schedule. You'll
					arrange details with each customer directly.
				</p>
				<Textarea
					name="fulfillmentNote"
					bind:value={fulfillmentNote}
					maxlength={500}
					rows={3}
					placeholder="e.g. Delivered to your door every Wednesday morning. We'll confirm your address after you subscribe."
				/>
			</div>
		{/if}
	</div>
{/snippet}

{#snippet formFields()}
	{#if twoColumn}
		<div class="space-y-3 md:space-y-5">
			{@render fieldImage()}
			{@render fieldName()}
			{@render fieldDescription()}
			{@render fieldPrice()}
			{#if categories.length > 0}
				<div class="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
					<div>{@render fieldCategory()}</div>
					<div>{@render fieldStatus()}</div>
				</div>
			{:else}
				{@render fieldStatus()}
			{/if}
			{@render fieldTags()}
			{@render fieldPickupType()}
			{#if !isSubscription && pickupType !== 'custom_date'}{@render fieldAvailabilityMode()}{/if}
			{#if hasSubscriptionsAddon}{@render fieldSubscription()}{/if}
		</div>
	{:else}
		<div class="space-y-3 md:space-y-5">
			{@render fieldImage()}
			{@render fieldName()}
			{@render fieldDescription()}
			{@render fieldPrice()}
			{#if categories.length > 0}{@render fieldCategory()}{/if}
			{@render fieldTags()}
			{@render fieldStatus()}
			{@render fieldPickupType()}
			{#if !isSubscription && pickupType !== 'custom_date'}{@render fieldAvailabilityMode()}{/if}
			{#if hasSubscriptionsAddon}{@render fieldSubscription()}{/if}
		</div>
	{/if}
	<input type="hidden" name="sortOrder" value={item?.sortOrder ?? 0} />
	{#if itemId !== undefined}
		<input type="hidden" name="id" value={itemId} />
	{/if}
{/snippet}

{#snippet formFooter(fullWidth?: boolean)}
	{#if mode === 'edit'}
		<Button
			type="submit"
			disabled={uploading || isSubmitting}
			variant="default"
			class={fullWidth ? 'w-full md:w-auto' : ''}
		>
			{#if isSubmitting}
				<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
				Saving...
			{:else}
				Save changes
			{/if}
		</Button>
	{:else if onSuccess}
		<Button
			type="submit"
			disabled={uploading || isSubmitting}
			variant="default"
			class={fullWidth ? 'w-full md:w-auto' : ''}
		>
			{#if isSubmitting}
				<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
				Saving...
			{:else}
				Save &amp; add modifiers
			{/if}
		</Button>
		<Button
			type="submit"
			data-add-another="1"
			disabled={uploading || isSubmitting}
			variant="outline"
			class={fullWidth ? 'w-full md:w-auto' : ''}
		>
			{#if isSubmitting}
				<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
				Saving...
			{:else}
				Save &amp; add another
			{/if}
		</Button>
	{:else}
		<Button
			type="submit"
			disabled={uploading || isSubmitting}
			variant="default"
			class={fullWidth ? 'w-full md:w-auto' : ''}
		>
			{#if isSubmitting}
				<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
				Saving...
			{:else}
				Create item
			{/if}
		</Button>
		{#if onCancel}
			<Button
				type="button"
				onclick={onCancel}
				variant="outline"
				class={fullWidth ? 'w-full md:w-auto' : ''}>Cancel</Button
			>
		{/if}
	{/if}
{/snippet}

{#if internalError}
	<Alert severity="error" class="mb-4">{internalError}</Alert>
{/if}

{#if variant === 'card'}
	<Card class="shadow-sm">
		<form method="post" action={formAction} use:enhance={handleEnhance}>
			<CardContent class="pt-6 pb-2">
				{@render formFields()}
			</CardContent>
			<CardFooter class="gap-3">
				{@render formFooter(false)}
			</CardFooter>
		</form>
	</Card>
{:else}
	<form method="post" action={formAction} use:enhance={handleEnhance}>
		<div class="pb-2">
			{@render formFields()}
		</div>
		<div class="flex flex-col gap-3 pt-5 md:flex-row">
			{@render formFooter(true)}
		</div>
	</form>
{/if}
