<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import OrderStatusStepper from '$lib/components/OrderStatusStepper.svelte';
	import { confirmDialog } from '$lib/confirm.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const order = $derived(data.order);
	const isPaid = $derived(order.paymentStatus === 'paid');
	const isCancelled = $derived(order.status === 'cancelled');
	const isFulfilled = $derived(order.status === 'fulfilled');
	const isDone = $derived(isFulfilled || isCancelled);
	const isPendingApproval = $derived(order.status === 'pending_approval');
	const isPaymentFailed = $derived(order.status === 'payment_failed');

	// Customer-friendly label overrides for the status stepper
	const customerLabels = {
		ready: 'Ready!',
		fulfilled: 'Done'
	};

	const scheduledFor = $derived(order.scheduledFor ? new Date(order.scheduledFor) : null);
	const scheduledLabel = $derived(
		scheduledFor
			? scheduledFor.toLocaleString(undefined, {
					weekday: 'short',
					month: 'short',
					day: 'numeric',
					hour: 'numeric',
					minute: '2-digit'
				})
			: null
	);

	let recoverPending = $state(false);

	function recoverEnhance() {
		recoverPending = true;
		return async ({ update }: { update: (opts?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			recoverPending = false;
		};
	}

	const hasProposedAlternate = $derived(order.proposedAt !== null && order.proposedDate !== null);
	const proposedDateLabel = $derived(
		order.proposedDate
			? new Date(order.proposedDate).toLocaleDateString(undefined, {
					weekday: 'short',
					month: 'short',
					day: 'numeric',
					year: 'numeric'
				})
			: null
	);

	let acceptAltPending = $state(false);
	let declineAltPending = $state(false);
	let declineAltForm: HTMLFormElement | undefined = $state();

	function acceptAltEnhance() {
		acceptAltPending = true;
		return async ({ update }: { update: (opts?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			acceptAltPending = false;
		};
	}

	function declineAltEnhance() {
		declineAltPending = true;
		return async ({ update }: { update: (opts?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false });
			declineAltPending = false;
		};
	}

	// ── Live polling ─────────────────────────────────────────────────────────
	onMount(() => {
		if (isDone || !isPaid) return;
		const interval = setInterval(() => {
			invalidate('app:order-status');
		}, 15_000);
		return () => clearInterval(interval);
	});
</script>

<svelte:head>
	<title>Order {order.orderNumber} — {data.vendor.name}</title>
</svelte:head>

<div class="min-h-screen">
<main class="mx-auto max-w-lg space-y-4 px-4 py-8">
		<!-- Payment / confirmation card -->
		<Card
			class="text-center shadow-sm"
			style={isPaid
				? 'border-color: var(--background-color);'
				: order.paymentStatus === 'pending'
					? 'border-color: #fde68a;'
					: order.paymentStatus === 'void' || order.paymentStatus === 'refunded'
						? 'border-color: #e5e7eb;'
						: 'border-color: #fca5a5;'}
		>
			<CardContent class="p-6">
				{#if isPaid && !isCancelled}
					<div class="mb-3 flex justify-center">
						<div
							class="flex h-14 w-14 items-center justify-center rounded-full"
							style="background-color: color-mix(in srgb, var(--background-color) 12%, white);"
						>
							<Icon
								icon="mdi:check-circle"
								class="h-8 w-8"
								style="color: var(--background-color);"
							/>
						</div>
					</div>
					<h1 class="text-xl font-bold text-neutral-900" style="font-family: var(--font-heading);">Payment confirmed!</h1>
					<p class="mt-1 text-sm text-muted-foreground">
						Thank you{order.customerName ? `, ${order.customerName}` : ''}. Your order is in.
					</p>
				{:else if isCancelled}
					<div class="mb-3 flex justify-center">
						<div class="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
							<Icon icon="mdi:close-circle" class="h-8 w-8 text-red-400" />
						</div>
					</div>
					<h1 class="text-xl font-bold text-neutral-900" style="font-family: var(--font-heading);">Order cancelled</h1>
					<p class="mt-1 text-sm text-muted-foreground">
						This order has been cancelled. Contact the vendor with any questions.
					</p>
				{:else if isPendingApproval}
					<div class="mb-3 flex justify-center">
						<div class="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
							<Icon icon="mdi:calendar-clock" class="h-8 w-8 text-amber-500" />
						</div>
					</div>
					<h1 class="text-xl font-bold text-neutral-900" style="font-family: var(--font-heading);">Request received!</h1>
					<p class="mt-1 text-sm text-muted-foreground">
						Your payment method is saved.
						{order.customerName ? ` Thanks, ${order.customerName}.` : ''} We'll review your order and
						reach out within 48 hours.
					</p>
				{:else if order.paymentStatus === 'pending'}
					<div class="mb-3 flex justify-center">
						<div class="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
							<Icon icon="mdi:clock-outline" class="h-8 w-8 text-amber-500" />
						</div>
					</div>
					<h1 class="text-xl font-bold text-neutral-900" style="font-family: var(--font-heading);">Awaiting payment</h1>
					<p class="mt-1 text-sm text-muted-foreground">
						We'll update this page once your payment is confirmed.
					</p>
				{:else if isPaymentFailed}
					<div class="mb-3 flex justify-center">
						<div class="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
							<Icon icon="mdi:credit-card-off-outline" class="h-8 w-8 text-red-400" />
						</div>
					</div>
					<h1 class="text-xl font-bold text-neutral-900" style="font-family: var(--font-heading);">Payment needs attention</h1>
					<p class="mt-1 text-sm text-muted-foreground">
						We weren't able to charge your saved card for this order.{order.customerName
							? ` Thanks for your patience, ${order.customerName}.`
							: ''}
					</p>
				{:else}
					<div class="mb-3 flex justify-center">
						<div class="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
							<Icon icon="mdi:alert-circle-outline" class="h-8 w-8 text-red-400" />
						</div>
					</div>
					<h1 class="text-xl font-bold text-neutral-900" style="font-family: var(--font-heading);">Payment issue</h1>
					<p class="mt-1 text-sm text-muted-foreground">Your payment could not be processed.</p>
				{/if}

				<div class="mt-3 flex flex-wrap items-center justify-center gap-2">
					<span class="font-mono text-sm font-semibold text-muted-foreground"
						>{order.orderNumber}</span
					>
					<span
						class="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground capitalize"
					>
						{order.type}
					</span>
					{#if scheduledLabel}
						<span
							class="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700"
						>
							<Icon icon="mdi:calendar-clock" class="h-3 w-3" />
							{scheduledLabel}
						</span>
					{/if}
				</div>
			</CardContent>
		</Card>

		<!-- Status stepper (paid, non-cancelled orders only) -->
		{#if isPaid && !isCancelled}
			<Card class="shadow-sm">
				<CardContent class="p-5">
					<div class="mb-4 flex items-center justify-between">
						<h2 class="text-sm font-semibold text-foreground" style="font-family: var(--font-heading);">Order status</h2>
						{#if !isDone}
							<span class="flex items-center gap-1 text-xs text-muted-foreground">
								<Icon icon="mdi:refresh" class="h-3.5 w-3.5" /> Auto-refreshing
							</span>
						{/if}
					</div>

					<OrderStatusStepper
						status={order.status}
						variant="full"
						colorScheme="branding"
						labelOverrides={customerLabels}
					/>

					{#if order.status === 'ready'}
						<div
							class="mt-5 rounded-lg px-4 py-3 text-center text-sm font-semibold"
							style="background-color: color-mix(in srgb, var(--background-color) 10%, white); color: var(--background-color);"
						>
							<Icon icon="mdi:bell-ring" class="mr-1 inline h-4 w-4" />
							Your order is ready! Head over to pick it up.
						</div>
					{:else if order.status === 'preparing'}
						<p class="mt-4 text-center text-xs text-muted-foreground">
							Hang tight — your order is in production.
						</p>
					{:else if order.status === 'received'}
						<p class="mt-4 text-center text-xs text-muted-foreground">
							Your order has been received and is awaiting confirmation.
						</p>
					{/if}
				</CardContent>
			</Card>
		{:else if isPendingApproval && hasProposedAlternate}
			<!-- Proposal banner -->
			<Card class="shadow-sm" style="border-color: #93c5fd;">
				<CardContent class="p-5">
					<div class="flex items-start gap-3">
						<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50">
							<Icon icon="mdi:calendar-arrow-right" class="h-5 w-5 text-blue-500" />
						</div>
						<div class="flex-1">
							<h2 class="text-sm font-semibold text-foreground" style="font-family: var(--font-heading);">New date proposed</h2>
							<p class="mt-1 text-xs text-muted-foreground">
								{data.vendor.name} has proposed a different pickup date for your order.
							</p>
							{#if proposedDateLabel}
								<p class="mt-2 text-xs font-medium text-blue-700">
									<Icon icon="mdi:calendar-arrow-right" class="mr-0.5 inline h-3 w-3" />
									Proposed: {proposedDateLabel}
								</p>
							{/if}
							{#if order.proposedReason}
								<p class="mt-1 text-xs italic text-muted-foreground">"{order.proposedReason}"</p>
							{/if}
							{#if form?.error}
								<p class="mt-2 text-xs font-medium text-destructive">{form.error}</p>
							{/if}
							<div class="mt-4 flex flex-wrap gap-2">
								<form
									method="post"
									action="?/acceptAlternate"
									use:enhance={acceptAltEnhance}
									autocomplete="off"
								>
									<input type="hidden" name="id" value={order.id} />
									<Button
										type="submit"
										disabled={acceptAltPending}
										style="background-color: var(--background-color); color: var(--foreground-color);"
									>
										{#if acceptAltPending}
											<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
											Accepting…
										{:else}
											<Icon icon="mdi:check" class="h-3.5 w-3.5" />
											Accept new date
										{/if}
									</Button>
								</form>
								<form
									method="post"
									action="?/declineAlternate"
									use:enhance={declineAltEnhance}
									autocomplete="off"
									bind:this={declineAltForm}
								>
									<input type="hidden" name="id" value={order.id} />
									<Button
										type="submit"
										variant="outline"
										disabled={declineAltPending}
										onclick={async (e) => {
											e.preventDefault();
											const f = declineAltForm!;
											if (
												await confirmDialog(
													'Decline this date and cancel your order? This cannot be undone.',
													{ confirmLabel: 'Cancel order', danger: true }
												)
											)
												f.requestSubmit();
										}}
									>
										{#if declineAltPending}
											<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
											Cancelling…
										{:else}
											Decline &amp; cancel
										{/if}
									</Button>
								</form>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		{:else if isPendingApproval}
			<Card class="shadow-sm" style="border-color: #fde68a;">
				<CardContent class="p-5">
					<div class="flex items-start gap-3">
						<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-50">
							<Icon icon="mdi:calendar-clock" class="h-5 w-5 text-amber-500" />
						</div>
						<div>
							<h2 class="text-sm font-semibold text-foreground">Awaiting vendor approval</h2>
							<p class="mt-1 text-xs text-muted-foreground">
								Your payment method is securely saved. Once the vendor approves this order your card
								will be charged and you'll receive a confirmation.
							</p>
							{#if scheduledLabel}
								<p class="mt-2 text-xs font-medium text-amber-700">
									<Icon icon="mdi:calendar" class="mr-0.5 inline h-3 w-3" />
									Requested for {scheduledLabel}
								</p>
							{/if}
						</div>
					</div>
				</CardContent>
			</Card>
		{:else if isPaymentFailed}
			<Card class="shadow-sm" style="border-color: #fca5a5;">
				<CardContent class="p-5">
					<div class="flex items-start gap-3">
						<div
							class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10"
						>
							<Icon icon="mdi:credit-card-off-outline" class="h-5 w-5 text-red-400" />
						</div>
						<div class="flex-1">
							<h2 class="text-sm font-semibold text-foreground">Payment couldn't be processed</h2>
							<p class="mt-1 text-xs text-muted-foreground">
								Your saved card was declined. Please update your payment method to complete your
								order.
							</p>
							{#if form?.error}
								<p class="mt-2 text-xs font-medium text-destructive">{form.error}</p>
							{/if}
							<form
								method="post"
								action="?/recoverPayment"
								use:enhance={recoverEnhance}
								autocomplete="off"
								class="mt-4"
							>
								<input type="hidden" name="id" value={order.id} />
								<Button type="submit" disabled={recoverPending} class="w-full sm:w-auto">
									{#if recoverPending}
										<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
										Processing…
									{:else}
										<Icon icon="mdi:credit-card-refresh-outline" class="h-3.5 w-3.5" />
										Update payment method
									{/if}
								</Button>
							</form>
						</div>
					</div>
				</CardContent>
			</Card>
		{/if}

		<!-- Items -->
		<Card class="shadow-sm">
			<CardHeader class="border-b  px-4 py-3">
				<CardTitle class="text-sm font-semibold text-foreground">Items ordered</CardTitle>
			</CardHeader>
			<CardContent class="p-0">
				{#each data.items as item, i (item.id)}
					<div class="flex items-start justify-between gap-3 px-4 py-3 {i > 0 ? 'border-t ' : ''}">
						<div class="min-w-0 flex-1">
							<p class="text-sm font-medium text-foreground">{item.name}</p>
							{#if Array.isArray(item.selectedModifiers) && (item.selectedModifiers as { name: string }[]).length > 0}
								<p class="mt-0.5 text-xs text-muted-foreground">
									{(item.selectedModifiers as { name: string }[]).map((m) => m.name).join(', ')}
								</p>
							{/if}
						</div>
						<div class="shrink-0 text-right">
							<p class="text-sm text-muted-foreground">×{item.quantity}</p>
							<p class="text-xs text-muted-foreground">
								${((item.unitPrice * item.quantity) / 100).toFixed(2)}
							</p>
						</div>
					</div>
				{/each}
			</CardContent>
		</Card>

		<!-- Totals -->
		<Card class="shadow-sm">
			<CardContent class="space-y-1.5 p-4 text-sm">
				<div class="flex justify-between text-muted-foreground">
					<span>Subtotal</span>
					<span>${(order.subtotal / 100).toFixed(2)}</span>
				</div>
				<div class="flex justify-between text-muted-foreground">
					<span>Tax</span>
					<span>${(order.tax / 100).toFixed(2)}</span>
				</div>
				{#if order.tip && order.tip > 0}
					<div class="flex justify-between text-muted-foreground">
						<span>Tip</span>
						<span>${(order.tip / 100).toFixed(2)}</span>
					</div>
				{/if}
				{#if order.discount && order.discount > 0}
					<div class="flex justify-between font-medium text-primary">
						<span class="flex items-center gap-1">
							<Icon icon="mdi:ticket-percent-outline" class="h-3.5 w-3.5" />
							Promo{order.promoCode ? ` (${order.promoCode})` : ''}
						</span>
						<span>−${(order.discount / 100).toFixed(2)}</span>
					</div>
				{/if}
				<div
					class="mt-1.5 flex justify-between border-t pt-1.5 font-semibold"
					style="color: var(--background-color);"
				>
					<span>{isPendingApproval ? 'Estimated total' : 'Total'}</span>
					<span>${(order.total / 100).toFixed(2)}</span>
				</div>
				{#if isPendingApproval}
					<p class="mt-1 text-xs text-muted-foreground">
						Your card will only be charged after the vendor approves your order.
					</p>
				{/if}
			</CardContent>
		</Card>

		{#if order.notes}
			<div class="rounded-lg border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
				<span class="font-medium">Notes: </span>{order.notes}
			</div>
		{/if}

		<a
			href={resolve('/catalog' as `/${string}`)}
			style="background-color: var(--background-color); color: var(--foreground-color);"
			class="block w-full rounded-xl px-6 py-3 text-center text-sm font-semibold shadow-sm transition-opacity hover:opacity-90"
		>
			Order again
		</a>
	</main>
</div>
