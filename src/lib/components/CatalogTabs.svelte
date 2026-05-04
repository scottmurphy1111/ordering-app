<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';

	const activeValue = $derived(page.url.pathname.includes('/categories') ? 'categories' : 'items');

	function handleValueChange(value: string) {
		goto(
			resolve(value === 'categories' ? '/dashboard/catalog/categories' : '/dashboard/catalog/items')
		);
	}
</script>

<Tabs value={activeValue} onValueChange={handleValueChange}>
	<TabsList>
		<TabsTrigger value="items">
			<Icon icon="mdi:silverware-fork-knife" class="h-3.5 w-3.5" />
			Items
		</TabsTrigger>
		<TabsTrigger value="categories">
			<Icon icon="mdi:tag-multiple-outline" class="h-3.5 w-3.5" />
			Categories
		</TabsTrigger>
	</TabsList>
</Tabs>
