<script lang="ts">
	let {
		vendor,
		children
	}: {
		vendor: {
			name: string;
			tagline: string | null;
			logoUrl: string | null;
			heroImageUrl: string | null;
			backgroundColor: string | null;
			foregroundColor: string | null;
			heroDisplayMode: 'none' | 'headline' | 'headline_tagline';
			heroHeadline: string | null;
			website: string | null;
		};
		children?: import('svelte').Snippet;
	} = $props();

	const backgroundColor = $derived(vendor.backgroundColor ?? '#000000');

	const heroBackgroundStyle = $derived(`background-color: ${backgroundColor};`);
</script>

<section class="relative w-full overflow-hidden" style={heroBackgroundStyle}>
	{#if vendor.heroImageUrl}
		<img
			src={vendor.heroImageUrl}
			alt={vendor.name}
			class="absolute inset-0 h-full w-full object-cover"
		/>
		<div class="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent"></div>
	{/if}

	<div class="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20 md:py-32">
		{#if vendor.heroDisplayMode !== 'none'}
			<div class="flex flex-col items-start gap-2">
				{#if vendor.heroHeadline}
					<h1
						class="text-3xl leading-tight font-bold sm:text-4xl md:text-5xl"
						style="font-family: var(--font-heading); color: {vendor.heroImageUrl
							? '#ffffff'
							: 'var(--foreground-color)'};"
					>
						{vendor.heroHeadline}
					</h1>
				{/if}
				{#if vendor.heroDisplayMode === 'headline_tagline' && vendor.tagline}
					<p
						class="text-sm sm:text-base"
						style="color: {vendor.heroImageUrl
							? 'rgba(255, 255, 255, 0.9)'
							: 'color-mix(in srgb, var(--accent-color) 60%, var(--foreground-color))'};"
					>
						{vendor.tagline}
					</p>
				{/if}
			</div>
		{/if}

		{#if children}
			<div class="relative mt-4">
				{@render children()}
			</div>
		{/if}
	</div>
</section>
