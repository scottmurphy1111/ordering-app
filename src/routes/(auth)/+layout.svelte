<script lang="ts">
	import { resolve } from'$app/paths';

	let { children } = $props();
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-muted/50 px-4">
	<a href={resolve('/')} class="mb-2 text-4xl font-bold tracking-tight text-foreground">
		Order<span class="text-primary">Local</span>
	</a>
	<p class="mb-6 text-sm text-muted-foreground">Pre-orders and pickup, built for makers, bakers, and growers.</p>
	<div class="w-full max-w-sm text-center">
		{@render children()}
	</div>
</div>
