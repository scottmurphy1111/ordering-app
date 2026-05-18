<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Alert } from '$lib/components/ui/alert';
	import Icon from '@iconify/svelte';
	import { untrack } from 'svelte';
	import { confirmDialog } from '$lib/confirm.svelte';

	let { data, form: _form }: { data: PageData; form: ActionData } = $props();
	const form = $derived(_form as ActionData | null);
	let submittingSaveHours = $state(false);
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
			<h1 class="text-2xl font-bold text-gray-900">Operating Hours</h1>
			<p class="mt-1 text-sm text-gray-500">
				Set your regular weekly hours and override specific dates as needed.
			</p>
		</div>

		<!-- Open state badge -->
		<div
			class="flex w-fit items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-nowrap {data
				.openState.isOpen
				? 'bg-green-50 text-green-700'
				: 'bg-gray-100 text-gray-500'}"
		>
			<span
				class="h-1.5 w-1.5 rounded-full {data.openState.isOpen ? 'bg-green-500' : 'bg-gray-400'}"
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

	{#if form?.saveSuccess}
		<Alert severity="success" class="mb-6">Hours saved.</Alert>
	{/if}
	{#if form?.error}
		<Alert severity="error" class="mb-6">{form.error}</Alert>
	{/if}

	<!-- Weekly hours card -->
	<Card class="mb-6">
		<CardHeader>
			<CardTitle>Weekly hours</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			<form method="post" action="?/saveHours" use:enhance={() => {
				submittingSaveHours = true;
				return async ({ update }) => {
					submittingSaveHours = false;
					await update();
				};
			}} class="divide-y divide-gray-100">
				{#each DAYS as day (day)}
					<div class="flex items-center gap-4 px-6 py-3">
						<!-- Enable toggle -->
						<button
							type="button"
							onclick={() => (dayStates[day].enabled = !dayStates[day].enabled)}
							class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors {dayStates[
								day
							].enabled
								? 'bg-primary'
								: 'bg-gray-200'}"
							aria-label="Toggle {DAY_LABELS[day]}"
						>
							<span
								class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform {dayStates[
									day
								].enabled
									? 'translate-x-4'
									: 'translate-x-0.5'}"
							></span>
						</button>

						<!-- Hidden input: only submitted when enabled -->
						{#if dayStates[day].enabled}
							<input type="hidden" name="{day}_enabled" value="on" />
						{/if}

						<!-- Day label -->
						<span class="w-28 text-sm font-medium text-gray-700">{DAY_LABELS[day]}</span>

						{#if dayStates[day].enabled}
							<!-- Time inputs -->
							<div class="flex flex-1 items-center gap-2">
								<input
									type="time"
									name="{day}_open"
									bind:value={dayStates[day].openTime}
									class="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
								/>
								<span class="text-xs text-gray-400">to</span>
								<input
									type="time"
									name="{day}_close"
									bind:value={dayStates[day].closeTime}
									class="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
								/>
							</div>
						{:else}
							<span class="flex-1 text-sm text-gray-400">Closed</span>
						{/if}
					</div>
				{/each}

				<div class="flex justify-end px-6 py-4">
					<Button type="submit" disabled={submittingSaveHours}>
						{#if submittingSaveHours}
							<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
							Saving...
						{:else}
							Save hours
						{/if}
					</Button>
				</div>
			</form>
		</CardContent>
	</Card>

	<!-- Date exceptions card -->
	<Card>
		<CardHeader>
			<CardTitle>Date exceptions</CardTitle>
		</CardHeader>
		<CardContent class="p-0">
			{#if form?.addSuccess}
				<div class="px-6 pt-4">
					<Alert severity="success">Exception saved.</Alert>
				</div>
			{/if}
			{#if form?.addError}
				<div class="px-6 pt-4">
					<Alert severity="error">{form.addError}</Alert>
				</div>
			{/if}
			{#if form?.removeSuccess}
				<div class="px-6 pt-4">
					<Alert severity="success">Exception removed.</Alert>
				</div>
			{/if}

			<!-- Existing exceptions -->
			{#if data.exceptions.length > 0}
				<div class="overflow-hidden">
					<table class="w-full">
						<thead class="border-b border-gray-200 bg-gray-50">
							<tr>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wide text-gray-500 uppercase"
									>Date</th
								>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wide text-gray-500 uppercase"
									>Override</th
								>
								<th
									class="px-6 py-3 text-left text-xs font-medium tracking-wide text-gray-500 uppercase"
									>Note</th
								>
								<th class="px-6 py-3"></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-100">
							{#each data.exceptions as exc (exc.id)}
								<tr class="hover:bg-gray-50">
									<td class="px-6 py-3 text-sm text-gray-900">{formatExceptionDate(exc.date)}</td>
									<td class="px-6 py-3 text-sm text-gray-500">
										{#if exc.isClosed}
											Closed all day
										{:else}
											{exc.openTime?.substring(0, 5) ?? ''} – {exc.closeTime?.substring(0, 5) ?? ''}
										{/if}
									</td>
									<td class="px-6 py-3 text-sm text-gray-400">{exc.note ?? '—'}</td>
									<td class="px-6 py-3 text-right">
										<form
											method="post"
											action="?/removeException"
											use:enhance={() => {
												submittingRemoveExceptionId = exc.id;
												return async ({ update }) => {
													submittingRemoveExceptionId = null;
													await update();
												};
											}}
											onsubmit={async (e) => {
												e.preventDefault();
												const form = e.currentTarget as HTMLFormElement;
												if (
													await confirmDialog(
														`Remove the exception for ${formatExceptionDate(exc.date)}? This cannot be undone.`,
														{ title: 'Remove exception', confirmLabel: 'Remove' }
													)
												) {
													form.requestSubmit();
												}
											}}
										>
											<input type="hidden" name="exceptionId" value={exc.id} />
											<Button
												type="submit"
												disabled={submittingRemoveExceptionId !== null}
												variant="ghost"
												size="icon"
												class="text-red-400 hover:bg-red-50 hover:text-red-600"
											>
												{#if submittingRemoveExceptionId === exc.id}
													<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
												{:else}
													<Icon icon="mdi:trash-can-outline" class="h-4 w-4" />
												{/if}
											</Button>
										</form>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<div class="px-6 py-8 text-center">
					<p class="text-sm text-gray-500">No date exceptions yet.</p>
				</div>
			{/if}

			<!-- Add exception form -->
			<div class="border-t border-gray-100 px-6 py-4">
				<p class="mb-3 text-sm font-medium text-gray-700">Add a date exception</p>
				<form
					method="post"
					action="?/addException"
					use:enhance={({ formElement }) => {
						return async ({ result, update }) => {
							if (result.type === 'success') formElement.reset();
							await update();
						};
					}}
					class="flex flex-col gap-3"
				>
					<div class="flex flex-wrap items-end gap-3">
						<!-- Date -->
						<div>
							<label for="exc-date" class="mb-1.5 block text-sm font-medium text-gray-700"
								>Date</label
							>
							<input
								id="exc-date"
								type="date"
								name="date"
								bind:value={addDate}
								required
								class="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
							/>
						</div>

						<!-- Closed all day toggle -->
						<div class="flex items-center gap-2 pb-1">
							<button
								type="button"
								onclick={() => (addIsClosed = !addIsClosed)}
								class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors {addIsClosed
									? 'bg-primary'
									: 'bg-gray-200'}"
								aria-label="Toggle closed all day"
							>
								<span
									class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform {addIsClosed
										? 'translate-x-4'
										: 'translate-x-0.5'}"
								></span>
							</button>
							<input type="hidden" name="isClosed" value={addIsClosed ? 'on' : 'off'} />
							<span class="text-sm text-gray-700">Closed all day</span>
						</div>
					</div>

					{#if !addIsClosed}
						<div class="flex flex-wrap items-end gap-3">
							<div>
								<label for="exc-open" class="mb-1.5 block text-sm font-medium text-gray-700"
									>Opens</label
								>
								<input
									id="exc-open"
									type="time"
									name="openTime"
									bind:value={addOpen}
									class="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
								/>
							</div>
							<div>
								<label for="exc-close" class="mb-1.5 block text-sm font-medium text-gray-700"
									>Closes</label
								>
								<input
									id="exc-close"
									type="time"
									name="closeTime"
									bind:value={addClose}
									class="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
								/>
							</div>
						</div>
					{/if}

					<div>
						<label for="exc-note" class="mb-1.5 block text-sm font-medium text-gray-700"
							>Note <span class="font-normal text-gray-400">(optional)</span></label
						>
						<input
							id="exc-note"
							type="text"
							name="note"
							bind:value={addNote}
							placeholder="e.g. Thanksgiving, holiday closure"
							class="h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-primary focus:outline-none"
						/>
					</div>

					<div>
						<Button type="submit" variant="outline">Add exception</Button>
					</div>
				</form>
			</div>
		</CardContent>
	</Card>
</div>
