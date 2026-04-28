<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	const isCategories = $derived(page.url.pathname.includes('/categories'));
</script>

<div class="flex overflow-hidden rounded-lg border bg-background">
	<button
		type="button"
		onclick={() => goto(resolve('/dashboard/catalog/items'))}
		class="flex items-center gap-1.5 border-r px-4 py-2 text-sm font-medium transition-colors
			{!isCategories ? 'bg-gray-900 text-white' : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'}"
	>
		<Icon icon="mdi:silverware-fork-knife" class="h-3.5 w-3.5" />
		Items
	</button>
	<button
		type="button"
		onclick={() => goto(resolve('/dashboard/catalog/categories'))}
		class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors
			{isCategories ? 'bg-gray-900 text-white' : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'}"
	>
		<Icon icon="mdi:tag-multiple-outline" class="h-3.5 w-3.5" />
		Categories
	</button>
</div>
