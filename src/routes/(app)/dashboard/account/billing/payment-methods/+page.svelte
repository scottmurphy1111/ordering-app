<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import type { PageData, ActionData } from './$types';
	import { enhanceWithToasts } from '$lib/forms/enhance-with-toasts';
	import { confirmDialog } from '$lib/confirm.svelte';
	import { Button } from '$lib/components/ui/button';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { Card, CardHeader, CardTitle, CardAction, CardContent } from '$lib/components/ui/card';
	import { Alert } from '$lib/components/ui/alert';
	import { toast } from '$lib/toast';
	import { onMount, tick } from 'svelte';
	import { replaceState } from '$app/navigation';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let submittingRemoveId = $state<string | null>(null);
	let submittingSetDefaultId = $state<string | null>(null);

	// Per-form save errors.
	let cardActionError = $state<string | null>(null);

	// Legacy: "saved" comes from the add-card flow, which currently sets a flag
	// on form data rather than redirecting back. Keep the effect for now.
	$effect(() => {
		if ((form as { saved?: boolean } | null)?.saved) toast.success('Card saved');
	});

	// URL-param toast: read once at script init, fire from onMount after the
	// Toaster portal has mounted, then clean the URL so a refresh doesn't re-fire.
	const wasAdded = page.url.searchParams.get('added') === '1';

	onMount(async () => {
		await tick();

		if (wasAdded) toast.success('Card saved');

		if (!page.url.searchParams.has('added')) return;
		try {
			const cleaned = new URL(page.url.href);
			cleaned.searchParams.delete('added');
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- same-page query-param cleanup, not navigation
			replaceState(cleaned.toString(), page.state);
		} catch (err) {
			console.debug('[payment-methods] skipped added-param cleanup:', err);
		}
	});

	const cardBrandIcon: Record<string, string> = {
		visa: 'logos:visa',
		mastercard: 'logos:mastercard',
		amex: 'logos:amex',
		discover: 'logos:discover'
	};

	const cardBrandLabel: Record<string, string> = {
		visa: 'Visa',
		mastercard: 'Mastercard',
		amex: 'American Express',
		discover: 'Discover',
		diners: 'Diners Club',
		jcb: 'JCB',
		unionpay: 'UnionPay'
	};

	function padMonth(m: number) {
		return String(m).padStart(2, '0');
	}

	// Subscription-level default takes precedence; fall back to customer-level default
	const effectiveDefault = $derived(
		data.subscriptionDefaultPaymentMethodId ?? data.defaultPaymentMethodId
	);
</script>

<svelte:head>
	<title>Payment methods — Order Local</title>
</svelte:head>

