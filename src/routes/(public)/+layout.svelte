<script lang="ts">
	import type { LayoutData } from './$types';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import StorefrontHeader from '$lib/components/storefront/StorefrontHeader.svelte';
	import { resolveFontPair, googleFontsUrl } from '$lib/storefront/font-pairs';
	import { getReadableTextColor } from '$lib/storefront/contrast';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const backgroundColor = $derived(data.vendor.backgroundColor ?? '#000000');
	const accentColor = $derived(data.vendor.accentColor ?? '#374151');
	const foregroundColor = $derived(data.vendor.foregroundColor ?? '#ffffff');
	const accentForeground = $derived(getReadableTextColor(accentColor));

	const fontPair = $derived(resolveFontPair(data.vendor.fontPair));
	const fontsUrl = $derived(googleFontsUrl(fontPair));
</script>

<svelte:head>
	{#if data.storefrontDisabled}
		<meta name="robots" content="noindex" />
	{/if}
	<link rel="stylesheet" href={fontsUrl} />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -- values are server-validated (hex-regex for colors, known-list for fonts); safe to inline as CSS custom properties -->
	{@html `<style>
		:root {
			--background-color: ${backgroundColor};
			--accent-color: ${accentColor};
			--foreground-color: ${foregroundColor};
			--accent-foreground: ${accentForeground};
			--font-heading: ${fontPair.heading.cssStack};
			--font-body: ${fontPair.body.cssStack};
		}
	</style>`}
</svelte:head>

<div class="flex min-h-screen flex-col bg-neutral-50" style="font-family: var(--font-body);">
	<StorefrontHeader
		vendorName={data.vendor.name}
		logoUrl={data.vendor.logoUrl}
		headerMode={data.vendor.headerMode}
	/>

	{#if data.storefrontDisabled}
		<div class="flex flex-1 items-center justify-center px-4 py-24 text-center">
			<div class="max-w-md">
				<h1
					class="text-2xl font-semibold text-neutral-900"
					style="font-family: var(--font-heading);"
				>
					{data.vendor.name} is taking a short break
				</h1>
				<p class="mt-3 text-sm text-neutral-600">
					This shop is temporarily unavailable. Please check back soon.
				</p>
			</div>
		</div>
	{:else}
		<div class="flex-1">
			{@render children()}
		</div>
	{/if}

	<footer class="border-t border-neutral-200 bg-white">
		<div
			class="mx-auto flex max-w-6xl flex-col items-center gap-1.5 px-4 py-5 sm:flex-row sm:justify-center"
		>
			{#if data.vendor.website}
				<a
					href={data.vendor.website}
					target="_blank"
					rel="external noopener noreferrer"
					class="text-xs font-semibold text-neutral-600 hover:underline">{data.vendor.name}</a
				>
				<span class="hidden text-neutral-400 sm:inline">·</span>
			{/if}
			{#if data.vendor.subscriptionTier !== 'pro'}
				<p class="text-xs font-semibold tracking-wide text-neutral-500 uppercase">
					Order<span class="text-primary">Local</span>
				</p>
			{/if}
			<p class="text-xs text-neutral-500">
				&copy; {new Date().getFullYear()} All rights reserved.
			</p>
		</div>
	</footer>

	<ConfirmModal />
</div>
