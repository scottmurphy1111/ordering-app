<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Alert } from '$lib/components/ui/alert';
	import Icon from '@iconify/svelte';
	import { untrack } from 'svelte';
	import { confirmDialog } from '$lib/confirm.svelte';
	import { enhanceWithToasts } from '$lib/forms/enhance-with-toasts';
	import { Switch } from '$lib/components/ui/switch';

	let { data }: { data: PageData } = $props();

	// Per-form save errors (separate so an error in one form doesn't bleed into others).
	let hoursSaveError = $state<string | null>(null);
	let addExceptionError = $state<string | null>(null);
	let removeExceptionError = $state<string | null>(null);
	let submittingSaveHours = $state(false);
	let submittingAddException = $state(false);
	let submittingRemoveExceptionId = $state<number | null>(null);

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

	const DAY_LABELS: Record<Day, string> = {
		monday: 'Monday',
		tuesday: 'Tuesday',
		wednesday: 'Wednesday',
		thursday: 'Thursday',
		friday: 'Friday',
		saturday: 'Saturday',
		sunday: 'Sunday'
	};

	type DayState = { enabled: boolean; openTime: string; closeTime: string };

	function buildDayStates(hours: typeof data.hours): Record<Day, DayState> {
		return Object.fromEntries(
			DAYS.map((day) => {
				const row = hours.find((h) => h.dayOfWeek === day);
				return [
					day,
					row
						? {
								enabled: true,
								openTime: row.openTime.substring(0, 5),
								closeTime: row.closeTime.substring(0, 5)
							}
						: { enabled: false, openTime: '09:00', closeTime: '17:00' }
				];
			})
		) as Record<Day, DayState>;
	}

	let dayStates = $state<Record<Day, DayState>>(untrack(() => buildDayStates(data.hours)));

	// Sync local form state when server data updates after a save
	$effect(() => {
		const h = data.hours;
		untrack(() => {
			Object.assign(dayStates, buildDayStates(h));
		});
	});

	// Add exception form state
	let addIsClosed = $state(true);
	let addDate = $state('');
	let addOpen = $state('09:00');
	let addClose = $state('17:00');
	let addNote = $state('');

	function formatTime(date: Date) {
		return new Intl.DateTimeFormat('en-US', {
			timeZone: data.timezone,
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		}).format(date);
	}

	function formatExceptionDate(dateStr: string) {
		const [y, m, d] = dateStr.split('-').map(Number);
		return new Date(y, m - 1, d).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<div class="max-w-2xl">
	<!-- Page header -->
	<div class="mb-6 flex flex-col justify-between gap-2">
		<div class="w-auto">
			<h1 class="text-2xl font-bold text-foreground">Operating Hours</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				Set your regular weekly hours and override specific dates as needed.
			</p>
		</div>

		<!-- Open state badge -->
		<div
			class="flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-nowrap {data
				.openState.isOpen
				? 'bg-success/10 text-success'
				: 'bg-muted text-muted-foreground'}"
		>
			<span
				class="h-1.5 w-1.5 rounded-full {data.openState.isOpen
					? 'bg-success'
					: 'bg-muted-foreground/40'}"
			></span>
			{#if data.openState.isOpen}
				Open now · closes {formatTime(data.openState.closesAt)}
			{:else if data.openState.opensAt}
				Closed · opens {formatTime(data.openState.opensAt)}
			{:else}
				Closed today
			{/if}
		</div>
	</div>

	{#if hoursSaveError}
		<Alert severity="error" class="mb-6">{hoursSaveError}</Alert>
	{/if}
	{#if removeExceptionError}
		<Alert severity="error" class="mb-6">{removeExceptionError}</Alert>
	{/if}

	<!-- Weekly hours card -->
	<Card class="mb-6">
		<CardHeader>
			<CardTitle>Weekly hours</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			<form
				id="hours-form"
				method="post"
				action="?/saveHours"
				use:enhance={enhanceWithToasts({
					successMessage: 'Hours saved',
					onStart: () => {
						submittingSaveHours = true;
						hoursSaveError = null;
					},
					onEnd: () => {
						submittingSaveHours = false;
					},
					onError: (msg) => {
						hoursSaveError = msg;
					}
				})}
				class="divide-y divide-border"
			>
				{#each DAYS as day (day)}
					<div class="overflow-x-auto px-6 py-3">
						<span class="block text-sm font-medium text-foreground">{DAY_LABELS[day]}</span>
						<div class="mt-2 flex items-center gap-1">
							{#if dayStates[day].enabled}
								<input
									type="time"
									name="{day}_open"
									bind:value={dayStates[day].openTime}
									class="h-8 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
								/>
								<span class="text-xs text-muted-foreground/60">to</span>
								<input
									type="time"
									name="{day}_close"
									bind:value={dayStates[day].closeTime}
									class="h-8 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
								/>
							{:else}
								<span class="text-sm text-muted-foreground/60">Closed</span>
							{/if}
							<Switch id="{day}-enabled" bind:checked={dayStates[day].enabled} class="ml-auto" />
						</div>
						<input type="hidden" name="{day}_enabled" value={dayStates[day].enabled ? 'on' : ''} />
					</div>
				{/each}
			</form>
		</CardContent>
		<CardFooter class="gap-2">
			<Button type="submit" form="hours-form" disabled={submittingSaveHours}>
				{#if submittingSaveHours}
					<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
					Saving...
				{:else}
					Save hours
				{/if}
			</Button>
		</CardFooter>
	</Card>

	<!-- Date exceptions card -->
	<Card>
		<CardHeader>
			<CardTitle>Date exceptions</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			{#if addExceptionError}
				<Alert severity="error">{addExceptionError}</Alert>
			{/if}

			<!-- Existing exceptions -->
			{#if data.exceptions.length > 0}
				<div class="divide-y divide-border">
					{#each data.exceptions as exc (exc.id)}
						<div class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
									<span class="text-sm font-medium whitespace-nowrap text-foreground">
										{formatExceptionDate(exc.date)}
									</span>
									<span class="text-sm text-muted-foreground">
										{#if exc.isClosed}
											Closed all day
										{:else}
											{exc.openTime?.substring(0, 5) ?? ''} – {exc.closeTime?.substring(0, 5) ?? ''}
										{/if}
									</span>
								</div>
								{#if exc.note}
									<p class="mt-0.5 truncate text-xs text-muted-foreground/70">{exc.note}</p>
								{/if}
							</div>
							<form
								method="post"
								action="?/removeException"
								use:enhance={enhanceWithToasts({
									successMessage: 'Exception removed',
									onStart: () => {
										submittingRemoveExceptionId = exc.id;
										removeExceptionError = null;
									},
									onEnd: () => {
										submittingRemoveExceptionId = null;
									},
									onError: (msg) => {
										removeExceptionError = msg;
									}
								})}
							>
								<input type="hidden" name="exceptionId" value={exc.id} />
								<Button
									type="submit"
									disabled={submittingRemoveExceptionId !== null}
									onclick={async (e) => {
										e.preventDefault();
										const form = (e.currentTarget as HTMLButtonElement).form;
										if (
											await confirmDialog(
												`Remove the exception for ${formatExceptionDate(exc.date)}? This cannot be undone.`,
												{ title: 'Remove exception', confirmLabel: 'Remove' }
											)
										) {
											form?.requestSubmit();
										}
									}}
									variant="ghost"
									size="icon"
									class="shrink-0 text-red-500 hover:bg-red-50 hover:text-red-600"
								>
									{#if submittingRemoveExceptionId === exc.id}
										<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
									{:else}
										<Icon icon="mdi:trash-can-outline" class="h-4 w-4" />
									{/if}
								</Button>
							</form>
						</div>
					{/each}
				</div>
			{:else}
				<p class="text-sm text-muted-foreground">No date exceptions yet.</p>
			{/if}

			<!-- Add a date exception -->
			<div class="border-t border-border pt-4">
				<p class="mb-3 text-sm font-medium text-foreground">Add a date exception</p>
				<form
					id="add-exception-form"
					method="post"
					action="?/addException"
					use:enhance={enhanceWithToasts({
						successMessage: 'Exception added',
						onStart: () => {
							submittingAddException = true;
							addExceptionError = null;
						},
						onEnd: () => {
							submittingAddException = false;
						},
						onError: (msg) => {
							addExceptionError = msg;
						}
					})}
					class="flex flex-col gap-3"
				>
					<div class="flex flex-wrap items-end gap-x-6 gap-y-3">
						<!-- Date -->
						<div>
							<label for="exc-date" class="mb-1.5 block text-sm font-medium text-foreground"
								>Date</label
							>
							<input
								id="exc-date"
								type="date"
								name="date"
								bind:value={addDate}
								required
								class="h-8 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
							/>
						</div>

						<!-- Closed all day -->
						<div class="flex items-center gap-2 pb-1.5">
							<Switch id="exc-closed" bind:checked={addIsClosed} />
							<label for="exc-closed" class="text-sm text-foreground">Closed all day</label>
						</div>
						<input type="hidden" name="isClosed" value={addIsClosed ? 'on' : ''} />
					</div>

					{#if !addIsClosed}
						<div class="flex flex-wrap items-end gap-3">
							<div>
								<label for="exc-open" class="mb-1.5 block text-sm font-medium text-foreground"
									>Opens</label
								>
								<input
									id="exc-open"
									type="time"
									name="openTime"
									bind:value={addOpen}
									class="h-8 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
								/>
							</div>
							<div>
								<label for="exc-close" class="mb-1.5 block text-sm font-medium text-foreground"
									>Closes</label
								>
								<input
									id="exc-close"
									type="time"
									name="closeTime"
									bind:value={addClose}
									class="h-8 rounded-lg border border-input bg-background px-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
								/>
							</div>
						</div>
					{/if}

					<div>
						<label for="exc-note" class="mb-1.5 block text-sm font-medium text-foreground">
							Note <span class="font-normal text-muted-foreground/60">(optional)</span>
						</label>
						<input
							id="exc-note"
							type="text"
							name="note"
							bind:value={addNote}
							placeholder="e.g. Thanksgiving, holiday closure"
							class="h-8 w-full rounded-lg border border-input bg-background px-3 text-sm placeholder:text-muted-foreground/50 focus:ring-2 focus:ring-primary focus:outline-none"
						/>
					</div>
				</form>
			</div>
		</CardContent>
		<CardFooter>
			<Button
				type="submit"
				form="add-exception-form"
				variant="outline"
				disabled={submittingAddException}
			>
				{#if submittingAddException}
					<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
					Saving...
				{:else}
					Add exception
				{/if}
			</Button>
		</CardFooter>
	</Card>
</div>
