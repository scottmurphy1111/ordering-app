<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Alert } from '$lib/components/ui/alert';
	import { confirmDialog } from '$lib/confirm.svelte';
	import { toast } from '$lib/toast';
	import { enhanceWithToasts } from '$lib/forms/enhance-with-toasts';

	let { data }: { data: PageData } = $props();
	let sendQuoteError = $state<string | null>(null);
	let declineError = $state<string | null>(null);

	const req = $derived(data.request);
	const quotes = $derived(data.quotes);

	let priceDollars = $state('');
	let depositDollars = $state('');
	let balanceDueDate = $state('');
	let submittingAction = $state<'sendQuote' | 'decline' | null>(null);

	const priceCents = $derived.by(() => {
		const val = parseFloat(priceDollars);
		return isNaN(val) || val <= 0 ? '' : String(Math.round(val * 100));
	});

	const depositCents = $derived.by(() => {
		const val = parseFloat(depositDollars);
		return isNaN(val) || val <= 0 ? '' : String(Math.round(val * 100));
	});

	// A deposit is "set" once a positive amount is entered; the balance-due date
	// then becomes required.
	const hasDeposit = $derived(depositCents !== '');

	// The balance can't come due after the event/target date (server-enforced too).
	// No target date → no upper bound.
	const balanceMaxDate = $derived(
		req.targetDate ? new Date(req.targetDate).toISOString().slice(0, 10) : undefined
	);

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

	{#if sendQuoteError}
		<Alert severity="error" class="mb-4">{sendQuoteError}</Alert>
	{/if}
	{#if declineError}
		<Alert severity="error" class="mb-4">{declineError}</Alert>
	{/if}

	<div class="space-y-5">
		<!-- PRIMARY card: request details + state content; Send quote button in footer -->
		<Card>
			<CardContent>
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
								<span
									class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
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
					<div
						class="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700"
					>
						<strong>Declined:</strong>
						{req.declinedReason}
					</div>
				{/if}

				<!-- Accepted — linked order -->
				{#if isAccepted && linkedOrder}
					<div class="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">
						<div class="flex items-center justify-between gap-3">
							<div class="flex items-center gap-2">
								<Icon icon="mdi:check-circle-outline" class="h-5 w-5 shrink-0 text-green-600" />
								<div>
									<p class="text-sm font-semibold text-green-900">Customer accepted the quote</p>
									<p class="text-xs text-green-700">
										Order {linkedOrder.orderNumber} · {formatCents(linkedOrder.total)} ·
										{linkedOrder.paymentStatus === 'paid'
											? 'Paid in full'
											: linkedOrder.paymentStatus === 'deposit_paid'
												? 'Deposit paid · balance due'
												: 'Payment pending'}
									</p>
								</div>
							</div>
							<Button
								href={resolve(`/dashboard/orders/${linkedOrder.id}`)}
								variant="outline"
								class="shrink-0"
							>
								<Icon icon="mdi:arrow-right" class="h-3.5 w-3.5" />
								View order
							</Button>
						</div>
					</div>
				{:else if isAccepted}
					<div class="mt-5 rounded-lg border border-green-200 bg-green-50 p-4">
						<div class="flex items-center gap-2">
							<Icon icon="mdi:check-circle-outline" class="h-5 w-5 shrink-0 text-green-600" />
							<p class="text-sm font-semibold text-green-900">
								Customer accepted — awaiting payment
							</p>
						</div>
					</div>
				{/if}

				<!-- Quote history -->
				{#if quotes.length > 0}
					<div class="mt-5 border-t border-gray-100 pt-5">
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
										<span class="shrink-0 text-xs text-gray-400">{formatDate(quote.createdAt)}</span
										>
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
					<div class="mt-5 border-t border-gray-100 pt-5">
						<h2 class="mb-4 text-sm font-medium tracking-wide text-gray-500 uppercase">
							{isQuoted ? 'Send revised quote' : 'Send quote'}
						</h2>
						<form
							id="send-quote-form"
							method="post"
							action="?/sendQuote"
							use:enhance={enhanceWithToasts({
								preserveValues: true,
								// successMessage omitted — we use onSuccess to fire a toast with description.
								onStart: () => {
									submittingAction = 'sendQuote';
									sendQuoteError = null;
								},
								onEnd: () => {
									submittingAction = null;
								},
								onSuccess: () => {
									toast.success('Quote sent', { description: `Sent to ${req.customerEmail}` });
								},
								onError: (msg) => {
									sendQuoteError = msg;
								}
							})}
							class="space-y-4"
						>
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
								<div>
									<label for="depositInput" class="mb-1 block text-sm font-medium text-foreground">
										Deposit <span class="font-normal text-gray-400">(optional)</span>
									</label>
									<div class="relative">
										<span
											class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-gray-400"
											>$</span
										>
										<input
											id="depositInput"
											type="number"
											min="0.01"
											step="0.01"
											placeholder="0.00"
											bind:value={depositDollars}
											class="h-8 w-full rounded-lg border border-gray-300 bg-white pr-3 pl-7 text-sm text-foreground placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-gray-400 focus:outline-none"
										/>
										<input type="hidden" name="depositCents" value={depositCents} />
									</div>
									<p class="mt-1.5 text-xs text-gray-400">
										Charge a deposit now; the customer pays the balance later via a link.
									</p>
								</div>
							</div>
							{#if hasDeposit}
								<div>
									<label
										for="balanceDueInput"
										class="mb-1 block text-sm font-medium text-foreground"
									>
										Balance due date *
									</label>
									<input
										id="balanceDueInput"
										type="date"
										name="balanceDueAt"
										required
										max={balanceMaxDate}
										bind:value={balanceDueDate}
										class="h-8 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-foreground placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-gray-400 focus:outline-none sm:w-auto"
									/>
								</div>
							{/if}
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
						</form>
					</div>
				{/if}
			</CardContent>

			{#if canSendQuote}
				<CardFooter class="justify-end">
					<Button type="submit" form="send-quote-form" disabled={submittingAction !== null}>
						{#if submittingAction === 'sendQuote'}
							<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
							Sending...
						{:else}
							<Icon icon="mdi:send-outline" class="h-3.5 w-3.5" />
							{isQuoted ? 'Send revised quote' : 'Send quote'}
						{/if}
					</Button>
				</CardFooter>
			{/if}
		</Card>

		{#if canDecline}
			<Card>
				<CardContent>
					<form
						id="decline-form"
						method="post"
						action="?/decline"
						use:enhance={enhanceWithToasts({
							// successMessage omitted — onSuccess fires a toast with an action.
							onStart: () => {
								submittingAction = 'decline';
								declineError = null;
							},
							onEnd: () => {
								submittingAction = null;
							},
							onSuccess: () => {
								toast.success('Request declined', {
									action: {
										label: 'Back to list',
										onClick: () => goto(resolve('/dashboard/special-orders'))
									}
								});
							},
							onError: (msg) => {
								declineError = msg;
							}
						})}
					>
						<textarea
							name="reason"
							rows="3"
							placeholder="Reason for declining (optional)"
							class="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-transparent focus:ring-1 focus:ring-gray-300 focus:outline-none"
						></textarea>
					</form>
				</CardContent>
				<CardFooter class="justify-end">
					<Button
						type="submit"
						form="decline-form"
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
				</CardFooter>
			</Card>
		{/if}
	</div>
</div>
