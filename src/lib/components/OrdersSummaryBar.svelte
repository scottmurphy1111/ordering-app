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
				<span
					class="font-semibold {stat.urgent
						? 'text-amber-600'
						: stat.positive
							? 'text-emerald-600'
							: 'text-foreground'}">{stat.value}</span
				>
			</span>
		{/each}
	</div>
{:else}
	<!--
		Layout: mobile (<md) stacks vertically — label left, value right.
		       Desktop (≥md) uses CSS auto-fit grid sized to fit 5 cells at >=960px;
		       cells degrade gracefully to 4/3/2 per row as viewport narrows.
		       Min cell width 12rem (192px) is calibrated so the longest sublabel
		       ("of paid orders fulfilled" at ~24ch) never wraps.
	-->
	<div class="mb-5 rounded-xl bg-background px-4 py-3 ring-1 ring-foreground/10">
		<!-- Mobile: stacked rows, label left, value right -->
		<div class="flex flex-col md:hidden">
			{#each stats as stat, i (stat.label)}
				<div
					class="flex items-baseline justify-between gap-3 py-2.5 {i > 0
						? 'border-t border-foreground/10'
						: ''}"
				>
					<span class="text-xs text-muted-foreground">{stat.label}</span>
					<div class="flex flex-col items-end gap-0.5">
						<span
							class="text-sm font-semibold {stat.urgent
								? 'text-amber-600'
								: stat.positive
									? 'text-emerald-600'
									: 'text-foreground'}"
						>
							{stat.value}
						</span>
						{#if stat.sublabel}
							<span class="text-xs text-gray-400">{stat.sublabel}</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>

		<!-- Desktop: auto-fit grid -->
		<div
			class="hidden md:grid"
			style="grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 0.5rem 1.5rem;"
		>
			{#each stats as stat (stat.label)}
				<div>
					<p class="text-xs text-muted-foreground">{stat.label}</p>
					<p
						class="text-sm font-semibold {stat.urgent
							? 'text-amber-600'
							: stat.positive
								? 'text-emerald-600'
								: 'text-foreground'}"
					>
						{stat.value}
					</p>
					{#if stat.sublabel}
						<p class="text-xs text-gray-400">{stat.sublabel}</p>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}
