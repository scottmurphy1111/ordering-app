<script lang="ts">
	import Icon from '@iconify/svelte';
	import { lifecycleStages } from '$lib/utils/order-lifecycle';

	let {
		status,
		variant = 'full',
		colorScheme = 'themed',
		labelOverrides = {}
	}: {
		status: string;
		variant?: 'full' | 'mini';
		colorScheme?: 'branding' | 'themed';
		labelOverrides?: Partial<Record<(typeof lifecycleStages)[number]['value'], string>>;
	} = $props();

	const stepIndex = $derived(lifecycleStages.findIndex((s) => s.value === status));
</script>

{#if variant === 'full'}
	<!-- pb-7 reserves vertical space for absolutely positioned labels below circles -->
	<div class="flex w-full max-w-100 items-center px-4 pb-7">
		{#each lifecycleStages as step, i (step.value)}
			{@const done = i < stepIndex}
			{@const active = i === stepIndex}
			{@const achieved = done || active}
			{@const label = labelOverrides[step.value] ?? step.label}
			<!-- circle wrapper: fixed-width to circle size; label absolutely below so it doesn't push siblings -->
			<div class="relative w-10 shrink-0">
				{#if colorScheme === 'branding'}
					<div
						class="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors"
						style={achieved
							? 'background-color: var(--background-color); border-color: var(--background-color); color: var(--foreground-color);'
							: 'background-color: white; border-color: #e5e7eb; color: #9ca3af;'}
					>
						<Icon icon={step.icon} class="h-5 w-5" />
					</div>
					<span
						class="absolute top-full left-1/2 mt-1.5 -translate-x-1/2 text-center text-xs leading-tight whitespace-nowrap"
						style={active
							? 'color: var(--background-color); font-weight: 600;'
							: done
								? 'color: #374151; font-weight: 500;'
								: 'color: #9ca3af;'}
					>
						{label}
					</span>
				{:else}
					<div
						class="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors {achieved
							? 'border-primary bg-white text-primary'
							: 'border-gray-200 bg-white text-gray-400'}"
					>
						<Icon icon={step.icon} class="h-5 w-5" />
					</div>
					<span
						class="absolute top-full left-1/2 mt-1.5 -translate-x-1/2 text-center text-xs leading-tight whitespace-nowrap {active
							? 'font-semibold text-primary'
							: done
								? 'font-medium text-gray-700'
								: 'text-gray-400'}"
					>
						{label}
					</span>
				{/if}
			</div>
			{#if i < lifecycleStages.length - 1}
				<!-- connector segment: flex-1 fills gap between this circle and next -->
				{@const filled = i < stepIndex}
				<div
					class="h-0.5 flex-1 transition-colors {colorScheme === 'themed'
						? filled
							? 'bg-primary'
							: 'bg-muted'
						: ''}"
					style={colorScheme === 'branding' && filled
						? 'background-color: var(--background-color);'
						: colorScheme === 'branding'
							? 'background-color: #e5e7eb;'
							: ''}
					aria-hidden="true"
				></div>
			{/if}
		{/each}
	</div>
{:else}
	<!-- mini variant: no labels -->
	<div class="flex items-center">
		{#each lifecycleStages as step, i (step.value)}
			{@const done = i < stepIndex}
			{@const active = i === stepIndex}
			{@const achieved = done || active}
			<div class="w-6 shrink-0">
				{#if colorScheme === 'branding'}
					<div
						class="flex h-6 w-6 items-center justify-center rounded-full border transition-colors"
						style={achieved
							? 'background-color: var(--background-color); border-color: var(--background-color); color: var(--foreground-color);'
							: 'background-color: white; border-color: #e5e7eb; color: #9ca3af;'}
					>
						<Icon icon={step.icon} class="h-3.5 w-3.5" />
					</div>
				{:else}
					<div
						class="flex h-6 w-6 items-center justify-center rounded-full border transition-colors {achieved
							? 'border-primary bg-white text-primary'
							: 'border-gray-200 bg-white text-gray-400'}"
					>
						<Icon icon={step.icon} class="h-3.5 w-3.5" />
					</div>
				{/if}
			</div>
			{#if i < lifecycleStages.length - 1}
				{@const filled = i < stepIndex}
				<div
					class="h-0.5 flex-1 transition-colors {colorScheme === 'themed'
						? filled
							? 'bg-primary'
							: 'bg-muted'
						: ''}"
					style={colorScheme === 'branding' && filled
						? 'background-color: var(--background-color);'
						: colorScheme === 'branding'
							? 'background-color: #e5e7eb;'
							: ''}
					aria-hidden="true"
				></div>
			{/if}
		{/each}
	</div>
{/if}
