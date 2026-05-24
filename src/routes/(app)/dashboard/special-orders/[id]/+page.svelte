<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Alert } from '$lib/components/ui/alert';
	import { confirmDialog } from '$lib/confirm.svelte';
	import { toast } from '$lib/toast';

	let { data, form: _form }: { data: PageData; form: ActionData } = $props();
	const form = $derived(
		_form as {
			sendError?: string;
			sendSuccess?: boolean;
			declineError?: string;
			declineSuccess?: boolean;
		} | null
	);

	const req = $derived(data.request);
	const quotes = $derived(data.quotes);

	let priceDollars = $state('');
	let submittingAction = $state<'sendQuote' | 'decline' | null>(null);

	const priceCents = $derived.by(() => {
		const val = parseFloat(priceDollars);
		return isNaN(val) || val <= 0 ? '' : String(Math.round(val * 100));
	});

	function formatDate(d: Date | string) {
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
			hour: 'numeric',
			minute: '2-digit'
		}).format(new Date(d));
	}

	function formatTargetDate(s: string | null) {
		if (!s) return null;
		return new Intl.DateTimeFormat('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(s + 'T12:00:00Z'));
	}

	function formatCents(cents: number) {
		return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
			cents / 100
		);
	}

	const isPending = $derived(req.state === 'pending');
	const isQuoted = $derived(req.state === 'quoted');
	const isDeclined = $derived(req.state === 'declined');
	const isAccepted = $derived(req.state === 'accepted');
	const canSendQuote = $derived(isPending || isQuoted);
	const canDecline = $derived(isPending || isQuoted);

	const linkedOrder = $derived(data.linkedOrder ?? null);

	$effect(() => {
		if (form?.sendSuccess) {
			toast.success('Quote sent', { description: `Sent to ${req.customerEmail}` });
		}
	});

	$effect(() => {
		if (form?.declineSuccess) {
			toast.success('Request declined', {
				action: {
					label: 'Back to list',
					onClick: () => goto(resolve('/dashboard/special-orders'))
				}
			});
		}
	});
</script>

