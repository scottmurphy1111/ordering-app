<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Icon from '@iconify/svelte';
	import type { PageData, ActionData } from './$types';
	import {
		TIERS,
		ADDONS,
		getTier,
		hasAddon,
		getIncludedAddons,
		cancelImmediateRefundPreview,
		type BillingInterval,
		type AddonItem
	} from '$lib/billing';
	import { SvelteDate } from 'svelte/reactivity';
	import { resolve } from '$app/paths';
	import { replaceState } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Alert } from '$lib/components/ui/alert';
	import { Tooltip, TooltipTrigger, TooltipContent } from '$lib/components/ui/tooltip';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import { onMount, tick } from 'svelte';
	import { toast } from '$lib/toast';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const currentTierKey = $derived(data.subscriptionTier ?? 'starter');
	const tierInfo = $derived(getTier(currentTierKey));
	const itemCount = $derived(data.itemCount ?? 0);
	const activeAddons = $derived(data.addons ?? []);
	const isPaidPlan = $derived(currentTierKey !== 'starter');
	const isCancelScheduled = $derived(!!data.subscriptionEndsAt);
	// Read URL params once at script init — captured before onMount strips them.
	// These are post-redirect notice flags consumed exactly once per visit.
	const initialParams = page.url.searchParams;
	const isUpgraded = initialParams.get('upgraded') === '1';
	const isDowngraded = initialParams.get('downgraded') === '1';
	const isReactivated = initialParams.get('reactivated') === '1';
	const isRefunded = initialParams.get('refunded') === '1';
	const isPausedSuccess = initialParams.get('paused') === '1';
	const isResumed = initialParams.get('resumed') === '1';
	const isSwitched = initialParams.get('switched') === '1';
	const isSwitchedRefund = initialParams.get('switched') === 'refund';
	const isCreditRefunded = initialParams.get('credit_refunded') === '1';

	// Fire post-action toasts and strip notice params from the URL after the
	// router is ready. tick() defers until after hydration so the Toaster portal
	// is mounted (otherwise toast.success() queues into a portal that doesn't
	// exist yet and the toast is dropped on the post-hydration repaint).
	onMount(async () => {
		await tick();

		if (isUpgraded) toast.success('Plan upgraded', { description: `Welcome to ${tierInfo.name}` });
		if (isReactivated)
			toast.success('Cancellation reversed', {
				description: `Your ${tierInfo.name} plan will continue`
			});
		if (isRefunded)
			toast.success('Subscription cancelled', {
				description: 'Prorated refund will appear in 5–10 business days'
			});
		if (isPausedSuccess)
			toast.success('Subscription paused', {
				description: data.pauseUntil ? `Billing resumes ${fmtDate(data.pauseUntil)}` : undefined
			});
		if (isResumed) toast.success('Subscription resumed');
		if (isSwitched && data.billingInterval === 'annual')
			toast.success('Switched to annual billing', {
				description: 'Prorated charge billed to your card'
			});
		if (isSwitched && data.billingInterval !== 'annual')
			toast.success('Switched to monthly billing', {
				description: 'Prorated credit applied'
			});
		if (isSwitchedRefund)
			toast.success('Switched to monthly billing', {
				description: 'Prorated refund will appear in 5–10 business days'
			});
		if (isCreditRefunded)
			toast.success('Account credit refunded', {
				description: 'Refund will appear in 5–10 business days'
			});
		if (isDowngraded && !isCancelScheduled) toast.success(`Plan changed to ${tierInfo.name}`);

		const noticeKeys = [
			'upgraded',
			'downgraded',
			'reactivated',
			'refunded',
			'paused',
			'resumed',
			'switched',
			'credit_refunded'
		];
		if (!noticeKeys.some((k) => page.url.searchParams.has(k))) return;
		try {
			const cleaned = new URL(page.url.href);
			for (const k of noticeKeys) cleaned.searchParams.delete(k);
			// eslint-disable-next-line svelte/no-navigation-without-resolve -- same-page query-param cleanup, not navigation
			replaceState(cleaned.toString(), page.state);
		} catch (err) {
			console.debug('[billing] skipped notice-param cleanup:', err);
		}
	});

	const isPaused = $derived(!!data.subscriptionPausedAt);

	const itemLimit = $derived(tierInfo.itemLimit);
	const usagePct = $derived(itemLimit ? Math.min(100, (itemCount / itemLimit) * 100) : 0);
	const atLimit = $derived(itemLimit !== null && itemCount >= itemLimit);
	const nearLimit = $derived(itemLimit !== null && itemCount >= itemLimit * 0.7 && !atLimit);

	const addonMonthlyTotal = $derived(
		ADDONS.filter((a) => hasAddon(activeAddons, a.key)).reduce((s, a) => s + a.price, 0)
	);
	const currentMonthly = $derived(tierInfo.price + addonMonthlyTotal);

	const tierAnnualInfo = $derived(
		'annualMonthly' in tierInfo
			? {
					monthly: (tierInfo as { annualMonthly: number }).annualMonthly,
					total: (tierInfo as { annualTotal: number }).annualTotal,
					savings: (tierInfo as { annualSavings: number }).annualSavings
				}
			: null
	);

	const statusColors: Record<string, string> = {
		active: 'bg-success/10 text-success',
		past_due: 'bg-amber-100 text-amber-700',
		cancelled: 'bg-red-100 text-red-600'
	};

	// Tracks which billing action is currently in flight. Set when a form submits,
	// cleared when the action completes (failure path only — success paths navigate away).
	let submittingAction = $state<string | null>(null);
	let billingError = $state<string | null>(null);

	type BillingResult =
		| { type: 'success' | 'redirect'; data?: Record<string, unknown> }
		| { type: 'failure'; data?: Record<string, unknown> }
		| { type: 'error'; error?: { message?: string } };

	// Centralized handler for failure / error results across billing forms.
	// Sets the page-level alert AND fires a toast. Returns true if a non-success
	// result was handled (caller should `return` to skip success path).
	function handleBillingResult(result: BillingResult): boolean {
		if (result.type === 'failure') {
			const msg = (result.data?.error as string) ?? 'Something went wrong.';
			billingError = msg;
			toast.error(msg);
			return true;
		}
		if (result.type === 'error') {
			const msg = result.error?.message ?? 'Something went wrong. Please try again.';
			billingError = msg;
			toast.error(msg);
			return true;
		}
		return false;
	}

	// --- Refund account credit modal ---
	let pendingRefundCreditOpen = $state(false);

	// --- Cancel choice modal (annual vendors choose period-end vs immediate-with-refund) ---
	type CancelChoice = 'period_end' | 'immediate_refund';
	let pendingCancelOpen = $state(false);
	let cancelChoice = $state<CancelChoice>('period_end');

	const cancelPreview = $derived(
		data.nextBillingDate && tierAnnualInfo
			? cancelImmediateRefundPreview({
					periodEnd: new Date(data.nextBillingDate),
					annualTotalCents: tierAnnualInfo.total * 100
				})
			: null
	);

	// --- Addon confirmation modal ---
	type PendingAddon = {
		key: string;
		name: string;
		price: number;
		action: 'activate' | 'deactivate';
	};
	let pendingAddon = $state<PendingAddon | null>(null);

	function openModal(addon: (typeof ADDONS)[number], action: 'activate' | 'deactivate') {
		pendingAddon = {
			key: addon.key,
			name: addon.name,
			price: addon.price,
			action
		};
	}

	function closeModal() {
		pendingAddon = null;
	}

	let pendingIntervalSwitch = $state<'monthly' | 'annual' | null>(null);
	let intervalSwitchChoice = $state<'credit' | 'refund'>('credit');

	function openIntervalSwitchModal(target: 'monthly' | 'annual') {
		intervalSwitchChoice = 'credit';
		pendingIntervalSwitch = target;
	}

	function closeIntervalSwitchModal() {
		pendingIntervalSwitch = null;
		intervalSwitchChoice = 'credit';
	}

	// --- Pause modal ---
	// Preset values represent months. Custom uses an explicit YYYY-MM-DD string.
	// Server enforces the same 6-month maximum as the UI.
	type PauseDuration = '1' | '3' | '6' | 'custom';
	let pendingPauseOpen = $state(false);
	let pauseDuration = $state<PauseDuration>('1');
	let pauseCustomDate = $state('');

	function todayPlusDays(n: number): string {
		return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
	}

	function todayPlusMonths(n: number): string {
		const d = new SvelteDate();
		d.setMonth(d.getMonth() + n);
		return d.toISOString().slice(0, 10);
	}

	function computePauseDate(): string {
		if (pauseDuration === 'custom') return pauseCustomDate;
		return todayPlusMonths(parseInt(pauseDuration, 10));
	}

	function closePauseModal() {
		pendingPauseOpen = false;
		pauseDuration = '1';
		pauseCustomDate = '';
	}

	const minPauseDate = $derived(todayPlusDays(1));
	const maxPauseDate = $derived(todayPlusMonths(6));

	// --- Unified plan-change modal (paid → paid upgrade OR downgrade) ---
	type PendingPlanChange = {
		direction: 'upgrade' | 'downgrade';
		targetTierKey: string;
		targetTierName: string;
		targetMonthlyPrice: number;
		targetAnnualMonthly: number;
		targetAnnualTotal: number;
		targetAnnualSavings: number;
		// Selected interval is bindable inside the dialog. Defaults to vendor's
		// current billing interval at open time.
		selectedInterval: BillingInterval;
	};
	let pendingPlanChange = $state<PendingPlanChange | null>(null);

	function openPlanChangeModal(tier: (typeof TIERS)[number], direction: 'upgrade' | 'downgrade') {
		const annualMonthly =
			'annualMonthly' in tier ? (tier as { annualMonthly: number }).annualMonthly : 0;
		const annualTotal = 'annualTotal' in tier ? (tier as { annualTotal: number }).annualTotal : 0;
		const annualSavings =
			'annualSavings' in tier ? (tier as { annualSavings: number }).annualSavings : 0;

		pendingPlanChange = {
			direction,
			targetTierKey: tier.key,
			targetTierName: tier.name,
			targetMonthlyPrice: tier.price,
			targetAnnualMonthly: annualMonthly,
			targetAnnualTotal: annualTotal,
			targetAnnualSavings: annualSavings,
			selectedInterval: data.billingInterval ?? 'monthly'
		};
	}

	function closePlanChangeModal() {
		pendingPlanChange = null;
	}

	function calcProration(addonPrice: number, action: 'activate' | 'deactivate'): number | null {
		if (!data.nextBillingDate || !data.periodStart) return null;
		const now = Date.now();
		const end = new Date(data.nextBillingDate).getTime();
		const start = new Date(data.periodStart).getTime();
		const totalDays = (end - start) / 86_400_000;
		const daysLeft = Math.max(0, (end - now) / 86_400_000);
		const amount = addonPrice * (daysLeft / totalDays);
		return action === 'activate' ? amount : -amount;
	}

	function calcUnusedMonthlyCredit(monthlyPrice: number): number {
		if (!data.nextBillingDate || !data.periodStart) return 0;
		const now = Date.now();
		const end = new Date(data.nextBillingDate).getTime();
		const start = new Date(data.periodStart).getTime();
		const totalDays = (end - start) / 86_400_000;
		const daysLeft = Math.max(0, (end - now) / 86_400_000);
		return monthlyPrice * (daysLeft / totalDays);
	}

	function calcUnusedAnnualCredit(annualTotal: number): number {
		if (!data.nextBillingDate || !data.periodStart) return 0;
		const now = Date.now();
		const end = new Date(data.nextBillingDate).getTime();
		const start = new Date(data.periodStart).getTime();
		const totalDays = (end - start) / 86_400_000;
		const daysLeft = Math.max(0, (end - now) / 86_400_000);
		return annualTotal * (daysLeft / totalDays);
	}

	function formatAddonList(addons: AddonItem[]): string {
		const names = addons
			.map((a) => ADDONS.find((d) => d.key === a.key)?.name ?? a.key)
			.filter(Boolean);
		if (names.length === 0) return '';
		if (names.length === 1) return names[0];
		if (names.length === 2) return `${names[0]} and ${names[1]}`;
		return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
	}

	function fmtDate(iso: string) {
		return new Date(iso).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function fmtMoney(dollars: number) {
		return Math.abs(dollars).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
	}
</script>

<div class="max-w-3xl">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-foreground">Billing</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">Manage your subscription plan and add-ons.</p>
	</div>

	<!-- Persistent state banners. These render whenever the vendor is in the
	     relevant state, not just immediately after the action. -->
	{#if isPaused && data.pauseUntil}
		<Alert severity="warning" class="mb-4" dismissible={false} autofade={0}>
			Your subscription is paused. Billing resumes automatically on {fmtDate(data.pauseUntil)}. Use
			"Resume now" below to restart billing early.
		</Alert>
	{/if}
	{#if data.subscriptionStatus === 'past_due'}
		<Alert severity="warning" class="mb-4" dismissible={false} autofade={0}>
			Your last payment didn't go through. Update your payment method to keep {tierInfo.name}.
		</Alert>
	{/if}
	{#if isCancelScheduled && data.subscriptionEndsAt && !data.subscriptionRefundedAt}
		<Alert severity="warning" class="mb-4" dismissible={false} autofade={0}>
			Your subscription will end on {fmtDate(data.subscriptionEndsAt)}, you'll keep paid features
			until then — use "Don't cancel" below to reverse if you change your mind.
		</Alert>
	{:else if isCancelScheduled && data.subscriptionEndsAt && data.subscriptionRefundedAt}
		<Alert severity="warning" class="mb-4" dismissible={false} autofade={0}>
			Your subscription is winding down — service ends {fmtDate(data.subscriptionEndsAt)}. A refund
			has been issued and this cancellation is final. To come back, re-upgrade after that date.
		</Alert>
	{/if}

	{#if billingError || form?.error}
		<Alert severity="error" class="mb-4">{billingError ?? form?.error}</Alert>
	{/if}

	<!-- Current plan + Account utilities: two-column grid on large screens. -->
	<div class="mb-8 grid gap-4 lg:grid-cols-3">
		<Card class="col-span-3 shadow-sm">
			<CardHeader>
				<CardTitle>Current plan</CardTitle>
			</CardHeader>
			<CardContent class="p-0">
				<div class="px-6 pb-6">
					<!-- Row 1: Plan name + status badges -->
					<div class="mb-2 flex flex-wrap items-center gap-2">
						<span class="text-xl font-bold text-foreground">{tierInfo.name}</span>
						<StatusBadge
							tone={statusColors[data.subscriptionStatus ?? 'active'] ?? statusColors.active}
						>
							{data.subscriptionStatus === 'past_due'
								? 'Payment past due'
								: data.subscriptionStatus === 'cancelled'
									? 'Cancelled'
									: 'Active'}
						</StatusBadge>
						{#if isPaidPlan}
							<StatusBadge variant="neutral">
								{data.billingInterval === 'annual' ? 'Annual' : 'Monthly'}
							</StatusBadge>
						{/if}
					</div>

					<!-- Row 2: Price + renewal date -->
					<div class="flex flex-wrap items-center gap-2">
						<p class="text-sm text-muted-foreground">
							{#if tierInfo.price === 0}
								Free
							{:else if data.billingInterval === 'annual' && tierAnnualInfo}
								${tierAnnualInfo.monthly}/mo · ${tierAnnualInfo.total}/yr
							{:else}
								${tierInfo.price}/month
							{/if}
							{#if addonMonthlyTotal > 0}
								<span>+ ${addonMonthlyTotal}/mo add-ons</span>
							{/if}
						</p>
						{#if !isCancelScheduled && !isPaused && data.nextBillingDate && isPaidPlan}
							<span
								class="inline-flex items-center gap-1 rounded-full border border-primary/15 bg-primary/5 px-2 py-0.5 text-xs font-medium text-primary"
							>
								<Icon icon="mdi:calendar-outline" class="h-3 w-3" />
								Renews {fmtDate(data.nextBillingDate)}
							</span>
						{/if}
					</div>

					<!-- Row 3: Cancel scheduled date -->
					{#if isCancelScheduled && data.subscriptionEndsAt}
						<p class="mt-1 text-xs font-medium text-amber-700">
							Plan ends {fmtDate(data.subscriptionEndsAt)}
						</p>
					{/if}

					<!-- Row 4: Item usage bar -->
					{#if itemLimit !== null}
						<div class="mt-5">
							<div class="mb-1.5 flex items-center justify-between text-sm">
								<span class="font-medium text-muted-foreground">Items</span>
								<span
									class={atLimit
										? 'font-semibold text-red-600'
										: nearLimit
											? 'font-semibold text-amber-600'
											: 'text-muted-foreground'}
								>
									{itemCount} / {itemLimit}
								</span>
							</div>
							<div class="h-2 w-full rounded-full bg-muted">
								<div
									class="h-2 rounded-full transition-all {atLimit
										? 'bg-destructive'
										: nearLimit
											? 'bg-amber-400'
											: 'bg-primary'}"
									style="width: {usagePct}%"
								></div>
							</div>
							{#if atLimit}
								<p class="mt-2 flex items-center gap-1.5 text-sm text-red-600">
									<Icon icon="mdi:alert-circle-outline" class="h-4 w-4 shrink-0" />
									Item limit reached. Upgrade your plan to add more.
								</p>
							{:else if nearLimit}
								<p class="mt-2 flex items-center gap-1.5 text-sm text-amber-600">
									<Icon icon="mdi:alert-outline" class="h-4 w-4 shrink-0" />
									Approaching your item limit.
								</p>
							{/if}
						</div>
					{:else}
						<div class="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
							<Icon icon="mdi:infinity" class="h-4 w-4 text-primary" />
							Unlimited catalog items
						</div>
					{/if}
				</div>

				<!-- Action strip: 5 mutually exclusive states. -->
				{#if isPaused}
					<CardFooter class="gap-2">
						<form
							method="post"
							action="?/resumeSubscription"
							use:enhance={() => {
								submittingAction = 'resume';
								billingError = null;
								return async ({ result, update }) => {
									if (result.type === 'redirect') {
										window.location.href = result.location;
										return;
									}
									submittingAction = null;
									if (handleBillingResult(result as BillingResult)) {
										await update({ invalidateAll: true });
										return;
									}
									await update({ invalidateAll: true });
								};
							}}
						>
							<Button
								type="submit"
								variant="outline"
								disabled={submittingAction !== null}
								class="gap-1.5 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
							>
								{#if submittingAction === 'resume'}
									<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
									Resuming...
								{:else}
									<Icon icon="mdi:play-circle-outline" class="h-3.5 w-3.5" />
									Resume now
								{/if}
							</Button>
						</form>
					</CardFooter>
				{:else if isCancelScheduled && data.hasStripeSubscription && !data.subscriptionRefundedAt}
					<CardFooter class="gap-2">
						<form
							method="post"
							action="?/reactivate"
							use:enhance={() => {
								submittingAction = 'reactivate';
								billingError = null;
								return async ({ result, update }) => {
									if (result.type === 'success') {
										window.location.href = resolve('/dashboard/account/billing') + '?reactivated=1';
										return;
									}
									submittingAction = null;
									handleBillingResult(result as BillingResult);
									await update({ invalidateAll: true });
								};
							}}
						>
							<Button
								type="submit"
								variant="outline"
								disabled={submittingAction !== null}
								class="gap-1.5 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
							>
								{#if submittingAction === 'reactivate'}
									<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
									Saving...
								{:else}
									<Icon icon="mdi:undo-variant" class="h-3.5 w-3.5" />
									Don't cancel — keep {tierInfo.name}
								{/if}
							</Button>
						</form>
					</CardFooter>
				{:else if data.subscriptionStatus === 'past_due'}
					<CardFooter class="gap-2">
						<Button
							href={resolve('/dashboard/account/billing/payment-methods')}
							class="gap-1.5 border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100"
						>
							<Icon icon="mdi:alert-outline" class="h-3.5 w-3.5" /> Update payment method
						</Button>
					</CardFooter>
				{:else if isPaidPlan && data.hasStripeSubscription}
					<CardFooter class="gap-2">
						{#if data.billingInterval === 'monthly'}
							<Button
								type="button"
								variant="outline"
								class="gap-1.5 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
								onclick={() => openIntervalSwitchModal('annual')}
							>
								<Icon icon="mdi:arrow-up-circle-outline" class="h-3.5 w-3.5" />
								Switch to annual — save ${tierAnnualInfo?.savings ?? 0}/yr
							</Button>
						{:else}
							<Button
								type="button"
								variant="outline"
								class="gap-1.5"
								onclick={() => openIntervalSwitchModal('monthly')}
							>
								<Icon icon="mdi:swap-horizontal" class="h-3.5 w-3.5" />
								Switch to monthly
							</Button>
						{/if}
						<Button
							type="button"
							variant="outline"
							class="gap-1.5"
							onclick={() => (pendingPauseOpen = true)}
						>
							<Icon icon="mdi:pause-circle-outline" class="h-3.5 w-3.5" />
							Pause billing
						</Button>
					</CardFooter>
				{/if}
			</CardContent>
		</Card>

		<!-- Account utilities card -->
		<Card class="col-span-3 shadow-sm">
			<CardHeader>
				<CardTitle>Payment & invoices</CardTitle>
			</CardHeader>
			<CardContent class="p-0">
				<!-- Default payment method -->
				{#if data.defaultPaymentMethod}
					<div class="px-4 pt-4 pb-3">
						<p class="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
							Default card
						</p>
						<div class="flex items-center gap-3">
							<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
								<Icon icon="mdi:credit-card-outline" class="h-4 w-4 text-muted-foreground" />
							</div>
							<div>
								<p class="text-sm font-medium text-foreground capitalize">
									{data.defaultPaymentMethod.brand} ···· {data.defaultPaymentMethod.last4}
								</p>
								<p class="text-xs text-muted-foreground">
									Expires {data.defaultPaymentMethod.expMonth}/{data.defaultPaymentMethod.expYear}
								</p>
							</div>
						</div>
					</div>
				{:else}
					<div class="px-4 pt-4 pb-3">
						<p class="text-sm text-muted-foreground">
							{data.hasStripeCustomer
								? 'No default card on file.'
								: 'Add a payment method after upgrading.'}
						</p>
					</div>
				{/if}

				<!-- Account credit -->
				{#if data.accountCreditCents > 0}
					<div class="border-t border-gray-100 px-4 pt-3 pb-3">
						<p class="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
							Account credit
						</p>
						<div class="flex flex-wrap items-center justify-between gap-3">
							<div class="flex items-center gap-3">
								<div
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-success/10"
								>
									<Icon icon="mdi:cash-refund" class="h-4 w-4 text-success" />
								</div>
								<div>
									<p class="text-sm font-medium text-success">
										${(data.accountCreditCents / 100).toFixed(2)} credit
									</p>
									<p class="text-xs text-muted-foreground">
										Applied automatically to upcoming invoices
									</p>
								</div>
							</div>
							<Button
								type="button"
								variant="outline"
								onclick={() => (pendingRefundCreditOpen = true)}
							>
								Refund to card
							</Button>
						</div>
					</div>
				{/if}

				<!-- Recent invoices -->
				{#if data.recentInvoices.length > 0}
					<div class="border-t border-gray-100">
						<p
							class="px-4 pt-3 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase"
						>
							Recent invoices
						</p>
						<ul class="divide-y divide-gray-50">
							{#each data.recentInvoices as invoice (invoice.id)}
								<li class="flex items-center justify-between px-4 py-2">
									<div>
										<p class="text-xs font-medium text-foreground">
											{#if invoice.type === 'credit_note'}
												Credit note
											{:else if invoice.type === 'refund'}
												Refund
											{:else if invoice.total < 0}
												Credit issued
											{:else}
												{invoice.number ?? 'Invoice'}
											{/if}
										</p>
										<p class="text-xs text-muted-foreground">
											{new Date(invoice.created * 1000).toLocaleDateString('en-US', {
												month: 'short',
												day: 'numeric',
												year: 'numeric'
											})}{#if invoice.creditAppliedCents > 0}
												<span class="ml-1 font-medium text-success"
													>· ${(invoice.creditAppliedCents / 100).toFixed(2)} from credit</span
												>
											{/if}
										</p>
									</div>
									<div class="flex items-center gap-2">
										<span
											class="text-xs font-semibold {invoice.type === 'credit_note' ||
											invoice.type === 'refund'
												? 'text-success'
												: 'text-foreground'}"
										>
											{invoice.total < 0 ? '−' : ''}${(Math.abs(invoice.total) / 100).toFixed(2)}
										</span>
										{#if invoice.invoicePdf}
											<!-- eslint-disable svelte/no-navigation-without-resolve -->
											<a
												href={invoice.invoicePdf}
												target="_blank"
												rel="noopener noreferrer"
												class="text-muted-foreground transition-colors hover:text-foreground"
												aria-label="Download PDF"
											>
												<Icon icon="mdi:file-download-outline" class="h-3.5 w-3.5" />
											</a>
											<!-- eslint-enable svelte/no-navigation-without-resolve -->
										{/if}
									</div>
								</li>
							{/each}
						</ul>
					</div>
				{/if}

				<!-- Action strip links -->
				<CardFooter class="gap-2">
					<Button
						type="button"
						variant="outline"
						class="gap-1.5"
						href={resolve('/dashboard/account/billing/payment-methods')}
					>
						<Icon icon="mdi:credit-card-outline" class="h-3.5 w-3.5" />
						Payment methods
					</Button>
					<Button
						type="button"
						variant="outline"
						class="gap-1.5"
						href={resolve('/dashboard/account/billing/invoices')}
					>
						<Icon icon="mdi:file-document-outline" class="h-3.5 w-3.5" />
						All invoices
					</Button>
				</CardFooter>
			</CardContent>
		</Card>
	</div>

	<!-- Plans -->
	<div class="mb-8">
		<h2 class="mb-4 text-lg font-semibold text-foreground">Plans</h2>
		<div class="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
			{#each TIERS as tier (tier.key)}
				{@const isCurrent = tier.key === currentTierKey}
				{@const tierIndex = TIERS.findIndex((t) => t.key === tier.key)}
				{@const currentIndex = TIERS.findIndex((t) => t.key === currentTierKey)}
				{@const isUpgrade = tierIndex > currentIndex}
				<div class="relative">
					{#if isCurrent}
						<span
							class="absolute -top-2.5 left-4 z-10 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white"
							>Current</span
						>
					{/if}
					<Card class="h-full shadow-sm {isCurrent ? 'ring-2 ring-primary/70 ring-offset-0' : ''}">
						<CardContent class="flex flex-1 flex-col">
							<!-- Tier header -->
							<div class="mb-4">
								<p class="font-semibold text-foreground">{tier.name}</p>

								<!-- Price block: three rows for vertical alignment across cards.
								     Row 1: annual total (or "Free" for Starter) — large, bold.
								     Row 2: annual monthly equivalent — small, primary green.
								     Row 3: monthly billing alternative — small, muted gray.
								     Starter's rows 2 and 3 use invisible spacers so the total
								     vertical height matches the paid cards. -->
								{#if tier.price === 0}
									<p class="mt-1 text-2xl font-bold text-foreground">Free</p>
									<p class="mt-0.5 text-xs text-muted-foreground">Get started for free</p>
									<p class="invisible mt-0.5 text-xs">spacer line b</p>
								{:else}
									{@const annualTotal =
										'annualTotal' in tier ? (tier as { annualTotal: number }).annualTotal : 0}
									{@const annualMonthly =
										'annualMonthly' in tier ? (tier as { annualMonthly: number }).annualMonthly : 0}
									<p class="mt-1 text-2xl font-bold text-foreground">
										${annualTotal}<span class="text-sm font-normal text-muted-foreground">/yr</span>
									</p>
									<p class="mt-0.5 text-xs font-medium text-primary">
										${annualMonthly}/mo when paid annually
									</p>
									<p class="mt-0.5 text-xs text-muted-foreground">
										${tier.price}/mo when paid monthly
									</p>
								{/if}
							</div>
							<ul class="mb-5 flex-1 space-y-2">
								{#each tier.features as feature (feature)}
									<li class="flex items-start gap-2 text-sm text-muted-foreground">
										<Icon
											icon="mdi:check-circle-outline"
											class="mt-0.5 h-4 w-4 shrink-0 text-primary/80"
										/>
										{feature}
									</li>
								{/each}
							</ul>
							{#if isCurrent}
								<Button
									disabled
									variant="outline"
									class="w-full cursor-default text-muted-foreground"
								>
									Current plan
								</Button>
							{:else if isUpgrade}
								<Button
									type="button"
									variant="default"
									class="w-full"
									onclick={() => openPlanChangeModal(tier, 'upgrade')}
								>
									Upgrade to {tier.name}
								</Button>
							{:else if isPaused}
								<Button
									disabled
									variant="outline"
									class="w-full cursor-default text-muted-foreground"
								>
									Resume to change plan
								</Button>
							{:else if isCancelScheduled && tier.key === 'starter'}
								<Button
									disabled
									variant="outline"
									class="w-full cursor-default text-muted-foreground"
								>
									Active from {data.subscriptionEndsAt
										? fmtDate(data.subscriptionEndsAt)
										: 'next billing cycle'}
								</Button>
							{:else}
								{@const isCancellation = tier.key === 'starter'}
								{@const isAnnualCancel = isCancellation && data.billingInterval === 'annual'}
								{#if isAnnualCancel}
									<Button
										type="button"
										onclick={() => (pendingCancelOpen = true)}
										variant="outline"
										class="w-full text-muted-foreground"
									>
										Downgrade to Starter
									</Button>
								{:else}
									<Button
										type="button"
										onclick={() => openPlanChangeModal(tier, 'downgrade')}
										variant="outline"
										class="w-full text-muted-foreground"
									>
										Downgrade to {tier.name}
									</Button>
								{/if}
							{/if}
						</CardContent>
					</Card>
				</div>
			{/each}
		</div>
		<p class="mt-2 text-xs text-muted-foreground">
			All plans include Stripe payment processing. Stripe charges 2.9% + 30¢ per transaction — we
			never take a cut.
		</p>
	</div>

	<!-- Add-ons -->
	<div>
		<h2 class="mb-1 text-lg font-semibold text-foreground">Add-ons</h2>
		{#if !isPaidPlan}
			<Alert severity="warning" class="mb-4" dismissible={false} autofade={0}>
				Add-ons require a Market or Pro plan. Upgrade above to activate add-ons.
			</Alert>
		{:else if !data.hasStripeSubscription}
			<Alert severity="warning" class="mb-4">Complete your plan upgrade to activate add-ons.</Alert>
		{:else}
			<p class="mb-4 text-sm text-muted-foreground">
				Activate or deactivate features. Changes are prorated and billed to your card on file
				immediately.
			</p>
		{/if}

		<div class="grid gap-4 md:grid-cols-2">
			{#each ADDONS as addon (addon.key)}
				{@const isIncluded = getIncludedAddons(currentTierKey).includes(addon.key)}
				{@const isActive = hasAddon(activeAddons, addon.key)}
				{@const canToggle = data.hasStripeSubscription && !isPaused && !isIncluded}
				{@const canActivate = canToggle && !isCancelScheduled}
				<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
					<div class="px-4 py-3">
						<div class="mb-2 flex items-start justify-between gap-3">
							<div class="flex items-center gap-3">
								<div
									class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10"
								>
									<Icon icon={addon.icon} class="h-4 w-4 text-primary" />
								</div>
								<div>
									<p class="text-sm font-semibold text-foreground">{addon.name}</p>
									<p class="text-xs text-muted-foreground">
										{isIncluded ? 'Included with Pro' : `$${addon.price}/mo`}
									</p>
								</div>
							</div>
							{#if isIncluded}
								<StatusBadge variant="success" class="shrink-0">Included with Pro</StatusBadge>
							{:else if isActive}
								<StatusBadge variant="success" class="shrink-0">Active</StatusBadge>
							{/if}
						</div>
						<p class="mb-3 text-sm text-muted-foreground">{addon.description}</p>
					</div>
					{#if canActivate && !isActive}
						<div class="flex items-center justify-start gap-3 border-t border-gray-100 px-4 py-2">
							<Button
								type="button"
								onclick={() => openModal(addon, 'activate')}
								variant="default"
								class=""
							>
								Activate
							</Button>
						</div>
					{:else if !isPaidPlan && !isIncluded && !isActive}
						<div class="flex items-center justify-start gap-3 border-t border-gray-100 px-4 py-2">
							<Tooltip>
								<TooltipTrigger>
									{#snippet child({ props })}
										<span {...props} class="inline-block">
											<Button type="button" variant="default" disabled>Activate</Button>
										</span>
									{/snippet}
								</TooltipTrigger>
								<TooltipContent>Upgrade to Market or Pro to activate add-ons.</TooltipContent>
							</Tooltip>
						</div>
					{/if}
					{#if canToggle && isActive}
						<div class="flex items-center justify-end gap-3 border-t border-gray-100 px-4 py-2">
							<Button
								type="button"
								variant="ghost"
								onclick={() => openModal(addon, 'deactivate')}
								class="text-red-500 hover:bg-red-50 hover:text-red-600"
							>
								Deactivate
							</Button>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- Addon confirmation modal -->
{#if pendingAddon}
	{@const proration = calcProration(pendingAddon.price, pendingAddon.action)}
	{@const newMonthly =
		pendingAddon.action === 'activate'
			? currentMonthly + pendingAddon.price
			: currentMonthly - pendingAddon.price}
	{@const isActivate = pendingAddon.action === 'activate'}

	<Dialog
		open={!!pendingAddon}
		onOpenChange={(open) => {
			if (!open) closeModal();
		}}
	>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle>
					{isActivate ? 'Activate' : 'Deactivate'}
					{pendingAddon.name}?
				</DialogTitle>
				<DialogDescription class="text-sm text-muted-foreground">
					{#if isActivate}
						You're adding {pendingAddon.name} to your {tierInfo?.name ?? 'plan'}.
					{:else}
						{pendingAddon.name} will be removed from your plan.
					{/if}
				</DialogDescription>
			</DialogHeader>
			<div class="flex flex-col gap-3">
				<!-- Billing summary -->
				<div class="space-y-1.5 rounded-xl border bg-muted/50 px-4 py-3">
					<p class="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
						Billing summary
					</p>
					<div class="flex items-center justify-between text-sm text-muted-foreground">
						<span>Current monthly bill</span>
						<span class="font-medium">${currentMonthly}/mo</span>
					</div>
					<div
						class="flex items-center justify-between text-sm {isActivate
							? 'text-foreground'
							: 'text-red-600'}"
					>
						<span>{isActivate ? '+' : '−'} {pendingAddon.name}</span>
						<span class="font-medium">{isActivate ? '+' : '−'}${pendingAddon.price}/mo</span>
					</div>
					<div
						class="flex items-center justify-between border-t pt-2 text-sm font-semibold text-foreground"
					>
						<span>New monthly bill</span>
						<span>~${newMonthly}/mo</span>
					</div>
				</div>

				<!-- Proration note -->
				{#if proration !== null}
					<Alert severity="info" dismissible={false} autofade={0}>
						{#if isActivate}
							You'll be charged a prorated amount of <strong>{fmtMoney(proration)}</strong> today for
							the remaining days in this billing cycle.
						{:else}
							You'll receive a prorated credit of <strong>{fmtMoney(proration)}</strong> on your next
							invoice.
						{/if}
					</Alert>
				{/if}

				<!-- Next billing date -->
				{#if data.nextBillingDate}
					<p class="text-xs text-muted-foreground">
						Next full charge of <strong>~${newMonthly}/mo</strong> on {fmtDate(
							data.nextBillingDate
						)}.
					</p>
				{/if}

				<!-- Trust footer -->
				<p class="text-center text-xs text-muted-foreground">
					Secure payment by Stripe · Cancel anytime · Receipt sent to your email
				</p>
			</div>
			<DialogFooter class="flex gap-3 sm:flex-row">
				<Button
					type="button"
					onclick={closeModal}
					variant="outline"
					class="flex-1"
					disabled={submittingAction !== null}
				>
					Cancel
				</Button>
				<form
					method="post"
					action={isActivate ? '?/activateAddon' : '?/deactivateAddon'}
					use:enhance={() => {
						submittingAction = 'addon';
						billingError = null;
						return async ({ result, update }) => {
							submittingAction = null;
							pendingAddon = null;
							handleBillingResult(result as BillingResult);
							await update({ invalidateAll: true });
						};
					}}
					class="flex-1"
				>
					<input type="hidden" name="key" value={pendingAddon.key} />
					<Button
						type="submit"
						variant={isActivate ? 'default' : 'destructive'}
						class="w-full"
						disabled={submittingAction !== null}
					>
						{#if submittingAction === 'addon'}
							<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
							{isActivate ? 'Activating...' : 'Removing...'}
						{:else if isActivate}
							Confirm — {fmtMoney(proration ?? pendingAddon.price)} today
						{:else}
							Confirm removal
						{/if}
					</Button>
				</form>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}

<!-- Cancel choice dialog (annual plan vendors: period-end vs immediate-with-refund) -->
{#if pendingCancelOpen}
	<Dialog
		open={pendingCancelOpen}
		onOpenChange={(open) => {
			if (!open) pendingCancelOpen = false;
		}}
	>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle>Downgrade to Starter</DialogTitle>
				<DialogDescription class="text-sm text-muted-foreground">
					Choose how to end your {tierInfo.name} annual plan.
				</DialogDescription>
			</DialogHeader>
			<div class="flex flex-col gap-3">
				<!-- Option 1: cancel at period end (no refund) -->
				<label
					class="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-muted/40 {cancelChoice ===
					'period_end'
						? 'border-primary ring-1 ring-primary'
						: 'border-border'}"
				>
					<input
						type="radio"
						name="cancelChoice"
						value="period_end"
						class="mt-0.5"
						checked={cancelChoice === 'period_end'}
						onchange={() => (cancelChoice = 'period_end')}
					/>
					<div class="flex-1">
						<p class="text-sm font-medium text-foreground">Cancel at period end</p>
						<p class="mt-0.5 text-xs text-muted-foreground">
							Keep access until {data.subscriptionEndsAt
								? fmtDate(data.subscriptionEndsAt)
								: data.nextBillingDate
									? fmtDate(data.nextBillingDate)
									: 'your next billing date'}, then move to Starter. No refund.
						</p>
						{#if activeAddons.length > 0}
							<p class="mt-1.5 text-xs text-muted-foreground italic">
								Your add-ons ({formatAddonList(activeAddons)}) keep their monthly charges until
								then, then end with your plan.
							</p>
						{/if}
					</div>
				</label>

				<!-- Option 2: cancel immediately + prorated refund (only when refund > 0) -->
				{#if cancelPreview && cancelPreview.refundCents > 0}
					<label
						class="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-4 transition-colors hover:bg-muted/40 {cancelChoice ===
						'immediate_refund'
							? 'border-primary ring-1 ring-primary'
							: 'border-border'}"
					>
						<input
							type="radio"
							name="cancelChoice"
							value="immediate_refund"
							class="mt-0.5"
							checked={cancelChoice === 'immediate_refund'}
							onchange={() => (cancelChoice = 'immediate_refund')}
						/>
						<div class="flex-1">
							<p class="text-sm font-medium text-foreground">Cancel now — get a refund</p>
							<p class="mt-0.5 text-xs text-muted-foreground">
								Cancel immediately and receive a prorated refund of
								<strong class="font-semibold text-foreground"
									>{fmtMoney(cancelPreview.refundCents / 100)}</strong
								>
								for {cancelPreview.unusedDays}
								unused {cancelPreview.unusedDays === 1 ? 'day' : 'days'}. Access ends today.
							</p>
							{#if activeAddons.length > 0}
								<p class="mt-1.5 text-xs text-muted-foreground italic">
									Your add-ons ({formatAddonList(activeAddons)}) end today. The refund above covers
									your plan only.
								</p>
							{/if}
						</div>
					</label>
				{/if}

				<!-- Trust footer -->
				<p class="text-center text-xs text-muted-foreground">
					Secure payment by Stripe · Refunds processed within 5–10 business days
				</p>
			</div>
			<DialogFooter class="flex gap-3 sm:flex-row">
				<Button
					type="button"
					onclick={() => (pendingCancelOpen = false)}
					variant="outline"
					class="flex-1"
					disabled={submittingAction !== null}
				>
					Keep plan
				</Button>
				<form
					method="post"
					action={cancelChoice === 'immediate_refund' ? '?/cancelImmediate' : '?/downgrade'}
					use:enhance={() => {
						submittingAction = 'cancel';
						billingError = null;
						const wasImmediate = cancelChoice === 'immediate_refund';
						return async ({ result, update }) => {
							pendingCancelOpen = false;
							if (result.type === 'success') {
								window.location.href =
									resolve('/dashboard/account/billing') +
									(wasImmediate ? '?refunded=1' : '?downgraded=1');
								return;
							}
							submittingAction = null;
							handleBillingResult(result as BillingResult);
							await update({ invalidateAll: true });
						};
					}}
					class="flex-1"
				>
					<input type="hidden" name="planKey" value="starter" />
					<Button
						type="submit"
						variant="destructive"
						class="w-full"
						disabled={submittingAction !== null}
					>
						{#if submittingAction === 'cancel'}
							<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
							{cancelChoice === 'immediate_refund' ? 'Cancelling...' : 'Downgrading...'}
						{:else if cancelChoice === 'immediate_refund' && cancelPreview}
							Cancel & refund {fmtMoney(cancelPreview.refundCents / 100)}
						{:else}
							Downgrade to Starter
						{/if}
					</Button>
				</form>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}

<!-- Interval switch confirmation modal -->
{#if pendingIntervalSwitch && tierAnnualInfo}
	{@const target = pendingIntervalSwitch}
	{@const switchingToAnnual = target === 'annual'}
	{@const annualMonthly = tierAnnualInfo.monthly}
	{@const annualTotal = tierAnnualInfo.total}
	{@const annualSavings = tierAnnualInfo.savings}
	{@const todayChargeEstimate = switchingToAnnual
		? Math.max(0, annualTotal - calcUnusedMonthlyCredit(tierInfo.price))
		: 0}
	{@const todayCreditEstimate = switchingToAnnual ? 0 : calcUnusedAnnualCredit(annualTotal)}

	<Dialog
		open={!!pendingIntervalSwitch}
		onOpenChange={(open) => {
			if (!open) closeIntervalSwitchModal();
		}}
	>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle>Switch to {target} billing?</DialogTitle>
				<DialogDescription class="text-sm text-muted-foreground">
					{#if switchingToAnnual}
						Lock in annual pricing and save ${annualSavings}/yr.
					{:else}
						Switch back to monthly billing on your next cycle.
					{/if}
				</DialogDescription>
			</DialogHeader>

			<div class="flex flex-col gap-3">
				<!-- Billing summary -->
				<div class="space-y-1.5 rounded-xl border bg-muted/50 px-4 py-3">
					<p class="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
						Billing summary
					</p>
					<div class="flex items-center justify-between text-sm text-muted-foreground">
						<span>Current billing</span>
						<span class="font-medium">
							{#if data.billingInterval === 'monthly'}
								${tierInfo.price}/mo
							{:else}
								${annualTotal}/yr
							{/if}
						</span>
					</div>
					<div class="flex items-center justify-between text-sm text-foreground">
						<span>New billing</span>
						<span class="font-medium">
							{#if switchingToAnnual}
								${annualTotal}/yr
								<span class="text-xs text-muted-foreground">(${annualMonthly}/mo)</span>
							{:else}
								${tierInfo.price}/mo
							{/if}
						</span>
					</div>
					{#if switchingToAnnual}
						<div
							class="flex items-center justify-between border-t pt-2 text-sm font-semibold text-foreground"
						>
							<span>Charged today</span>
							<span>~{fmtMoney(todayChargeEstimate)}</span>
						</div>
					{/if}
				</div>

				<!-- Proration / credit note -->
				{#if switchingToAnnual}
					<Alert severity="info" dismissible={false} autofade={0}>
						A prorated charge of <strong>~{fmtMoney(todayChargeEstimate)}</strong> will be billed to your
						card on file today (annual price minus credit for unused days in your current cycle). Your
						subscription then renews annually.
					</Alert>
				{:else}
					<!-- annual → monthly: let the vendor choose credit or cash refund -->
					<label
						class="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3 transition-colors hover:bg-muted/40 {intervalSwitchChoice ===
						'credit'
							? 'border-primary ring-1 ring-primary'
							: 'border-border'}"
					>
						<input
							type="radio"
							name="intervalSwitchChoice"
							value="credit"
							class="mt-0.5"
							checked={intervalSwitchChoice === 'credit'}
							onchange={() => (intervalSwitchChoice = 'credit')}
						/>
						<div class="flex-1">
							<p class="text-sm font-medium text-foreground">Credit to account</p>
							<p class="mt-0.5 text-xs text-muted-foreground">
								A prorated credit of <strong>~{fmtMoney(todayCreditEstimate)}</strong> is applied immediately,
								and offsets your upcoming monthly invoices automatically.
							</p>
						</div>
					</label>
					{#if cancelPreview && cancelPreview.refundCents > 0}
						<label
							class="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-3 transition-colors hover:bg-muted/40 {intervalSwitchChoice ===
							'refund'
								? 'border-primary ring-1 ring-primary'
								: 'border-border'}"
						>
							<input
								type="radio"
								name="intervalSwitchChoice"
								value="refund"
								class="mt-0.5"
								checked={intervalSwitchChoice === 'refund'}
								onchange={() => (intervalSwitchChoice = 'refund')}
							/>
							<div class="flex-1">
								<p class="text-sm font-medium text-foreground">Refund to card</p>
								<p class="mt-0.5 text-xs text-muted-foreground">
									Get <strong>{fmtMoney(cancelPreview.refundCents / 100)}</strong> back for
									{cancelPreview.unusedDays}
									unused {cancelPreview.unusedDays === 1 ? 'day' : 'days'}. Refund appears within
									5–10 business days.
								</p>
							</div>
						</label>
					{/if}
				{/if}

				<!-- Trust footer -->
				<p class="text-center text-xs text-muted-foreground">
					Secure payment by Stripe · Cancel anytime · Receipt sent to your email
				</p>
			</div>

			<DialogFooter class="flex gap-3 sm:flex-row">
				<Button
					type="button"
					onclick={closeIntervalSwitchModal}
					variant="outline"
					class="flex-1"
					disabled={submittingAction !== null}
				>
					Cancel
				</Button>
				<form
					method="post"
					action="?/switchInterval"
					use:enhance={() => {
						submittingAction = 'switchInterval';
						billingError = null;
						const wasSwitchingToAnnual = target === 'annual';
						const choiceAtSubmit = intervalSwitchChoice;
						return async ({ result, update }) => {
							pendingIntervalSwitch = null;
							intervalSwitchChoice = 'credit';
							if (result.type === 'success') {
								const flag =
									!wasSwitchingToAnnual && choiceAtSubmit === 'refund'
										? 'switched=refund'
										: 'switched=1';
								window.location.href = resolve('/dashboard/account/billing') + '?' + flag;
								return;
							}
							submittingAction = null;
							handleBillingResult(result as BillingResult);
							await update({ invalidateAll: true });
						};
					}}
					class="flex-1"
				>
					<input type="hidden" name="interval" value={target} />
					{#if !switchingToAnnual}
						<input type="hidden" name="switchChoice" value={intervalSwitchChoice} />
					{/if}
					<Button
						type="submit"
						variant="default"
						class="w-full"
						disabled={submittingAction !== null}
					>
						{#if submittingAction === 'switchInterval'}
							<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
							Switching...
						{:else if switchingToAnnual}
							Confirm annual billing
						{:else if intervalSwitchChoice === 'refund' && cancelPreview && cancelPreview.refundCents > 0}
							Confirm & refund {fmtMoney(cancelPreview.refundCents / 100)}
						{:else}
							Confirm switch
						{/if}
					</Button>
				</form>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}

<!-- Pause billing modal -->
{#if pendingPauseOpen}
	<Dialog
		open={pendingPauseOpen}
		onOpenChange={(open) => {
			if (!open) closePauseModal();
		}}
	>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle>Pause billing</DialogTitle>
				<DialogDescription class="text-sm text-muted-foreground">
					Choose how long to pause your {tierInfo.name} subscription.
				</DialogDescription>
			</DialogHeader>

			<div class="flex flex-col gap-4">
				<!-- Duration picker -->
				<div class="grid grid-cols-3 gap-2">
					{#each [{ value: '1', label: '1 month' }, { value: '3', label: '3 months' }, { value: '6', label: '6 months' }] as opt (opt.value)}
						<button
							type="button"
							onclick={() => {
								pauseDuration = opt.value as typeof pauseDuration;
							}}
							class="rounded-lg border px-3 py-2 text-sm transition-colors {pauseDuration ===
							opt.value
								? 'border-primary bg-background font-medium text-primary ring-1 ring-primary '
								: 'border-gray-200 text-muted-foreground hover:border-gray-300 hover:bg-muted/40'}"
						>
							{opt.label}
						</button>
					{/each}
				</div>
				<button
					type="button"
					onclick={() => {
						pauseDuration = 'custom';
					}}
					class="rounded-lg border px-3 py-2 text-sm transition-colors {pauseDuration === 'custom'
						? 'border-primary bg-background font-medium text-primary ring-1 ring-primary '
						: 'border-gray-200 text-muted-foreground hover:border-gray-300 hover:bg-muted/40'}"
				>
					Custom date
				</button>

				{#if pauseDuration === 'custom'}
					<div>
						<label for="pause-custom-date" class="mb-1.5 block text-sm font-medium text-gray-700"
							>Resume billing on</label
						>
						<input
							id="pause-custom-date"
							type="date"
							bind:value={pauseCustomDate}
							min={minPauseDate}
							max={maxPauseDate}
							class="h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none"
						/>
					</div>
				{:else}
					<p class="text-sm text-muted-foreground">
						Billing resumes automatically on <strong>{fmtDate(computePauseDate())}</strong>.
					</p>
				{/if}

				<Alert severity="info" dismissible={false} autofade={0}>
					Your storefront stays active and your data is safe while paused. You can resume early at
					any time from this page.
				</Alert>

				<p class="text-center text-xs text-muted-foreground">
					Pause duration cannot exceed 6 months.
				</p>
			</div>

			<DialogFooter class="flex gap-3 sm:flex-row">
				<Button
					type="button"
					onclick={closePauseModal}
					variant="outline"
					class="flex-1"
					disabled={submittingAction !== null}
				>
					Cancel
				</Button>
				<form
					method="post"
					action="?/pauseSubscription"
					use:enhance={() => {
						submittingAction = 'pause';
						billingError = null;
						return async ({ result, update }) => {
							closePauseModal();
							if (result.type === 'redirect') {
								window.location.href = result.location;
								return;
							}
							submittingAction = null;
							handleBillingResult(result as BillingResult);
							await update({ invalidateAll: true });
						};
					}}
					class="flex-1"
				>
					<input type="hidden" name="pauseUntilDate" value={computePauseDate()} />
					<Button
						type="submit"
						variant="default"
						class="w-full"
						disabled={submittingAction !== null || (pauseDuration === 'custom' && !pauseCustomDate)}
					>
						{#if submittingAction === 'pause'}
							<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
							Pausing...
						{:else}
							Pause until {pauseDuration !== 'custom'
								? fmtDate(computePauseDate())
								: pauseCustomDate
									? fmtDate(pauseCustomDate)
									: '…'}
						{/if}
					</Button>
				</form>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}

<!-- Unified plan-change dialog (paid → paid upgrade or downgrade) -->
{#if pendingPlanChange}
	{@const targetIsAnnual = pendingPlanChange.selectedInterval === 'annual'}
	{@const currentIsAnnual = data.billingInterval === 'annual'}
	{@const isUpgrade = pendingPlanChange.direction === 'upgrade'}

	{@const newTierCost = targetIsAnnual
		? pendingPlanChange.targetAnnualTotal
		: calcUnusedMonthlyCredit(pendingPlanChange.targetMonthlyPrice)}

	{@const currentCredit = currentIsAnnual
		? calcUnusedAnnualCredit(
				'annualTotal' in tierInfo ? (tierInfo as { annualTotal: number }).annualTotal : 0
			)
		: calcUnusedMonthlyCredit(tierInfo.price)}

	{@const nextInvoiceEstimate = Math.max(0, newTierCost - currentCredit)}

	<Dialog
		open={!!pendingPlanChange}
		onOpenChange={(open) => {
			if (!open) closePlanChangeModal();
		}}
	>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle>
					{isUpgrade ? 'Upgrade to' : 'Downgrade to'}
					{pendingPlanChange.targetTierName}
				</DialogTitle>
				<DialogDescription class="text-sm text-muted-foreground">
					{#if isUpgrade}
						{#if !data.hasStripeSubscription}
							Choose a billing interval. You'll enter payment details at the next step.
						{:else}
							You'll get {pendingPlanChange.targetTierName} access right away, and the prorated charge
							is billed to your card on file today.
						{/if}
					{:else if pendingPlanChange.targetTierKey === 'starter'}
						Your subscription stays active until the next billing cycle, then moves to Starter.
						{#if activeAddons.length > 0}
							Your add-ons ({formatAddonList(activeAddons)}) keep their monthly charges until then,
							then end with your plan.
						{/if}
					{:else}
						Your subscription moves to {pendingPlanChange.targetTierName} pricing immediately. Stripe
						credits the unused portion of your current plan to your account. Add-ons stay active.
					{/if}
				</DialogDescription>
			</DialogHeader>

			<div class="flex flex-col gap-3">
				<!-- Interval picker: two card-style radios. Vendor picks Monthly or
				     Annual for the target plan. Defaults to current interval at open.
				     Hidden when target is Starter (free tier has no interval). -->
				{#if pendingPlanChange.targetTierKey !== 'starter'}
					<div class="grid grid-cols-2 gap-2">
						<button
							type="button"
							onclick={() => {
								if (pendingPlanChange) pendingPlanChange.selectedInterval = 'monthly';
							}}
							class="flex flex-col gap-0.5 rounded-lg border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/40 {pendingPlanChange.selectedInterval ===
							'monthly'
								? 'border-primary ring-1 ring-primary'
								: 'border-border'}"
						>
							<span class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
								Monthly
							</span>
							<span class="text-base font-semibold text-foreground">
								${pendingPlanChange.targetMonthlyPrice}/mo
							</span>
						</button>
						<button
							type="button"
							onclick={() => {
								if (pendingPlanChange) pendingPlanChange.selectedInterval = 'annual';
							}}
							class="flex flex-col gap-0.5 rounded-lg border bg-background px-3 py-2.5 text-left transition-colors hover:bg-muted/40 {pendingPlanChange.selectedInterval ===
							'annual'
								? 'border-primary ring-1 ring-primary'
								: 'border-border'}"
						>
							<div class="flex items-center justify-between">
								<span class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
									Annual
								</span>
								{#if pendingPlanChange.targetAnnualSavings > 0}
									<span
										class="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
									>
										save ${pendingPlanChange.targetAnnualSavings}
									</span>
								{/if}
							</div>
							<span class="text-base font-semibold text-foreground">
								${pendingPlanChange.targetAnnualMonthly}/mo
							</span>
							<span class="text-xs text-muted-foreground">
								${pendingPlanChange.targetAnnualTotal}/yr
							</span>
						</button>
					</div>
				{/if}

				<!-- Billing summary -->
				<div class="space-y-1.5 rounded-xl border bg-muted/50 px-4 py-3">
					<p class="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
						Billing summary
					</p>
					<div class="flex items-center justify-between text-sm text-muted-foreground">
						<span>Current plan</span>
						<span class="font-medium">
							{tierInfo.name}
							{currentIsAnnual && 'annualTotal' in tierInfo
								? `· $${(tierInfo as { annualTotal: number }).annualTotal}/yr`
								: `· $${tierInfo.price}/mo`}
						</span>
					</div>
					<div class="flex items-center justify-between text-sm text-foreground">
						<span>New plan</span>
						<span class="font-medium">
							{pendingPlanChange.targetTierName}
							{#if targetIsAnnual}
								· ${pendingPlanChange.targetAnnualTotal}/yr
								<span class="text-xs text-muted-foreground"
									>(${pendingPlanChange.targetAnnualMonthly}/mo)</span
								>
							{:else}
								· ${pendingPlanChange.targetMonthlyPrice}/mo
							{/if}
						</span>
					</div>
					<div
						class="flex items-center justify-between border-t pt-2 text-sm font-semibold text-foreground"
					>
						<span>
							{#if isUpgrade}
								{data.hasStripeSubscription ? 'Charged today' : 'Due at checkout'}
							{:else}
								Effective immediately
							{/if}
						</span>
						<span>
							{#if isUpgrade}
								{#if data.hasStripeSubscription}
									~{fmtMoney(nextInvoiceEstimate)}
								{:else}
									{targetIsAnnual
										? `$${pendingPlanChange.targetAnnualTotal}/yr`
										: `$${pendingPlanChange.targetMonthlyPrice}/mo`}
								{/if}
							{:else}
								{targetIsAnnual
									? `$${pendingPlanChange.targetAnnualTotal}/yr`
									: `$${pendingPlanChange.targetMonthlyPrice}/mo`}
							{/if}
						</span>
					</div>
				</div>

				<!-- Proration note -->
				<Alert severity="info" dismissible={false} autofade={0}>
					{#if isUpgrade}
						{#if !data.hasStripeSubscription}
							Your card is charged when you complete the next step. You can choose a different
							interval or go back at any time.
						{:else}
							Stripe credits the unused portion of your current plan and bills the new plan's
							prorated cost to your card on file today. Access to {pendingPlanChange.targetTierName} starts
							immediately.
						{/if}
					{:else if pendingPlanChange.targetTierKey === 'starter'}
						Your current plan stays active until the end of your billing cycle. After that, you're
						moved to Starter. No refund — you keep paid features for the time you've already paid
						for.
					{:else}
						Your subscription moves to {pendingPlanChange.targetTierName} pricing immediately. Stripe
						credits the unused portion of your current plan to your account.
					{/if}
				</Alert>

				<!-- Trust footer -->
				<p class="text-center text-xs text-muted-foreground">
					Secure payment by Stripe · Cancel anytime · Receipt sent to your email
				</p>
			</div>

			<DialogFooter class="flex gap-3 sm:flex-row">
				<Button
					type="button"
					onclick={closePlanChangeModal}
					variant="outline"
					class="flex-1"
					disabled={submittingAction !== null}
				>
					{isUpgrade ? 'Cancel' : 'Keep current plan'}
				</Button>
				<form
					method="post"
					action={isUpgrade ? '?/upgrade' : '?/downgrade'}
					use:enhance={() => {
						submittingAction = 'planChange';
						billingError = null;
						return async ({ result, update }) => {
							const wasUpgrade = isUpgrade;
							pendingPlanChange = null;
							if (result.type === 'redirect') {
								window.location.href = result.location;
								return;
							} else if (result.type === 'success') {
								const flag = wasUpgrade ? 'upgraded=1' : 'downgraded=1';
								window.location.href = resolve('/dashboard/account/billing') + `?${flag}`;
								return;
							}
							submittingAction = null;
							handleBillingResult(result as BillingResult);
							await update({ invalidateAll: true });
						};
					}}
					class="flex-1"
				>
					<input type="hidden" name="planKey" value={pendingPlanChange.targetTierKey} />
					<input type="hidden" name="interval" value={pendingPlanChange.selectedInterval} />
					<Button
						type="submit"
						variant={isUpgrade ? 'default' : 'destructive'}
						class="w-full {isUpgrade
							? ''
							: 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700'}"
						disabled={submittingAction !== null}
					>
						{#if submittingAction === 'planChange'}
							<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
							{isUpgrade ? 'Upgrading...' : 'Downgrading...'}
						{:else if isUpgrade}
							{data.hasStripeSubscription ? 'Confirm upgrade' : 'Continue to payment →'}
						{:else}
							Confirm downgrade
						{/if}
					</Button>
				</form>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}

<!-- Refund account credit dialog -->
{#if pendingRefundCreditOpen}
	<Dialog
		open={pendingRefundCreditOpen}
		onOpenChange={(open) => {
			if (!open) pendingRefundCreditOpen = false;
		}}
	>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle>Refund credit to card</DialogTitle>
				<DialogDescription class="text-sm text-muted-foreground">
					Convert your account credit back to cash on your card.
				</DialogDescription>
			</DialogHeader>
			<div class="flex flex-col gap-3">
				<div class="rounded-lg border border-border bg-muted/30 p-4">
					<p class="text-sm font-medium text-foreground">
						Refund <strong class="text-success"
							>${(data.accountCreditCents / 100).toFixed(2)}</strong
						>
						{#if data.defaultPaymentMethod}
							to {data.defaultPaymentMethod.brand} ···· {data.defaultPaymentMethod.last4}
						{:else}
							to your original payment method
						{/if}?
					</p>
					<p class="mt-2 text-xs leading-relaxed text-muted-foreground">
						Stripe routes the refund through your original payment method. If that card has been
						replaced or expired, your bank will typically redirect it to your new card or account.
						Allow 5–10 business days.
					</p>
				</div>
				<p class="text-center text-xs text-muted-foreground">
					This clears your account credit. Future invoices will be charged normally.
				</p>
			</div>
			<DialogFooter class="flex gap-3 sm:flex-row">
				<Button
					type="button"
					onclick={() => (pendingRefundCreditOpen = false)}
					variant="outline"
					class="flex-1"
					disabled={submittingAction !== null}
				>
					Cancel
				</Button>
				<form
					method="post"
					action="?/refundAccountCredit"
					use:enhance={() => {
						submittingAction = 'refundCredit';
						billingError = null;
						return async ({ result, update }) => {
							pendingRefundCreditOpen = false;
							if (result.type === 'success') {
								window.location.href = resolve('/dashboard/account/billing') + '?credit_refunded=1';
								return;
							}
							submittingAction = null;
							handleBillingResult(result as BillingResult);
							await update({ invalidateAll: true });
						};
					}}
					class="flex-1"
				>
					<Button type="submit" class="w-full" disabled={submittingAction !== null}>
						{#if submittingAction === 'refundCredit'}
							<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
							Refunding...
						{:else}
							Refund ${(data.accountCreditCents / 100).toFixed(2)}
						{/if}
					</Button>
				</form>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}
