<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';
	import CatalogItemForm from '$lib/components/CatalogItemForm.svelte';
	import ModifierGroupsManager from '$lib/components/ModifierGroupsManager.svelte';

	let { data }: { data: PageData } = $props();

	const itemModifiers = $derived(
		data.item.modifiers
			.map((m) => m.modifier)
			.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
	);
</script>

<div class="max-w-xl">
	<div class="mb-6 flex items-center gap-3">
		<a
			href={resolve('/dashboard/catalog/items')}
			class="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-muted-foreground"
			><Icon icon="mdi:arrow-left" class="h-4 w-4" /> Items</a
		>
		<h1 class="text-2xl font-bold text-foreground">Edit item</h1>
	</div>

	<!-- ── Item details form ─────────────────────────────────── -->
	<CatalogItemForm
		mode="edit"
		formAction="?/update"
		item={data.item}
		categories={data.categories}
		hasSubscriptionsAddon={data.hasSubscriptionsAddon}
	/>

	<!-- ── Modifier groups ───────────────────────────────────── -->
	<div class="mt-8">
		<ModifierGroupsManager groups={itemModifiers} itemId={data.item.id} />
	</div>

	<!-- ── Danger zone ───────────────────────────────────────── -->
	<div class="mt-6 rounded-xl border border-destructive/20 bg-background p-4">
		<h2 class="mb-2 text-sm font-semibold text-destructive">Danger zone</h2>
		<form method="post" action="?/delete" use:enhance>
			<Button
				type="submit"
				onclick={async (e) => {
					e.preventDefault();
					const form = (e.currentTarget as HTMLButtonElement).form;
					if (await confirmDialog('Delete this item? This cannot be undone.'))
						form?.requestSubmit();
				}}
				variant="destructive"
			>
				Delete item
			</Button>
		</form>
	</div>
</div>
