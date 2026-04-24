<script lang="ts">
	import { onMount } from 'svelte';
	import { invalidate } from '$app/navigation';
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';

	let { data }: { data: PageData } = $props();

	const order = $derived(data.order);
	const isPaid = $derived(order.paymentStatus === 'paid');
	const isCancelled = $derived(order.status === 'cancelled');
	const isFulfilled = $derived(order.status === 'fulfilled');
	const isDone = $derived(isFulfilled || isCancelled);

	// Status stepper — only shown for paid orders
	const STEPS = [
		{ key: 'received', label: 'Received', icon: 'mdi:receipt-text-outline' },
		{ key: 'confirmed', label: 'Confirmed', icon: 'mdi:check-circle-outline' },
		{ key: 'preparing', label: 'Preparing', icon: 'mdi:chef-hat' },
		{ key: 'ready', label: 'Ready!', icon: 'mdi:bell-ring-outline' },
		{ key: 'fulfilled', label: 'Done', icon: 'mdi:flag-checkered' }
	];
	const stepIndex = $derived(STEPS.findIndex((s) => s.key === order.status));

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
	<title>Order {order.orderNumber} — {data.tenant.name}</title>
</svelte:head>

<div class="min-h-screen">
	<!-- Branded header -->
	<header style="background-color: var(--background-color);">
		<div class="mx-auto max-w-lg px-4 py-4">
			<a
				href={resolve(`/${data.tenantSlug}/menu`)}
				class="inline-flex items-center gap-1 text-sm font-medium transition-opacity hover:opacity-75"
				style="color: var(--foreground-color);"
			>
				<Icon icon="mdi:arrow-left" class="h-4 w-4" /> Back to menu
			</a>
		</div>
	</header>

	<main class="mx-auto max-w-lg space-y-4 px-4 py-8">
		<!-- Payment / confirmation card -->
		<Card
			class="shadow-sm text-center"
			style={isPaid
				? 'border-color: var(--background-color);'
				: order.paymentStatus === 'pending'
					? 'border-color: #fde68a;'
					: 'border-color: #fca5a5;'}
		>
			<CardContent class="p-6">
				{#if isPaid && !isCancelled}
					<div class="mb-3 flex justify-center">
						<div
							class="flex h-14 w-14 items-center justify-center rounded-full"
							style="background-color: color-mix(in srgb, var(--background-color) 12%, white);"
						>
							<Icon icon="mdi:check-circle" class="h-8 w-8" style="color: var(--background-color);" />
						</div>
					</div>
					<h1 class="text-xl font-bold text-gray-900">Payment confirmed!</h1>
					<p class="mt-1 text-sm text-gray-500">
						Thank you{order.customerName ? `, ${order.customerName}` : ''}. Your order is in.
					</p>
				{:else if isCancelled}
					<div class="mb-3 flex justify-center">
						<div class="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
							<Icon icon="mdi:close-circle" class="h-8 w-8 text-red-400" />
						</div>
					</div>
					<h1 class="text-xl font-bold text-gray-900">Order cancelled</h1>
					<p class="mt-1 text-sm text-gray-500">
						This order has been cancelled. Contact the vendor with any questions.
					</p>
				{:else if order.paymentStatus === 'pending'}
					<div class="mb-3 flex justify-center">
						<div class="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-50">
							<Icon icon="mdi:clock-outline" class="h-8 w-8 text-yellow-500" />
						</div>
					</div>
					<h1 class="text-xl font-bold text-gray-900">Awaiting payment</h1>
					<p class="mt-1 text-sm text-gray-500">
						We'll update this page once your payment is confirmed.
					</p>
				{:else}
					<div class="mb-3 flex justify-center">
						<div class="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
							<Icon icon="mdi:alert-circle-outline" class="h-8 w-8 text-red-400" />
						</div>
					</div>
					<h1 class="text-xl font-bold text-gray-900">Payment issue</h1>
					<p class="mt-1 text-sm text-gray-500">Your payment could not be processed.</p>
				{/if}

				<div class="mt-3 flex flex-wrap items-center justify-center gap-2">
					<span class="font-mono text-sm font-semibold text-gray-700">{order.orderNumber}</span>
					<span class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500 capitalize">
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
						<h2 class="text-sm font-semibold text-gray-800">Order status</h2>
						{#if !isDone}
							<span class="flex items-center gap-1 text-xs text-gray-400">
								<Icon icon="mdi:refresh" class="h-3.5 w-3.5" /> Auto-refreshing
							</span>
						{/if}
					</div>

					<div class="relative flex items-start justify-between">
						<!-- connector line behind steps -->
						<div class="absolute top-5 right-0 left-0 h-0.5 bg-gray-200" aria-hidden="true">
							<div
								class="h-full transition-all duration-500"
								style="background-color: var(--background-color); width: {stepIndex >= 0
									? `${(stepIndex / (STEPS.length - 1)) * 100}%`
									: '0%'};"
							></div>
						</div>

						{#each STEPS as step, i (step.key)}
							{@const done = i < stepIndex}
							{@const active = i === stepIndex}
							<div
								class="relative z-10 flex flex-col items-center gap-1.5"
								style="width: {100 / STEPS.length}%;"
							>
								<div
									class="flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors"
									style={done || active
										? `background-color: var(--background-color); border-color: var(--background-color); color: var(--foreground-color);`
										: 'background-color: white; border-color: #e5e7eb; color: #9ca3af;'}
								>
									<Icon icon={step.icon} class="h-5 w-5" />
								</div>
								<span
									class="text-center text-xs leading-tight"
									style={active
										? 'color: var(--background-color); font-weight: 600;'
										: done
											? 'color: #374151; font-weight: 500;'
											: 'color: #9ca3af;'}
								>
									{step.label}
								</span>
							</div>
						{/each}
					</div>

					{#if order.status === 'ready'}
						<div
							class="mt-5 rounded-lg px-4 py-3 text-center text-sm font-semibold"
							style="background-color: color-mix(in srgb, var(--background-color) 10%, white); color: var(--background-color);"
						>
							<Icon icon="mdi:bell-ring" class="mr-1 inline h-4 w-4" />
							Your order is ready! Head over to pick it up.
						</div>
					{:else if order.status === 'preparing'}
						<p class="mt-4 text-center text-xs text-gray-400">
							Hang tight — your order is being prepared.
						</p>
					{:else if order.status === 'received'}
						<p class="mt-4 text-center text-xs text-gray-400">
							Your order has been received and is awaiting confirmation.
						</p>
					{/if}
				</CardContent>
			</Card>
		{/if}

		<!-- Items -->
		<Card class="shadow-sm">
			<CardHeader class="border-b border-gray-100 px-4 py-3">
				<CardTitle class="text-sm font-semibold text-gray-800">Items ordered</CardTitle>
			</CardHeader>
			<CardContent class="p-0">
				{#each data.items as item, i (item.id)}
					<div
						class="flex items-start justify-between gap-3 px-4 py-3 {i > 0
							? 'border-t border-gray-100'
							: ''}"
					>
						<div class="min-w-0 flex-1">
							<p class="text-sm font-medium text-gray-900">{item.name}</p>
							{#if Array.isArray(item.selectedModifiers) && (item.selectedModifiers as { name: string }[]).length > 0}
								<p class="mt-0.5 text-xs text-gray-400">
									{(item.selectedModifiers as { name: string }[]).map((m) => m.name).join(', ')}
								</p>
							{/if}
						</div>
						<div class="shrink-0 text-right">
							<p class="text-sm text-gray-700">×{item.quantity}</p>
							<p class="text-xs text-gray-400">
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
				<div class="flex justify-between text-gray-600">
					<span>Subtotal</span>
					<span>${(order.subtotal / 100).toFixed(2)}</span>
				</div>
				<div class="flex justify-between text-gray-600">
					<span>Tax</span>
					<span>${(order.tax / 100).toFixed(2)}</span>
				</div>
				{#if order.deliveryFee && order.deliveryFee > 0}
					<div class="flex justify-between text-gray-600">
						<span>Delivery fee</span>
						<span>${(order.deliveryFee / 100).toFixed(2)}</span>
					</div>
				{/if}
				{#if order.tip && order.tip > 0}
					<div class="flex justify-between text-gray-600">
						<span>Tip</span>
						<span>${(order.tip / 100).toFixed(2)}</span>
					</div>
				{/if}
				{#if order.discount && order.discount > 0}
					<div class="flex justify-between font-medium text-green-600">
						<span class="flex items-center gap-1">
							<Icon icon="mdi:ticket-percent-outline" class="h-3.5 w-3.5" />
							Promo{order.promoCode ? ` (${order.promoCode})` : ''}
						</span>
						<span>−${(order.discount / 100).toFixed(2)}</span>
					</div>
				{/if}
				<div
					class="mt-1.5 flex justify-between border-t border-gray-100 pt-1.5 font-semibold"
					style="color: var(--background-color);"
				>
					<span>Total</span>
					<span>${(order.total / 100).toFixed(2)}</span>
				</div>
			</CardContent>
		</Card>

		{#if order.notes}
			<div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
				<span class="font-medium">Notes: </span>{order.notes}
			</div>
		{/if}

		<a
			href={resolve(`/${data.tenantSlug}/menu`)}
			style="background-color: var(--background-color); color: var(--foreground-color);"
			class="block w-full rounded-xl px-6 py-3 text-center text-sm font-semibold shadow-sm transition-opacity hover:opacity-90"
		>
			Order again
		</a>
	</main>
</div>
