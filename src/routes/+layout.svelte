<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { TooltipProvider } from '$lib/components/ui/tooltip';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<TooltipProvider delayDuration={300}>
	{@render children()}
</TooltipProvider>
