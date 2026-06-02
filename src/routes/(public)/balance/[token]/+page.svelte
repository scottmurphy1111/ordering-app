<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';

	let { data, form: _form }: { data: PageData; form: ActionData } = $props();
	const form = $derived(_form as { payError?: string } | null);

	const vendor = $derived(data.vendor);
	const payment = $derived(data.payment);
	const order = $derived(data.order);

	function formatCents(cents: number) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
			cents / 100
		);
	}

	function formatDate(d: Date | string | null) {
		if (!d) return null;
		return new Intl.DateTimeFormat('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(d));
	}

	const isPaid = $derived(payment?.status === 'paid');
	const isVoid = $derived(payment?.status === 'void');
	const isBalance = $derived(payment?.label === 'Balance');
	const isPayable = $derived(!!payment && isBalance && payment.status === 'scheduled' && !!order);

	let submitting = $state(false);
</script>

<svelte:head>
	<title>Pay balance — {vendor.name}</title>
</svelte:head>

<main class="mx-auto max-w-xl px-4 py-10">
	{#if !payment || !isBalance}
		<!-- Invalid token / not a balance link -->
		<div class="rounded-lg border bg-background p-8 text-center">
			<div
				class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500"
			>
				<Icon icon="mdi:link-off" class="h-6 w-6" />
			</div>
			<h1 class="text-xl font-bold text-neutral-900" style="font-family: var(--font-heading);">
				Payment link not found
			</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				This link is invalid or may no longer be active.
			</p>
			<div class="mt-6">
				<Button href={resolve('/catalog' as `/${string}`)} variant="outline">
					Back to {vendor.name}
				</Button>
			</div>
		</div>
	{:else if isPaid}
		<!-- Already paid -->
		<div class="rounded-lg border bg-background p-8 text-center">
			<div
				class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
			>
				<Icon icon="mdi:check" class="h-6 w-6" />
			</div>
			<h1 class="text-xl font-bold text-neutral-900" style="font-family: var(--font-heading);">
				Balance already paid
			</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				This balance has been paid in full. Thank you!
			</p>
			<div class="mt-6">
				<Button href={resolve('/catalog' as `/${string}`)} variant="outline">
					Back to {vendor.name}
				</Button>
			</div>
		</div>
	{:else if isVoid || !order}
		<!-- Void / no order -->
		<div class="rounded-lg border bg-background p-8 text-center">
			<div
				class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500"
			>
				<Icon icon="mdi:close" class="h-6 w-6" />
			</div>
			<h1 class="text-xl font-bold text-neutral-900" style="font-family: var(--font-heading);">
				Balance not payable
			</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				This balance is no longer available to pay. Contact {vendor.name} if you have questions.
			</p>
			<div class="mt-6">
				<Button href={resolve('/catalog' as `/${string}`)} variant="outline">
					Back to {vendor.name}
				</Button>
			</div>
		</div>
	{:else}
		<!-- Active balance to pay -->
		<div class="rounded-lg border bg-background p-6 sm:p-8">
			<div class="mb-6">
				<h1 class="text-2xl font-bold text-neutral-900" style="font-family: var(--font-heading);">
					Pay your balance
				</h1>
				<p class="mt-1.5 text-sm text-muted-foreground">
					Order {order.orderNumber} from {vendor.name}.
				</p>
			</div>

			{#if form?.payError}
				<div class="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					<Icon
						icon="mdi:alert-circle-outline"
						class="mr-1.5 mb-0.5 inline-block h-4 w-4 align-text-bottom"
					/>
					{form.payError}
				</div>
			{/if}

			<!-- Balance block -->
			<div class="mb-5 rounded-lg border border-gray-100 bg-gray-50 px-5 py-4 text-center">
				<p class="mb-1 text-xs font-medium tracking-wide text-gray-500 uppercase">Balance due</p>
				<p class="text-3xl font-bold text-foreground">{formatCents(payment.amountCents)}</p>
				{#if payment.dueAt}
					<p class="mt-1 text-xs text-muted-foreground">Due {formatDate(payment.dueAt)}</p>
				{/if}
				<p class="mt-2 text-xs text-muted-foreground">
					Order total {formatCents(order.total)}
				</p>
			</div>

			<!-- Pay CTA -->
			<form
				method="post"
				action="?/pay"
				use:enhance={() => {
					submitting = true;
					return async ({ result, update }) => {
						if (result.type === 'redirect') {
							window.location.href = result.location;
							return;
						}
						submitting = false;
						await update();
					};
				}}
			>
				<Button type="submit" class="w-full" disabled={submitting || !isPayable}>
					{#if submitting}
						<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
						Continuing...
					{:else}
						<Icon icon="mdi:credit-card-outline" class="h-4 w-4" />
						Pay balance
					{/if}
				</Button>
			</form>
		</div>
	{/if}
</main>
