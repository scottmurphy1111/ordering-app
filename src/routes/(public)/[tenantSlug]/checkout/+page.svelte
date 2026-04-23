<script lang="ts">
	import { onMount } from 'svelte';
	import { loadStripe } from '@stripe/stripe-js';
	import type { StripeElements, Stripe } from '@stripe/stripe-js';
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	let { data }: { data: PageData } = $props();

	let stripe = $state<Stripe | null>(null);
	let elements = $state<StripeElements | null>(null);
	let mountReady = $state(false);
	let submitting = $state(false);
	let paymentError = $state('');
	const fmt = (cents: number) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

	const backgroundColor = $derived(data.tenant.backgroundColor ?? '#000000');
	const accentColor = $derived(data.tenant.accentColor ?? '#374151');
	const foregroundColor = $derived(data.tenant.foregroundColor ?? '#ffffff');
	const logoUrl = $derived(data.tenant.logoUrl ?? '');

	onMount(async () => {
		const stripeInstance = await loadStripe(data.publishableKey);
		if (!stripeInstance) return;
		stripe = stripeInstance;

		elements = stripeInstance.elements({
			clientSecret: data.clientSecret,
			appearance: {
				theme: 'stripe',
				variables: {
					colorPrimary: backgroundColor,
					colorBackground: '#ffffff',
					colorText: '#111827',
					colorDanger: '#dc2626',
					fontFamily: 'ui-sans-serif, system-ui, sans-serif',
					borderRadius: '8px',
					spacingUnit: '4px'
				},
				rules: {
					'.Input': {
						border: '1px solid #e5e7eb',
						boxShadow: 'none'
					},
					'.Input:focus': {
						border: `1px solid ${backgroundColor}`,
						boxShadow: `0 0 0 1px ${backgroundColor}`
					},
					'.Label': {
						color: '#374151',
						fontWeight: '500',
						fontSize: '13px'
					},
					'.Tab': {
						border: '1px solid #e5e7eb',
						boxShadow: 'none'
					},
					'.Tab--selected': {
						border: `1px solid ${backgroundColor}`,
						boxShadow: `0 0 0 1px ${backgroundColor}`
					}
				}
			}
		});

		const paymentElement = elements.create('payment', {
			layout: { type: 'tabs', defaultCollapsed: false }
		});
		paymentElement.mount('#payment-element');
		paymentElement.on('ready', () => {
			mountReady = true;
		});
	});

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!stripe || !elements || submitting) return;

		submitting = true;
		paymentError = '';

		const { error: stripeError } = await stripe.confirmPayment({
			elements,
			confirmParams: {
				return_url: `${window.location.origin}/${data.tenant.slug}/orders/${data.order.id}`
			}
		});

		if (stripeError) {
			paymentError = stripeError.message ?? 'Payment failed. Please try again.';
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Checkout — {data.tenant.name}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Branded header -->
	<header class="border-b border-white/10" style="background-color: {backgroundColor};">
		<div class="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
			{#if logoUrl}
				<img src={logoUrl} alt={data.tenant.name} class="h-8 w-8 rounded object-contain" />
			{/if}
			<span class="text-lg font-semibold" style="color: {foregroundColor};"
				>{data.tenant.name}</span
			>
			<span class="ml-auto text-sm opacity-60" style="color: {foregroundColor};">Secure checkout</span>
			<Icon icon="mdi:lock" class="h-4 w-4 opacity-60" style="color: {foregroundColor};" />
		</div>
	</header>

	<main class="mx-auto max-w-4xl px-4 py-8">
		<div class="grid gap-6 lg:grid-cols-[1fr_420px]">
			<!-- Left: payment form -->
			<div class="space-y-4">
				<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
					<h2 class="mb-5 text-base font-semibold text-gray-900">Payment details</h2>

					{#if !mountReady}
						<div class="space-y-3">
							<div class="h-10 animate-pulse rounded-lg bg-gray-100"></div>
							<div class="h-10 animate-pulse rounded-lg bg-gray-100"></div>
							<div class="grid grid-cols-2 gap-3">
								<div class="h-10 animate-pulse rounded-lg bg-gray-100"></div>
								<div class="h-10 animate-pulse rounded-lg bg-gray-100"></div>
							</div>
						</div>
					{/if}

					<form onsubmit={handleSubmit}>
						<div id="payment-element"></div>

						{#if paymentError}
							<div
								class="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
							>
								<Icon icon="mdi:alert-circle-outline" class="mt-0.5 h-4 w-4 shrink-0" />
								{paymentError}
							</div>
						{/if}

						{#if mountReady}
							<button
								type="submit"
								disabled={submitting}
								class="mt-5 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold transition-opacity disabled:opacity-60"
								style="background-color: {backgroundColor}; color: {foregroundColor};"
							>
								{#if submitting}
									<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
									Processing...
								{:else}
									<Icon icon="mdi:lock" class="h-4 w-4" />
									Pay {fmt(data.order.total)}
								{/if}
							</button>
						{/if}
					</form>
				</div>

				<div class="flex items-center justify-center gap-4 px-2">
					<Icon icon="mdi:shield-check-outline" class="h-4 w-4 text-gray-400" />
					<p class="text-xs text-gray-400">
						Payments are encrypted and processed securely by Stripe. Your card details are never
						stored by us.
					</p>
				</div>
			</div>

			<!-- Right: order summary -->
			<div class="order-first lg:order-last">
				<div class="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
					<div class="mb-5 flex items-center justify-between">
						<h2 class="text-base font-semibold text-gray-900">Order summary</h2>
						<span
							class="rounded-full px-2.5 py-0.5 text-xs font-medium"
							style="background-color: {accentColor}1a; color: {accentColor};"
						>
							{data.order.orderNumber}
						</span>
					</div>

					<!-- Items -->
					<ul class="divide-y divide-gray-100">
						{#each data.order.items as item (item.itemId + item.name)}
							<li class="flex items-start gap-3 py-3 first:pt-0">
								<span
									class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
									style="background-color: {accentColor};"
								>
									{item.quantity}
								</span>
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium text-gray-900">{item.name}</p>
									{#if item.selectedModifiers.length}
										<p class="mt-0.5 text-xs text-gray-400">
											{item.selectedModifiers.map((m) => m.name).join(', ')}
										</p>
									{/if}
								</div>
								<p class="text-sm font-medium text-gray-900">
									{fmt(
										item.quantity *
											(item.basePrice +
												item.selectedModifiers.reduce((s, m) => s + m.priceAdjustment, 0))
									)}
								</p>
							</li>
						{/each}
					</ul>

					<!-- Totals -->
					<div class="mt-4 space-y-2 border-t border-gray-100 pt-4">
						<div class="flex justify-between text-sm text-gray-600">
							<span>Subtotal</span>
							<span>{fmt(data.order.subtotal)}</span>
						</div>
						{#if data.order.discount > 0}
							<div class="flex justify-between text-sm text-green-600">
								<span>Discount</span>
								<span>-{fmt(data.order.discount)}</span>
							</div>
						{/if}
						{#if data.order.deliveryFee > 0}
							<div class="flex justify-between text-sm text-gray-600">
								<span>Delivery fee</span>
								<span>{fmt(data.order.deliveryFee)}</span>
							</div>
						{/if}
						{#if data.order.tax > 0}
							<div class="flex justify-between text-sm text-gray-600">
								<span>Tax</span>
								<span>{fmt(data.order.tax)}</span>
							</div>
						{/if}
						{#if data.order.tip > 0}
							<div class="flex justify-between text-sm text-gray-600">
								<span>Tip</span>
								<span>{fmt(data.order.tip)}</span>
							</div>
						{/if}
						<div
							class="flex justify-between border-t border-gray-200 pt-2 text-base font-semibold text-gray-900"
						>
							<span>Total</span>
							<span>{fmt(data.order.total)}</span>
						</div>
					</div>

					<!-- Customer info -->
					<div class="mt-5 border-t border-gray-100 pt-4">
						<p class="mb-1 text-xs font-medium tracking-wide text-gray-400 uppercase">Customer</p>
						<p class="text-sm font-medium text-gray-800">{data.order.customerName}</p>
						{#if data.order.customerEmail}
							<p class="text-xs text-gray-500">{data.order.customerEmail}</p>
						{/if}
					</div>

					{#if data.order.notes}
						<div class="mt-3 rounded-lg bg-gray-50 px-3 py-2">
							<p class="text-xs text-gray-500">{data.order.notes}</p>
						</div>
					{/if}
				</div>

				<div class="mt-3 flex justify-center">
					<a
						href={resolve(`/${data.tenant.slug}/cart`)}
						class="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-600"
					>
						<Icon icon="mdi:arrow-left" class="h-3.5 w-3.5" /> Back to cart
					</a>
				</div>
			</div>
		</div>
	</main>
</div>
