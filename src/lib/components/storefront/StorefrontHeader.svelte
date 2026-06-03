<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '@iconify/svelte';

	let {
		vendorName,
		logoUrl,
		headerMode
	}: {
		vendorName: string;
		logoUrl: string | null;
		headerMode: 'logo' | 'name';
	} = $props();

	const currentPath = $derived(page.url.pathname);

	function isActive(path: string): boolean {
		if (path === '/catalog') {
			return (
				currentPath === '/catalog' || currentPath.startsWith('/item/') || currentPath === '/cart'
			);
		}
		return currentPath === path || currentPath.startsWith(path + '/');
	}
</script>

<header
	class="sticky top-0 z-50 w-full"
	style="background-color: var(--background-color); color: var(--foreground-color); border-bottom: 1px solid color-mix(in srgb, var(--foreground-color) 12%, transparent);"
>
	<div class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
		<!-- Wordmark zone -->
		<a
			href={resolve('/catalog' as `/${string}`)}
			class="flex items-center gap-3 transition-opacity hover:opacity-85"
		>
			{#if headerMode === 'logo' && logoUrl}
				<img
					src={logoUrl}
					alt={vendorName}
					class="max-h-10 w-auto max-w-48 shrink-0 object-contain sm:max-h-12 sm:max-w-64"
				/>
			{:else}
				<Icon
					icon="mdi:storefront-outline"
					class="h-5 w-5 shrink-0 sm:h-6 sm:w-6"
					style="color: var(--foreground-color);"
				/>
				<span
					class="truncate text-base font-semibold sm:text-lg"
					style="font-family: var(--font-heading); color: var(--foreground-color);"
				>
					{vendorName}
				</span>
			{/if}
		</a>

		<!-- Nav (desktop only) -->
		<nav class="hidden flex-1 items-center justify-center gap-1 md:flex">
			{@render navLink(resolve('/catalog' as `/${string}`), 'Menu', isActive('/catalog'))}
			{@render navLink(
				resolve('/store-info' as `/${string}`),
				'Store Info',
				isActive('/store-info')
			)}
		</nav>

		{#snippet navLink(href: string, label: string, active: boolean)}
			<!-- href is already resolve()-d at every call site; the rule can't trace through the snippet prop -->
			<!-- eslint-disable svelte/no-navigation-without-resolve -->
			<a
				{href}
				class="nav-link"
				class:is-active={active}
				aria-current={active ? 'page' : undefined}
			>
				{label}
			</a>
			<!-- eslint-enable svelte/no-navigation-without-resolve -->
		{/snippet}

		<!-- Cart icon (placeholder — prompt 3 wires real behavior) -->
		<a
			href={resolve('/cart' as `/${string}`)}
			class="flex items-center gap-2 rounded-full p-2 transition-opacity hover:opacity-85"
			style="color: var(--foreground-color);"
			aria-label="View cart"
		>
			<Icon icon="mdi:basket-outline" class="h-6 w-6" />
		</a>
	</div>
</header>

<style>
	/* Colors derive from the theme vars set at :root by the storefront layout,
	   so the nav pills adapt per vendor. */
	.nav-link {
		padding: 0.4rem 0.85rem;
		border-radius: 0.75rem;
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1;
		color: var(--accent-color);
		opacity: 0.9;
		transition:
			background-color 160ms ease,
			opacity 160ms ease,
			box-shadow 160ms ease;
	}
	.nav-link:hover {
		opacity: 1;
		background-color: color-mix(in srgb, var(--foreground-color) 10%, transparent);
	}
	.nav-link:focus-visible {
		outline: none;
		box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent-color) 55%, transparent);
	}
	.nav-link.is-active {
		opacity: 1;
		background-color: color-mix(in srgb, var(--foreground-color) 15%, transparent);
		box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--foreground-color) 20%, transparent);
	}
	.nav-link.is-active:hover {
		background-color: color-mix(in srgb, var(--foreground-color) 18%, transparent);
	}
</style>
