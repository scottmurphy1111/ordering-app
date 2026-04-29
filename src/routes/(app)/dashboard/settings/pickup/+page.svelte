<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { RRule } from 'rrule';
	import { SvelteMap } from 'svelte/reactivity';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '$lib/components/ui/card';
	import {
		Table,
		TableBody,
		TableCell,
		TableHead,
		TableHeader,
		TableRow
	} from '$lib/components/ui/table';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// ── Phase 2: location state ───────────────────────────────────────────────

	let showAddForm = $state(false);
	let addError = $state<string | null>(null);
	let editingId = $state<number | null>(null);
	let editError = $state<string | null>(null);

	const editingLocation = $derived(
		editingId !== null ? (data.locations.find((l) => l.id === editingId) ?? null) : null
	);

	type Addr = { street?: string | null; city?: string | null; state?: string | null; zip?: string | null };

	function getAddr(raw: unknown): Addr {
		return (raw as Addr) ?? {};
	}

	function formatAddress(raw: unknown): string {
		const a = getAddr(raw);
		const parts = [a.street, a.city, a.state].filter(Boolean);
		return parts.length > 0 ? parts.join(', ') : '—';
	}

	function handleAddEnhance() {
		addError = null;
		return async ({
			result,
			update
		}: {
			result: { type: string; data?: Record<string, unknown> };
			update: (opts?: { reset?: boolean }) => Promise<void>;
		}) => {
			if (result.type === 'failure') {
				addError = (result.data?.error as string) ?? 'Something went wrong.';
				return;
			}
			showAddForm = false;
			addError = null;
			await update({ reset: true });
		};
	}

	function handleEditEnhance() {
		editError = null;
		return async ({
			result,
			update
		}: {
			result: { type: string; data?: Record<string, unknown> };
			update: (opts?: { reset?: boolean }) => Promise<void>;
		}) => {
			if (result.type === 'failure') {
				editError = (result.data?.error as string) ?? 'Something went wrong.';
				return;
			}
			editingId = null;
			editError = null;
			await update({ reset: false });
		};
	}

	// ── Phase 3: template state ───────────────────────────────────────────────

	let showAddTemplateForm = $state(false);
	let addTemplateForLocationId = $state<number | null>(null);
	let editingTemplateId = $state<number | null>(null);
	let addTemplateError = $state<string | null>(null);
	let editTemplateError = $state<string | null>(null);

	// Reactive preview state — drives the live occurrence preview in both forms
	let previewDays = $state<string[]>([]);
	let previewStartTime = $state('');
	let previewEndTime = $state('');
	let previewCutoffHours = $state(48);

	const editingTemplate = $derived(
		editingTemplateId !== null
			? (data.templates.find((t) => t.id === editingTemplateId) ?? null)
			: null
	);


	const DAY_ORDER = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'] as const;
	const DAY_LABELS: Record<string, string> = {
		MO: 'Mon',
		TU: 'Tue',
		WE: 'Wed',
		TH: 'Thu',
		FR: 'Fri',
		SA: 'Sat',
		SU: 'Sun'
	};

	function getRruleDays(recurrence: string): string[] {
		const match = recurrence.match(/BYDAY=([A-Z,]+)/);
		return match ? match[1].split(',') : [];
	}

	function formatTime(timeStr: string): string {
		if (!timeStr) return '';
		const [h, m] = timeStr.split(':').map(Number);
		const ampm = h < 12 ? 'am' : 'pm';
		const h12 = h % 12 || 12;
		return m > 0 ? `${h12}:${String(m).padStart(2, '0')}${ampm}` : `${h12}${ampm}`;
	}

	function formatRecurrence(recurrence: string): string {
		const days = getRruleDays(recurrence);
		const ordered = DAY_ORDER.filter((d) => days.includes(d));
		return 'Every ' + ordered.map((d) => DAY_LABELS[d]).join(' + ');
	}

	// Mirrors expand.ts — runs client-side so the preview needs no server round-trip
	function wallClockToUtc(rruleDate: Date, timeHHMM: string, ianaTimezone: string): Date {
		const year = rruleDate.getUTCFullYear();
		const month = rruleDate.getUTCMonth() + 1;
		const day = rruleDate.getUTCDate();
		const [hours, minutes] = timeHHMM.split(':').map(Number);
		const approxUtc = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
		const parts = new Intl.DateTimeFormat('en', {
			timeZone: ianaTimezone,
			hour: '2-digit',
			minute: '2-digit',
			hour12: false
		}).formatToParts(approxUtc);
		const localH = parseInt(parts.find((p) => p.type === 'hour')!.value);
		const localM = parseInt(parts.find((p) => p.type === 'minute')!.value);
		const normH = localH === 24 ? 0 : localH;
		const diffMs = ((hours - normH) * 60 + (minutes - localM)) * 60_000;
		return new Date(approxUtc.getTime() + diffMs);
	}

	type OccurrencePreview = { startsAt: Date; endsAt: Date; cutoffAt: Date };

	function computePreview(
		days: string[],
		start: string,
		end: string,
		cutoffHrs: number,
		tz: string
	): OccurrencePreview[] {
		if (days.length === 0 || !start || !end) return [];
		const BYDAY: Record<string, (typeof RRule.MO)> = {
			MO: RRule.MO, TU: RRule.TU, WE: RRule.WE, TH: RRule.TH,
			FR: RRule.FR, SA: RRule.SA, SU: RRule.SU
		};
		const now = new Date();
		const dtstart = new Date(
			Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0)
		);
		const rule = new RRule({
			freq: RRule.WEEKLY,
			byweekday: days.map((d) => BYDAY[d]).filter(Boolean),
			dtstart,
			count: 14
		});
		const results: OccurrencePreview[] = [];
		for (const occ of rule.all()) {
			const startsAt = wallClockToUtc(occ, start, tz);
			if (startsAt <= now) continue;
			const endsAt = wallClockToUtc(occ, end, tz);
			const cutoffAt = new Date(startsAt.getTime() - cutoffHrs * 3_600_000);
			results.push({ startsAt, endsAt, cutoffAt });
			if (results.length >= 6) break;
		}
		return results;
	}

	const occurrencePreview = $derived(
		computePreview(previewDays, previewStartTime, previewEndTime, previewCutoffHours, data.timezone)
	);

	function formatPreviewDate(date: Date, tz: string): string {
		return new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		}).format(date);
	}

	function formatPreviewTime(date: Date, tz: string): string {
		return new Intl.DateTimeFormat('en-US', {
			timeZone: tz,
			hour: 'numeric',
			minute: '2-digit',
			hour12: true
		})
			.format(date)
			.replace(':00 ', ' ')
			.toLowerCase();
	}

	// Templates grouped by locationId (null = unassigned)
	const templatesByLocation = $derived.by(() => {
		const map = new SvelteMap<number | null, typeof data.templates>();
		for (const loc of data.locations) {
			map.set(loc.id, []);
		}
		map.set(null, []);
		for (const tmpl of data.templates) {
			const key = tmpl.locationId ?? null;
			if (!map.has(key)) map.set(key, []);
			map.get(key)!.push(tmpl);
		}
		return map;
	});

	function handleAddTemplateEnhance() {
		addTemplateError = null;
		return async ({
			result,
			update
		}: {
			result: { type: string; data?: Record<string, unknown> };
			update: (opts?: { reset?: boolean }) => Promise<void>;
		}) => {
			if (result.type === 'failure') {
				addTemplateError = (result.data?.templateError as string) ?? 'Something went wrong.';
				return;
			}
			showAddTemplateForm = false;
			addTemplateForLocationId = null;
			addTemplateError = null;
			previewDays = [];
			previewStartTime = '';
			previewEndTime = '';
			await update({ reset: true });
		};
	}

	function handleEditTemplateEnhance() {
		editTemplateError = null;
		return async ({
			result,
			update
		}: {
			result: { type: string; data?: Record<string, unknown> };
			update: (opts?: { reset?: boolean }) => Promise<void>;
		}) => {
			if (result.type === 'failure') {
				editTemplateError = (result.data?.templateError as string) ?? 'Something went wrong.';
				return;
			}
			editingTemplateId = null;
			editTemplateError = null;
			previewDays = [];
			previewStartTime = '';
			previewEndTime = '';
			await update({ reset: false });
		};
	}
