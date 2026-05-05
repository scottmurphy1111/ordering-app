<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Alert } from '$lib/components/ui/alert';
	import type { PageData, ActionData } from './$types';
	import { lifecycleStages, actionConfig } from '$lib/utils/order-lifecycle';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const order = $derived(data.order);

	const nextStatus: Record<string, string> = {
		received: 'confirmed',
		confirmed: 'preparing',
		preparing: 'ready',
		ready: 'fulfilled'
	};

	function formatCents(cents: number) {
		return `$${(cents / 100).toFixed(2)}`;
	}

	const items = $derived(
		order.items as Array<{
			name: string;
			quantity: number;
			basePrice: number;
			selectedModifiers: Array<{ name: string; priceAdjustment: number }>;
		}>
	);
</script>

<div class="max-w-2xl">
	<!-- Back link -->
	<a
		href={resolve('/dashboard/orders')}
		class="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
	>
		<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Orders
	</a>

	{#if form?.error}
		<Alert severity="error" class="mb-4">{form.error}</Alert>
	{/if}

	<!-- Header -->
	<div class="mb-6 flex items-start justify-between">
		<div>
			<div class="flex flex-wrap items-center gap-2">
				<h1 class="font-mono text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
				<Badge class="bg-gray-100 text-gray-500 capitalize">{order.type}</Badge>
				{#if order.paymentStatus === 'paid'}
					<Badge class="bg-emerald-100 text-emerald-700">paid</Badge>
				{:else if order.paymentStatus === 'refunded'}
					<Badge class="bg-orange-100 text-orange-700">refunded</Badge>
				{:else if order.paymentStatus === 'failed'}
					<Badge class="bg-red-100 text-red-600">payment failed</Badge>
				{:else}
					<Badge class="bg-amber-50 text-amber-700">pending payment</Badge>
				{/if}
			</div>
			<p class="mt-1 text-sm text-gray-500">
				{new Date(order.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
			</p>
			{#if order.scheduledFor}
				<p class="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-amber-600">
					<Icon icon="mdi:calendar-clock" class="h-4 w-4 shrink-0" />
					Scheduled for {new Date(order.scheduledFor).toLocaleString([], {
						weekday: 'short',
						month: 'short',
						day: 'numeric',
						hour: 'numeric',
						minute: '2-digit'
					})}
				</p>
			{/if}
			<!-- Lifecycle stepper -->
			{#if order.status === 'cancelled'}
				<div class="mt-4 flex items-center gap-2">
					<Icon icon="mdi:close-circle" class="h-5 w-5 text-red-500" />
					<span class="text-base font-medium text-gray-900">Cancelled</span>
				</div>
			{:else}
				<div class="mt-4 flex items-center">
					{#each lifecycleStages as stage, i (stage.value)}
						{@const stageIndex = lifecycleStages.findIndex((s) => s.value === stage.value)}
						{@const currentIndex = lifecycleStages.findIndex((s) => s.value === order.status)}
						{@const isCompleted = stageIndex < currentIndex}
						{@const isCurrent = stageIndex === currentIndex}
						<div class="flex flex-col items-center">
							{#if isCurrent}
								<span
									class="inline-flex items-center justify-center rounded-full bg-primary/10 p-1.5"
								>
									<Icon icon={stage.icon} class="h-5 w-5 text-primary" />
								</span>
								<span class="mt-1 text-xs font-semibold text-gray-900">{stage.label}</span>
							{:else if isCompleted}
								<span class="inline-flex items-center justify-center p-1.5">
									<Icon icon={stage.icon} class="h-5 w-5 text-primary" />
								</span>
								<span class="mt-1 text-xs font-medium text-gray-900">{stage.label}</span>
							{:else}
								<span class="inline-flex items-center justify-center p-1.5">
									<Icon icon={stage.icon} class="h-5 w-5 text-gray-300" />
								</span>
								<span class="mt-1 text-xs text-gray-400">{stage.label}</span>
							{/if}
						</div>
						{#if i < lifecycleStages.length - 1}
							{@const lineCompleted = stageIndex < currentIndex}
							<div class="mx-2 h-px flex-1 {lineCompleted ? 'bg-primary' : 'bg-gray-200'}"></div>
						{/if}
					{/each}
				</div>
			{/if}
		</div>
		<p class="text-xl font-semibold text-gray-900">{formatCents(order.total)}</p>
	</div>

	<!-- Customer info -->
	<Card class="mb-4">
		<CardHeader>
			<CardTitle class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
				>Customer</CardTitle
			>
		</CardHeader>
		<CardContent class="space-y-1.5">
			{#if order.customerName}
				<div class="flex items-center gap-2 text-sm">
					<Icon icon="mdi:account-outline" class="h-4 w-4 shrink-0 text-gray-500" />
					{order.customerName}
				</div>
			{/if}
			{#if order.customerEmail}
				<div class="flex items-center gap-2 text-sm">
					<Icon icon="mdi:email-outline" class="h-4 w-4 shrink-0 text-gray-500" />
					<a href="mailto:{order.customerEmail}" class="hover:underline">{order.customerEmail}</a>
				</div>
			{/if}
			{#if order.customerPhone}
				<div class="flex items-center gap-2 text-sm">
					<Icon icon="mdi:phone-outline" class="h-4 w-4 shrink-0 text-gray-500" />
					<a href="tel:{order.customerPhone}" class="hover:underline">{order.customerPhone}</a>
				</div>
			{/if}
			{#if !order.customerName && !order.customerEmail && !order.customerPhone}
				<p class="text-sm text-gray-500">No customer info recorded.</p>
			{/if}
		</CardContent>
	</Card>

	<!-- Items -->
	<Card class="mb-4">
		<CardHeader>
			<CardTitle class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
				>Items</CardTitle
			>
		</CardHeader>
		<CardContent>
			<div class="divide-y">
				{#each items as item, i (i)}
					<div class="flex items-start justify-between py-3">
						<div>
							<p class="text-sm font-medium">{item.name}</p>
							{#if item.selectedModifiers?.length}
								<p class="mt-0.5 text-xs text-gray-500">
									{item.selectedModifiers.map((m) => m.name).join(',')}
								</p>
							{/if}
						</div>
						<div class="ml-4 shrink-0 text-right">
							<p class="text-sm">×{item.quantity}</p>
							<p class="text-xs text-gray-400">
								{formatCents(
									(item.basePrice +
										(item.selectedModifiers?.reduce((s, m) => s + m.priceAdjustment, 0) ?? 0)) *
										item.quantity
								)}
							</p>
						</div>
					</div>
				{/each}
			</div>

			<!-- Totals -->
			<div class="mt-1 space-y-1.5 border-t pt-3">
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
				{#if order.discount && order.discount > 0}
					<div class="flex justify-between text-sm font-medium text-primary">
						<span class="flex items-center gap-1">
							<Icon icon="mdi:ticket-percent-outline" class="h-3.5 w-3.5" />
							Promo{order.promoCode ? ` (${order.promoCode})` : ''}
						</span>
						<span>−{formatCents(order.discount)}</span>
					</div>
				{/if}
				{#if order.deliveryFee && order.deliveryFee > 0}
					<div class="flex justify-between text-sm text-gray-500">
						<span>Delivery fee</span><span>{formatCents(order.deliveryFee)}</span>
					</div>
				{/if}
				{#if order.deliveryAddress}
					<div
						class="mt-2 flex items-start gap-1.5 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-500"
					>
						<Icon icon="mdi:map-marker-outline" class="mt-0.5 h-4 w-4 shrink-0" />
						{order.deliveryAddress}
					</div>
				{/if}
				<div class="flex justify-between border-t pt-1.5 text-sm font-bold">
					<span>Total</span><span>{formatCents(order.total)}</span>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Notes -->
	{#if order.notes}
		<Card class="mb-4">
			<CardHeader>
				<CardTitle class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
					>Notes</CardTitle
				>
			</CardHeader>
			<CardContent>
				<p class="text-sm italic">"{order.notes}"</p>
			</CardContent>
		</Card>
	{/if}

	<!-- Actions -->
	{#if nextStatus[order.status] || !['fulfilled', 'cancelled'].includes(order.status) || (order.status === 'cancelled' && order.paymentStatus === 'paid')}
		<Card>
			<CardHeader>
				<CardTitle class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
					>Actions</CardTitle
				>
			</CardHeader>
			<CardContent class="flex flex-wrap gap-2">
				{#if nextStatus[order.status]}
					{@const action = actionConfig[order.status]}
					<form method="post" action="?/updateStatus" use:enhance autocomplete="off">
						<input type="hidden" name="id" value={order.id} />
						<input type="hidden" name="status" value={nextStatus[order.status]} />
						<Button type="submit">
							<Icon icon={action.icon} class="h-3.5 w-3.5" />
							{action.label}
						</Button>
					</form>
				{/if}
				{#if !['fulfilled', 'cancelled'].includes(order.status)}
					<form method="post" action="?/cancel" use:enhance autocomplete="off">
						<input type="hidden" name="id" value={order.id} />
						<Button
							type="submit"
							variant="outline"
							class="border-red-200 text-red-500 hover:bg-red-50"
							onclick={async (e) => {
								e.preventDefault();
								const btn = e.currentTarget as HTMLButtonElement;
								if (await confirmDialog('Cancel this order?')) btn.form?.requestSubmit();
							}}
						>
							Cancel order
						</Button>
					</form>
				{/if}
				{#if order.status === 'cancelled' && order.paymentStatus === 'paid'}
					<form method="post" action="?/refund" use:enhance autocomplete="off">
						<input type="hidden" name="id" value={order.id} />
						<Button
							type="submit"
							onclick={async (e) => {
								e.preventDefault();
								const btn = e.currentTarget as HTMLButtonElement;
								if (await confirmDialog('Issue a full refund for this order?'))
									btn.form?.requestSubmit();
							}}
							variant="outline"
							class="border-red-200 text-red-500 hover:bg-red-50"
						>
							Refund payment
						</Button>
					</form>
				{/if}
			</CardContent>
		</Card>
	{/if}
</div>