<div class="max-w-3xl">
	<div class="mb-6">
		<a
			href={resolve('/dashboard/account/billing')}
			class="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<Icon icon="mdi:arrow-left" class="h-3.5 w-3.5" />
			Back to billing
		</a>
		<h1 class="text-2xl font-bold text-gray-900">Payment methods</h1>
		<p class="mt-1 text-sm text-gray-500">Cards saved to your account for subscription charges.</p>
	</div>

	{#if cardActionError}
		<Alert severity="error" class="mb-4">{cardActionError}</Alert>
	{/if}

	<Card class="shadow-sm">
		<CardHeader class="border-b">
			<CardTitle>Cards</CardTitle>
			<CardAction>
				<Button href={resolve('/dashboard/account/billing/payment-methods/add')} class="gap-1.5">
					<Icon icon="mdi:plus" class="h-3.5 w-3.5" />
					Add card
				</Button>
			</CardAction>
		</CardHeader>
		<CardContent class="p-0">
			{#if !data.hasStripeCustomer}
				<div class="px-6 py-12 text-center">
					<p class="mb-1 text-base font-semibold text-gray-900">No billing account yet</p>
					<p class="mb-4 text-sm text-gray-500">Upgrade to a paid plan to set up billing.</p>
					<a
						href={resolve('/dashboard/account/billing')}
						class="text-sm font-medium text-primary hover:text-primary/90"
					>
						View plans →
					</a>
				</div>
			{:else if data.paymentMethods.length === 0}
				<div class="px-6 py-12 text-center">
					<p class="mb-1 text-base font-semibold text-gray-900">No cards saved</p>
					<p class="mb-4 text-sm text-gray-500">Add a card to use for subscription charges.</p>
					<Button href={resolve('/dashboard/account/billing/payment-methods/add')} class="gap-1.5">
						<Icon icon="mdi:plus" class="h-3.5 w-3.5" />
						Add card
					</Button>
				</div>
			{:else}
				<ul class="divide-y divide-gray-100">
					{#each data.paymentMethods as method (method.id)}
						{@const isDefault = method.id === effectiveDefault}
						{@const brandIcon = cardBrandIcon[method.brand] ?? 'mdi:credit-card-outline'}
						{@const brandLabel = cardBrandLabel[method.brand] ?? 'Card'}
						<li class="flex flex-col gap-3 px-6 py-4 md:flex-row md:items-center">
							<!-- Card identity -->
							<div class="flex min-w-0 flex-1 items-center gap-3">
								<div
									class="flex h-9 w-10 shrink-0 items-center justify-center rounded border border-gray-200 bg-white"
								>
									<Icon icon={brandIcon} class="h-5 w-auto" />
								</div>
								<div class="min-w-0">
									<p class="text-sm font-medium text-gray-900">
										{brandLabel} ending in {method.last4}
									</p>
									<p class="text-xs text-gray-500">
										Expires {padMonth(method.expMonth)}/{method.expYear}
									</p>
								</div>
							</div>

							<!-- Row actions -->
							<div class="flex items-center gap-2 md:shrink-0">
								{#if isDefault}
									<StatusBadge tone="bg-primary/10 text-primary">Default</StatusBadge>
								{:else}
									<form
										method="post"
										action="?/setDefault"
										use:enhance={enhanceWithToasts({
											successMessage: 'Default card updated',
											onStart: () => {
												submittingSetDefaultId = method.id;
												cardActionError = null;
											},
											onEnd: () => {
												submittingSetDefaultId = null;
											},
											onError: (msg) => {
												cardActionError = msg;
											}
										})}
									>
										<input type="hidden" name="paymentMethodId" value={method.id} />
										<Button
											type="submit"
											variant="outline"
											size="xs"
											disabled={submittingSetDefaultId !== null}
										>
											{#if submittingSetDefaultId === method.id}
												<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
												Saving...
											{:else}
												Set as default
											{/if}
										</Button>
									</form>
								{/if}

								<form
									method="post"
									action="?/remove"
									use:enhance={enhanceWithToasts({
										successMessage: 'Card removed',
										onStart: () => {
											submittingRemoveId = method.id;
											cardActionError = null;
										},
										onEnd: () => {
											submittingRemoveId = null;
										},
										onError: (msg) => {
											cardActionError = msg;
										}
									})}
								>
									<input type="hidden" name="paymentMethodId" value={method.id} />
									<Button
										type="submit"
										variant="ghost"
										size="icon"
										class="text-red-500 hover:bg-red-50 hover:text-red-600"
										disabled={submittingRemoveId !== null}
										onclick={async (e) => {
											e.preventDefault();
											const formEl = (e.currentTarget as HTMLButtonElement).closest(
												'form'
											) as HTMLFormElement;
											if (
												await confirmDialog(
													`Remove this ${cardBrandLabel[method.brand] ?? 'card'} ending in ${method.last4}? This card won't be available for future charges.`,
													{
														title: 'Remove card',
														confirmLabel: 'Remove',
														cancelLabel: 'Keep',
														danger: true
													}
												)
											)
												formEl.requestSubmit();
										}}
									>
										{#if submittingRemoveId === method.id}
											<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
										{:else}
											<Icon icon="mdi:trash-can-outline" />
										{/if}
									</Button>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</CardContent>
	</Card>

	<p class="mt-3 text-xs text-muted-foreground">
		Card details are stored securely with Stripe — they never touch our servers.
	</p>
</div>
