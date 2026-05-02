<script lang="ts">
	export interface StatItem {
		label: string;
		value: string | number;
		urgent?: boolean;
		positive?: boolean;
		sublabel?: string;
	}

	let { stats, compact = false }: { stats: StatItem[]; compact?: boolean } = $props();
</script>

{#if compact}
	<div class="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-muted-foreground">
		{#each stats as stat, i (stat.label)}
			{#if i > 0}<span aria-hidden="true" class="text-muted-foreground/30">·</span>{/if}
			<span>
				{stat.label}
				<span class="font-semibold {stat.urgent ? 'text-amber-600' : stat.positive ? 'text-emerald-600' : 'text-foreground'}">{stat.value}</span>
			</span>
		{/each}
	</div>
{:else}
	<div class="mb-5 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border bg-muted/40 px-4 py-3">
		{#each stats as stat, i (stat.label)}
			{#if i > 0}
				<div class="h-6 w-px bg-border"></div>
			{/if}
			<div>
				<p class="text-xs text-muted-foreground">{stat.label}</p>
				<p class="text-sm font-semibold {stat.urgent ? 'text-amber-600' : stat.positive ? 'text-emerald-600' : 'text-foreground'}">{stat.value}</p>
				{#if stat.sublabel}
					<p class="text-xs text-gray-400">{stat.sublabel}</p>
				{/if}
			</div>
		{/each}
	</div>
{/if}
