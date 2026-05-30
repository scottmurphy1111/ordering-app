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
		<nav class="hidden flex-1 items-center justify-center gap-8 md:flex">
			<a
				href={resolve('/catalog' as `/${string}`)}
				class="text-sm font-medium transition-opacity hover:opacity-100 {isActive('/catalog')
					? 'opacity-100'
					: 'opacity-75'}"
				style="color: {isActive('/catalog')
					? 'var(--accent-color)'
					: 'var(--accent-color)'}; border-bottom: 2px solid {isActive('/catalog')
					? 'var(--foreground-color)'
					: 'transparent'}; padding-bottom: 2px;"
			>
				Menu
			</a>
			<a
				href={resolve('/store-info' as `/${string}`)}
				class="text-sm font-medium transition-opacity hover:opacity-100 {isActive('/store-info')
					? 'opacity-100'
					: 'opacity-75'}"
				style="color: {isActive('/store-info')
					? 'var(--accent-color)'
					: 'var(--accent-color)'}; border-bottom: 2px solid {isActive('/store-info')
					? 'var(--foreground-color)'
					: 'transparent'}; padding-bottom: 2px;"
			>
				Store Info
			</a>
		</nav>

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
