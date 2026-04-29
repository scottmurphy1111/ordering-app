<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const order = $derived(data.order);

	const statusColors: Record<string, string> = {
		received: 'bg-blue-100 text-blue-700',
		confirmed: 'bg-purple-100 text-purple-700',
		preparing: 'bg-yellow-100 text-yellow-700',
		ready: 'bg-green-100 text-primary/90',
		fulfilled: 'bg-muted text-muted-foreground',
		cancelled: 'bg-red-100 text-red-600'
	};

	const statusLabels: Record<string, string> = {
		received: 'Received',
		confirmed: 'Confirmed',
		preparing: 'In production',
		ready: 'Ready',
		fulfilled: 'Fulfilled',
		cancelled: 'Cancelled'
	};

	const nextStatus: Record<string, string> = {
		received: 'confirmed',
		confirmed: 'preparing',
		preparing: 'ready',
		ready: 'fulfilled'
	};

	const nextStatusLabels: Record<string, string> = {
		received: 'Confirm',
		confirmed: 'In production',
		preparing: 'Ready',
		ready: 'Fulfilled'
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
		class="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-muted-foreground"
	>
		<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Orders
	</a>

	{#if form?.error}
		<div
			class="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
		>
			{form.error}
		</div>
	{/if}

	<!-- Header -->
	<div class="mb-6 flex items-start justify-between">
		<div>
			<div class="flex flex-wrap items-center gap-2">
				<h1 class="font-mono text-2xl font-bold text-foreground">{order.orderNumber}</h1>
				<Badge class={statusColors[order.status] ?? 'bg-muted'}>
					{statusLabels[order.status] ?? order.status}
				</Badge>
				<Badge class="bg-muted text-muted-foreground capitalize">{order.type}</Badge>
				{#if order.paymentStatus === 'paid'}
					<Badge class="bg-emerald-100 text-emerald-700">paid</Badge>
				{:else if order.paymentStatus === 'refunded'}
					<Badge class="bg-orange-100 text-orange-700">refunded</Badge>
				{:else if order.paymentStatus === 'failed'}
					<Badge class="bg-red-100 text-red-600">payment failed</Badge>
				{:else}
					<Badge class="bg-muted text-muted-foreground">pending payment</Badge>
				{/if}
			</div>
			<p class="mt-1 text-sm text-muted-foreground">
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
		</div>
		<p class="text-2xl font-bold text-foreground">{formatCents(order.total)}</p>
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
					<Icon icon="mdi:account-outline" class="h-4 w-4 shrink-0 text-muted-foreground" />
					{order.customerName}
				</div>
			{/if}
			{#if order.customerEmail}
				<div class="flex items-center gap-2 text-sm">
					<Icon icon="mdi:email-outline" class="h-4 w-4 shrink-0 text-muted-foreground" />
					<a href="mailto:{order.customerEmail}" class="hover:underline">{order.customerEmail}</a>
				</div>
			{/if}
			{#if order.customerPhone}
				<div class="flex items-center gap-2 text-sm">
					<Icon icon="mdi:phone-outline" class="h-4 w-4 shrink-0 text-muted-foreground" />
					<a href="tel:{order.customerPhone}" class="hover:underline">{order.customerPhone}</a>
				</div>
			{/if}
			{#if !order.customerName && !order.customerEmail && !order.customerPhone}
				<p class="text-sm text-muted-foreground">No customer info recorded.</p>
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
								<p class="mt-0.5 text-xs text-muted-foreground">
									{item.selectedModifiers.map((m) => m.name).join(',')}
								</p>
							{/if}
						</div>
						<div class="ml-4 shrink-0 text-right">
							<p class="text-sm">×{item.quantity}</p>
							<p class="text-xs text-muted-foreground">
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
				<div class="flex justify-between text-sm text-muted-foreground">
					<span>Subtotal</span><span>{formatCents(order.subtotal)}</span>
				</div>
				<div class="flex justify-between text-sm text-muted-foreground">
					<span>Tax</span><span>{formatCents(order.tax)}</span>
				</div>
				{#if order.tip && order.tip > 0}
					<div class="flex justify-between text-sm text-muted-foreground">
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
					<div class="flex justify-between text-sm text-muted-foreground">
						<span>Delivery fee</span><span>{formatCents(order.deliveryFee)}</span>
					</div>
				{/if}
				{#if order.deliveryAddress}
					<div
						class="mt-2 flex items-start gap-1.5 rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground"
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
					<form method="post" action="?/updateStatus" use:enhance autocomplete="off">
						<input type="hidden" name="id" value={order.id} />
						<input type="hidden" name="status" value={nextStatus[order.status]} />
						<Button type="submit" variant="default">
							Mark as {nextStatusLabels[order.status] ?? nextStatus[order.status]}
						</Button>
					</form>
				{/if}
				{#if !['fulfilled', 'cancelled'].includes(order.status)}
					<form method="post" action="?/cancel" use:enhance autocomplete="off">
						<input type="hidden" name="id" value={order.id} />
						<Button
							type="submit"
							onclick={async (e) => {
								e.preventDefault();
								const btn = e.currentTarget as HTMLButtonElement;
								if (await confirmDialog('Cancel this order?')) btn.form?.requestSubmit();
							}}
							variant="destructive"
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
							class="border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-600"
						>
							Refund payment
						</Button>
					</form>
				{/if}
			</CardContent>
		</Card>
	{/if}
</div>
