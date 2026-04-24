<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import type { PageData, ActionData } from './$types';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardHeader, CardAction, CardFooter } from '$lib/components/ui/card';
	import { SvelteURLSearchParams } from 'svelte/reactivity';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let debounceTimer: ReturnType<typeof setTimeout>;
	function debounceSubmit(f: HTMLFormElement) {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			const params = new SvelteURLSearchParams(
				new FormData(f) as unknown as Record<string, string>
			);
			for (const [key, val] of [...params.entries()]) {
				if (!val) params.delete(key);
			}
			const qs = params.toString();
			goto(
				qs
					? resolve(`/dashboard/orders/history?${qs}` as `/${string}`)
					: resolve('/dashboard/orders/history'),
				{ keepFocus: true, noScroll: true, replaceState: true }
			);
		}, 400);
	}

	let fromInput: HTMLInputElement;
	let toInput: HTMLInputElement;

	const statusColors: Record<string, string> = {
		fulfilled: 'bg-gray-100 text-gray-600',
		cancelled: 'bg-red-100 text-red-600'
	};

	function buildStatusPath(status: string): `/${string}` {
		const entries = { q: data.search, from: data.from, to: data.to, status };
		const p = new SvelteURLSearchParams(
			Object.fromEntries(Object.entries(entries).filter(([, v]) => v))
		);
		const qs = p.toString();
		return `/dashboard/orders/history${qs ? `?${qs}` : ''}`;
	}
</script>

