<script lang="ts">
	import type { PageData } from './$types';
	import Icon from '@iconify/svelte';

	let { data }: { data: PageData } = $props();

	const DAYS = [
		'monday',
		'tuesday',
		'wednesday',
		'thursday',
		'friday',
		'saturday',
		'sunday'
	] as const;

	type Day = (typeof DAYS)[number];

	function formatTime(hhmm: string): string {
		const [h, m] = hhmm.split(':').map(Number);
		const period = h < 12 ? 'AM' : 'PM';
		const hour = h === 0 ? 12 : h > 12 ? h - 12 : h;
		return m === 0 ? `${hour} ${period}` : `${hour}:${String(m).padStart(2, '0')} ${period}`;
	}

	const hoursByDay = $derived(
		DAYS.reduce<Record<Day, typeof data.hours>>(
			(acc, day) => {
				acc[day] = data.hours
					.filter((r) => r.dayOfWeek === day)
					.sort((a, b) => a.openTime.localeCompare(b.openTime));
				return acc;
			},
			{} as Record<Day, typeof data.hours>
		)
	);

	const address = $derived(
		data.vendor.address as { street?: string; city?: string; state?: string; zip?: string } | null
	);

	const hasHours = $derived(data.hours.length > 0);
	const hasContact = $derived(!!(data.vendor.phone || data.vendor.email || data.vendor.website));
	const hasAddress = $derived(!!(address?.city || address?.street));

	const openState = $derived(data.openState);

	function formatOpenStatus(): string {
		if (openState.isOpen) {
			const closes = new Intl.DateTimeFormat('en-US', {
				timeZone: data.timezone,
				hour: 'numeric',
				minute: '2-digit'
			}).format(openState.closesAt);
			return `Open · Closes ${closes}`;
		}
		if (openState.opensAt) {
			const now = new Date();
			const isToday =
				new Intl.DateTimeFormat('en-CA', { timeZone: data.timezone }).format(now) ===
				new Intl.DateTimeFormat('en-CA', { timeZone: data.timezone }).format(openState.opensAt);
			const opens = new Intl.DateTimeFormat('en-US', {
				timeZone: data.timezone,
				hour: 'numeric',
				minute: '2-digit',
				...(isToday ? {} : { weekday: 'short' })
			}).format(openState.opensAt);
			return `Closed · Opens ${opens}`;
		}
		return 'Closed';
	}
</script>

<svelte:head>
	<title>Store info — {data.vendor.name}</title>
</svelte:head>

