<script lang="ts">
	import FilterPills from './FilterPills.svelte';
	import type { FilterPill } from './FilterPills.svelte';

	export type FilterTab = FilterPill;

	let {
		tabs,
		active,
		onchange
	}: { tabs: FilterTab[]; active: string; onchange: (value: string) => void } = $props();
</script>

<FilterPills pills={tabs} {active} onSelect={onchange} />
