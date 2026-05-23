<script lang="ts">
	import { resolve } from '$app/paths';
	import { authPattern } from '$lib/storefront/auth-pattern';

	let { children } = $props();

	const patternDataUri = `url("data:image/svg+xml;utf8,${encodeURIComponent(authPattern.render('#ffffff'))}")`;
	const patternTileSize = authPattern.tileSize;
</script>

<div class="flex min-h-screen flex-col md:flex-row">
	<aside
		class="relative flex h-20 shrink-0 items-center justify-center overflow-hidden md:order-2 md:h-auto md:min-h-screen md:flex-1"
		style="
			background-image:
				{patternDataUri},
				linear-gradient(135deg, oklch(0.55 0.16 152.75) 0%, oklch(0.44 0.10 152.75) 100%);
			background-size: {patternTileSize}, cover;
			background-repeat: repeat, no-repeat;
		"
	>
		<a href={resolve('/')} class="text-xl font-bold tracking-tight text-white md:hidden">
			Order<span class="text-white/85">Local</span>
		</a>

		<div class="hidden max-w-lg rounded-lg bg-white/25 p-8 text-center md:block">
			<h2
				class="text-5xl leading-snug font-bold text-white"
				style="text-shadow: 0 2px 5px rgba(0, 0, 0, .2);"
			>
				Pre-orders and pickup, built for makers, bakers and growers.
			</h2>
			<h4 class="mt-6 text-lg leading-normal text-white/90">
				Order Local helps bakers, growers, and small producers run pickup-based ordering without a
				clunky e-commerce platform.
			</h4>
		</div>
	</aside>

	<main
		class="flex flex-1 flex-col justify-center px-8 py-10 md:order-1 md:max-w-120 md:px-12 md:py-16"
	>
		<a
			href={resolve('/')}
			class="mb-6 hidden text-2xl font-bold tracking-tight text-foreground md:block"
		>
			Order<span class="text-primary">Local</span>
		</a>

		<div class="flex items-center justify-center">
			<div class="w-full">
				{@render children()}
			</div>
		</div>

		<p class="mt-12 text-center text-xs text-muted-foreground">
			By signing in, you agree to our
			<a href={resolve('/terms')} class="underline hover:text-foreground">Terms of Service</a>
			and
			<a href={resolve('/privacy')} class="underline hover:text-foreground">Privacy Policy</a>.
		</p>
	</main>
</div>
