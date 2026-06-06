<script lang="ts">
	import { resolve } from '$app/paths';

	let { children } = $props();
</script>

<div class="flex min-h-screen flex-col md:flex-row">
	<aside
		class="relative hidden shrink-0 items-center justify-center overflow-hidden md:order-2 md:flex md:h-auto md:min-h-screen md:flex-1"
		style="
			background-image:
				linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.55)),
				url('/marketing/auth-aside.webp');
			background-size: cover;
			background-position: center;
			background-repeat: no-repeat;
		"
	>
		<div class="hidden max-w-lg p-8 text-center md:block">
			<h2
				class="text-4xl leading-snug font-bold text-white"
				style="text-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);"
			>
				A clean, professional storefront for everything you sell.
			</h2>
			<h4
				class="mt-6 text-lg leading-normal text-white/90"
				style="text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);"
			>
				Organize your products, take pre-orders, and accept payments — all from one branded page,
				set up in minutes.
			</h4>
		</div>
	</aside>

	<main
		class="flex flex-1 flex-col justify-center px-8 py-10 md:order-1 md:max-w-120 md:px-12 md:py-16"
	>
		<a
			href={resolve('/')}
			class="mb-6 block text-center text-2xl font-bold tracking-tight text-foreground md:text-left"
		>
			Order<span class="text-primary">Local</span>
		</a>

		<!-- Mobile value block: the desktop aside is hidden below md:, so give mobile
		     a short outcome line above the card. The card itself carries the
		     reassurance + trust row (shown at all breakpoints), so we don't repeat
		     the trust row here. -->
		<p class="mb-6 text-center text-sm font-medium text-foreground md:hidden">
			You're one step from your storefront.
		</p>

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
