<script lang="ts">
	import type { PageData } from './$types';
	import { page as pageState } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';

	let { data }: { data: PageData } = $props();

	const totalPages = $derived(Math.max(1, Math.ceil(data.total / data.pageSize)));

	function navigate(params: Record<string, string>) {
		const p = new URLSearchParams(pageState.url.searchParams);
		for (const [k, v] of Object.entries(params)) {
			if (v) p.set(k, v);
			else p.delete(k);
		}
		if (!('page' in params)) p.delete('page');
		goto(resolve(`/admin/activity?${p.toString()}` as `/${string}`), { replaceState: true });
	}

	function fmtRelative(d: Date | string | null): string {
		if (!d) return '—';
		const diffMs = Date.now() - new Date(d).getTime();
		const sec = Math.floor(diffMs / 1000);
		if (sec < 60) return 'just now';
		const min = Math.floor(sec / 60);
		if (min < 60) return `${min}m ago`;
		const hr = Math.floor(min / 60);
		if (hr < 24) return `${hr}h ago`;
		const day = Math.floor(hr / 24);
		if (day < 30) return `${day}d ago`;
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	const filterTabs: Array<{ key: string; label: string }> = [
		{ key: 'all', label: 'All' },
		{ key: 'paused', label: 'Paused' },
		{ key: 'cancel_scheduled', label: 'Cancel scheduled' },
		{ key: 'past_due', label: 'Past due' },
		{ key: 'recent_signups', label: 'Recent signups' }
	];
</script>

<div>
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-foreground">Activity</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">
			Recent vendor activity, ordered by last update. Click any vendor to act as them.
		</p>
	</div>

	<!-- Filters + search -->
	<div class="mb-4 flex flex-wrap items-center gap-3">
		<div class="flex flex-wrap items-center gap-1">
			{#each filterTabs as tab (tab.key)}
				<button
					type="button"
					class="h-8 rounded-lg border px-3 text-xs transition-colors {data.filter === tab.key
						? 'border-primary bg-primary/5 text-primary'
						: 'border-gray-200 text-gray-600 hover:bg-gray-50'}"
					onclick={() => navigate({ filter: tab.key })}
				>
					{tab.label}
				</button>
			{/each}
		</div>

		<input
			type="text"
			placeholder="Search by name or slug…"
			class="h-8 w-64 rounded-lg border border-gray-200 bg-white px-3 text-sm placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none"
			value={data.search}
			oninput={(e) => navigate({ search: (e.target as HTMLInputElement).value })}
		/>
	</div>

	{#if data.vendors.length === 0}
		<div class="rounded-xl border border-dashed p-10 text-center">
			<p class="text-sm text-muted-foreground">No vendors match these filters.</p>
		</div>
	{:else}
		<Card class="p-0 shadow-sm">
			<CardContent class="p-0">
				<div class="divide-y">
					{#each data.vendors as v (v.id)}
						<form method="post" action="/vendors?/select" class="contents">
							<input type="hidden" name="vendorId" value={v.id} />
							<button
								type="submit"
								class="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/40"
							>
								<div class="min-w-0 flex-1">
									<div class="flex flex-wrap items-center gap-2">
										<p class="font-medium text-foreground">{v.name}</p>
										<span class="font-mono text-xs text-muted-foreground">/{v.slug}</span>
										<Badge class="bg-muted capitalize text-muted-foreground">
											{v.subscriptionTier ?? 'starter'}
										</Badge>
										{#if v.subscriptionPausedAt}
											<Badge class="bg-amber-100 text-amber-700">Paused</Badge>
										{:else if v.subscriptionEndsAt}
											<Badge class="bg-amber-100 text-amber-700">Cancel scheduled</Badge>
										{:else if v.subscriptionStatus === 'past_due'}
											<Badge class="bg-red-100 text-red-700">Past due</Badge>
										{/if}
									</div>
									<p class="mt-0.5 text-xs text-muted-foreground">
										Updated {fmtRelative(v.updatedAt)} · joined {new Date(
											v.createdAt
										).toLocaleDateString('en-US', {
											month: 'short',
											day: 'numeric',
											year: 'numeric'
										})}
									</p>
								</div>
								<Icon icon="mdi:chevron-right" class="h-5 w-5 shrink-0 text-muted-foreground" />
							</button>
						</form>
					{/each}
				</div>
			</CardContent>
		</Card>

		{#if totalPages > 1}
			<div class="mt-4 flex items-center justify-between text-sm text-muted-foreground">
				<span>Page {data.page} of {totalPages} · {data.total} total</span>
				<div class="flex gap-2">
					<button
						type="button"
						class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
						disabled={data.page <= 1}
						onclick={() => navigate({ page: String(data.page - 1) })}
					>
						← Previous
					</button>
					<button
						type="button"
						class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
						disabled={data.page >= totalPages}
						onclick={() => navigate({ page: String(data.page + 1) })}
					>
						Next →
					</button>
				</div>
			</div>
		{/if}
	{/if}
</div>
