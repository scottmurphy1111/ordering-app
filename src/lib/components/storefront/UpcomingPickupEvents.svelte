<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	interface UpcomingWindow {
		id: number;
		startsAt: Date;
		endsAt: Date;
		name: string | null;
		locationName: string | null;
	}

	let {
		windows,
		vendorTimezone
	}: {
		windows: UpcomingWindow[];
		vendorTimezone: string;
	} = $props();

	const visible = $derived(windows.slice(0, 4));
	const hasMore = $derived(windows.length > 4);

	function formatWindowDate(d: Date): string {
		return d.toLocaleDateString('en-US', {
			timeZone: vendorTimezone,
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	}

	function formatWindowTime(d: Date): string {
		return d.toLocaleTimeString('en-US', {
			timeZone: vendorTimezone,
			hour: 'numeric',
			minute: '2-digit'
		});
	}
</script>

{#if visible.length > 0}
	<section class="space-y-3">
		<div class="flex items-baseline justify-between">
			<h2 class="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
				Upcoming pickup events
			</h2>
			{#if hasMore}
				<a
					href={resolve('/cart' as `/${string}`)}
					class="text-xs font-medium text-primary hover:underline"
				>
					See all
				</a>
			{/if}
		</div>
		<ul class="space-y-2">
			{#each visible as win (win.id)}
				<li
					class="flex items-start gap-3 rounded-lg border bg-background/95 px-3 py-2.5 backdrop-blur-sm"
				>
					<Icon icon="mdi:calendar-clock" class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
					<div class="min-w-0 flex-1">
						<p class="text-sm font-medium text-foreground">
							{formatWindowDate(new Date(win.startsAt))} ·
							<span class="text-muted-foreground">{formatWindowTime(new Date(win.startsAt))}</span>
						</p>
						{#if win.locationName}
							<p class="mt-0.5 text-xs text-muted-foreground">{win.locationName}</p>
						{/if}
					</div>
				</li>
			{/each}
		</ul>
	</section>
{/if}
