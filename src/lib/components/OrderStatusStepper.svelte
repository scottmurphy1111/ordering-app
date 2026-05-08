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
	const totalSteps = lifecycleStages.length;

	const fillWidth = $derived(stepIndex >= 0 ? `${(stepIndex / (totalSteps - 1)) * 100}%` : '0%');
</script>

{#if variant === 'full'}
	<div class="relative flex items-start justify-between">
		<!-- connector line behind steps -->
		<div class="absolute top-5 right-0 left-0 h-0.5 bg-muted" aria-hidden="true">
			<div
				class="h-full transition-all duration-500 {colorScheme === 'themed' ? 'bg-primary' : ''}"
				style={colorScheme === 'branding'
					? `background-color: var(--background-color); width: ${fillWidth};`
					: `width: ${fillWidth};`}
			></div>
		</div>

		{#each lifecycleStages as step, i (step.value)}
			{@const done = i < stepIndex}
			{@const active = i === stepIndex}
			{@const achieved = done || active}
			{@const label = labelOverrides[step.value] ?? step.label}
			<div
				class="relative z-10 flex flex-col items-center gap-1.5"
				style="width: {100 / totalSteps}%;"
			>
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
						class="text-center text-xs leading-tight"
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
						class="text-center text-xs leading-tight {active
							? 'font-semibold text-primary'
							: done
								? 'font-medium text-gray-700'
								: 'text-gray-400'}"
					>
						{label}
					</span>
				{/if}
			</div>
		{/each}
	</div>
{:else}
	<!-- mini variant: no labels, smaller circles -->
	<div class="relative flex items-center justify-between">
		<div class="absolute top-3 right-0 left-0 h-0.5 bg-muted" aria-hidden="true">
			<div
				class="h-full transition-all duration-500 {colorScheme === 'themed' ? 'bg-primary' : ''}"
				style={colorScheme === 'branding'
					? `background-color: var(--background-color); width: ${fillWidth};`
					: `width: ${fillWidth};`}
			></div>
		</div>

		{#each lifecycleStages as step, i (step.value)}
			{@const done = i < stepIndex}
			{@const active = i === stepIndex}
			{@const achieved = done || active}
			<div class="relative z-10 flex justify-center" style="width: {100 / totalSteps}%;">
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
		{/each}
	</div>
{/if}
