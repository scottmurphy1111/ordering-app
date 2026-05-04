<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';

	const activeValue = $derived(page.url.pathname.includes('/history') ? 'history' : 'live');

	function handleValueChange(value: string) {
		goto(resolve(value === 'history' ? '/dashboard/orders/history' : '/dashboard/orders'));
	}
</script>

<Tabs value={activeValue} onValueChange={handleValueChange}>
	<TabsList>
		<TabsTrigger value="live">
			<span class="relative flex h-1.5 w-1.5 shrink-0">
				{#if activeValue === 'live'}
					<span
						class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70 opacity-75"
					></span>
				{/if}
				<span
					class="relative inline-flex h-1.5 w-1.5 rounded-full {activeValue === 'live'
						? 'bg-primary'
						: 'bg-muted-foreground/30'}"
				></span>
			</span>
			Live
		</TabsTrigger>
		<TabsTrigger value="history">
			<Icon icon="mdi:history" class="h-3.5 w-3.5" />
			History
		</TabsTrigger>
	</TabsList>
</Tabs>
