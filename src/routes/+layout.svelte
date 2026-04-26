<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	let { children } = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

{@render children()}

<footer class="border-t bg-background px-6 py-12">
	<div class="mx-auto max-w-6xl">
		<!-- 4-column grid -->
		<div class="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
			<!-- Col 1: Logo + tagline -->
			<div>
				<a href={resolve('/')} class="text-xl font-bold tracking-tight text-foreground">
					Order<span class="text-primary">Local</span>
				</a>
				<p class="mt-2 text-sm leading-relaxed text-muted-foreground">
					Online ordering, without the big-platform fees.
				</p>
			</div>

			<!-- Col 2: Product -->
			<div>
				<p class="mb-3 text-xs font-semibold tracking-wide text-foreground uppercase">Product</p>
				<nav class="flex flex-col gap-2 text-sm text-muted-foreground">
					<a href="#features" class="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1">Features</a>
					<a href="#how-it-works" class="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1">How it works</a>
					<a href="#pricing" class="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1">Pricing</a>
					<a href="#faq" class="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1">FAQ</a>
					<a href={resolve('/login')} class="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1">Sign in</a>
				</nav>
			</div>

			<!-- Col 3: Company -->
			<div>
				<p class="mb-3 text-xs font-semibold tracking-wide text-foreground uppercase">Company</p>
				<nav class="flex flex-col gap-2 text-sm text-muted-foreground">
					<a href="mailto:hello@getorderlocal.com" rel="external" class="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1">Contact</a>
				</nav>
			</div>

			<!-- Col 4: Legal -->
			<div>
				<p class="mb-3 text-xs font-semibold tracking-wide text-foreground uppercase">Legal</p>
				<nav class="flex flex-col gap-2 text-sm text-muted-foreground">
					<a href={resolve('/privacy')} class="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1">Privacy Policy</a>
					<a href={resolve('/terms')} class="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1">Terms of Service</a>
				</nav>
			</div>
		</div>

		<!-- Bottom row -->
		<div class="mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row">
			<p class="text-xs text-muted-foreground">
				© {new Date().getFullYear()} Order<span class="text-primary">Local</span>. All rights reserved.
			</p>
			<div class="flex items-center gap-4">
				<a
					href="https://x.com/getorderlocal"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Order Local on X"
					class="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
				>
					<Icon icon="mdi:twitter" class="h-4 w-4" aria-hidden="true" />
				</a>
				<a
					href="https://linkedin.com/company/getorderlocal"
					target="_blank"
					rel="noopener noreferrer"
					aria-label="Order Local on LinkedIn"
					class="text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
				>
					<Icon icon="mdi:linkedin" class="h-4 w-4" aria-hidden="true" />
				</a>
			</div>
		</div>
	</div>
</footer>
