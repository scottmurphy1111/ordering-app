<script lang="ts">
	import { findPatternBySlug, patternDataUriSoft } from '$lib/storefront/background-patterns';

	let {
		vendor,
		children
	}: {
		vendor: {
			name: string;
			tagline: string | null;
			logoUrl: string | null;
			bannerUrl: string | null;
			backgroundColor: string | null;
			foregroundColor: string | null;
			backgroundPatternSlug: string | null;
			showName: boolean;
			showLogo: boolean;
			showTagline: boolean;
			website: string | null;
		};
		children?: import('svelte').Snippet;
	} = $props();

	const backgroundColor = $derived(vendor.backgroundColor ?? '#000000');
	const foregroundColor = $derived(vendor.foregroundColor ?? '#ffffff');
	const pattern = $derived(findPatternBySlug(vendor.backgroundPatternSlug));

	const heroBackgroundStyle = $derived.by(() => {
		if (vendor.bannerUrl) {
			return `background-color: ${backgroundColor};`;
		}
		if (pattern) {
			return `background-color: ${backgroundColor}; background-image: ${patternDataUriSoft(pattern, foregroundColor, backgroundColor)}; background-repeat: repeat; background-size: ${pattern.tileSize};`;
		}
		return `background-color: ${backgroundColor};`;
	});
</script>

<section class="relative w-full overflow-hidden" style={heroBackgroundStyle}>
	{#if vendor.bannerUrl}
		<img
			src={vendor.bannerUrl}
			alt={vendor.name}
			class="absolute inset-0 h-full w-full object-cover"
		/>
		<div class="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent"></div>
	{/if}

	<div class="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 md:py-24">
		<div class="flex flex-col items-start gap-6 md:flex-row md:items-end md:justify-between">
			<!-- Identity: logo + name + tagline -->
			<div class="flex items-end gap-4">
				{#if vendor.showLogo && vendor.logoUrl}
					<img
						src={vendor.logoUrl}
						alt={vendor.name}
						class="max-h-16 w-auto max-w-64 shrink-0 object-contain sm:max-h-20 sm:max-w-80 {vendor.bannerUrl
							? 'drop-shadow'
							: ''}"
					/>
				{/if}
				<div>
					{#if vendor.showName}
						<h1
							class="text-3xl leading-tight font-bold sm:text-4xl md:text-5xl"
							style="font-family: var(--font-heading); color: {vendor.bannerUrl
								? '#ffffff'
								: 'var(--foreground-color)'};"
						>
							{vendor.name}
						</h1>
					{/if}
					{#if vendor.showTagline && vendor.tagline}
						<p
							class="mt-2 text-sm sm:text-base"
							style="color: {vendor.bannerUrl
								? 'rgba(255, 255, 255, 0.85)'
								: 'color-mix(in srgb, var(--foreground-color) 75%, transparent)'};"
						>
							{vendor.tagline}
						</p>
					{/if}
				</div>
			</div>

			<!-- Status slot -->
			{#if children}
				<div class="shrink-0">
					{@render children()}
				</div>
			{/if}
		</div>
	</div>
</section>
