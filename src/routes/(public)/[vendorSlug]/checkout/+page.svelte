<script lang="ts">
	import { onMount } from 'svelte';
	import { loadStripe } from '@stripe/stripe-js';
	import type { StripeElements, Stripe } from '@stripe/stripe-js';
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Card, CardContent } from '$lib/components/ui/card';

	let { data }: { data: PageData } = $props();

	let stripe = $state<Stripe | null>(null);
	let elements = $state<StripeElements | null>(null);
	let mountReady = $state(false);
	let submitting = $state(false);
	let paymentError = $state('');
	const fmt = (cents: number) =>
		new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

	const backgroundColor = $derived(data.vendor.backgroundColor ?? '#000000');
	const accentColor = $derived(data.vendor.accentColor ?? '#374151');
	const foregroundColor = $derived(data.vendor.foregroundColor ?? '#ffffff');
	const logoUrl = $derived(data.vendor.logoUrl ?? '');

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
				return_url: `${window.location.origin}/${data.vendor.slug}/orders/${data.order.id}`
			}
		});

		if (stripeError) {
			paymentError = stripeError.message ?? 'Payment failed. Please try again.';
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Checkout — {data.vendor.name}</title>
</svelte:head>

<div class="min-h-screen bg-muted/50">
	<!-- Branded header -->
	<header class="border-b border-white/10" style="background-color: {backgroundColor};">
		<div class="mx-auto flex max-w-4xl items-center gap-3 px-4 py-4">
			{#if logoUrl}
				<img src={logoUrl} alt={data.vendor.name} class="h-8 w-8 rounded object-contain" />
			{/if}
			<span class="text-lg font-semibold" style="color: {foregroundColor};"
				>{data.vendor.name}</span
			>
			<span class="ml-auto text-sm opacity-60" style="color: {foregroundColor};">Secure checkout</span>
			<Icon icon="mdi:lock" class="h-4 w-4 opacity-60" style="color: {foregroundColor};" />
		</div>
	</header>

	<main class="mx-auto max-w-4xl px-4 py-8">
		<div class="grid gap-6 lg:grid-cols-[1fr_420px]">
			<!-- Left: payment form -->
			<div class="space-y-4">
				<Card class="shadow-sm">
				<CardContent class="p-6">
					<h2 class="mb-5 text-base font-semibold text-foreground">Payment details</h2>

					{#if !mountReady}
						<div class="space-y-3">
							<Skeleton class="h-10 rounded-lg" />
							<Skeleton class="h-10 rounded-lg" />
							<div class="grid grid-cols-2 gap-3">
								<Skeleton class="h-10 rounded-lg" />
								<Skeleton class="h-10 rounded-lg" />
							</div>
						</div>
					{/if}

					<form onsubmit={handleSubmit}>
						<div id="payment-element"></div>

						{#if paymentError}
							<div
								class="mt-4 flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
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
				</CardContent>
				</Card>

				<div class="flex items-center justify-center gap-4 px-2">
					<Icon icon="mdi:shield-check-outline" class="h-4 w-4 text-muted-foreground" />
					<p class="text-xs text-muted-foreground">
						Payments are encrypted and processed securely by Stripe. Your card details are never
						stored by us.
					</p>
				</div>
			</div>

			<!-- Right: order summary -->
			<div class="order-first lg:order-last">
				<Card class="shadow-sm">
				<CardContent class="p-6">
					<div class="mb-5 flex items-center justify-between">
						<h2 class="text-base font-semibold text-foreground">Order summary</h2>
						<span
							class="rounded-full px-2.5 py-0.5 text-xs font-medium"
							style="background-color: {accentColor}1a; color: {accentColor};"
						>
							{data.order.orderNumber}
						</span>
					</div>

					<!-- Items -->
					<ul class="divide-y divide-border">
						{#each data.order.items as item (item.itemId + item.name)}
							<li class="flex items-start gap-3 py-3 first:pt-0">
								<span
									class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
									style="background-color: {accentColor};"
								>
									{item.quantity}
								</span>
								<div class="min-w-0 flex-1">
									<p class="text-sm font-medium text-foreground">{item.name}</p>
									{#if item.selectedModifiers.length}
										<p class="mt-0.5 text-xs text-muted-foreground">
											{item.selectedModifiers.map((m) => m.name).join(', ')}
										</p>
									{/if}
								</div>
								<p class="text-sm font-medium text-foreground">
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
					<div class="mt-4 space-y-2 border-t  pt-4">
						<div class="flex justify-between text-sm text-muted-foreground">
							<span>Subtotal</span>
							<span>{fmt(data.order.subtotal)}</span>
						</div>
						{#if data.order.discount > 0}
							<div class="flex justify-between text-sm text-primary">
								<span>Discount</span>
								<span>-{fmt(data.order.discount)}</span>
							</div>
						{/if}
						{#if data.order.deliveryFee > 0}
							<div class="flex justify-between text-sm text-muted-foreground">
								<span>Delivery fee</span>
								<span>{fmt(data.order.deliveryFee)}</span>
							</div>
						{/if}
						{#if data.order.tax > 0}
							<div class="flex justify-between text-sm text-muted-foreground">
								<span>Tax</span>
								<span>{fmt(data.order.tax)}</span>
							</div>
						{/if}
						{#if data.order.tip > 0}
							<div class="flex justify-between text-sm text-muted-foreground">
								<span>Tip</span>
								<span>{fmt(data.order.tip)}</span>
							</div>
						{/if}
						<div
							class="flex justify-between border-t  pt-2 text-base font-semibold text-foreground"
						>
							<span>Total</span>
							<span>{fmt(data.order.total)}</span>
						</div>
					</div>

					<!-- Customer info -->
					<div class="mt-5 border-t  pt-4">
						<p class="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Customer</p>
						<p class="text-sm font-medium text-foreground">{data.order.customerName}</p>
						{#if data.order.customerEmail}
							<p class="text-xs text-muted-foreground">{data.order.customerEmail}</p>
						{/if}
					</div>

					{#if data.order.notes}
						<div class="mt-3 rounded-lg bg-muted/50 px-3 py-2">
							<p class="text-xs text-muted-foreground">{data.order.notes}</p>
						</div>
					{/if}
				</CardContent>
				</Card>

				<div class="mt-3 flex justify-center">
					<a
						href={resolve(`/${data.vendor.slug}/cart`)}
						class="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-muted-foreground"
					>
						<Icon icon="mdi:arrow-left" class="h-3.5 w-3.5" /> Back to cart
					</a>
				</div>
			</div>
		</div>
	</main>
</div>
