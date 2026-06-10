<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';
	import { Alert } from '$lib/components/ui/alert';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import type { PageData } from './$types';
	import { actionConfig } from '$lib/utils/order-lifecycle';
	import OrderStatusStepper from '$lib/components/OrderStatusStepper.svelte';
	import { SvelteDate } from 'svelte/reactivity';
	import { untrack, tick } from 'svelte';
	import { Switch } from '$lib/components/ui/switch';
	import { toast } from '$lib/toast';
	import { enhanceWithToasts } from '$lib/forms/enhance-with-toasts';

	let { data }: { data: PageData } = $props();
	let actionError = $state<string | null>(null);

	const order = $derived(data.order);

	const nextStatus: Record<string, string> = {
		received: 'confirmed',
		confirmed: 'preparing',
		preparing: 'ready',
		ready: 'fulfilled'
	};

	function formatCents(cents: number) {
		return `$${(cents / 100).toFixed(2)}`;
	}

	const items = $derived(
		order.items as Array<{
			name: string;
			quantity: number;
			basePrice: number;
			selectedModifiers: Array<{ name: string; priceAdjustment: number; quantity?: number }>;
		}>
	);

	const payments = $derived(data.payments ?? []);
	const depositRow = $derived(payments.find((p) => p.label === 'Deposit'));
	const balanceRow = $derived(payments.find((p) => p.label === 'Balance'));

	function formatPaymentDate(d: Date | string | null) {
		if (!d) return null;
		return new Intl.DateTimeFormat('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		}).format(new Date(d));
	}

	function copyBalanceLink() {
		if (!data.balanceLink) return;
		navigator.clipboard.writeText(data.balanceLink).then(() => {
			toast.success('Balance link copied to clipboard');
		});
	}

	// Effective auto-reminder state for this balance: per-order override falls back
	// to the vendor default. Initialized once; the toggle form keeps it in sync.
	let remindersOn = $state(
		untrack(() => {
			const b = data.payments?.find((p) => p.label === 'Balance');
			return b?.remindersEnabled ?? data.balanceRemindersDefault ?? true;
		})
	);
	let remindersForm: HTMLFormElement | undefined = $state();

	const reminderKindLabels: Record<string, string> = {
		upcoming_7d: '7 days before',
		upcoming_1d: '1 day before',
		overdue: 'Overdue',
		manual: 'Manual'
	};

	let approvePending = $state(false);
	let submittingAction = $state<string | null>(null);

	function approveEnhance() {
		approvePending = true;
		actionError = null;
		return async ({
			result,
			update
		}: {
			result: { type: string; data?: Record<string, unknown>; error?: { message?: string } };
			update: (opts?: { reset?: boolean }) => Promise<void>;
		}) => {
			await update({ reset: false });
			approvePending = false;
			if (result.type === 'success') {
				toast.success('Quote sent');
			} else if (result.type === 'failure') {
				const msg = (result.data?.error as string) ?? 'Something went wrong.';
				actionError = msg;
				toast.error(msg);
			} else if (result.type === 'error') {
				const msg = result.error?.message ?? 'Something went wrong. Please try again.';
				actionError = msg;
				toast.error(msg);
			}
		};
	}

	const hasProposal = $derived(order.proposedAt !== null);
	const proposedDateLabel = $derived(
		order.proposedDate
			? new Date(order.proposedDate).toLocaleDateString([], {
					weekday: 'short',
					month: 'short',
					day: 'numeric',
					year: 'numeric'
				})
			: null
	);

	let proposeOpen = $state(false);
	let proposedDateInput = $state('');
	let proposeReasonInput = $state('');
	let proposePending = $state(false);
	let withdrawPending = $state(false);

	function proposeEnhance() {
		proposePending = true;
		actionError = null;
		return async ({
			result,
			update
		}: {
			result: { type: string; data?: Record<string, unknown>; error?: { message?: string } };
			update: (opts?: { reset?: boolean }) => Promise<void>;
		}) => {
			await update({ reset: false });
			proposePending = false;
			if (result.type === 'success') {
				proposeOpen = false;
				toast.success('Alternate proposed');
			} else if (result.type === 'failure') {
				const msg = (result.data?.error as string) ?? 'Something went wrong.';
				actionError = msg;
				toast.error(msg);
			} else if (result.type === 'error') {
				const msg = result.error?.message ?? 'Something went wrong. Please try again.';
				actionError = msg;
				toast.error(msg);
			}
		};
	}

	function withdrawEnhance() {
		withdrawPending = true;
		actionError = null;
		return async ({
			result,
			update
		}: {
			result: { type: string; data?: Record<string, unknown>; error?: { message?: string } };
			update: (opts?: { reset?: boolean }) => Promise<void>;
		}) => {
			await update({ reset: false });
			withdrawPending = false;
			if (result.type === 'success') {
				toast.success('Proposal withdrawn');
			} else if (result.type === 'failure') {
				const msg = (result.data?.error as string) ?? 'Something went wrong.';
				actionError = msg;
				toast.error(msg);
			} else if (result.type === 'error') {
				const msg = result.error?.message ?? 'Something went wrong. Please try again.';
				actionError = msg;
				toast.error(msg);
			}
		};
	}

	function chipBaseline(): SvelteDate {
		// Use the customer's originally-requested pickup date as the offset baseline.
		// Falls back to today only as a defensive measure — pending_approval orders
		// always have scheduledFor set.
		if (order.scheduledFor) return new SvelteDate(order.scheduledFor);
		return new SvelteDate();
	}

	function chipDate(daysOffset: number) {
		const d = chipBaseline();
		d.setDate(d.getDate() + daysOffset);
		return d.toISOString().split('T')[0];
	}

	function chipLabel(daysOffset: number) {
		const d = chipBaseline();
		d.setDate(d.getDate() + daysOffset);
		return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}
</script>

<div class="max-w-2xl">
	<!-- Back link -->
	<a
		href={resolve('/dashboard/orders')}
		class="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
	>
		<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Orders
	</a>

	{#if actionError}
		<Alert severity="error" class="mb-4">{actionError}</Alert>
	{/if}

	<!-- Header -->
	<div class="mb-4 flex items-start justify-between gap-4">
		<div class="flex min-w-0 flex-col gap-1.5">
			<h1 class="font-mono text-2xl font-bold text-gray-900">{order.orderNumber}</h1>
			<div class="flex flex-wrap items-center gap-2">
				<StatusBadge variant="subtle"
					>{order.type.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())}</StatusBadge
				>
				{#if order.paymentStatus === 'paid'}
					<StatusBadge variant="success">paid</StatusBadge>
				{:else if order.paymentStatus === 'refunded'}
					<StatusBadge tone="bg-orange-100 text-orange-700">refunded</StatusBadge>
				{:else if order.paymentStatus === 'failed'}
					<StatusBadge variant="danger">payment failed</StatusBadge>
				{:else if order.paymentStatus === 'void'}
					<StatusBadge tone="bg-stone-200 text-stone-700">void</StatusBadge>
				{:else if order.paymentStatus === 'deposit_paid'}
					<StatusBadge tone="bg-amber-50 text-amber-700">deposit paid</StatusBadge>
				{:else}
					<StatusBadge tone="bg-amber-50 text-amber-700">pending payment</StatusBadge>
				{/if}
			</div>
			<p class="mt-1 text-sm text-gray-500">
				{new Date(order.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
			</p>
			{#if order.pickupMode === 'storefront_hours'}
				{#if order.scheduledFor}
					<p class="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
						<Icon icon="mdi:storefront-outline" class="h-4 w-4 shrink-0" />
						Storefront pickup — scheduled for {new Date(order.scheduledFor).toLocaleString([], {
							weekday: 'short',
							month: 'short',
							day: 'numeric',
							hour: 'numeric',
							minute: '2-digit'
						})}
					</p>
				{:else}
					<p class="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-amber-600">
						<Icon icon="mdi:lightning-bolt" class="h-4 w-4 shrink-0" />
						ASAP pickup — customer arriving during open hours
					</p>
				{/if}
			{:else if order.scheduledFor}
				<p class="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-amber-600">
					<Icon icon="mdi:calendar-clock" class="h-4 w-4 shrink-0" />
					Scheduled for {new Date(order.scheduledFor).toLocaleString([], {
						weekday: 'short',
						month: 'short',
						day: 'numeric',
						hour: 'numeric',
						minute: '2-digit'
					})}
				</p>
			{/if}
		</div>
		<p class="text-xl font-semibold text-gray-900">{formatCents(order.total)}</p>
	</div>

	<!-- Lifecycle stepper -->
	{#if order.status === 'cancelled'}
		<div class="mb-6 flex items-center gap-2">
			<Icon icon="mdi:close-circle" class="h-5 w-5 text-red-500" />
			<span class="text-base font-medium text-gray-900">Cancelled</span>
		</div>
	{:else if order.status === 'pending_approval'}
		{#if hasProposal}
			<!-- Proposal-pending banner -->
			<div class="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4">
				<div class="flex items-start gap-3">
					<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100">
						<Icon icon="mdi:calendar-clock" class="h-5 w-5 text-blue-700" />
					</div>
					<div class="flex-1">
						<h2 class="text-sm font-semibold text-blue-900">Alternate date proposed</h2>
						<p class="mt-0.5 text-xs text-blue-700">
							Waiting for the customer to accept or decline.
						</p>
						{#if proposedDateLabel}
							<p class="mt-1.5 text-xs font-medium text-blue-800">
								<Icon icon="mdi:calendar-arrow-right" class="mr-0.5 inline h-3 w-3" />
								Proposed: {proposedDateLabel}
							</p>
						{/if}
						{#if order.proposedReason}
							<p class="mt-1 text-xs text-blue-700 italic">"{order.proposedReason}"</p>
						{/if}
					</div>
				</div>
				<div class="mt-4 flex flex-wrap gap-2">
					<form
						method="post"
						action="?/withdrawProposal"
						use:enhance={withdrawEnhance}
						autocomplete="off"
					>
						<input type="hidden" name="id" value={order.id} />
						<Button
							type="submit"
							variant="outline"
							disabled={withdrawPending}
							class="border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
							onclick={async (e) => {
								e.preventDefault();
								const f = (e.currentTarget as HTMLButtonElement).form!;
								if (
									await confirmDialog(
										'Withdraw this date proposal? The customer will see the original pending state again.',
										{
											confirmLabel: 'Withdraw',
											danger: false
										}
									)
								)
									f.requestSubmit();
							}}
						>
							{#if withdrawPending}
								<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
								Withdrawing…
							{:else}
								<Icon icon="mdi:undo" class="h-3.5 w-3.5" />
								Withdraw proposal
							{/if}
						</Button>
					</form>
				</div>
			</div>
		{:else}
			<!-- Normal approval banner -->
			<div class="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
				<div class="flex items-start gap-3">
					<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
						<Icon icon="mdi:gavel" class="h-5 w-5 text-amber-700" />
					</div>
					<div class="flex-1">
						<h2 class="text-sm font-semibold text-amber-900">
							Custom date request — pending approval
						</h2>
						<p class="mt-0.5 text-xs text-amber-700">
							The customer's payment method is saved. Approving will charge them immediately.
						</p>
						{#if order.scheduledFor}
							<p class="mt-1.5 text-xs font-medium text-amber-800">
								<Icon icon="mdi:calendar" class="mr-0.5 inline h-3 w-3" />
								Requested for {new Date(order.scheduledFor).toLocaleDateString([], {
									weekday: 'short',
									month: 'short',
									day: 'numeric',
									year: 'numeric'
								})}
							</p>
						{/if}
					</div>
				</div>
				<div class="mt-4 flex flex-wrap gap-2">
					<form method="post" action="?/approve" use:enhance={approveEnhance} autocomplete="off">
						<input type="hidden" name="id" value={order.id} />
						<Button type="submit" disabled={approvePending}>
							{#if approvePending}
								<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
								Charging…
							{:else}
								<Icon icon="mdi:check" class="h-3.5 w-3.5" />
								Approve &amp; charge
							{/if}
						</Button>
					</form>
					<Button variant="outline" onclick={() => (proposeOpen = true)}>
						<Icon icon="mdi:calendar-edit" class="h-3.5 w-3.5" />
						Propose alternate date
					</Button>
					<form
						method="post"
						action="?/decline"
						use:enhance={enhanceWithToasts({
							successMessage: 'Quote declined',
							onStart: () => {
								submittingAction = 'decline';
								actionError = null;
							},
							onEnd: () => {
								submittingAction = null;
							},
							onError: (msg) => {
								actionError = msg;
							}
						})}
						autocomplete="off"
					>
						<input type="hidden" name="id" value={order.id} />
						<Button
							type="submit"
							variant="ghost"
							class="text-red-500 hover:bg-red-50 hover:text-red-600"
							disabled={submittingAction !== null}
							onclick={async (e) => {
								e.preventDefault();
								const f = (e.currentTarget as HTMLButtonElement).form!;
								if (
									await confirmDialog(
										'Decline this order request? The customer will be notified.',
										{ confirmLabel: 'Decline', danger: true }
									)
								)
									f.requestSubmit();
							}}
						>
							{#if submittingAction === 'decline'}
								<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
								Declining...
							{:else}
								<Icon icon="mdi:close" class="h-3.5 w-3.5" />
								Decline
							{/if}
						</Button>
					</form>
				</div>
			</div>
		{/if}
	{:else}
		<div class="mb-6">
			<OrderStatusStepper status={order.status} variant="full" colorScheme="themed" />
		</div>
	{/if}

	<!-- Originated from a special request -->
	{#if data.originatingRequest}
		<Card class="mb-4">
			<CardContent class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div class="flex items-center gap-2 text-sm text-gray-700">
					<Icon icon="mdi:link-variant" class="h-4 w-4 shrink-0 text-muted-foreground" />
					Originated from special request from
					<span class="font-medium text-gray-900">{data.originatingRequest.customerName}</span>
				</div>
				<Button
					href={resolve(`/dashboard/special-orders/${data.originatingRequest.id}` as `/${string}`)}
					variant="outline"
					class="shrink-0"
				>
					View request
					<Icon icon="mdi:arrow-right" class="h-3.5 w-3.5" />
				</Button>
			</CardContent>
		</Card>
	{/if}

	<!-- Customer info -->
	<Card class="mb-4">
		<CardHeader>
			<CardTitle class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
				>Customer</CardTitle
			>
		</CardHeader>
		<CardContent class="space-y-1.5">
			{#if order.customerName}
				<div class="flex items-center gap-2 text-sm">
					<Icon icon="mdi:account-outline" class="h-4 w-4 shrink-0 text-gray-500" />
					{order.customerName}
				</div>
			{/if}
			{#if order.customerEmail}
				<div class="flex items-center gap-2 text-sm">
					<Icon icon="mdi:email-outline" class="h-4 w-4 shrink-0 text-gray-500" />
					<a href="mailto:{order.customerEmail}" class="hover:underline">{order.customerEmail}</a>
				</div>
			{/if}
			{#if order.customerPhone}
				<div class="flex items-center gap-2 text-sm">
					<Icon icon="mdi:phone-outline" class="h-4 w-4 shrink-0 text-gray-500" />
					<a href="tel:{order.customerPhone}" class="hover:underline">{order.customerPhone}</a>
				</div>
			{/if}
			{#if !order.customerName && !order.customerEmail && !order.customerPhone}
				<p class="text-sm text-gray-500">No customer info recorded.</p>
			{/if}
		</CardContent>
	</Card>

	<!-- Items -->
	<Card class="mb-4">
		<CardHeader>
			<CardTitle class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
				>Items</CardTitle
			>
		</CardHeader>
		<CardContent>
			<div class="divide-y">
				{#each items as item, i (i)}
					<div class="flex items-start justify-between py-3">
						<div>
							<p class="text-sm font-medium">{item.name}</p>
							{#if item.selectedModifiers?.length}
								<p class="mt-0.5 text-xs text-gray-500">
									{item.selectedModifiers
										.map((m) => ((m.quantity ?? 1) > 1 ? `${m.name} ×${m.quantity}` : m.name))
										.join(', ')}
								</p>
							{/if}
						</div>
						<div class="ml-4 shrink-0 text-right">
							<p class="text-sm">×{item.quantity}</p>
							<p class="text-xs text-gray-400">
								{formatCents(
									(item.basePrice +
										(item.selectedModifiers?.reduce(
											(s, m) => s + m.priceAdjustment * (m.quantity ?? 1),
											0
										) ?? 0)) *
										item.quantity
								)}
							</p>
						</div>
					</div>
				{/each}
			</div>

			<!-- Totals -->
			<div class="mt-1 space-y-1.5 border-t pt-3">
				<div class="flex justify-between text-sm text-gray-500">
					<span>Subtotal</span><span>{formatCents(order.subtotal)}</span>
				</div>
				<div class="flex justify-between text-sm text-gray-500">
					<span>Tax</span><span>{formatCents(order.tax)}</span>
				</div>
				{#if order.tip && order.tip > 0}
					<div class="flex justify-between text-sm text-gray-500">
						<span>Tip</span><span>{formatCents(order.tip)}</span>
					</div>
				{/if}
				{#if order.discount && order.discount > 0}
					<div class="flex justify-between text-sm font-medium text-primary">
						<span class="flex items-center gap-1">
							<Icon icon="mdi:ticket-percent-outline" class="h-3.5 w-3.5" />
							Promo{order.promoCode ? ` (${order.promoCode})` : ''}
						</span>
						<span>−{formatCents(order.discount)}</span>
					</div>
				{/if}
				<div class="flex justify-between border-t pt-1.5 text-sm font-bold">
					<span>Total</span><span>{formatCents(order.total)}</span>
				</div>
			</div>
		</CardContent>
	</Card>

	<!-- Payments (deposit + balance) -->
	{#if depositRow && balanceRow}
		<Card class="mb-4">
			<CardHeader>
				<CardTitle class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
					>Payments</CardTitle
				>
			</CardHeader>
			<CardContent class="space-y-3">
				<div class="flex flex-col gap-2 text-sm">
					<span class="text-gray-700">
						<span class="font-medium text-gray-900"
							>Deposit {formatCents(depositRow.amountCents)}</span
						>
						{#if depositRow.status === 'paid'}
							<span class="text-success"> · paid</span>
						{:else}
							<span class="text-gray-500"> · {depositRow.status}</span>
						{/if}
					</span>
					<span class="text-gray-700">
						<span class="font-medium text-gray-900"
							>Balance {formatCents(balanceRow.amountCents)}</span
						>
						{#if balanceRow.status === 'paid'}
							<span class="text-success"> · paid</span>
						{:else}
							<span class="text-amber-700">
								· due {formatPaymentDate(balanceRow.dueAt) ?? 'later'}</span
							>
						{/if}
					</span>
				</div>
				{#if balanceRow.status !== 'paid' && data.balanceLink}
					<div
						class="flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:items-center"
					>
						<input
							type="text"
							readonly
							value={data.balanceLink}
							class="h-8 w-full flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 text-xs text-gray-600 focus:outline-none"
						/>
						<Button
							type="button"
							variant="outline"
							size="default"
							class="shrink-0"
							onclick={copyBalanceLink}
						>
							<Icon icon="mdi:content-copy" class="h-3.5 w-3.5" />
							Copy balance link
						</Button>
					</div>
					<p class="text-xs text-gray-400">
						Send this link to the customer to collect the balance.
					</p>
				{/if}

				<!-- Automatic-reminder toggle -->
				<div class="flex items-start justify-between gap-3 border-t border-gray-100 pt-3">
					<div class="min-w-0">
						<p class="text-sm font-medium text-gray-900">Automatic reminders</p>
						<p class="mt-0.5 text-xs text-gray-400">
							7 days and 1 day before due, plus once if overdue.
						</p>
					</div>
					<form
						method="post"
						action="?/toggleBalanceReminders"
						bind:this={remindersForm}
						use:enhance={enhanceWithToasts({
							successMessage: 'Reminder settings updated',
							preserveValues: true,
							onError: () => {
								remindersOn = !remindersOn;
							}
						})}
					>
						<input type="hidden" name="id" value={balanceRow.id} />
						<input type="hidden" name="enabled" value={remindersOn ? 'on' : ''} />
						<Switch
							checked={remindersOn}
							onCheckedChange={async (v) => {
								remindersOn = v === true;
								await tick();
								remindersForm?.requestSubmit();
							}}
							aria-label="Toggle automatic reminders"
						/>
					</form>
				</div>

				<!-- Manual send + reminder history -->
				<div class="space-y-2 border-t border-gray-100 pt-3">
					<div class="flex items-center justify-between gap-3">
						<p class="text-sm font-medium text-gray-900">Reminders sent</p>
						{#if balanceRow.status !== 'paid' && balanceRow.status !== 'void'}
							<form
								method="post"
								action="?/sendBalanceReminder"
								use:enhance={enhanceWithToasts({ successMessage: 'Reminder sent' })}
							>
								<input type="hidden" name="id" value={balanceRow.id} />
								<Button type="submit" variant="outline" size="default" class="shrink-0">
									<Icon icon="mdi:email-outline" class="h-3.5 w-3.5" />
									Send reminder
								</Button>
							</form>
						{/if}
					</div>
					{#if data.reminders.length > 0}
						<ul class="space-y-1">
							{#each data.reminders as r (r.id)}
								<li class="flex items-center justify-between text-xs text-gray-500">
									<span>{reminderKindLabels[r.kind] ?? r.kind}</span>
									<span class="text-gray-400">{formatPaymentDate(r.sentAt)}</span>
								</li>
							{/each}
						</ul>
					{:else}
						<p class="text-xs text-gray-400">No reminders sent yet.</p>
					{/if}
				</div>
			</CardContent>
		</Card>
	{/if}

	<!-- Notes -->
	{#if order.notes}
		<Card class="mb-4">
			<CardHeader>
				<CardTitle class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
					>Notes</CardTitle
				>
			</CardHeader>
			<CardContent>
				<p class="text-sm italic">"{order.notes}"</p>
			</CardContent>
		</Card>
	{/if}

	<!-- Propose alternate date dialog -->
	<Dialog bind:open={proposeOpen}>
		<DialogContent class="max-w-sm">
			<DialogHeader>
				<DialogTitle>Propose an alternate date</DialogTitle>
			</DialogHeader>
			<form
				method="post"
				action="?/proposeAlternate"
				use:enhance={proposeEnhance}
				autocomplete="off"
				id="propose-form"
			>
				<input type="hidden" name="id" value={order.id} />
				<div class="space-y-4 py-2">
					<div>
						<label for="propose-date" class="mb-1.5 block text-sm font-medium text-gray-700"
							>New date</label
						>
						<input
							type="date"
							id="propose-date"
							name="date"
							bind:value={proposedDateInput}
							required
							class="h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-green-500"
						/>
						<div class="mt-2 flex flex-wrap gap-1.5">
							<button
								type="button"
								onclick={() => (proposedDateInput = chipDate(7))}
								class="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200"
							>
								+1 week ({chipLabel(7)})
							</button>
							<button
								type="button"
								onclick={() => (proposedDateInput = chipDate(14))}
								class="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200"
							>
								+2 weeks ({chipLabel(14)})
							</button>
							<button
								type="button"
								onclick={() => (proposedDateInput = chipDate(30))}
								class="rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200"
							>
								+1 month ({chipLabel(30)})
							</button>
						</div>
					</div>
					<div>
						<label for="propose-reason" class="mb-1.5 block text-sm font-medium text-gray-700">
							Reason <span class="font-normal text-gray-400">(optional)</span>
						</label>
						<textarea
							id="propose-reason"
							name="reason"
							bind:value={proposeReasonInput}
							rows="3"
							placeholder="e.g. We're fully booked on your requested date."
							class="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-transparent focus:ring-2 focus:ring-green-500"
						></textarea>
					</div>
				</div>
			</form>
			<DialogFooter>
				<Button variant="outline" onclick={() => (proposeOpen = false)}>Cancel</Button>
				<Button type="submit" form="propose-form" disabled={proposePending || !proposedDateInput}>
					{#if proposePending}
						<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
						Sending…
					{:else}
						Propose date
					{/if}
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>

	<!-- Actions -->
	{#if nextStatus[order.status] || !['fulfilled', 'cancelled', 'pending_approval'].includes(order.status) || (order.status === 'cancelled' && order.paymentStatus === 'paid')}
		<Card>
			<CardHeader>
				<CardTitle class="text-xs font-semibold tracking-wide text-muted-foreground uppercase"
					>Actions</CardTitle
				>
			</CardHeader>
			<CardContent class="flex flex-wrap gap-2">
				{#if nextStatus[order.status]}
					{@const action = actionConfig[order.status]}
					<form
						method="post"
						action="?/updateStatus"
						use:enhance={enhanceWithToasts({
							successMessage: `Order marked as ${nextStatus[order.status]}`,
							onStart: () => {
								submittingAction = 'updateStatus';
								actionError = null;
							},
							onEnd: () => {
								submittingAction = null;
							},
							onError: (msg) => {
								actionError = msg;
							}
						})}
						autocomplete="off"
					>
						<input type="hidden" name="id" value={order.id} />
						<input type="hidden" name="status" value={nextStatus[order.status]} />
						<Button type="submit" disabled={submittingAction !== null}>
							{#if submittingAction === 'updateStatus'}
								<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
								Updating...
							{:else}
								<Icon icon={action.icon} class="h-3.5 w-3.5" />
								{action.label}
							{/if}
						</Button>
					</form>
				{/if}
				{#if !['fulfilled', 'cancelled'].includes(order.status)}
					<form
						method="post"
						action="?/cancel"
						use:enhance={enhanceWithToasts({
							successMessage: 'Order cancelled',
							onStart: () => {
								submittingAction = 'cancel';
								actionError = null;
							},
							onEnd: () => {
								submittingAction = null;
							},
							onError: (msg) => {
								actionError = msg;
							}
						})}
						autocomplete="off"
					>
						<input type="hidden" name="id" value={order.id} />
						<Button
							type="submit"
							variant="ghost"
							class="text-red-500 hover:bg-red-50 hover:text-red-600"
							disabled={submittingAction !== null}
							onclick={async (e) => {
								e.preventDefault();
								const form = (e.currentTarget as HTMLButtonElement).form;
								if (await confirmDialog('Cancel this order?')) form?.requestSubmit();
							}}
						>
							{#if submittingAction === 'cancel'}
								<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
								Cancelling...
							{:else}
								Cancel order
							{/if}
						</Button>
					</form>
				{/if}
				{#if order.status === 'cancelled' && order.paymentStatus === 'paid'}
					<form
						method="post"
						action="?/refund"
						use:enhance={enhanceWithToasts({
							successMessage: 'Refund issued',
							onStart: () => {
								submittingAction = 'refund';
								actionError = null;
							},
							onEnd: () => {
								submittingAction = null;
							},
							onError: (msg) => {
								actionError = msg;
							}
						})}
						autocomplete="off"
					>
						<input type="hidden" name="id" value={order.id} />
						<Button
							type="submit"
							onclick={async (e) => {
								e.preventDefault();
								const form = (e.currentTarget as HTMLButtonElement).form;
								if (await confirmDialog('Issue a full refund for this order?'))
									form?.requestSubmit();
							}}
							disabled={submittingAction !== null}
							variant="ghost"
							class="text-red-500 hover:bg-red-50 hover:text-red-600"
						>
							{#if submittingAction === 'refund'}
								<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
								Refunding...
							{:else}
								Refund payment
							{/if}
						</Button>
					</form>
				{/if}
			</CardContent>
		</Card>
	{/if}
</div>
