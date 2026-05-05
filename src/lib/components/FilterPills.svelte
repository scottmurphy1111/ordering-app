<script lang="ts">
	import Icon from '@iconify/svelte';

	export interface FilterPill {
		label: string;
		value: string;
		count: number;
		dot?: boolean;
		icon?: string;
	}

	let {
		pills,
		active,
		onSelect
	}: {
		pills: FilterPill[];
		active: string;
		onSelect: (value: string) => void;
	} = $props();
</script>

<div class="flex gap-1.5 overflow-x-auto pb-0.5">
	{#each pills as pill (pill.value)}
		{@const isActive = active === pill.value}
		{@const showDot = (pill.dot ?? false) && pill.count > 0 && !isActive}
		<button
			type="button"
			onclick={() => onSelect(pill.value)}
			class="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors {isActive
				? 'bg-primary text-white'
				: 'border border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200'}"
		>
			{#if pill.icon}
				<Icon icon={pill.icon} class="h-3 w-3 shrink-0" />
			{/if}
			{pill.label}
			{pill.count}
			{#if showDot}
				<span class="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
			{/if}
		</button>
	{/each}
</div>
