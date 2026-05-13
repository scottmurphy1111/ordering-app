<script lang="ts">
	import { isVendorOpen, type HoursRow, type ExceptionRow } from '$lib/hours/isOpen';

	let {
		hours,
		exceptions,
		vendorTimezone
	}: {
		hours: HoursRow[];
		exceptions: ExceptionRow[];
		vendorTimezone: string;
	} = $props();

	let now = $state(new Date());

	$effect(() => {
		const interval = setInterval(() => {
			now = new Date();
		}, 60_000);
		return () => clearInterval(interval);
	});

	const openState = $derived(isVendorOpen(hours, exceptions, vendorTimezone, now));

	function formatTime(d: Date): string {
		return d.toLocaleTimeString('en-US', {
			timeZone: vendorTimezone,
			hour: 'numeric',
			minute: '2-digit'
		});
	}

	function formatDayAndTime(d: Date): string {
		const today = new Date().toLocaleDateString('en-CA', { timeZone: vendorTimezone });
		const targetDay = d.toLocaleDateString('en-CA', { timeZone: vendorTimezone });
		const time = formatTime(d);
		if (today === targetDay) return `today at ${time}`;
		const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleDateString('en-CA', {
			timeZone: vendorTimezone
		});
		if (tomorrow === targetDay) return `tomorrow at ${time}`;
		const dayLabel = d.toLocaleDateString('en-US', {
			timeZone: vendorTimezone,
			weekday: 'long'
		});
		return `${dayLabel} at ${time}`;
	}
</script>

<div class="flex items-center gap-2 rounded-lg border bg-background/95 px-3 py-2 backdrop-blur-sm">
	{#if openState.isOpen}
		<div class="h-2 w-2 shrink-0 rounded-full bg-emerald-500"></div>
		<p class="text-sm font-medium text-foreground">
			Open · <span class="text-muted-foreground">closes at {formatTime(openState.closesAt)}</span>
		</p>
	{:else if openState.opensAt}
		<div class="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/50"></div>
		<p class="text-sm font-medium text-foreground">
			Closed · <span class="text-muted-foreground">opens {formatDayAndTime(openState.opensAt)}</span
			>
		</p>
	{:else}
		<div class="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/50"></div>
		<p class="text-sm font-medium text-foreground">Closed</p>
	{/if}
</div>
