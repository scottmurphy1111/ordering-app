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
							<div class="text-right">
								<p class="text-xs text-gray-500">{fmtDateTime(job.lastRun)}</p>
								{#if job.lastMeta}
									<p class="text-xs text-gray-400">
										{job.lastMeta.processed} processed
										{#if job.lastMeta.errors.length > 0}
											· <span class="text-red-500">{job.lastMeta.errors.length} error{job.lastMeta.errors.length === 1 ? '' : 's'}</span>
										{/if}
									</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
				<a
					href={resolve('/admin/system-events?type=cron')}
					class="mt-3 block text-xs font-medium text-primary hover:underline"
				>
					View all cron events →
				</a>
			</CardContent>
		</Card>
	</div>

	<p class="mt-6 text-center text-xs text-muted-foreground">
		Activity feed, metrics breakdown, and Stripe webhook log are coming.
	</p>
</div>