<div class="max-w-2xl">
	<!-- Back-link breadcrumb -->
	<div class="mb-6 flex items-center gap-3">
		<a
			href={resolve('/dashboard/special-orders')}
			class="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Special requests
		</a>
		<span class="text-muted-foreground/40">/</span>
		<h1 class="text-2xl font-bold text-foreground">{req.customerName}</h1>
	</div>

	{#if form?.sendError}
		<Alert severity="error" class="mb-4">{form.sendError}</Alert>
	{/if}
	{#if form?.declineError}
		<Alert severity="error" class="mb-4">{form.declineError}</Alert>
	{/if}

	<div class="space-y-5">
		<!-- Request details card -->
		<div class="rounded-xl border border-gray-200 bg-white p-5">
			<div class="mb-4 flex items-start justify-between gap-3">
				<div>
					<div class="flex flex-wrap items-center gap-2">
						<span class="text-base font-semibold text-gray-900">{req.customerName}</span>
						{#if isPending}
							<span class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
								>Pending</span
							>
						{:else if isQuoted}
							<span
								class="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700"
								>Quoted</span
							>
						{:else if isDeclined}
							<span class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
								>Declined</span
							>
						{:else if isAccepted}
							<span class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
								>Accepted</span
							>
						{/if}
					</div>
					<div class="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
						<span>
							<Icon
								icon="mdi:email-outline"
								class="mr-1 mb-0.5 inline-block h-3.5 w-3.5 align-text-bottom"
							/>
							{req.customerEmail}
						</span>
						{#if req.customerPhone}
							<span>
								<Icon
									icon="mdi:phone-outline"
									class="mr-1 mb-0.5 inline-block h-3.5 w-3.5 align-text-bottom"
								/>
								{req.customerPhone}
							</span>
						{/if}
					</div>
				</div>
				<span class="shrink-0 text-xs text-gray-400">{formatDate(req.createdAt)}</span>
			</div>

			{#if req.targetDate}
				<div
					class="mb-4 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700"
				>
					<Icon icon="mdi:calendar-outline" class="h-3.5 w-3.5 shrink-0" />
					Requested for {formatTargetDate(req.targetDate)}
				</div>
			{/if}

			<div>
				<p class="mb-1 text-xs font-medium tracking-wide text-gray-500 uppercase">
					Request details
				</p>
				<p class="text-sm whitespace-pre-wrap text-gray-700">{req.description}</p>
			</div>

			{#if (req.photoUrls as string[]).length > 0}
				<div class="mt-4">
					<p class="mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase">Photos</p>
					<div class="flex flex-wrap gap-2">
						{#each req.photoUrls as string[] as url, i (i)}
							<!-- eslint-disable svelte/no-navigation-without-resolve -->
							<a
								href={url}
								target="_blank"
								rel="noopener noreferrer"
								class="block h-20 w-20 overflow-hidden rounded-lg border border-gray-200"
							>
								<img src={url} alt="Reference photo {i + 1}" class="h-full w-full object-cover" />
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						{/each}
					</div>
				</div>
			{/if}

			{#if isDeclined && req.declinedReason}
				<div class="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
					<strong>Declined:</strong>
					{req.declinedReason}
				</div>
			{/if}
		</div>

		<!-- Accepted — linked order -->
		{#if isAccepted && linkedOrder}
			<div class="rounded-xl border border-green-200 bg-green-50 p-5">
				<div class="flex items-center justify-between gap-3">
					<div class="flex items-center gap-2">
						<Icon icon="mdi:check-circle-outline" class="h-5 w-5 shrink-0 text-green-600" />
						<div>
							<p class="text-sm font-semibold text-green-900">Customer accepted the quote</p>
							<p class="text-xs text-green-700">
								Order {linkedOrder.orderNumber} · {formatCents(linkedOrder.total)} ·
								{linkedOrder.paymentStatus === 'paid' ? 'Paid' : 'Payment pending'}
							</p>
						</div>
					</div>
					<Button href={resolve(`/dashboard/orders/${linkedOrder.id}`)} variant="outline" class="shrink-0">
						<Icon icon="mdi:arrow-right" class="h-3.5 w-3.5" />
						View order
					</Button>
				</div>
			</div>
		{:else if isAccepted}
			<div class="rounded-xl border border-green-200 bg-green-50 p-5">
				<div class="flex items-center gap-2">
					<Icon icon="mdi:check-circle-outline" class="h-5 w-5 shrink-0 text-green-600" />
					<p class="text-sm font-semibold text-green-900">Customer accepted — awaiting payment</p>
				</div>
			</div>
		{/if}

		<!-- Quote history -->
		{#if quotes.length > 0}
			<div class="rounded-xl border border-gray-200 bg-white p-5">
				<h2 class="mb-3 text-sm font-medium tracking-wide text-gray-500 uppercase">
					Quote history
				</h2>
				<div class="space-y-3">
					{#each quotes as quote (quote.id)}
						<div class="rounded-lg border border-gray-100 bg-gray-50 px-3 py-3">
							<div class="flex items-start justify-between gap-3">
								<div>
									<span class="text-sm font-semibold text-gray-900"
										>{formatCents(quote.priceCents)}</span
									>
									{#if quote.acceptedAt}
										<span
											class="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
											>Accepted</span
										>
									{:else if quote.declinedAt}
										<span
											class="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
											>Declined</span
										>
									{:else}
										<span
											class="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700"
											>Sent</span
										>
									{/if}
								</div>
								<span class="shrink-0 text-xs text-gray-400">{formatDate(quote.createdAt)}</span>
							</div>
							{#if quote.message}
								<p class="mt-1 text-xs text-gray-500">{quote.message}</p>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Send quote form -->
		{#if canSendQuote}
			<div class="rounded-xl border border-gray-200 bg-white p-5">
				<h2 class="mb-4 text-sm font-medium tracking-wide text-gray-500 uppercase">
					{isQuoted ? 'Send revised quote' : 'Send quote'}
				</h2>
				<form method="post" action="?/sendQuote" use:enhance={() => {
					submittingAction = 'sendQuote';
					return async ({ update }) => {
						submittingAction = null;
						await update();
					};
				}} class="space-y-4">
					<div class="grid gap-4 sm:grid-cols-2">
						<div>
							<label for="priceInput" class="mb-1 block text-sm font-medium text-foreground">
								Price *
							</label>
							<div class="relative">
								<span
									class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-400"
									>$</span
								>
								<input
									id="priceInput"
									type="number"
									min="0.01"
									step="0.01"
									required
									placeholder="0.00"
									bind:value={priceDollars}
									class="h-8 w-full rounded-lg border border-gray-300 bg-white pr-3 pl-7 text-sm text-foreground placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-gray-400 focus:outline-none"
								/>
								<input type="hidden" name="priceCents" value={priceCents} />
							</div>
						</div>
						<div class="hidden sm:block"></div>
					</div>
					<div>
						<label for="messageInput" class="mb-1 block text-sm font-medium text-foreground">
							Message to customer <span class="font-normal text-gray-400">(optional)</span>
						</label>
						<textarea
							id="messageInput"
							name="message"
							rows="3"
							class="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-foreground placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-gray-400 focus:outline-none"
							placeholder="Add any notes about this quote — timeline, what's included, etc."
						></textarea>
					</div>
					<div class="pt-1">
						<Button type="submit" disabled={submittingAction !== null}>
							{#if submittingAction === 'sendQuote'}
								<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
								Sending...
							{:else}
								<Icon icon="mdi:send-outline" class="h-3.5 w-3.5" />
								Send quote
							{/if}
						</Button>
					</div>
				</form>

				{#if canDecline}
					<div class="mt-4 flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
						<form method="post" action="?/decline" class="w-full" use:enhance={() => {
						submittingAction = 'decline';
						return async ({ update }) => {
							submittingAction = null;
							await update();
						};
					}}>
							<div class="flex items-center gap-2">
								<textarea
									name="reason"
									rows="2"
									placeholder="Reason for declining (optional)"
									class="w-full resize-none rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-transparent focus:ring-1 focus:ring-gray-300 focus:outline-none"
								></textarea>
								<Button
									type="submit"
									variant="ghost"
									class="text-red-500 hover:bg-red-50 hover:text-red-600"
									disabled={submittingAction !== null}
									onclick={async (e) => {
										e.preventDefault();
										const f = (e.currentTarget as HTMLButtonElement).form;
										if (
											await confirmDialog(`Decline request from ${req.customerName}?`, {
												confirmLabel: 'Decline',
												danger: true
											})
										)
											f?.requestSubmit();
									}}
								>
									{#if submittingAction === 'decline'}
										<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
										Declining...
									{:else}
										Decline
									{/if}
								</Button>
							</div>
						</form>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>
