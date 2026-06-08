<script lang="ts">
	import { resolve } from '$app/paths';

	import { MediaQuery } from 'svelte/reactivity';

	let { children } = $props();
	let isMedium = new MediaQuery('(min-width: 768px)');
</script>

<div class="flex min-h-screen flex-col md:flex-row">
	<aside
		class="relative hidden shrink-0 items-center justify-center overflow-hidden md:order-2 md:flex md:h-auto md:min-h-screen md:flex-1"
		style="
			background-image:
				radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 1), rgba(0, 0, 0, 0.2) 40%),
				url('/marketing/iStock-1318889309.webp');
			background-size: cover;
			background-position: 25% 50%;
			background-repeat: no-repeat;
		"
	>
		<div class="hidden max-w-lg p-8 text-center md:block">
			<h2
				class="text-4xl leading-snug font-bold text-white"
				style="text-shadow: 0 2px 8px rgba(0, 0, 0, 0.45);"
			>
				Your shop starts here.
			</h2>
			<h4
				class="mt-6 text-lg leading-normal text-white/90"
				style="text-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);"
			>
				List what you make, share your link, and take your first order — your own branded
				storefront, set up in minutes.
			</h4>
		</div>
	</aside>

	<main
		class="flex flex-1 flex-col justify-center px-8 py-10 md:order-1 md:max-w-120 md:px-12 md:py-16"
		style={// On mobile, we want to show the background image, but on desktop, the aside takes care of it.
		!isMedium.current
			? `
          background-image:
            radial-gradient(circle at 50% 50%, rgba(0, 0, 0, 1), rgba(0, 0, 0, 0.2) 40%),
            url('/marketing/iStock-1318889309.webp');
          background-size: cover;
          background-position: 25% 0%;
          background-repeat: no-repeat;
        `
			: ''}
	>
		<a
			href={resolve('/')}
			class="mb-6 block text-center text-2xl font-bold tracking-tight text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.4)] md:text-left md:text-foreground md:[text-shadow:none]"
		>
			Order<span class="text-primary">Local</span>
		</a>

		<!-- Mobile value block: the desktop aside is hidden below md:, so give mobile
		     a short outcome line above the card. The card itself carries the
		     reassurance + trust row (shown at all breakpoints), so we don't repeat
		     the trust row here. -->
		<p
			class="mb-6 text-center text-sm font-medium text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.4)] md:hidden"
		>
			You're one step from your storefront.
		</p>

		<div class="flex items-center justify-center">
			<div class="w-full">
				{@render children()}
			</div>
		</div>

		<p
			class="mt-12 text-center text-xs text-white/80 [text-shadow:0_1px_3px_rgba(0,0,0,0.4)] md:text-muted-foreground md:[text-shadow:none]"
		>
			By signing in, you agree to our
			<a href={resolve('/terms')} class="underline hover:text-white md:hover:text-foreground"
				>Terms of Service</a
			>
			and
			<a href={resolve('/privacy')} class="underline hover:text-white md:hover:text-foreground"
				>Privacy Policy</a
			>.
		</p>
	</main>
</div>
