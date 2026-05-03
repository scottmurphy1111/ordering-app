<script lang="ts">
	export interface FilterTab {
		label: string;
		value: string;
		count: number;
		dot?: boolean;
	}

	let {
		tabs,
		active,
		onchange
	}: { tabs: FilterTab[]; active: string; onchange: (value: string) => void } = $props();
</script>

<div class="flex gap-1.5 overflow-x-auto pb-0.5">
	{#each tabs as tab (tab.value)}
		{@const isActive = active === tab.value}
		{@const showDot = (tab.dot ?? false) && tab.count > 0 && !isActive}
		<button
			type="button"
			onclick={() => onchange(tab.value)}
			class="flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors
				{isActive
				? 'bg-primary text-white'
				: 'border border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200'}"
		>
			{tab.label}
			{tab.count}
			{#if showDot}
				<span class="h-1.5 w-1.5 rounded-full bg-amber-400"></span>
			{/if}
		</button>
	{/each}
</div>
