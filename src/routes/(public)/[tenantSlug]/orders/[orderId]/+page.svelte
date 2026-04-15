<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	let { data }: { data: PageData } = $props();

	const isPaid = $derived(data.order.paymentStatus === 'paid');
	const isPending = $derived(data.order.paymentStatus === 'pending');

	const statusLabels: Record<string, string> = {
		received: 'Order received',
		confirmed: 'Confirmed',
		preparing: 'Being prepared',
		ready: 'Ready for pickup',
		fulfilled: 'Fulfilled',
		cancelled: 'Cancelled'
	};
</script>

<svelte:head>
	<title>Order {data.order.orderNumber} — {data.tenant.name}</title>
</svelte:head>

<div class="min-h-screen">
	<header class="border-b border-gray-200 bg-white/90 backdrop-blur-sm">
		<div class="mx-auto max-w-lg px-4 py-4">
			<a
				href={resolve(`/${data.tenantSlug}/menu`)}
				class="inline-flex items-center gap-1 text-sm text-gray-500 transition-colors hover:text-gray-800"
			>
				<Icon icon="mdi:arrow-left" class="h-4 w-4" /> Back to menu
			</a>
		</div>
	</header>

	<main class="mx-auto max-w-lg space-y-5 px-4 py-8">
		<!-- Status card -->
		<div
			class="rounded-xl border bg-white p-6 text-center shadow-sm
			{isPaid ? 'border-green-200' : isPending ? 'border-yellow-200' : 'border-gray-200'}"
		>
			{#if isPaid}
				<div class="mb-3 flex justify-center">
					<Icon icon="mdi:check-circle" class="h-12 w-12 text-green-500" />
				</div>
				<h1 class="text-xl font-bold text-gray-900">Payment confirmed!</h1>
				<p class="mt-1 text-sm text-gray-500">Thank you, {data.order.customerName}.</p>
			{:else if isPending}
				<div class="mb-3 flex justify-center">
					<Icon icon="mdi:clock-outline" class="h-12 w-12 text-yellow-500" />
				</div>
				<h1 class="text-xl font-bold text-gray-900">Awaiting payment</h1>
				<p class="mt-1 text-sm text-gray-500">
					We'll update this page once your payment is confirmed.
				</p>
			{:else}
				<div class="mb-3 flex justify-center">
					<Icon icon="mdi:close-circle" class="h-12 w-12 text-red-400" />
				</div>
				<h1 class="text-xl font-bold text-gray-900">Payment issue</h1>
				<p class="mt-1 text-sm text-gray-500">Your payment could not be processed.</p>
			{/if}

			<div class="mt-4 flex flex-wrap items-center justify-center gap-3">
				<span class="font-mono text-sm font-semibold text-gray-700">{data.order.orderNumber}</span>
				<span class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
					{statusLabels[data.order.status] ?? data.order.status}
				</span>
				<span class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500 capitalize">
					{data.order.type}
				</span>
			</div>
		</div>

		<!-- Order items -->
		<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
			<div class="border-b border-gray-100 px-4 py-3">
				<h2 class="text-sm font-semibold text-gray-800">Items ordered</h2>
			</div>
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
		</div>

		<!-- Totals -->
		<div class="space-y-1.5 rounded-xl border border-gray-200 bg-white p-4 text-sm shadow-sm">
			<div class="flex justify-between text-gray-600">
				<span>Subtotal</span>
				<span>${(data.order.subtotal / 100).toFixed(2)}</span>
			</div>
			<div class="flex justify-between text-gray-600">
				<span>Tax</span>
				<span>${(data.order.tax / 100).toFixed(2)}</span>
			</div>
			{#if data.order.tip && data.order.tip > 0}
				<div class="flex justify-between text-gray-600">
					<span>Tip</span>
					<span>${(data.order.tip / 100).toFixed(2)}</span>
				</div>
			{/if}
			<div
				class="mt-1.5 flex justify-between border-t border-gray-100 pt-1.5 font-semibold text-gray-900"
			>
				<span>Total</span>
				<span>${(data.order.total / 100).toFixed(2)}</span>
			</div>
		</div>

		{#if data.order.notes}
			<div class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
				<span class="font-medium">Notes:</span>
				{data.order.notes}
			</div>
		{/if}

		<a
			href={resolve(`/${data.tenantSlug}/menu`)}
			style="border-color: var(--primary-color); color: var(--primary-color);"
			class="block w-full rounded-xl border px-6 py-3 text-center text-sm font-medium transition-opacity hover:opacity-75"
		>
			Order again
		</a>
	</main>
</div>
