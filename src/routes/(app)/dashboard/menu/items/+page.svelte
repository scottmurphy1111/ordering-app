<!-- src/routes/(app)/dashboard/menu/items/+page.svelte -->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PageData } from './$types';
	let { data } = $props() as { data: PageData };

	let search = $state('');
</script>

<h1 class="mb-6 text-3xl font-bold">Menu Items</h1>

<!-- Search + Filter + New Button -->
<div class="mb-6 flex gap-4">
	<input type="text" bind:value={search} placeholder="Search items..." />
	<!-- Category filter select -->
	<button
		onclick={() => {
			goto(resolve('/dashboard/menu/items/new'));
		}}>+ New Item</button
	>
</div>

{#each data.items as item (item.id)}
	<div class="rounded-lg border p-4">
		<h3>{item.name}</h3>
		<p>${(item.price / 100).toFixed(2)}</p>
		{#if item.description}
			<span class="text-sm text-gray-500">{item.description}</span>
		{/if}
		<div class="flex gap-2">
			<button>Edit</button>
			<button>Delete</button>
		</div>
	</div>
{/each}

<!-- Pagination controls -->
