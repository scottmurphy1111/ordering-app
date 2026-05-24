<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Card, CardContent } from '$lib/components/ui/card';

	let { data }: { data: PageData } = $props();

	function fmtDateTime(d: Date | string | null) {
		if (!d) return 'Never';
		return new Date(d).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div>
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-foreground">Overview</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">Platform health at a glance.</p>
	</div>

	<!-- Stat tiles -->
	<div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<Card class="shadow-sm">
			<CardContent>
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
						<Icon icon="mdi:store-outline" class="h-5 w-5 text-primary" />
					</div>
					<div>
						<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
							Active vendors
						</p>
						<p class="text-2xl font-bold text-foreground">{data.stats.activeVendors}</p>
					</div>
				</div>
			</CardContent>
		</Card>

		<Card class="shadow-sm">
			<CardContent>
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
						<Icon icon="mdi:credit-card-check-outline" class="h-5 w-5 text-primary" />
					</div>
					<div>
						<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
							Paid subscriptions
						</p>
						<p class="text-2xl font-bold text-foreground">{data.stats.paidVendors}</p>
					</div>
				</div>
			</CardContent>
		</Card>

		<Card class="shadow-sm">
			<CardContent>
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
						<Icon icon="mdi:calendar-week-outline" class="h-5 w-5 text-primary" />
					</div>
					<div>
						<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
							Signups · 7 days
						</p>
						<p class="text-2xl font-bold text-foreground">{data.stats.signupsLast7}</p>
					</div>
				</div>
			</CardContent>
		</Card>

		<Card class="shadow-sm">
			<CardContent>
				<div class="flex items-center gap-3">
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
						<Icon icon="mdi:calendar-month-outline" class="h-5 w-5 text-primary" />
					</div>
					<div>
						<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
							Signups · 30 days
						</p>
						<p class="text-2xl font-bold text-foreground">{data.stats.signupsLast30}</p>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Drill-in panels -->
	<div class="grid gap-4 lg:grid-cols-2">
		<Card class="shadow-sm">
			<CardContent>
				<div class="mb-3 flex items-center justify-between">
					<h2 class="text-base font-semibold text-foreground">Manage vendors</h2>
					<a
						href={resolve('/admin/vendors')}
						class="text-xs font-medium text-primary hover:underline"
					>
						Open
					</a>
				</div>
				<p class="text-sm text-muted-foreground">
					Archive, restore, or soft-delete vendor accounts.
				</p>
			</CardContent>
		</Card>

		<Card class="shadow-sm">
			<CardContent>
				<div class="mb-3 flex items-center justify-between">
					<h2 class="text-base font-semibold text-foreground">Impersonate a vendor</h2>
					<a href={resolve('/vendors')} class="text-xs font-medium text-primary hover:underline">
						Open
					</a>
				</div>
				<p class="text-sm text-muted-foreground">
					Pick any vendor to act as them. Used for support and forensics.
				</p>
			</CardContent>
		</Card>
	</div>

	<!-- Scheduled jobs -->
	<div class="mt-6">
		<h2 class="mb-3 text-sm font-medium tracking-wide text-gray-500 uppercase">Scheduled jobs</h2>
		<Card class="shadow-sm">
			<CardContent>
				<div class="divide-y divide-gray-100">
					{#each data.cronJobs as job (job.eventType)}
						<div class="flex items-center justify-between py-3 first:pt-0 last:pb-0">
							<div class="flex items-center gap-2.5">
								<div
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"
								>
									<Icon icon="mdi:clock-outline" class="h-4 w-4 text-primary" />
								</div>
								<div>
									<p class="text-sm font-medium text-gray-900">{job.name}</p>
									<p class="font-mono text-xs text-gray-400">{job.eventType}</p>
								</div>
							</div>
							<div class="flex items-center gap-3">
								<div class="text-right">
									<p class="text-xs text-gray-500">{fmtDateTime(job.lastRun)}</p>
									{#if job.lastMeta}
										<p class="text-xs text-gray-400">
											{job.lastMeta.processed} processed{#if job.lastMeta.drifted !== undefined && job.lastMeta.drifted > 0},
												{job.lastMeta.drifted} drifted{/if}
										</p>
									{/if}
								</div>
								{#if job.lastStatus === 'error'}
									<span
										class="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
									>
										Error
									</span>
								{:else if job.lastStatus === 'ok'}
									<span
										class="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
									>
										OK
									</span>
								{:else}
									<span
										class="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500"
									>
										Pending
									</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
				<div class="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
					<a
						href={resolve('/admin/system-events?type=cron')}
						class="text-xs font-medium text-primary hover:underline"
					>
						View all cron events →
					</a>
					{#if data.cronErrorsLast7 > 0}
						<a
							href={resolve('/admin/system-events?type=cron&status=error')}
							class="text-xs font-medium text-red-700 hover:underline"
						>
							{data.cronErrorsLast7} error{data.cronErrorsLast7 === 1 ? '' : 's'} · last 7 days
						</a>
					{:else}
						<span class="text-xs text-success">No errors · last 7 days</span>
					{/if}
				</div>
			</CardContent>
		</Card>
	</div>

	<!-- Webhook health -->
	<div class="mt-6">
		<h2 class="mb-3 text-sm font-medium tracking-wide text-gray-500 uppercase">Webhook health</h2>
		<Card class="shadow-sm">
			<CardContent>
				{@const wh = data.webhookHealth}
				{@const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)}
				{@const isStale =
					wh.lastSuccessAt === null || new Date(wh.lastSuccessAt) <= fortyEightHoursAgo}
				{@const hasErrors = wh.errorsLast7 > 0}

				<!-- Status indicator -->
				<div class="mb-4 flex items-center gap-2">
					<span
						class="h-2.5 w-2.5 rounded-full {hasErrors
							? 'bg-red-500'
							: isStale
								? 'bg-amber-500'
								: 'bg-green-500'}"
					></span>
					<span
						class="text-sm font-medium {hasErrors
							? 'text-red-700'
							: isStale
								? 'text-amber-700'
								: 'text-green-700'}"
					>
						{hasErrors ? 'Errors detected' : isStale ? 'Stale' : 'Healthy'}
					</span>
				</div>

				<!-- Stat rows -->
				<div class="space-y-3">
					<div class="flex items-center justify-between">
						<p class="text-xs text-gray-500">Last event</p>
						{#if wh.lastSuccessAt}
							<p class="text-xs text-gray-700">
								{fmtDateTime(wh.lastSuccessAt)}
								<span class="font-mono text-gray-400">({wh.lastSuccessType})</span>
							</p>
						{:else}
							<p class="text-xs text-gray-400">No events received</p>
						{/if}
					</div>
					<div class="flex items-center justify-between">
						<p class="text-xs text-gray-500">Events · last 7 days</p>
						<p class="text-sm font-semibold text-gray-900">{wh.totalLast7}</p>
					</div>
					<div class="flex items-center justify-between">
						<p class="text-xs text-gray-500">Errors · last 7 days</p>
						<p
							class="text-sm font-semibold {wh.errorsLast7 > 0 ? 'text-red-600' : 'text-gray-900'}"
						>
							{wh.errorsLast7}
						</p>
					</div>
				</div>

				<div class="mt-3 border-t border-gray-100 pt-3">
					<a
						href={resolve('/admin/system-events?type=webhook')}
						class="text-xs font-medium text-primary hover:underline"
					>
						View all webhook events →
					</a>
				</div>
			</CardContent>
		</Card>
	</div>

	<p class="mt-6 text-center text-xs text-muted-foreground">
		Activity feed, metrics breakdown, and Stripe webhook log are coming.
	</p>
</div>
