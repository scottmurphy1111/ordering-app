<script lang="ts">
	import type { PageData } from './$types';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	let { data }: { data: PageData } = $props();

	function fmtDateTime(d: Date | string) {
		return new Date(d).toLocaleString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}

	function navigate(params: Record<string, string>) {
		const p = new URLSearchParams(page.url.searchParams);
		for (const [k, v] of Object.entries(params)) {
			if (v) p.set(k, v);
			else p.delete(k);
		}
		if (!('page' in params)) p.delete('page');
		goto(resolve(`/admin/system-events?${p.toString()}` as `/${string}`), { replaceState: true });
	}

	const totalPages = $derived(Math.ceil(data.total / data.pageSize));
</script>

<div>
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">System events</h1>
			<p class="mt-1 text-sm text-muted-foreground">
				{data.total} event{data.total === 1 ? '' : 's'}
			</p>
		</div>
	</div>

	<!-- Filters -->
	<div class="mb-4 flex flex-wrap items-center gap-3">
		<input
			type="text"
			class="h-8 w-64 rounded-lg border border-gray-200 bg-white px-3 text-sm placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-green-500 focus:outline-none"
			placeholder="Filter by type (e.g. cron, webhook)"
			value={data.typeFilter}
			oninput={(e) => navigate({ type: (e.target as HTMLInputElement).value })}
		/>

		<div class="flex items-center gap-1">
			<span class="mr-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
				Status
			</span>
			<button
				type="button"
				class="h-8 rounded-lg border px-3 text-xs transition-colors {!data.statusFilter
					? 'border-primary bg-primary/5 text-primary'
					: 'border-gray-200 text-gray-600 hover:bg-gray-50'}"
				onclick={() => navigate({ status: '' })}
			>
				All
			</button>
			<button
				type="button"
				class="h-8 rounded-lg border px-3 text-xs transition-colors {data.statusFilter === 'ok'
					? 'border-primary bg-primary/5 text-primary'
					: 'border-gray-200 text-gray-600 hover:bg-gray-50'}"
				onclick={() => navigate({ status: 'ok' })}
			>
				OK
			</button>
			<button
				type="button"
				class="h-8 rounded-lg border px-3 text-xs transition-colors {data.statusFilter ===
				'error'
					? 'border-red-300 bg-red-50 text-red-700'
					: 'border-gray-200 text-gray-600 hover:bg-gray-50'}"
				onclick={() => navigate({ status: 'error' })}
			>
				Error
			</button>
		</div>

		{#if data.typeFilter || data.statusFilter}
			<button
				type="button"
				class="text-sm text-muted-foreground transition-colors hover:text-foreground"
				onclick={() => navigate({ type: '', status: '' })}
			>
				Clear all
			</button>
		{/if}
	</div>

	<!-- Table -->
	<div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
		<table class="w-full">
			<thead class="border-b border-gray-200 bg-gray-50">
				<tr>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wide text-gray-500 uppercase"
						>Time</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wide text-gray-500 uppercase"
						>Event type</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wide text-gray-500 uppercase"
						>Status</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wide text-gray-500 uppercase"
						>Vendor</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium tracking-wide text-gray-500 uppercase"
						>Metadata</th
					>
				</tr>
			</thead>
			<tbody class="divide-y divide-gray-100">
				{#if data.events.length === 0}
					<tr>
						<td colspan="5" class="px-4 py-12 text-center text-sm text-gray-500">
							{data.typeFilter || data.statusFilter
								? 'No events match these filters.'
								: 'No events recorded yet.'}
						</td>
					</tr>
				{:else}
					{#each data.events as event (event.id)}
						<tr class="hover:bg-gray-50">
							<td class="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-400">
								{fmtDateTime(event.createdAt)}
							</td>
							<td class="px-4 py-3 font-mono text-sm text-gray-900">{event.eventType}</td>
							<td class="px-4 py-3">
								{#if event.status === 'error'}
									<span
										class="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
									>
										Error
									</span>
								{:else}
									<span
										class="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
									>
										OK
									</span>
								{/if}
							</td>
							<td class="px-4 py-3 text-sm text-gray-500">
								{#if event.vendorId}
									{event.vendorName ?? `#${event.vendorId}`}
								{:else}
									<span class="text-gray-400">—</span>
								{/if}
							</td>
							<td class="max-w-xs truncate px-4 py-3 font-mono text-xs text-gray-400">
								{event.metadata ? JSON.stringify(event.metadata) : '—'}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Pagination -->
	{#if totalPages > 1}
		<div class="mt-4 flex items-center justify-between text-sm text-gray-500">
			<span>Page {data.page} of {totalPages}</span>
			<div class="flex gap-2">
				{#if data.page > 1}
					<button
						type="button"
						class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
						onclick={() => navigate({ page: String(data.page - 1) })}
					>
						← Previous
					</button>
				{/if}
				{#if data.page < totalPages}
					<button
						type="button"
						class="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
						onclick={() => navigate({ page: String(data.page + 1) })}
					>
						Next →
					</button>
				{/if}
			</div>
		</div>
	{/if}
</div>
