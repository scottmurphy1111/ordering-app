<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	const isHistory = $derived(page.url.pathname.includes('/history'));
</script>

<div class="flex overflow-hidden rounded-lg border bg-background">
	<button
		type="button"
		onclick={() => goto(resolve('/dashboard/orders'))}
		class="flex items-center gap-1.5 border-r px-4 py-2 text-sm font-medium transition-colors
			{!isHistory ? 'bg-gray-900 text-white' : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'}"
	>
		<span class="relative flex h-1.5 w-1.5 shrink-0">
			{#if !isHistory}
				<span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70 opacity-75"></span>
			{/if}
			<span class="relative inline-flex h-1.5 w-1.5 rounded-full {!isHistory ? 'bg-primary' : 'bg-muted-foreground/30'}"></span>
		</span>
		Live
	</button>
	<button
		type="button"
		onclick={() => goto(resolve('/dashboard/orders/history'))}
		class="flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors
			{isHistory ? 'bg-gray-900 text-white' : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'}"
	>
		<Icon icon="mdi:history" class="h-3.5 w-3.5" />
		History
	</button>
</div>
