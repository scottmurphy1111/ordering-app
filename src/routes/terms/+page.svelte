<script lang="ts">
	import { resolve } from '$app/paths';
</script>

<svelte:head>
	<title>Terms of Service — Order Local</title>
</svelte:head>

<main class="mx-auto max-w-2xl px-6 py-16">
	<h1 class="text-3xl font-bold text-foreground">Terms of Service</h1>
	<!-- TODO(copy): confirm with legal team before publishing -->
	<p class="mt-4 text-muted-foreground">Our full terms of service are coming soon.</p>
</main>

<footer class="border-t px-6 py-8">
	<div class="mx-auto flex max-w-2xl items-center justify-between gap-4">
		<a href={resolve('/')} class="text-sm font-bold tracking-tight text-foreground">
			Order<span class="text-primary">Local</span>
		</a>
		<p class="text-xs text-muted-foreground">© {new Date().getFullYear()} Order Local. All rights reserved.</p>
	</div>
</footer>
