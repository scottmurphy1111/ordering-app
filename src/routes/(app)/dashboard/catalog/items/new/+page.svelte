<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import CatalogItemForm from '$lib/components/CatalogItemForm.svelte';

	let { data }: { data: PageData } = $props();
</script>

<div class="max-w-xl">
	<div class="mb-6 flex items-center gap-3">
		<a
			href={resolve('/dashboard/catalog/items')}
			class="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-muted-foreground"
			><Icon icon="mdi:arrow-left" class="h-4 w-4" /> Items</a
		>
		<h1 class="text-2xl font-bold text-foreground">New item</h1>
	</div>

	<CatalogItemForm
		mode="new"
		formAction=""
		categories={data.categories}
		hasSubscriptionsAddon={data.hasSubscriptionsAddon}
	/>
</div>