<main class="mx-auto max-w-2xl px-4 py-8 sm:py-12">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-neutral-900" style="font-family: var(--font-heading);">
			Store Info
		</h1>
	</div>

	<!-- Open status pill -->
	<div class="mb-6 flex items-center gap-2">
		<span
			class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium"
			style="background-color: {openState.isOpen
				? 'color-mix(in srgb, var(--accent-color) 15%, white)'
				: 'color-mix(in srgb, #6b7280 12%, white)'}; color: {openState.isOpen
				? 'var(--accent-color)'
				: '#374151'};"
		>
			<span
				class="h-2 w-2 rounded-full"
				style="background-color: {openState.isOpen ? 'var(--accent-color)' : '#9ca3af'};"
			></span>
			{formatOpenStatus()}
		</span>
	</div>

	<div class="space-y-6">
		<!-- Hours -->
		{#if hasHours}
			<section class="rounded-xl border border-neutral-200 bg-white">
				<div class="flex items-center gap-2 border-b border-neutral-100 px-5 py-4">
					<Icon icon="mdi:clock-outline" class="h-4 w-4 text-neutral-400" />
					<h2
						class="text-sm font-semibold text-neutral-900"
						style="font-family: var(--font-heading);"
					>
						Hours
					</h2>
				</div>
				<ul class="divide-y divide-neutral-100">
					{#each DAYS as day (day)}
						{@const shifts = hoursByDay[day]}
						{@const isToday = day === data.todayDayName}
						<li
							class="flex items-start justify-between gap-3 px-5 py-3 {isToday
								? 'bg-neutral-50'
								: ''}"
						>
							<span
								class="w-28 shrink-0 text-sm {isToday
									? 'font-semibold text-neutral-900'
									: 'text-neutral-600'} capitalize"
							>
								{day}
								{#if isToday}
									<span
										class="ml-1 inline-block rounded-full px-1.5 py-0.5 text-[10px] leading-none font-medium"
										style="background-color: var(--accent-color); color: var(--foreground-color);"
									>
										Today
									</span>
								{/if}
							</span>
							<div class="flex flex-1 flex-col items-end gap-0.5">
								{#if shifts.length === 0}
									<span class="text-sm text-neutral-400">Closed</span>
								{:else}
									{#each shifts as shift (shift.id)}
										<span
											class="text-sm {isToday
												? 'font-medium text-neutral-900'
												: 'text-neutral-600'}"
										>
											{formatTime(shift.openTime.slice(0, 5))} – {formatTime(
												shift.closeTime.slice(0, 5)
											)}
										</span>
									{/each}
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			</section>
		{/if}

		<!-- Location / Address -->
		{#if hasAddress}
			<section class="rounded-xl border border-neutral-200 bg-white px-5 py-4">
				<div class="mb-3 flex items-center gap-2">
					<Icon icon="mdi:map-marker-outline" class="h-4 w-4 text-neutral-400" />
					<h2
						class="text-sm font-semibold text-neutral-900"
						style="font-family: var(--font-heading);"
					>
						Location
					</h2>
				</div>
				<address class="text-sm text-neutral-600 not-italic">
					{#if address?.street}<p>{address.street}</p>{/if}
					{#if address?.city || address?.state || address?.zip}
						<p>
							{[address?.city, address?.state, address?.zip].filter(Boolean).join(', ')}
						</p>
					{/if}
				</address>
			</section>
		{/if}

		<!-- Contact -->
		{#if hasContact}
			<section class="rounded-xl border border-neutral-200 bg-white px-5 py-4">
				<div class="mb-3 flex items-center gap-2">
					<Icon icon="mdi:phone-outline" class="h-4 w-4 text-neutral-400" />
					<h2
						class="text-sm font-semibold text-neutral-900"
						style="font-family: var(--font-heading);"
					>
						Contact
					</h2>
				</div>
				<ul class="space-y-2">
					{#if data.vendor.phone}
						<li class="flex items-center gap-2 text-sm text-neutral-600">
							<Icon icon="mdi:phone-outline" class="h-3.5 w-3.5 shrink-0 text-neutral-400" />
							<a href="tel:{data.vendor.phone}" class="hover:underline">{data.vendor.phone}</a>
						</li>
					{/if}
					{#if data.vendor.email}
						<li class="flex items-center gap-2 text-sm text-neutral-600">
							<Icon icon="mdi:email-outline" class="h-3.5 w-3.5 shrink-0 text-neutral-400" />
							<a href="mailto:{data.vendor.email}" class="hover:underline">{data.vendor.email}</a>
						</li>
					{/if}
					{#if data.vendor.website}
						<li class="flex items-center gap-2 text-sm text-neutral-600">
							<Icon icon="mdi:web" class="h-3.5 w-3.5 shrink-0 text-neutral-400" />
							<a
								href={data.vendor.website}
								target="_blank"
								rel="external noopener noreferrer"
								class="hover:underline"
							>
								{data.vendor.website.replace(/^https?:\/\//, '')}
							</a>
						</li>
					{/if}
				</ul>
			</section>
		{/if}

		<!-- Empty state if nothing to show -->
		{#if !hasHours && !hasAddress && !hasContact}
			<div class="rounded-xl border border-neutral-200 bg-white p-10 text-center">
				<Icon icon="mdi:information-outline" class="mx-auto mb-3 h-8 w-8 text-neutral-300" />
				<p class="text-sm text-neutral-500">Store information coming soon.</p>
			</div>
		{/if}
	</div>
</main>
