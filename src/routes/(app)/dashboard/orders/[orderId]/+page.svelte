<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const order = $derived(data.order);

	const statusColors: Record<string, string> = {
		received: 'bg-blue-100 text-blue-700',
		confirmed: 'bg-purple-100 text-purple-700',
		preparing: 'bg-yellow-100 text-yellow-700',
		ready: 'bg-green-100 text-green-700',
		fulfilled: 'bg-gray-100 text-gray-600',
		cancelled: 'bg-red-100 text-red-600'
	};

	const nextStatus: Record<string, string> = {
		received: 'confirmed',
		confirmed: 'preparing',
		preparing: 'ready',
		ready: 'fulfilled'
	};

	function formatCents(cents: number) {
		return `$${(cents / 100).toFixed(2)}`;
	}

	const items = $derived(order.items as Array<{
		name: string;
		quantity: number;
		basePrice: number;
		selectedModifiers: Array<{ name: string; priceAdjustment: number }>;
	}>);
</script>

<div class="max-w-2xl">
	<!-- Back link -->
	<a href={resolve('/dashboard/orders')} class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
		<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Orders
	</a>

	{#if form?.error}
		<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{form.error}</div>
	{/if}

	<!-- Header -->
	<div class="flex items-start justify-between mb-6">
		<div>
			<div class="flex items-center gap-2 flex-wrap">
				<h1 class="text-2xl font-bold text-gray-900 font-mono">{order.orderNumber}</h1>
				<span class="rounded-full px-2.5 py-0.5 text-xs font-medium {statusColors[order.status] ?? 'bg-gray-100'}">
					{order.status}
				</span>
				<span class="rounded-full px-2.5 py-0.5 text-xs bg-gray-100 text-gray-500 capitalize">{order.type}</span>
				{#if order.paymentStatus === 'paid'}
					<span class="rounded-full px-2.5 py-0.5 text-xs bg-emerald-100 text-emerald-700">paid</span>
				{:else if order.paymentStatus === 'refunded'}
					<span class="rounded-full px-2.5 py-0.5 text-xs bg-orange-100 text-orange-700">refunded</span>
				{:else if order.paymentStatus === 'failed'}
					<span class="rounded-full px-2.5 py-0.5 text-xs bg-red-100 text-red-600">payment failed</span>
				{:else}
					<span class="rounded-full px-2.5 py-0.5 text-xs bg-gray-100 text-gray-500">pending payment</span>
				{/if}
			</div>
			<p class="text-sm text-gray-400 mt-1">
				{new Date(order.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
			</p>
		</div>
		<p class="text-2xl font-bold text-gray-900">{formatCents(order.total)}</p>
	</div>

	<!-- Customer info -->
	<div class="rounded-xl border border-gray-200 bg-white p-5 mb-4">
		<h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Customer</h2>
		<div class="space-y-1.5">
			{#if order.customerName}
				<div class="flex items-center gap-2 text-sm text-gray-700">
					<Icon icon="mdi:account-outline" class="h-4 w-4 text-gray-400 shrink-0" />
					{order.customerName}
				</div>
			{/if}
			{#if order.customerEmail}
				<div class="flex items-center gap-2 text-sm text-gray-700">
					<Icon icon="mdi:email-outline" class="h-4 w-4 text-gray-400 shrink-0" />
					<a href="mailto:{order.customerEmail}" class="hover:underline">{order.customerEmail}</a>
				</div>
			{/if}
			{#if order.customerPhone}
				<div class="flex items-center gap-2 text-sm text-gray-700">
					<Icon icon="mdi:phone-outline" class="h-4 w-4 text-gray-400 shrink-0" />
					<a href="tel:{order.customerPhone}" class="hover:underline">{order.customerPhone}</a>
				</div>
			{/if}
			{#if !order.customerName && !order.customerEmail && !order.customerPhone}
				<p class="text-sm text-gray-400">No customer info recorded.</p>
			{/if}
		</div>
	</div>

	<!-- Items -->
	<div class="rounded-xl border border-gray-200 bg-white p-5 mb-4">
		<h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Items</h2>
		<div class="divide-y divide-gray-100">
			{#each items as item}
				<div class="flex items-start justify-between py-3">
					<div>
						<p class="text-sm font-medium text-gray-900">{item.name}</p>
						{#if item.selectedModifiers?.length}
							<p class="text-xs text-gray-400 mt-0.5">{item.selectedModifiers.map(m => m.name).join(', ')}</p>
						{/if}
					</div>
					<div class="text-right shrink-0 ml-4">
						<p class="text-sm text-gray-700">×{item.quantity}</p>
						<p class="text-xs text-gray-400">{formatCents((item.basePrice + (item.selectedModifiers?.reduce((s, m) => s + m.priceAdjustment, 0) ?? 0)) * item.quantity)}</p>
					</div>
				</div>
			{/each}
		</div>

		<!-- Totals -->
		<div class="border-t border-gray-100 pt-3 mt-1 space-y-1.5">
			<div class="flex justify-between text-sm text-gray-500">
				<span>Subtotal</span><span>{formatCents(order.subtotal)}</span>
			</div>
			<div class="flex justify-between text-sm text-gray-500">
				<span>Tax</span><span>{formatCents(order.tax)}</span>
			</div>
			{#if order.tip && order.tip > 0}
				<div class="flex justify-between text-sm text-gray-500">
					<span>Tip</span><span>{formatCents(order.tip)}</span>
				</div>
			{/if}
			{#if order.deliveryFee && order.deliveryFee > 0}
				<div class="flex justify-between text-sm text-gray-500">
					<span>Delivery fee</span><span>{formatCents(order.deliveryFee)}</span>
				</div>
			{/if}
			<div class="flex justify-between text-sm font-bold text-gray-900 pt-1.5 border-t border-gray-200">
				<span>Total</span><span>{formatCents(order.total)}</span>
			</div>
		</div>
	</div>

	<!-- Notes -->
	{#if order.notes}
		<div class="rounded-xl border border-gray-200 bg-white p-5 mb-4">
			<h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</h2>
			<p class="text-sm text-gray-700 italic">"{order.notes}"</p>
		</div>
	{/if}

	<!-- Actions -->
	{#if nextStatus[order.status] || !['fulfilled', 'cancelled'].includes(order.status) || (order.status === 'cancelled' && order.paymentStatus === 'paid')}
		<div class="rounded-xl border border-gray-200 bg-white p-5">
			<h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Actions</h2>
			<div class="flex flex-wrap gap-2">
				{#if nextStatus[order.status]}
					<form method="post" action="?/updateStatus" use:enhance>
						<input type="hidden" name="id" value={order.id} />
						<input type="hidden" name="status" value={nextStatus[order.status]} />
						<button type="submit" class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
							Mark as {nextStatus[order.status]}
						</button>
					</form>
				{/if}
				{#if !['fulfilled', 'cancelled'].includes(order.status)}
					<form method="post" action="?/cancel" use:enhance
						onsubmit={(e) => { if (!confirm('Cancel this order?')) e.preventDefault(); }}>
						<input type="hidden" name="id" value={order.id} />
						<button type="submit" class="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
							Cancel order
						</button>
					</form>
				{/if}
				{#if order.status === 'cancelled' && order.paymentStatus === 'paid'}
					<form method="post" action="?/refund" use:enhance
						onsubmit={(e) => { if (!confirm('Issue a full refund for this order?')) e.preventDefault(); }}>
						<input type="hidden" name="id" value={order.id} />
						<button type="submit" class="rounded-md border border-orange-200 px-4 py-2 text-sm font-medium text-orange-600 hover:bg-orange-50 transition-colors">
							Refund payment
						</button>
					</form>
				{/if}
			</div>
		</div>
	{/if}
</div>
