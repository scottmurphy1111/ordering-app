<script lang="ts">
	// import { resolve } from '$app/paths';
	// import Icon from '@iconify/svelte';
	// import { Card, CardContent } from '$lib/components/ui/card';
	// import type { PageData } from './$types';

	// let { data }: { data: PageData } = $props();

	// const sections = [
	// 	{
	// 		href: '/dashboard/catalog/items',
	// 		icon: 'mdi:silverware-fork-knife',
	// 		label: 'Menu Items',
	// 		description: 'Add, edit, and organize your menu items.'
	// 	},
	// 	{
	// 		href: '/dashboard/catalog/categories',
	// 		icon: 'mdi:tag-multiple-outline',
	// 		label: 'Categories',
	// 		description: 'Group your menu items into categories.'
	// 	}
	// ];
</script>

<!-- <div>
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-foreground">Menu Management</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">
			Create and organize your menu items and categories.
		</p>
	</div>

	{#if data.itemCount > 0 || data.categoryCount > 0}
		<p class="mb-5 text-sm text-muted-foreground">
			{data.itemCount}
			{data.itemCount === 1 ? 'item' : 'items'} across
			{data.categoryCount}
			{data.categoryCount === 1 ? 'category' : 'categories'}
		</p>
	{/if}

	<div class="grid gap-4 sm:grid-cols-2">
		{#each sections as section (section.href)}
			<a href={resolve(section.href as `/${string}`)}>
				<Card class="shadow-sm transition-colors hover:bg-muted/50 py-6">
					<CardContent class="flex items-start gap-5 px-6">
						<div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
							<Icon icon={section.icon} class="h-6 w-6 text-primary" />
						</div>
						<div>
							<p class="text-base font-semibold">{section.label}</p>
							<p class="mt-0.5 text-sm text-muted-foreground">{section.description}</p>
						</div>
					</CardContent>
				</Card>
			</a>
		{/each}
	</div>
</div> -->
