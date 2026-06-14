<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Alert } from '$lib/components/ui/alert';
	import CatalogItemForm from '$lib/components/CatalogItemForm.svelte';
	import ModifierGroupsManager from '$lib/components/ModifierGroupsManager.svelte';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import { enhanceWithToasts } from '$lib/forms/enhance-with-toasts';
	import { toast } from '$lib/toast';

	let { data }: { data: PageData } = $props();
	let submitting = $state(false);
	let deleteError = $state<string | null>(null);

	// Direct-link sharing for unlisted items (hidden from the public catalog).
	function itemShareUrl(): string | null {
		return data.storefrontOrigin ? `${data.storefrontOrigin}/item/${data.item.id}` : null;
	}
	async function copyItemLink() {
		const url = itemShareUrl();
		if (!url) return;
		try {
			await navigator.clipboard.writeText(url);
			toast.success('Link copied');
		} catch {
			toast.error('Could not copy link');
		}
	}

	const itemModifiers = $derived(
		data.item.modifiers
			.map((m) => m.modifier)
			.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
	);
</script>

<div class="max-w-xl">
	<div class="mb-6 flex items-center justify-between gap-3">
		<div class="flex min-w-0 items-center gap-3">
			<a
				href={resolve('/dashboard/catalog/items')}
				class="inline-flex shrink-0 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
				><Icon icon="mdi:chevron-left" class="h-4 w-4" /> Items</a
			>
			<span class="text-muted-foreground/40">/</span>
			<h1 class="truncate text-2xl font-bold text-foreground">{data.item.name}</h1>
			{#if data.item.isUnlisted}
				<span
					class="shrink-0 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
					>Unlisted</span
				>
			{/if}
		</div>
		{#if data.item.isUnlisted && data.storefrontOrigin}
			<div class="flex shrink-0 items-center gap-1">
				<Button variant="ghost" size="icon" onclick={copyItemLink} aria-label="Copy share link">
					<Icon icon="mdi:link-variant" class="h-4 w-4" />
				</Button>
				<Button
					variant="ghost"
					size="icon"
					href={itemShareUrl()}
					target="_blank"
					rel="noopener"
					aria-label="View storefront page"
				>
					<Icon icon="mdi:open-in-new" class="h-4 w-4" />
				</Button>
			</div>
		{/if}
	</div>

	<!-- ── Item details form ─────────────────────────────────── -->
	<CatalogItemForm
		mode="edit"
		formAction="?/update"
		item={data.item}
		categories={data.categories}
		fulfillmentModel={data.fulfillmentModel}
		hasSubscriptionsAddon={data.hasSubscriptionsAddon}
	/>

	<!-- ── Modifier groups ───────────────────────────────────── -->
	<div class="mt-8">
		<ModifierGroupsManager groups={itemModifiers} itemId={data.item.id} />
	</div>

	<!-- ── Danger zone ───────────────────────────────────────── -->
	<Card class="mt-6 border-destructive/20">
		<CardContent class="space-y-3">
			<h2 class="text-sm font-semibold">Danger zone</h2>
			{#if deleteError}
				<Alert severity="error">{deleteError}</Alert>
			{/if}
		</CardContent>
		<CardFooter>
			<form
				method="post"
				action="?/delete"
				use:enhance={enhanceWithToasts({
					// successMessage omitted — server returns a redirect.
					onStart: () => {
						submitting = true;
						deleteError = null;
					},
					onEnd: () => {
						submitting = false;
					},
					onError: (msg) => {
						deleteError = msg;
					}
				})}
			>
				<Button
					type="submit"
					disabled={submitting}
					onclick={async (e) => {
						e.preventDefault();
						const form = (e.currentTarget as HTMLButtonElement).form;
						if (await confirmDialog('Delete this item? This cannot be undone.'))
							form?.requestSubmit();
					}}
					variant="destructive"
				>
					{#if submitting}
						<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
						Deleting...
					{:else}
						Delete item
					{/if}
				</Button>
			</form>
		</CardFooter>
	</Card>
</div>