<div>
	<div class="mb-6 flex items-center justify-between">
		<div>
			<div class="mb-1 flex items-center gap-1.5 text-sm text-gray-400">
				<a href={resolve('/dashboard/orders')} class="hover:text-gray-700">Orders</a>
				<Icon icon="mdi:chevron-right" class="h-3.5 w-3.5" />
				<span>History</span>
			</div>
			<h1 class="text-2xl font-bold text-gray-900">Order History</h1>
		</div>
		<span class="text-sm text-gray-500"
			>{data.orders.length} result{data.orders.length === 1 ? '' : 's'}</span
		>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			{form.error}
		</div>
	{/if}

	<!-- Search -->
	<form method="GET" class="mb-5 flex flex-wrap items-center gap-2">
		<input type="hidden" name="status" value={data.statusFilter} />
		<div class="relative min-w-0 flex-1">
			<Icon
				icon="mdi:magnify"
				class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
			/>
			<input
				type="search"
				name="q"
				value={data.search}
				placeholder="Search by order #, customer name, email, or phone…"
				class="w-full rounded-lg border border-gray-200 bg-white py-2 pr-4 pl-9 text-sm text-gray-800 placeholder-gray-400 focus:border-gray-400 focus:outline-none"
				oninput={(e) => debounceSubmit(e.currentTarget.form!)}
			/>
		</div>
		<div class="flex items-center gap-2">
			<label for="date-from" class="text-xs whitespace-nowrap text-gray-500">From</label>
			<input
				bind:this={fromInput}
				id="date-from"
				type="date"
				name="from"
				value={data.from}
				class="rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:border-gray-400 focus:outline-none"
				onchange={(e) => e.currentTarget.form?.requestSubmit()}
			/>
			{#if data.from}
				<button
					type="button"
					class="text-muted-foreground hover:text-foreground"
					onclick={(e) => {
						fromInput.value = '';
						e.currentTarget.closest('form')?.requestSubmit();
					}}
				>
					<Icon icon="mdi:close" class="h-3.5 w-3.5" />
				</button>
			{/if}
		</div>
		<div class="flex items-center gap-2">
			<label for="date-to" class="text-xs text-gray-500">To</label>
			<input
				bind:this={toInput}
				id="date-to"
				type="date"
				name="to"
				value={data.to}
				class="rounded-md border border-gray-200 px-2 py-1.5 text-sm focus:border-gray-400 focus:outline-none"
				onchange={(e) => e.currentTarget.form?.requestSubmit()}
			/>
			{#if data.to}
				<button
					type="button"
					class="text-muted-foreground hover:text-foreground"
					onclick={(e) => {
						toInput.value = '';
						e.currentTarget.closest('form')?.requestSubmit();
					}}
				>
					<Icon icon="mdi:close" class="h-3.5 w-3.5" />
				</button>
			{/if}
		</div>
	</form>

	<!-- Status tabs -->
	<div class="mb-5 flex gap-1 overflow-x-auto">
		{#each [['', 'All History'], ['fulfilled', 'Fulfilled'], ['cancelled', 'Cancelled']] as [val, label] (val)}
			<Button
				href={resolve(buildStatusPath(val))}
				variant={data.statusFilter === val ? 'default' : 'ghost'}
				size="sm">{label}</Button
			>
		{/each}
	</div>

	{#if data.orders.length === 0}
		<div class="rounded-xl border border-dashed border-gray-300 p-12 text-center">
			<p class="text-sm text-gray-400">
				No historical orders found{data.search ? ` matching "${data.search}"` : ''}.
			</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each data.orders as order (order.id)}
				<Card class="shadow-sm">
					<CardHeader>
						<div class="flex min-w-0 flex-1 flex-col gap-1">
							<div class="flex flex-wrap items-center gap-2">
								<a
									href={resolve(`/dashboard/orders/${order.id}`)}
									class="font-mono text-sm font-semibold hover:underline">{order.orderNumber}</a
								>
								<Badge class={statusColors[order.status] ?? 'bg-muted text-muted-foreground'}>
									{order.status}
								</Badge>
								<Badge class="bg-muted text-muted-foreground capitalize">{order.type}</Badge>
								{#if order.paymentStatus === 'paid'}
									<Badge class="bg-emerald-100 text-emerald-700">paid</Badge>
								{:else if order.paymentStatus === 'refunded'}
									<Badge class="bg-orange-100 text-orange-700">refunded</Badge>
								{:else if order.paymentStatus === 'failed'}
									<Badge class="bg-red-100 text-red-600">payment failed</Badge>
								{/if}
							</div>
							{#if order.customerName}
								<p class="text-sm text-muted-foreground">
									{order.customerName}{order.customerPhone ? ` · ${order.customerPhone}` : ''}
								</p>
							{/if}
							{#if order.scheduledFor}
								<p class="flex items-center gap-1 text-xs font-medium text-amber-600">
									<Icon icon="mdi:calendar-clock" class="h-3.5 w-3.5 shrink-0" />
									Scheduled: {new Date(order.scheduledFor).toLocaleString([], {
										weekday: 'short',
										month: 'short',
										day: 'numeric',
										hour: 'numeric',
										minute: '2-digit'
									})}
								</p>
							{/if}
							{#if order.deliveryAddress}
								<p class="flex items-center gap-1 text-xs text-muted-foreground">
									<Icon icon="mdi:map-marker-outline" class="h-3.5 w-3.5 shrink-0" />
									{order.deliveryAddress}
								</p>
							{/if}
							{#if order.notes}
								<p class="text-xs text-muted-foreground italic">"{order.notes}"</p>
							{/if}
						</div>
						<CardAction class="text-right">
							<p class="font-semibold">${(order.total / 100).toFixed(2)}</p>
							<p class="mt-0.5 text-xs text-muted-foreground">
								{new Date(order.createdAt).toLocaleString([], {
									month: 'short',
									day: 'numeric',
									year: 'numeric',
									hour: '2-digit',
									minute: '2-digit'
								})}
							</p>
							<a
								href={resolve(`/dashboard/orders/${order.id}`)}
								class="mt-1 inline-flex items-center gap-0.5 text-xs text-green-600 hover:underline"
							>
								View <Icon icon="mdi:chevron-right" class="h-3 w-3" />
							</a>
						</CardAction>
					</CardHeader>
					{#if order.status === 'cancelled' && order.paymentStatus === 'paid'}
						<CardFooter class="gap-2">
							<form method="post" action="?/refund" use:enhance>
								<input type="hidden" name="id" value={order.id} />
								<Button
									type="submit"
									onclick={async (e) => {
										e.preventDefault();
										if (await confirmDialog('Issue a full refund for this order?'))
											(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
									}}
									variant="outline"
									size="sm"
									class="border-orange-200 text-orange-600 hover:bg-orange-50"
								>
									Refund payment
								</Button>
							</form>
						</CardFooter>
					{/if}
				</Card>
			{/each}
		</div>
	{/if}
</div>
