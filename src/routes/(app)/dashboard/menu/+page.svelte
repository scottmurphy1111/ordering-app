<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

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
		},
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
			<a
				href={resolve(section.href as `/${string}`)}
				class="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
			>
				<Icon icon={section.icon} class="mt-0.5 h-6 w-6 shrink-0 text-gray-500" />
				<div>
					<p class="font-semibold text-gray-900">{section.label}</p>
					<p class="mt-0.5 text-sm text-gray-500">{section.description}</p>
				</div>
			</a>
		{/each}
	</div>
</div>