</script>

<div class="max-w-2xl">
	<!-- Page header -->
	<div class="mb-6">
		<a
			href={resolve('/dashboard/settings')}
			class="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-muted-foreground"
		>
			<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Settings
		</a>
		<h1 class="text-2xl font-bold text-foreground">Pickup schedule</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">
			Define where and when customers can pick up their orders.
		</p>
	</div>

	<!-- ── Pickup locations section (Phase 2) ─────────────────────────────── -->
	<div>
		<div class="mb-3 flex items-center justify-between">
			<div>
				<h2 class="text-base font-semibold text-foreground">Pickup locations</h2>
				<p class="mt-0.5 text-xs text-muted-foreground">
					Named places where customers collect their orders.
				</p>
			</div>
			{#if !showAddForm && editingId === null}
				<Button
					type="button"
					onclick={() => {
						showAddForm = true;
					}}
					variant="outline"
					size="sm"
				>
					+ Add location
				</Button>
			{/if}
		</div>

		{#if form?.createSuccess}
			<div
				class="mb-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary/90"
			>
				Location saved.
			</div>
		{/if}
		{#if form?.updateSuccess}
			<div
				class="mb-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary/90"
			>
				Location updated.
			</div>
		{/if}

		<!-- Edit form -->
		{#if editingId !== null && editingLocation !== null}
			{#if editError}
				<div
					class="mb-3 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
				>
					{editError}
				</div>
			{/if}
			<Card class="mb-4 shadow-sm">
				<form method="post" action="?/updateLocation" use:enhance={handleEditEnhance}>
					<input type="hidden" name="id" value={editingId} />
					<CardHeader>
						<CardTitle>Edit location</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						<div>
							<label
								class="mb-1 block text-sm font-medium text-muted-foreground"
								for="edit-name"
							>
								Name *
							</label>
							<input
								id="edit-name"
								name="name"
								type="text"
								required
								maxlength="100"
								value={editingLocation.name}
								class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
							/>
						</div>
						<div>
							<p class="mb-2 text-sm font-medium text-muted-foreground">
								Address <span class="font-normal text-muted-foreground">(optional)</span>
							</p>
							<div class="space-y-2">
								<input
									name="street"
									type="text"
									placeholder="Street"
									maxlength="100"
									value={getAddr(editingLocation.address).street ?? ''}
									class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
								/>
								<div class="grid grid-cols-3 gap-2">
									<input
										name="city"
										type="text"
										placeholder="City"
										maxlength="100"
										value={getAddr(editingLocation.address).city ?? ''}
										class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
									/>
									<input
										name="state"
										type="text"
										placeholder="State"
										maxlength="50"
										value={getAddr(editingLocation.address).state ?? ''}
										class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
									/>
									<input
										name="zip"
										type="text"
										placeholder="ZIP"
										maxlength="20"
										value={getAddr(editingLocation.address).zip ?? ''}
										class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
									/>
								</div>
							</div>
						</div>
						<div>
							<label
								class="mb-1 block text-sm font-medium text-muted-foreground"
								for="edit-notes"
							>
								Notes
							</label>
							<textarea
								id="edit-notes"
								name="notes"
								maxlength="500"
								rows="2"
								placeholder="e.g. Green tent, Row C, near the main entrance"
								class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
							>{editingLocation.notes ?? ''}</textarea>
							<p class="mt-1 text-xs text-muted-foreground">Shown to customers at checkout.</p>
						</div>
					</CardContent>
					<CardFooter class="gap-3">
						<Button type="submit" variant="default">Save changes</Button>
						<Button
							type="button"
							onclick={() => {
								editingId = null;
								editError = null;
							}}
							variant="outline"
						>
							Cancel
						</Button>
					</CardFooter>
				</form>
			</Card>
		{/if}

		<!-- Add form -->
		{#if showAddForm}
			{#if addError}
				<div
					class="mb-3 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
				>
					{addError}
				</div>
			{/if}
			<Card class="mb-4 shadow-sm">
				<form method="post" action="?/createLocation" use:enhance={handleAddEnhance}>
					<CardHeader>
						<CardTitle>New location</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						<div>
							<label
								class="mb-1 block text-sm font-medium text-muted-foreground"
								for="add-name"
							>
								Name *
							</label>
							<input
								id="add-name"
								name="name"
								type="text"
								required
								maxlength="100"
								placeholder="e.g. Saturday Farmers Market"
								class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
							/>
						</div>
						<div>
							<p class="mb-2 text-sm font-medium text-muted-foreground">
								Address <span class="font-normal text-muted-foreground">(optional)</span>
							</p>
							<div class="space-y-2">
								<input
									name="street"
									type="text"
									placeholder="Street"
									maxlength="100"
									class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
								/>
								<div class="grid grid-cols-3 gap-2">
									<input
										name="city"
										type="text"
										placeholder="City"
										maxlength="100"
										class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
									/>
									<input
										name="state"
										type="text"
										placeholder="State"
										maxlength="50"
										class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
									/>
									<input
										name="zip"
										type="text"
										placeholder="ZIP"
										maxlength="20"
										class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
									/>
								</div>
							</div>
						</div>
						<div>
							<label
								class="mb-1 block text-sm font-medium text-muted-foreground"
								for="add-notes"
							>
								Notes
							</label>
							<textarea
								id="add-notes"
								name="notes"
								maxlength="500"
								rows="2"
								placeholder="e.g. Green tent, Row C, near the main entrance"
								class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
							></textarea>
							<p class="mt-1 text-xs text-muted-foreground">Shown to customers at checkout.</p>
						</div>
						<label class="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
							<input type="checkbox" name="isActive" checked class="h-4 w-4 rounded" />
							Active
						</label>
					</CardContent>
					<CardFooter class="gap-3">
						<Button type="submit" variant="default">Save location</Button>
						<Button
							type="button"
							onclick={() => {
								showAddForm = false;
								addError = null;
							}}
							variant="outline"
						>
							Cancel
						</Button>
					</CardFooter>
				</form>
			</Card>
		{/if}

		<!-- Empty state -->
		{#if data.locations.length === 0 && !showAddForm}
			<div class="rounded-xl border border-dashed p-8 text-center">
				<h3 class="mb-1 text-base font-semibold text-foreground">No pickup locations yet.</h3>
				<p class="mb-4 text-sm text-muted-foreground">
					Add your first location to start configuring pickup windows.
				</p>
				<Button type="button" onclick={() => (showAddForm = true)} variant="default">
					Add location
				</Button>
			</div>
		{/if}

		<!-- Locations table -->
		{#if data.locations.length > 0}
			<div class="overflow-hidden rounded-xl border bg-background">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Name</TableHead>
							<TableHead>Address</TableHead>
							<TableHead>Status</TableHead>
							<TableHead class="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each data.locations as loc (loc.id)}
							<TableRow>
								<TableCell class="font-medium">{loc.name}</TableCell>
								<TableCell class="text-sm text-muted-foreground">
									{formatAddress(loc.address)}
								</TableCell>
								<TableCell>
									{#if loc.isActive}
										<Badge class="bg-green-100 text-primary/90">Active</Badge>
									{:else}
										<Badge class="bg-gray-100 text-muted-foreground">Inactive</Badge>
									{/if}
								</TableCell>
								<TableCell class="text-right">
									<div class="flex items-center justify-end gap-3">
										<Button
											type="button"
											onclick={() => {
												editingId = loc.id;
												showAddForm = false;
												editError = null;
											}}
											variant="ghost"
											size="sm"
											class="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
										>
											Edit
										</Button>
										<form method="post" action="?/toggleActive" use:enhance>
											<input type="hidden" name="id" value={loc.id} />
											<Button
												type="submit"
												variant="ghost"
												size="sm"
												class="h-auto p-0 text-xs {loc.isActive
													? 'text-muted-foreground hover:text-destructive'
													: 'text-muted-foreground hover:text-primary'}"
											>
												{loc.isActive ? 'Deactivate' : 'Activate'}
											</Button>
										</form>
									</div>
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			</div>
		{/if}
	</div>

	<!-- ── Pickup windows section (Phase 3) ───────────────────────────────── -->
	<div class="mt-10">
		<div class="mb-3 flex items-center justify-between">
			<div>
				<h2 class="text-base font-semibold text-foreground">Pickup windows</h2>
				<p class="mt-0.5 text-xs text-muted-foreground">
					Recurring time slots when customers can pick up their orders.
				</p>
			</div>
			{#if !showAddTemplateForm && editingTemplateId === null}
				<Button
					type="button"
					onclick={() => {
						previewDays = [];
						previewStartTime = '';
						previewEndTime = '';
						previewCutoffHours = 48;
						addTemplateForLocationId = null;
						showAddTemplateForm = true;
					}}
					variant="outline"
					size="sm"
				>
					+ Add window
				</Button>
			{/if}
		</div>

		{#if form?.createTemplateSuccess}
			<div
				class="mb-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary/90"
			>
				Window saved.
			</div>
		{/if}
		{#if form?.updateTemplateSuccess}
			<div
				class="mb-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary/90"
			>
				Window updated.
			</div>
		{/if}
		{#if form?.deleteTemplateSuccess}
			<div
				class="mb-3 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary/90"
			>
				Window removed.
			</div>
		{/if}

		<!-- Edit template form -->
		{#if editingTemplateId !== null && editingTemplate !== null}
			{#if editTemplateError}
				<div
					class="mb-3 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
				>
					{editTemplateError}
				</div>
			{/if}
			<Card class="mb-4 shadow-sm">
				<form method="post" action="?/updateTemplate" use:enhance={handleEditTemplateEnhance}>
					<input type="hidden" name="id" value={editingTemplateId} />
					<CardHeader>
						<CardTitle>Edit pickup window</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						<!-- Name -->
						<div>
							<label class="mb-1 block text-sm font-medium text-muted-foreground" for="etmpl-name">
								Name *
							</label>
							<input
								id="etmpl-name"
								name="name"
								type="text"
								required
								maxlength="100"
								value={editingTemplate.name}
								class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
							/>
						</div>
						<!-- Location -->
						<div>
							<label
								class="mb-1 block text-sm font-medium text-muted-foreground"
								for="etmpl-location"
							>
								Location
							</label>
							<select
								id="etmpl-location"
								name="locationId"
								class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
							>
								<option value="">(no location)</option>
								{#each data.locations.filter((l) => l.isActive) as loc (loc.id)}
									<option value={loc.id} selected={loc.id === editingTemplate.locationId}>
										{loc.name}
									</option>
								{/each}
							</select>
						</div>
						<!-- Days -->
						<div>
							<p class="mb-2 text-sm font-medium text-muted-foreground">Days *</p>
							<div class="flex flex-wrap gap-2">
								{#each DAY_ORDER as day (day)}
									<label
										class="flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors {previewDays.includes(
											day
										)
											? 'border-ring bg-primary/5 text-foreground'
											: 'border-input bg-background text-muted-foreground hover:bg-muted/50'}"
									>
										<input
											type="checkbox"
											name="days"
											value={day}
											checked={previewDays.includes(day)}
											onchange={(e) => {
												if (e.currentTarget.checked) previewDays = [...previewDays, day];
												else previewDays = previewDays.filter((d) => d !== day);
											}}
											class="sr-only"
										/>
										{DAY_LABELS[day]}
									</label>
								{/each}
							</div>
						</div>
						<!-- Times -->
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label
									class="mb-1 block text-sm font-medium text-muted-foreground"
									for="etmpl-start"
								>
									Start time *
								</label>
								<input
									id="etmpl-start"
									name="windowStart"
									type="time"
									required
									value={previewStartTime}
									oninput={(e) => (previewStartTime = e.currentTarget.value)}
									class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
								/>
								<p class="mt-1 text-xs text-muted-foreground">Pickup opens.</p>
							</div>
							<div>
								<label
									class="mb-1 block text-sm font-medium text-muted-foreground"
									for="etmpl-end"
								>
									End time *
								</label>
								<input
									id="etmpl-end"
									name="windowEnd"
									type="time"
									required
									value={previewEndTime}
									oninput={(e) => (previewEndTime = e.currentTarget.value)}
									class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
								/>
								<p class="mt-1 text-xs text-muted-foreground">Pickup closes.</p>
							</div>
						</div>
						<!-- Cutoff + max orders -->
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label
									class="mb-1 block text-sm font-medium text-muted-foreground"
									for="etmpl-cutoff"
								>
									Order cutoff (hours) *
								</label>
								<input
									id="etmpl-cutoff"
									name="cutoffHours"
									type="number"
									required
									min="1"
									value={previewCutoffHours}
									oninput={(e) =>
										(previewCutoffHours = parseInt(e.currentTarget.value) || 48)}
									class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
								/>
								<p class="mt-1 text-xs text-muted-foreground">Hours before pickup customers must order.</p>
							</div>
							<div>
								<label
									class="mb-1 block text-sm font-medium text-muted-foreground"
									for="etmpl-max"
								>
									Max orders per window
								</label>
								<input
									id="etmpl-max"
									name="maxOrders"
									type="number"
									min="1"
									value={editingTemplate.maxOrders ?? ''}
									placeholder="Unlimited"
									class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
								/>
							</div>
						</div>
						<!-- Live preview -->
						{@render occurrencePreviewBlock()}
					</CardContent>
					<CardFooter class="gap-3">
						<Button type="submit" variant="default">Save changes</Button>
						<Button
							type="button"
							onclick={() => {
								editingTemplateId = null;
								editTemplateError = null;
								previewDays = [];
								previewStartTime = '';
								previewEndTime = '';
							}}
							variant="outline"
						>
							Cancel
						</Button>
					</CardFooter>
				</form>
			</Card>
		{/if}

		<!-- Add template form -->
		{#if showAddTemplateForm}
			{#if addTemplateError}
				<div
					class="mb-3 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
				>
					{addTemplateError}
				</div>
			{/if}
			<Card class="mb-4 shadow-sm">
				<form method="post" action="?/createTemplate" use:enhance={handleAddTemplateEnhance}>
					<CardHeader>
						<CardTitle>New pickup window</CardTitle>
					</CardHeader>
					<CardContent class="space-y-4">
						<!-- Name -->
						<div>
							<label class="mb-1 block text-sm font-medium text-muted-foreground" for="tmpl-name">
								Name *
							</label>
							<input
								id="tmpl-name"
								name="name"
								type="text"
								required
								maxlength="100"
								placeholder="e.g. Saturday morning market"
								class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
							/>
						</div>
						<!-- Location -->
						<div>
							<label
								class="mb-1 block text-sm font-medium text-muted-foreground"
								for="tmpl-location"
							>
								Location
							</label>
							<select
								id="tmpl-location"
								name="locationId"
								class="w-full rounded-md border bg-background px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
							>
								<option value="">(no location)</option>
								{#each data.locations.filter((l) => l.isActive) as loc (loc.id)}
									<option value={loc.id} selected={loc.id === addTemplateForLocationId}>
										{loc.name}
									</option>
								{/each}
							</select>
						</div>
						<!-- Days -->
						<div>
							<p class="mb-2 text-sm font-medium text-muted-foreground">Days *</p>
							<div class="flex flex-wrap gap-2">
								{#each DAY_ORDER as day (day)}
									<label
										class="flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors {previewDays.includes(
											day
										)
											? 'border-ring bg-primary/5 text-foreground'
											: 'border-input bg-background text-muted-foreground hover:bg-muted/50'}"
									>
										<input
											type="checkbox"
											name="days"
											value={day}
											checked={previewDays.includes(day)}
											onchange={(e) => {
												if (e.currentTarget.checked) previewDays = [...previewDays, day];
												else previewDays = previewDays.filter((d) => d !== day);
											}}
											class="sr-only"
										/>
										{DAY_LABELS[day]}
									</label>
								{/each}
							</div>
						</div>
						<!-- Times -->
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label
									class="mb-1 block text-sm font-medium text-muted-foreground"
									for="tmpl-start"
								>
									Start time *
								</label>
								<input
									id="tmpl-start"
									name="windowStart"
									type="time"
									required
									value={previewStartTime}
									oninput={(e) => (previewStartTime = e.currentTarget.value)}
									class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
								/>
								<p class="mt-1 text-xs text-muted-foreground">Pickup opens.</p>
							</div>
							<div>
								<label
									class="mb-1 block text-sm font-medium text-muted-foreground"
									for="tmpl-end"
								>
									End time *
								</label>
								<input
									id="tmpl-end"
									name="windowEnd"
									type="time"
									required
									value={previewEndTime}
									oninput={(e) => (previewEndTime = e.currentTarget.value)}
									class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
								/>
								<p class="mt-1 text-xs text-muted-foreground">Pickup closes.</p>
							</div>
						</div>
						<!-- Cutoff + max orders -->
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label
									class="mb-1 block text-sm font-medium text-muted-foreground"
									for="tmpl-cutoff"
								>
									Order cutoff (hours) *
								</label>
								<input
									id="tmpl-cutoff"
									name="cutoffHours"
									type="number"
									required
									min="1"
									value={previewCutoffHours}
									oninput={(e) =>
										(previewCutoffHours = parseInt(e.currentTarget.value) || 48)}
									class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
								/>
								<p class="mt-1 text-xs text-muted-foreground">Hours before pickup customers must order.</p>
							</div>
							<div>
								<label
									class="mb-1 block text-sm font-medium text-muted-foreground"
									for="tmpl-max"
								>
									Max orders per window
								</label>
								<input
									id="tmpl-max"
									name="maxOrders"
									type="number"
									min="1"
									placeholder="Unlimited"
									class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
								/>
							</div>
						</div>
						<!-- Active -->
						<label class="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
							<input type="checkbox" name="isActive" checked class="h-4 w-4 rounded" />
							Active
						</label>
						<!-- Live preview -->
						{@render occurrencePreviewBlock()}
					</CardContent>
					<CardFooter class="gap-3">
						<Button type="submit" variant="default">Save window</Button>
						<Button
							type="button"
							onclick={() => {
								showAddTemplateForm = false;
								addTemplateForLocationId = null;
								addTemplateError = null;
								previewDays = [];
								previewStartTime = '';
								previewEndTime = '';
							}}
							variant="outline"
						>
							Cancel
						</Button>
					</CardFooter>
				</form>
			</Card>
		{/if}

		<!-- Empty state -->
		{#if data.templates.length === 0 && !showAddTemplateForm && editingTemplateId === null}
			<div class="rounded-xl border border-dashed p-8 text-center">
				<h3 class="mb-1 text-base font-semibold text-foreground">No pickup windows yet.</h3>
				<p class="mb-4 text-sm text-muted-foreground">
					Add a window to define when customers can pick up their orders.
				</p>
				<Button
					type="button"
					onclick={() => {
						previewDays = [];
						previewStartTime = '';
						previewEndTime = '';
						previewCutoffHours = 48;
						addTemplateForLocationId = null;
						showAddTemplateForm = true;
					}}
					variant="default"
				>
					Add window
				</Button>
			</div>
		{/if}

		<!-- Templates grouped by location -->
		{#if data.templates.length > 0 || (data.locations.length > 0 && !showAddTemplateForm && editingTemplateId === null)}
			{#each data.locations as loc (loc.id)}
				{@const locTemplates = templatesByLocation.get(loc.id) ?? []}
				<div class="mb-6">
					<h3 class="mb-2 text-sm font-semibold text-foreground">{loc.name}</h3>
					{#if locTemplates.length === 0}
						<p class="mb-2 text-xs text-muted-foreground italic">
							No windows configured for this location.
						</p>
					{:else}
						<div class="mb-2 overflow-hidden rounded-xl border bg-background">
							{#each locTemplates as tmpl, i (tmpl.id)}
								<div
									class="flex items-center justify-between px-4 py-3 {i > 0 ? 'border-t' : ''}"
								>
									<span class="text-sm text-foreground">
										{formatTime(tmpl.windowStart)}–{formatTime(tmpl.windowEnd)}
										· {formatRecurrence(tmpl.recurrence)}
										· Cutoff {tmpl.cutoffHours}h
										· {tmpl.maxOrders ? `Max ${tmpl.maxOrders}` : 'No cap'}
									</span>
									<div class="flex shrink-0 items-center gap-3 pl-4">
										<Button
											type="button"
											onclick={() => {
												editingTemplateId = tmpl.id;
												showAddTemplateForm = false;
												editTemplateError = null;
												previewDays = getRruleDays(tmpl.recurrence);
												previewStartTime = tmpl.windowStart;
												previewEndTime = tmpl.windowEnd;
												previewCutoffHours = tmpl.cutoffHours;
											}}
											variant="ghost"
											size="sm"
											class="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
										>
											Edit
										</Button>
										<form method="post" action="?/toggleTemplateActive" use:enhance>
											<input type="hidden" name="id" value={tmpl.id} />
											<Button
												type="submit"
												variant="ghost"
												size="sm"
												class="h-auto p-0 text-xs text-muted-foreground hover:text-destructive"
											>
												Deactivate
											</Button>
										</form>
										<form
											method="post"
											action="?/deleteTemplate"
											use:enhance
											onsubmit={(e) => {
												if (
													!confirm(
														`Delete "${tmpl.name}"? This will stop generating future occurrences for this template.`
													)
												) {
													e.preventDefault();
												}
											}}
										>
											<input type="hidden" name="id" value={tmpl.id} />
											<Button
												type="submit"
												variant="ghost"
												size="sm"
												class="h-auto p-0 text-xs text-muted-foreground hover:text-destructive"
											>
												Delete
											</Button>
										</form>
									</div>
								</div>
							{/each}
						</div>
					{/if}
					{#if !showAddTemplateForm && editingTemplateId === null}
						<button
							type="button"
							onclick={() => {
								previewDays = [];
								previewStartTime = '';
								previewEndTime = '';
								previewCutoffHours = 48;
								addTemplateForLocationId = loc.id;
								showAddTemplateForm = true;
							}}
							class="text-xs text-muted-foreground hover:text-foreground"
						>
							+ Add window for this location
						</button>
					{/if}
				</div>
			{/each}

			<!-- Unassigned group -->
			{@const unassigned = (templatesByLocation.get(null) ?? []) as typeof data.templates}
			{#if unassigned.length > 0}
				<div class="mb-6">
					<h3 class="mb-2 text-sm font-medium italic text-muted-foreground">Unassigned</h3>
					<div class="overflow-hidden rounded-xl border bg-background">
						{#each unassigned as tmpl, i (tmpl.id)}
							<div
								class="flex items-center justify-between px-4 py-3 {i > 0 ? 'border-t' : ''}"
							>
								<span class="text-sm text-foreground">
									{formatTime(tmpl.windowStart)}–{formatTime(tmpl.windowEnd)}
									· {formatRecurrence(tmpl.recurrence)}
									· Cutoff {tmpl.cutoffHours}h
									· {tmpl.maxOrders ? `Max ${tmpl.maxOrders}` : 'No cap'}
								</span>
								<div class="flex shrink-0 items-center gap-3 pl-4">
									<Button
										type="button"
										onclick={() => {
											editingTemplateId = tmpl.id;
											showAddTemplateForm = false;
											editTemplateError = null;
											previewDays = getRruleDays(tmpl.recurrence);
											previewStartTime = tmpl.windowStart;
											previewEndTime = tmpl.windowEnd;
											previewCutoffHours = tmpl.cutoffHours;
										}}
										variant="ghost"
										size="sm"
										class="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
									>
										Edit
									</Button>
									<form method="post" action="?/toggleTemplateActive" use:enhance>
										<input type="hidden" name="id" value={tmpl.id} />
										<Button
											type="submit"
											variant="ghost"
											size="sm"
											class="h-auto p-0 text-xs text-muted-foreground hover:text-destructive"
										>
											Deactivate
										</Button>
									</form>
									<form
										method="post"
										action="?/deleteTemplate"
										use:enhance
										onsubmit={(e) => {
											if (
												!confirm(
													`Delete "${tmpl.name}"? This will stop generating future occurrences for this template.`
												)
											) {
												e.preventDefault();
											}
										}}
									>
										<input type="hidden" name="id" value={tmpl.id} />
										<Button
											type="submit"
											variant="ghost"
											size="sm"
											class="h-auto p-0 text-xs text-muted-foreground hover:text-destructive"
										>
											Delete
										</Button>
									</form>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Phase 8: per-occurrence overrides UI -->
</div>

{#snippet occurrencePreviewBlock()}
	<div class="rounded-lg border border-dashed bg-muted/30 p-4">
		<p class="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
			Upcoming windows — next 6
		</p>
		{#if previewDays.length === 0}
			<p class="text-xs text-muted-foreground">Select at least one day to see upcoming occurrences.</p>
		{:else if !previewStartTime || !previewEndTime || previewEndTime <= previewStartTime}
			<p class="text-xs text-muted-foreground">Set valid start and end times to see upcoming occurrences.</p>
		{:else if occurrencePreview.length === 0}
			<p class="text-xs text-muted-foreground">No upcoming occurrences found.</p>
		{:else}
			<div class="space-y-1.5">
				{#each occurrencePreview as occ (occ.startsAt.toISOString())}
					<div class="grid grid-cols-3 gap-2 text-xs">
						<span class="font-medium text-foreground">{formatPreviewDate(occ.startsAt, data.timezone)}</span>
						<span class="text-muted-foreground"
							>{formatPreviewTime(occ.startsAt, data.timezone)}–{formatPreviewTime(
								occ.endsAt,
								data.timezone
							)}</span
						>
						<span class="text-muted-foreground"
							>Cutoff {formatPreviewDate(occ.cutoffAt, data.timezone)}, {formatPreviewTime(
								occ.cutoffAt,
								data.timezone
							)}</span
						>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/snippet}
