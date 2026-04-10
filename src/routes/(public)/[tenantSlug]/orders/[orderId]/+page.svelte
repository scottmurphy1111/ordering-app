<script lang="ts">
	import type { PageData } from './$types';

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

<div class="min-h-screen bg-gray-50">
	<header class="border-b border-gray-200 bg-white">
		<div class="mx-auto max-w-lg px-4 py-4">
			<a href="/{data.tenantSlug}/menu" class="text-sm text-gray-500 hover:text-gray-800 transition-colors">
				← Back to menu
			</a>
		</div>
	</header>

	<main class="mx-auto max-w-lg px-4 py-8 space-y-5">
		<!-- Status card -->
		<div class="rounded-xl border bg-white p-6 shadow-sm text-center
			{isPaid ? 'border-green-200' : isPending ? 'border-yellow-200' : 'border-gray-200'}">
			{#if isPaid}
				<p class="text-4xl mb-3">✅</p>
				<h1 class="text-xl font-bold text-gray-900">Payment confirmed!</h1>
				<p class="mt-1 text-sm text-gray-500">Thank you, {data.order.customerName}.</p>
			{:else if isPending}
				<p class="text-4xl mb-3">⏳</p>
				<h1 class="text-xl font-bold text-gray-900">Awaiting payment</h1>
				<p class="mt-1 text-sm text-gray-500">We'll update this page once your payment is confirmed.</p>
			{:else}
				<p class="text-4xl mb-3">❌</p>
				<h1 class="text-xl font-bold text-gray-900">Payment issue</h1>
				<p class="mt-1 text-sm text-gray-500">Your payment could not be processed.</p>
			{/if}

			<div class="mt-4 flex items-center justify-center gap-3 flex-wrap">
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
		<div class="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
			<div class="px-4 py-3 border-b border-gray-100">
				<h2 class="text-sm font-semibold text-gray-800">Items ordered</h2>
			</div>
			{#each data.items as item, i (item.id)}
				<div class="flex items-start justify-between gap-3 px-4 py-3 {i > 0 ? 'border-t border-gray-100' : ''}">
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium text-gray-900">{item.name}</p>
						{#if Array.isArray(item.selectedModifiers) && (item.selectedModifiers as {name:string}[]).length > 0}
							<p class="text-xs text-gray-400 mt-0.5">
								{(item.selectedModifiers as {name:string}[]).map((m) => m.name).join(', ')}
							</p>
						{/if}
					</div>
					<div class="text-right shrink-0">
						<p class="text-sm text-gray-700">×{item.quantity}</p>
						<p class="text-xs text-gray-400">${((item.unitPrice * item.quantity) / 100).toFixed(2)}</p>
					</div>
				</div>
			{/each}
		</div>

		<!-- Totals -->
		<div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm space-y-1.5 text-sm">
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
			<div class="flex justify-between font-semibold text-gray-900 border-t border-gray-100 pt-1.5 mt-1.5">
				<span>Total</span>
				<span>${(data.order.total / 100).toFixed(2)}</span>
			</div>
		</div>

		{#if data.order.notes}
			<div class="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-600">
				<span class="font-medium">Notes:</span> {data.order.notes}
			</div>
		{/if}

		<a
			href="/{data.tenantSlug}/menu"
			class="block w-full rounded-xl border border-gray-300 px-6 py-3 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
		>
			Order again
		</a>
	</main>
</div>
