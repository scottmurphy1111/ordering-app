<script lang="ts">
	import { onMount } from 'svelte';
	import { loadStripe } from '@stripe/stripe-js';
	import type { Stripe, StripeElements } from '@stripe/stripe-js';
	import { resolve } from '$app/paths';
	import { deserialize } from '$app/forms';
	import type { ActionResult } from '@sveltejs/kit';
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

	function fmtCents(cents: number): string {
		return (cents / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
	}

	function fmtDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!stripe || !elements || submitting) return;

		submitting = true;
		paymentError = '';

		// confirmSetup saves the card without charging (the charge happens in
		// finalizeSubscription when the subscription is created). redirect: 'if_required'
		// keeps the vendor on this page for most cards; 3DS-required cards will
		// redirect to return_url, but finalizeSubscription won't have run yet — the
		// vendor would need to restart checkout. Acceptable: 3DS cards are rare in
		// US test environments. Future enhancement: detect the SI return param in the
		// billing-page load and complete finalization automatically.
		const { error: stripeError, setupIntent } = await stripe.confirmSetup({
			elements,
			redirect: 'if_required',
			confirmParams: {
				return_url: `${window.location.origin}${resolve('/dashboard/account/billing')}?upgraded=1`
			}
		});

		if (stripeError) {
			paymentError = stripeError.message ?? 'Could not save your card. Please try again.';
			submitting = false;
			return;
		}

		if (!setupIntent || setupIntent.status !== 'succeeded') {
			paymentError = 'Could not confirm your card. Please try again.';
			submitting = false;
			return;
		}

		// Card saved. POST to finalizeSubscription to create the subscription and
		// flip the vendor tier server-side.
		const formData = new FormData();
		formData.append('setupIntentId', data.setupIntentId);
		formData.append('planKey', data.planKey);
		formData.append('interval', data.interval);

		try {
			const response = await fetch('?/finalizeSubscription', {
				method: 'POST',
				body: formData,
				headers: { 'x-sveltekit-action': 'true' }
			});

			// SvelteKit actions return a serialized ActionResult body (not a raw 3xx
			// redirect) — deserialize() is the canonical parser for this format.
			const result: ActionResult = deserialize(await response.text());

			if (result.type === 'redirect') {
				// Success — finalizeSubscription redirected to billing?upgraded=1.
				window.location.href = result.location;
				return;
			}

			if (result.type === 'failure') {
				const err = (result.data as { error?: string } | undefined)?.error;
				paymentError = err ?? 'Could not start your subscription. Please contact support.';
				submitting = false;
				return;
			}

			if (result.type === 'error') {
				console.error('[checkout] finalizeSubscription server error:', result.error);
				paymentError = 'Something went wrong on our end. Please try again or contact support.';
				submitting = false;
				return;
			}

			// type === 'success' shouldn't happen (this action always redirects on the
			// happy path), but handle defensively.
			if (result.type === 'success') {
				window.location.href = `${window.location.origin}/dashboard/account/billing?upgraded=1`;
			}
		} catch (err) {
			console.error('[checkout] finalizeSubscription POST failed:', err);
			paymentError = 'Network error. Please try again.';
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Complete your upgrade — Order Local</title>
</svelte:head>

<div class="max-w-3xl">
	<!-- Back link + page header -->
	<div class="mb-6">
		<a
			href={resolve('/dashboard/account/billing')}
			class="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<Icon icon="mdi:arrow-left" class="h-3.5 w-3.5" />
			Back to billing
		</a>
		<h1 class="text-2xl font-bold text-gray-900">Complete your upgrade</h1>
		<p class="mt-1 text-sm text-gray-500">
			You're upgrading to Order Local {data.planName} ({data.interval} billing).
		</p>
	</div>

	<div class="grid gap-6 lg:grid-cols-[1fr_320px]">
		<!-- Left: payment form -->
		<div>
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
							<Button type="submit" disabled={submitting} class="mt-5 w-full gap-1.5">
								{#if submitting}
									<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
									Processing…
								{:else}
									<Icon icon="mdi:lock" class="h-4 w-4" />
									Pay {fmtCents(data.amountDueTodayCents)} and start your {data.planName} plan
								{/if}
							</Button>
						{/if}
					</form>
				</CardContent>
			</Card>

			<div class="mt-3 flex items-center gap-2 px-1">
				<Icon icon="mdi:shield-check-outline" class="h-4 w-4 shrink-0 text-muted-foreground" />
				<p class="text-xs text-muted-foreground">
					Payments are encrypted and processed securely by Stripe. Your card details are never
					stored by us.
				</p>
			</div>
		</div>

		<!-- Right: order summary -->
		<div>
			<Card class="shadow-sm">
				<CardContent class="p-6">
					<h2 class="mb-4 text-base font-semibold text-foreground">Order summary</h2>

					<div class="mb-4 flex items-start justify-between gap-4">
						<div>
							<p class="font-medium text-foreground">Order Local {data.planName}</p>
							<p class="text-sm text-muted-foreground capitalize">{data.interval} billing</p>
						</div>
						<div class="text-right">
							<p class="font-semibold text-foreground">
								${data.displayPrice.monthly}<span class="text-sm font-normal text-muted-foreground"
									>/mo</span
								>
							</p>
							{#if data.interval === 'annual'}
								<p class="text-xs text-muted-foreground">Billed ${data.displayPrice.billed}/yr</p>
							{/if}
						</div>
					</div>

					<div class="mb-4 border-t border-border pt-4">
						<div class="flex items-center justify-between text-sm font-medium">
							<span class="text-muted-foreground">Total due today</span>
							<span class="text-foreground">{fmtCents(data.amountDueTodayCents)}</span>
						</div>
						<p class="mt-1 text-xs text-muted-foreground">
							Renews {fmtCents(data.fullCycleAmountCents)}/{data.interval === 'annual'
								? 'year'
								: 'month'}{data.nextChargeDate ? ` on ${fmtDate(data.nextChargeDate)}` : ''}
						</p>
					</div>

					<div class="border-t border-border pt-4">
						<p class="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
							What's included
						</p>
						<ul class="space-y-1.5">
							{#each data.features as feature (feature)}
								<li class="flex items-start gap-2 text-xs text-muted-foreground">
									<Icon
										icon="mdi:check-circle-outline"
										class="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary"
									/>
									{feature}
								</li>
							{/each}
						</ul>
					</div>
				</CardContent>
			</Card>

			<div class="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground">
				<Icon icon="mdi:refresh" class="h-3.5 w-3.5" />
				Cancel anytime · Receipt sent to your email
			</div>
		</div>
	</div>
</div>
