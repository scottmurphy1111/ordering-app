<script lang="ts">
	import { onMount } from 'svelte';
	import { loadStripe } from '@stripe/stripe-js';
	import type { Stripe, StripeElements } from '@stripe/stripe-js';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Skeleton } from '$lib/components/ui/skeleton';

	let { data } = $props();

	let stripe = $state<Stripe | null>(null);
	let elements = $state<StripeElements | null>(null);
	let mountReady = $state(false);
	let submitting = $state(false);
	let paymentError = $state('');

	onMount(async () => {
		const stripeInstance = await loadStripe(data.publishableKey);
		if (!stripeInstance) return;
		stripe = stripeInstance;

		elements = stripeInstance.elements({
			clientSecret: data.clientSecret,
			appearance: {
				theme: 'stripe',
				variables: {
					colorPrimary: '#16a34a',
					colorBackground: '#ffffff',
					colorText: '#111827',
					colorDanger: '#ef4444',
					fontFamily: 'ui-sans-serif, system-ui, sans-serif',
					borderRadius: '8px',
					spacingUnit: '4px'
				},
				rules: {
					'.Input': { border: '1px solid #e5e7eb', boxShadow: 'none' },
					'.Input:focus': { border: '1px solid #16a34a', boxShadow: '0 0 0 1px #16a34a' },
					'.Label': { color: '#374151', fontWeight: '500', fontSize: '13px' },
					'.Tab': { border: '1px solid #e5e7eb', boxShadow: 'none' },
					'.Tab--selected': { border: '1px solid #16a34a', boxShadow: '0 0 0 1px #16a34a' }
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

		const { error: stripeError } = await stripe.confirmSetup({
			elements,
			confirmParams: {
				return_url: `${window.location.origin}${resolve('/dashboard/account/billing/payment-methods')}?added=1`
			}
		});

		if (stripeError) {
			paymentError = stripeError.message ?? 'Failed to save card. Please try again.';
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Add a card — Order Local</title>
</svelte:head>

<div class="max-w-xl">
	<div class="mb-6">
		<a
			href={resolve('/dashboard/account/billing/payment-methods')}
			class="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<Icon icon="mdi:arrow-left" class="h-3.5 w-3.5" />
			Back to payment methods
		</a>
		<h1 class="text-2xl font-bold text-gray-900">Add a card</h1>
		<p class="mt-1 text-sm text-gray-500">
			Save a card to your account for subscription and add-on charges.
		</p>
	</div>

	<Card class="shadow-sm">
		<CardContent class="p-6">
			<h2 class="mb-5 text-base font-semibold text-foreground">Card details</h2>

			{#if !mountReady}
				<div class="space-y-3">
					<Skeleton class="h-10 rounded-lg" />
					<Skeleton class="h-10 rounded-lg" />
					<div class="grid grid-cols-2 gap-3">
						<Skeleton class="h-10 rounded-lg" />
						<Skeleton class="h-10 rounded-lg" />
					</div>
					<Skeleton class="h-10 rounded-lg" />
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
					<Button type="submit" disabled={submitting} class="mt-5 w-full gap-1.5">
						{#if submitting}
							<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
							Saving…
						{:else}
							<Icon icon="mdi:lock" class="h-4 w-4" />
							Save card
						{/if}
					</Button>
				{/if}
			</form>
		</CardContent>
	</Card>

	<p class="mt-3 text-center text-xs text-muted-foreground">
		Secured by Stripe · Card data never touches our servers
	</p>
</div>
