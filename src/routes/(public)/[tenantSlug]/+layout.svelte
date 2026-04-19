<script lang="ts">
	import type { LayoutData } from './$types';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const primaryColor = $derived(data.tenant.primaryColor ?? '#000000');
	const secondaryColor = $derived(data.tenant.secondaryColor ?? '#374151');
	const accentColor = $derived(data.tenant.accentColor ?? '#ffffff');
	const logoUrl = $derived(data.tenant.logoUrl ?? '');
	const backgroundImageUrl = $derived(data.tenant.backgroundImageUrl ?? '');
</script>

<div
	class="relative flex min-h-screen flex-col"
	style="--primary-color: {primaryColor}; --secondary-color: {secondaryColor}; --accent-color: {accentColor};"
>
	<!-- Background: custom image takes priority over tiled logo -->
	{#if backgroundImageUrl}
		<div
			aria-hidden="true"
			class="pointer-events-none fixed inset-0 z-0"
			style="background-image: url('{backgroundImageUrl}'); background-repeat: no-repeat; background-size: cover; background-position: center; opacity: 1;"
		></div>
	{:else if logoUrl}
		<div
			aria-hidden="true"
			class="pointer-events-none fixed inset-0 z-0 opacity-[0.04]"
			style="background-image: url('{logoUrl}'); background-repeat: repeat; background-size: 120px;"
		></div>
	{/if}

	<div class="relative z-10 flex-1">
		{@render children()}
	</div>

	<!-- Footer -->
	<footer class="relative z-10 border-t border-gray-200 bg-white/80 backdrop-blur-sm">
		<div
			class="mx-auto flex max-w-2xl flex-col items-center gap-1.5 px-4 py-5 sm:flex-row sm:justify-center"
		>
			{#if data.tenant.website}
				<a
					href={data.tenant.website}
					target="_blank"
					rel="noopener noreferrer"
					class="text-xs font-semibold text-gray-700 hover:underline">{data.tenant.name}</a
				>
				<span class="hidden text-gray-300 sm:inline">·</span>
			{/if}
			<p class="text-xs font-semibold tracking-wide text-gray-500 uppercase">
				Order<span class="text-green-600">Local</span>
			</p>
			<p class="text-xs text-gray-400">&copy; {new Date().getFullYear()} All rights reserved.</p>
		</div>
	</footer>
</div>
