<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';

	let { data, form: _form }: { data: PageData; form: ActionData } = $props();
	const form = $derived(
		_form as {
			acceptError?: string;
			acceptSuccess?: boolean;
			declineError?: string;
			declineSuccess?: boolean;
		} | null
	);

	const vendor = $derived(data.vendor);
	const quote = $derived(data.quote);
	const request = $derived(data.request);
	const expired = $derived(data.expired);

	function formatCents(cents: number) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
			cents / 100
		);
	}

	function formatTargetDate(s: string | null) {
		if (!s) return null;
		return new Intl.DateTimeFormat('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(s + 'T12:00:00Z'));
	}

	const isAccepted = $derived(!!quote?.acceptedAt || !!form?.acceptSuccess);
	const isDeclined = $derived(!!quote?.declinedAt || !!form?.declineSuccess);
	let submittingAction = $state<'accept' | 'decline' | null>(null);
</script>

<svelte:head>
	<title>Quote from {vendor.name}</title>
</svelte:head>

<main class="mx-auto max-w-xl px-4 py-10">
	{#if !quote}
		<!-- Invalid token -->
		<div class="rounded-lg border bg-background p-8 text-center">
			<div
				class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500"
			>
				<Icon icon="mdi:link-off" class="h-6 w-6" />
			</div>
			<h1 class="text-xl font-bold text-neutral-900" style="font-family: var(--font-heading);">
				Quote not found
			</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				This link is invalid or may have already been used.
			</p>
			<div class="mt-6">
				<Button href={resolve('/catalog' as `/${string}`)} variant="outline">
					Back to {vendor.name}
				</Button>
			</div>
		</div>
	{:else if isAccepted}
		<!-- Accepted state -->
		<div class="rounded-lg border bg-background p-8 text-center">
			<div
				class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
			>
				<Icon icon="mdi:check" class="h-6 w-6" />
			</div>
			<h1 class="text-xl font-bold text-neutral-900" style="font-family: var(--font-heading);">
				Quote accepted!
			</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				{vendor.name} will be in touch to confirm the details and arrange payment.
			</p>
			<div class="mt-6">
				<Button href={resolve('/catalog' as `/${string}`)} variant="outline">
					Back to {vendor.name}
				</Button>
			</div>
		</div>
	{:else if isDeclined}
		<!-- Declined state -->
		<div class="rounded-lg border bg-background p-8 text-center">
			<div
				class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500"
			>
				<Icon icon="mdi:close" class="h-6 w-6" />
			</div>
			<h1 class="text-xl font-bold text-neutral-900" style="font-family: var(--font-heading);">
				Quote declined
			</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				No problem. Feel free to reach out to {vendor.name} if you'd like to discuss other options.
			</p>
			<div class="mt-6">
				<Button href={resolve('/catalog' as `/${string}`)} variant="outline">
					Back to {vendor.name}
				</Button>
			</div>
		</div>
	{:else if expired}
		<!-- Expired -->
		<div class="rounded-lg border bg-background p-8 text-center">
			<div
				class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-600"
			>
				<Icon icon="mdi:clock-outline" class="h-6 w-6" />
			</div>
			<h1 class="text-xl font-bold text-neutral-900" style="font-family: var(--font-heading);">
				Quote expired
			</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				This quote is no longer available. Contact {vendor.name} to request a new one.
			</p>
			<div class="mt-6">
				<Button href={resolve('/request' as `/${string}`)} variant="outline">
					Submit a new request
				</Button>
			</div>
		</div>
	{:else}
		<!-- Active quote -->
		<div class="rounded-lg border bg-background p-6 sm:p-8">
			<div class="mb-6">
				<h1 class="text-2xl font-bold text-neutral-900" style="font-family: var(--font-heading);">
					Your quote is ready
				</h1>
				<p class="mt-1.5 text-sm text-muted-foreground">
					{vendor.name} has put together a quote for your special request.
				</p>
			</div>

			{#if form?.acceptError}
				<div class="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					<Icon
						icon="mdi:alert-circle-outline"
						class="mr-1.5 mb-0.5 inline-block h-4 w-4 align-text-bottom"
					/>
					{form.acceptError}
				</div>
			{/if}
			{#if form?.declineError}
				<div class="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					<Icon
						icon="mdi:alert-circle-outline"
						class="mr-1.5 mb-0.5 inline-block h-4 w-4 align-text-bottom"
					/>
					{form.declineError}
				</div>
			{/if}

			<!-- Price block -->
			<div class="mb-5 rounded-lg border border-gray-100 bg-gray-50 px-5 py-4 text-center">
				<p class="mb-1 text-xs font-medium tracking-wide text-gray-500 uppercase">Quoted price</p>
				<p class="text-3xl font-bold text-foreground">{formatCents(quote.priceCents)}</p>
			</div>

			<!-- Quote message -->
			{#if quote.message}
				<div class="mb-5">
					<p class="mb-1 text-xs font-medium tracking-wide text-gray-500 uppercase">
						Message from {vendor.name}
					</p>
					<p class="text-sm whitespace-pre-wrap text-gray-700">{quote.message}</p>
				</div>
			{/if}

			<!-- Request details (brief) -->
			{#if request}
				<div class="mb-6">
					<p class="mb-1 text-xs font-medium tracking-wide text-gray-500 uppercase">
						Your original request
					</p>
					<p class="line-clamp-3 text-sm text-gray-600">{request.description}</p>
					{#if request.targetDate}
						<p class="mt-1 text-xs text-amber-700">
							<Icon
								icon="mdi:calendar-outline"
								class="mr-0.5 mb-0.5 inline-block h-3 w-3 align-text-bottom"
							/>
							Requested for {formatTargetDate(request.targetDate)}
						</p>
					{/if}
				</div>
			{/if}

			<!-- Accept CTA -->
			<form
				method="post"
				action="?/accept"
				use:enhance={() => {
					submittingAction = 'accept';
					return async ({ result, update }) => {
						if (result.type === 'redirect') {
							window.location.href = result.location;
							return;
						}
						submittingAction = null;
						await update();
					};
				}}
				class="mb-3"
			>
				<Button type="submit" class="w-full" disabled={submittingAction !== null}>
					{#if submittingAction === 'accept'}
						<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
						Accepting...
					{:else}
						<Icon icon="mdi:check" class="h-4 w-4" />
						Accept quote
					{/if}
				</Button>
			</form>

			<div class="text-center text-xs text-muted-foreground">
				Not interested?
				<form
					method="post"
					action="?/decline"
					use:enhance={() => {
						submittingAction = 'decline';
						return async ({ update }) => {
							submittingAction = null;
							await update();
						};
					}}
					class="inline"
				>
					<button
						type="submit"
						disabled={submittingAction !== null}
						class="text-muted-foreground underline hover:text-foreground disabled:opacity-50"
					>
						{submittingAction === 'decline' ? 'Declining...' : 'Decline this quote'}
					</button>
				</form>
			</div>
		</div>
	{/if}
</main>
