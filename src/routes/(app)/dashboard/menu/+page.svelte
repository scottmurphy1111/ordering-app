<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Card, CardContent } from '$lib/components/ui/card';

	const sections = [
		{
			href: '/dashboard/menu/items',
			icon: 'mdi:food',
			label: 'Menu Items',
			description: 'Add, edit, and organize your menu items.'
		},
		{
			href: '/dashboard/menu/categories',
			icon: 'mdi:folder-outline',
			label: 'Categories',
			description: 'Group your menu items into categories.'
		}
	];
</script>

<div>
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-900">Menu Management</h1>
		<p class="mt-0.5 text-sm text-gray-500">
			Create and organize your menu items, categories, and modifiers.
		</p>
	</div>
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each sections as section (section.href)}
			<a href={resolve(section.href as `/${string}`)}>
				<Card class="shadow-sm transition-colors hover:bg-muted/50">
					<CardContent class="flex items-start gap-4">
						<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100">
							<Icon icon={section.icon} class="h-5 w-5 text-green-700" />
						</div>
						<div>
							<p class="font-semibold">{section.label}</p>
							<p class="mt-0.5 text-sm text-muted-foreground">{section.description}</p>
						</div>
					</CardContent>
				</Card>
			</a>
		{/each}
	</div>
</div>
