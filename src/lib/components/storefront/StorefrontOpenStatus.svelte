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

<div
	class="flex items-center gap-2 rounded-lg border px-3 py-2"
	style="background-color: color-mix(in srgb, var(--foreground-color) 8%, transparent); border-color: color-mix(in srgb, var(--foreground-color) 15%, transparent);"
>
	{#if openState.isOpen}
		<div class="h-2 w-2 shrink-0 rounded-full bg-emerald-500"></div>
		<p class="text-sm font-medium" style="color: var(--foreground-color);">
			Open · <span style="color: color-mix(in srgb, var(--foreground-color) 65%, transparent);">closes at {formatTime(openState.closesAt)}</span>
		</p>
	{:else if openState.opensAt}
		<div class="h-2 w-2 shrink-0 rounded-full" style="background-color: color-mix(in srgb, var(--foreground-color) 30%, transparent);"></div>
		<p class="text-sm font-medium" style="color: var(--foreground-color);">
			Closed · <span style="color: color-mix(in srgb, var(--foreground-color) 65%, transparent);">opens {formatDayAndTime(openState.opensAt)}</span>
		</p>
	{:else}
		<div class="h-2 w-2 shrink-0 rounded-full" style="background-color: color-mix(in srgb, var(--foreground-color) 30%, transparent);"></div>
		<p class="text-sm font-medium" style="color: var(--foreground-color);">Closed</p>
	{/if}
</div>
