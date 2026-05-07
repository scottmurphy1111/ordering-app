<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Icon from '@iconify/svelte';
	import type { PageData, ActionData } from './$types';
	import { untrack } from 'svelte';
	import {
		TIERS,
		ADDONS,
		getTier,
		hasAddon,
		cancelImmediateRefundPreview,
		type BillingInterval,
		type AddonItem
	} from '$lib/billing';
	import { confirmDialog } from '$lib/confirm.svelte';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
	import { Card, CardHeader, CardTitle, CardAction, CardContent } from '$lib/components/ui/card';
	import { Alert } from '$lib/components/ui/alert';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter
	} from '$lib/components/ui/dialog';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const currentTierKey = $derived(data.subscriptionTier ?? 'starter');
	const tierInfo = $derived(getTier(currentTierKey));
	const itemCount = $derived(data.itemCount ?? 0);
	const activeAddons = $derived(data.addons ?? []);
	const isPaidPlan = $derived(currentTierKey !== 'starter');
	const isCancelScheduled = $derived(!!data.subscriptionEndsAt);
	const isUpgraded = $derived(page.url.searchParams.get('upgraded') === '1');
	const isDowngraded = $derived(page.url.searchParams.get('downgraded') === '1');
	const isReactivated = $derived(page.url.searchParams.get('reactivated') === '1');
	const isRefunded = $derived(page.url.searchParams.get('refunded') === '1');
	const isPausedSuccess = $derived(page.url.searchParams.get('paused') === '1');
	const isResumed = $derived(page.url.searchParams.get('resumed') === '1');
	const isPaused = $derived(!!data.subscriptionPausedAt);

	const itemLimit = $derived(tierInfo.itemLimit);
	const usagePct = $derived(itemLimit ? Math.min(100, (itemCount / itemLimit) * 100) : 0);
	const atLimit = $derived(itemLimit !== null && itemCount >= itemLimit);
	const nearLimit = $derived(itemLimit !== null && itemCount >= itemLimit * 0.7 && !atLimit);

	const addonMonthlyTotal = $derived(
		ADDONS.filter((a) => hasAddon(activeAddons, a.key)).reduce((s, a) => s + a.price, 0)
	);
	const currentMonthly = $derived(tierInfo.price + addonMonthlyTotal);

	// Per-card interval selection. Defaults to vendor's current billing interval
	// so comparisons start at the cadence they already use.
	let cardIntervals = $state<Record<string, BillingInterval>>(
		untrack(() => {
			const initial = data.billingInterval ?? 'monthly';
			return { market: initial, pro: initial };
		})
	);

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

	function openIntervalSwitchModal(target: 'monthly' | 'annual') {
		pendingIntervalSwitch = target;
	}

	function closeIntervalSwitchModal() {
		pendingIntervalSwitch = null;
	}

	// --- Pause modal ---
	type PauseDuration = '30' | '60' | '90' | 'custom';
	let pendingPauseOpen = $state(false);
	let pauseDuration = $state<PauseDuration>('30');
	let pauseCustomDate = $state('');

	function todayPlusDays(n: number): string {
		return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
	}

	function computePauseDate(): string {
		if (pauseDuration === 'custom') return pauseCustomDate;
		return todayPlusDays(parseInt(pauseDuration, 10));
	}

	function closePauseModal() {
		pendingPauseOpen = false;
		pauseDuration = '30';
		pauseCustomDate = '';
	}

	const minPauseDate = $derived(todayPlusDays(1));
	const maxPauseDate = $derived(todayPlusDays(90));

	// --- Tier upgrade confirmation modal (paid → paid tier change) ---
	type PendingUpgrade = {
		targetTierKey: string;
		targetTierName: string;
		targetMonthlyPrice: number;
		targetAnnualMonthly: number;
		targetAnnualTotal: number;
		targetInterval: BillingInterval;
	};
	let pendingUpgrade = $state<PendingUpgrade | null>(null);

	function openUpgradeModal(tier: (typeof TIERS)[number], interval: BillingInterval) {
		// Only for paid → paid transitions. Free Starter upgrades go straight
		// through to embedded checkout via the form submit (no modal).
		pendingUpgrade = {
			targetTierKey: tier.key,
			targetTierName: tier.name,
			targetMonthlyPrice: tier.price,
			targetAnnualMonthly:
				'annualMonthly' in tier ? (tier as { annualMonthly: number }).annualMonthly : 0,
			targetAnnualTotal: 'annualTotal' in tier ? (tier as { annualTotal: number }).annualTotal : 0,
			targetInterval: interval
		};
	}

	function closeUpgradeModal() {
		pendingUpgrade = null;
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

	{#if isUpgraded}
		<Alert severity="success" class="mb-4"
			>Your plan has been upgraded. Welcome to {tierInfo.name}!</Alert
		>
	{/if}
	{#if isReactivated}
		<Alert severity="success" class="mb-4">
			Cancellation reversed. Your {tierInfo.name} plan will continue.
		</Alert>
	{/if}
	{#if isRefunded}
		<Alert severity="success" class="mb-4">
			Your annual subscription has been cancelled and a prorated refund has been issued. The refund
			will appear on your original payment method within 5–10 business days.
		</Alert>
	{/if}
	{#if isPausedSuccess}
		<Alert severity="success" class="mb-4">
			Your subscription has been paused. Billing will resume automatically on
			{data.pauseUntil ? fmtDate(data.pauseUntil) : 'your chosen date'}.
		</Alert>
	{/if}
	{#if isResumed}
		<Alert severity="success" class="mb-4">
			Your subscription has resumed. Normal billing is now active.
		</Alert>
	{/if}

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

	{#if isDowngraded && !isCancelScheduled}
		<Alert severity="info" class="mb-4">Your plan has been changed to {tierInfo.name}.</Alert>
	{/if}
	{#if form?.error}
		<Alert severity="error" class="mb-4">{form.error}</Alert>
	{/if}

	<!-- Current plan -->
	<Card class="mb-8 shadow-sm">
		<CardHeader class="border-b">
			<CardTitle>Current plan</CardTitle>
			<CardAction>
				{#if data.hasStripeCustomer}
					<div class="flex items-center gap-2">
						<Button
							href={resolve('/dashboard/account/billing/payment-methods')}
							variant="outline"
							class="gap-1.5"
						>
							<Icon icon="mdi:credit-card-outline" class="h-3.5 w-3.5" />
							Payment methods
						</Button>
						<Button
							href={resolve('/dashboard/account/billing/invoices')}
							variant="outline"
							class="gap-1.5"
						>
							<Icon icon="mdi:file-document-outline" class="h-3.5 w-3.5" />
							Invoices
						</Button>
					</div>
				{/if}
			</CardAction>
		</CardHeader>
		<CardContent>
			<div class="flex flex-wrap items-start justify-between gap-4">
				<div>
					<div class="flex flex-wrap items-center gap-2">
						<span class="text-xl font-bold text-foreground">{tierInfo.name}</span>
						<Badge class={statusColors[data.subscriptionStatus ?? 'active'] ?? statusColors.active}>
							{data.subscriptionStatus === 'past_due'
								? 'Payment past due'
								: data.subscriptionStatus === 'cancelled'
									? 'Cancelled'
									: 'Active'}
						</Badge>
						{#if isPaidPlan}
							<Badge class="bg-muted text-muted-foreground">
								{data.billingInterval === 'annual' ? 'Annual' : 'Monthly'}
							</Badge>
						{/if}
					</div>
					<div class="mt-0.5 flex flex-wrap items-center gap-2">
						<p class="text-sm text-muted-foreground">
							{#if tierInfo.price === 0}
								Free
							{:else if data.billingInterval === 'annual' && tierAnnualInfo}
								${tierAnnualInfo.monthly}/mo · ${tierAnnualInfo.total}/yr
							{:else}
								${tierInfo.price}/month
							{/if}
							{#if addonMonthlyTotal > 0}
								<span class="text-muted-foreground">+ ${addonMonthlyTotal}/mo add-ons</span>
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
					{#if isCancelScheduled && data.subscriptionEndsAt}
						<p class="mt-0.5 text-xs font-medium text-amber-700">
							Plan ends {fmtDate(data.subscriptionEndsAt)}
						</p>
					{/if}
				</div>
				{#if data.subscriptionStatus === 'past_due'}
					<Button
						href={resolve('/dashboard/account/billing/payment-methods')}
						class="gap-1.5 border border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100"
					>
						<Icon icon="mdi:alert-outline" class="h-3.5 w-3.5" /> Update payment method
					</Button>
				{/if}
			</div>

			<!-- Action row: switch interval, pause/resume, reactivate. Single horizontal
			     container; conditionals render buttons directly into it. Wraps on narrow viewports. -->
			<div class="mt-5 flex flex-wrap items-center gap-3">
				{#if isPaidPlan && data.hasStripeSubscription && !isCancelScheduled}
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
				{/if}

				{#if isPaused}
					<form
						method="post"
						action="?/resumeSubscription"
						use:enhance={() =>
							async ({ result, update }) => {
								if (result.type === 'redirect') {
									window.location.href = result.location;
								} else {
									await update({ invalidateAll: true });
								}
							}}
					>
						<Button
							type="submit"
							variant="outline"
							class="gap-1.5 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
						>
							<Icon icon="mdi:play-circle-outline" class="h-3.5 w-3.5" />
							Resume now
						</Button>
					</form>
				{:else if isPaidPlan && data.hasStripeSubscription && !isCancelScheduled && data.subscriptionStatus !== 'past_due'}
					<Button
						type="button"
						variant="outline"
						class="gap-1.5"
						onclick={() => (pendingPauseOpen = true)}
					>
						<Icon icon="mdi:pause-circle-outline" class="h-3.5 w-3.5" />
						Pause billing
					</Button>
				{/if}

				{#if isCancelScheduled && data.hasStripeSubscription && !data.subscriptionRefundedAt}
					<form
						method="post"
						action="?/reactivate"
						use:enhance={() =>
							async ({ result, update }) => {
								if (result.type === 'success') {
									window.location.href = resolve('/dashboard/account/billing') + '?reactivated=1';
								} else {
									await update({ invalidateAll: true });
								}
							}}
					>
						<Button
							type="submit"
							variant="outline"
							class="gap-1.5 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 hover:text-amber-900"
						>
							<Icon icon="mdi:undo-variant" class="h-3.5 w-3.5" />
							Don't cancel — keep {tierInfo.name}
						</Button>
					</form>
				{/if}
			</div>

			<!-- Item usage -->
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
		</CardContent>
	</Card>

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
							{@const cardInterval = cardIntervals[tier.key] ?? 'monthly'}
							{@const showToggle = !isCurrent && tier.price > 0}
							<div class="mb-4">
								<p class="font-semibold text-foreground">{tier.name}</p>
								{#if showToggle}
									<div class="mt-2">
										<Tabs
											value={cardInterval}
											onValueChange={(v) => (cardIntervals[tier.key] = v as BillingInterval)}
										>
											<TabsList>
												<TabsTrigger value="monthly">Monthly</TabsTrigger>
												<TabsTrigger value="annual">
													Annual
													{#if 'annualSavings' in tier}
														<span
															class="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary"
															>−${(tier as { annualSavings: number }).annualSavings}</span
														>
													{/if}
												</TabsTrigger>
											</TabsList>
										</Tabs>
									</div>
								{/if}
								{#if tier.price === 0}
									<p class="mt-0.5 text-2xl font-bold text-foreground">Free</p>
								{:else}
									{@const displayPrice =
										cardInterval === 'annual' && 'annualMonthly' in tier
											? (tier as { annualMonthly: number }).annualMonthly
											: tier.price}
									<p class="mt-1 text-2xl font-bold text-foreground">
										${displayPrice}<span class="text-sm font-normal text-muted-foreground">/mo</span
										>
									</p>
									{#if cardInterval === 'annual' && 'annualTotal' in tier}
										<p class="mt-0.5 text-xs font-medium text-primary">
											Billed ${(tier as { annualTotal: number }).annualTotal}/yr · save ${(
												tier as { annualSavings: number }
											).annualSavings}
										</p>
									{/if}
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
								{#if isPaidPlan && data.hasStripeSubscription}
									<Button
										type="button"
										variant="default"
										class="w-full"
										onclick={() => openUpgradeModal(tier, cardIntervals[tier.key] ?? 'monthly')}
									>
										Upgrade to {tier.name}
										{#if cardIntervals[tier.key] === 'annual'}
											— Annual{/if}
									</Button>
								{:else}
									<form method="post" action="?/upgrade" use:enhance>
										<input type="hidden" name="planKey" value={tier.key} />
										<input
											type="hidden"
											name="interval"
											value={cardIntervals[tier.key] ?? 'monthly'}
										/>
										<Button type="submit" variant="default" class="w-full">
											Upgrade to {tier.name}
											{#if cardIntervals[tier.key] === 'annual'}
												— Annual{/if}
										</Button>
									</form>
								{/if}
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
								{@const endsAtStr = data.subscriptionEndsAt
									? fmtDate(data.subscriptionEndsAt)
									: data.nextBillingDate
										? fmtDate(data.nextBillingDate)
										: 'the end of your billing cycle'}
								{@const downgradeMsg = isCancellation
									? activeAddons.length > 0
										? `Downgrade to Starter? Your subscription will continue until ${endsAtStr}. After that, you'll be moved to Starter and your add-ons (${formatAddonList(activeAddons)}) will end with your plan.`
										: `Downgrade to Starter? Your subscription will continue until ${endsAtStr}. After that, you'll be moved to Starter.`
									: `Downgrade to ${tier.name}? Your subscription will be moved to ${tier.name} pricing on the next billing cycle (Stripe credits the unused portion). Add-ons stay active.`}
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
									<form
										method="post"
										action="?/downgrade"
										use:enhance={() =>
											async ({ result, update }) => {
												if (result.type === 'success') {
													window.location.href =
														resolve('/dashboard/account/billing') + '?downgraded=1';
												} else {
													await update({ invalidateAll: true });
												}
											}}
									>
										<input type="hidden" name="planKey" value={tier.key} />
										<input
											type="hidden"
											name="interval"
											value={cardIntervals[tier.key] ?? 'monthly'}
										/>
										<Button
											type="submit"
											onclick={async (e) => {
												e.preventDefault();
												const form = (e.currentTarget as HTMLButtonElement).closest(
													'form'
												) as HTMLFormElement;
												if (
													await confirmDialog(downgradeMsg, {
														title: `Downgrade to ${tier.name}`,
														confirmLabel: 'Downgrade',
														cancelLabel: 'Keep current plan',
														danger: true
													})
												)
													form.requestSubmit();
											}}
											variant="outline"
											class="w-full text-muted-foreground"
										>
											Downgrade to {tier.name}
										</Button>
									</form>
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
			<Alert severity="warning" class="mb-4"
				>Add-ons require a Market or Pro plan. Upgrade above to unlock.</Alert
			>
		{:else if !data.hasStripeSubscription}
			<Alert severity="warning" class="mb-4">Complete your plan upgrade to activate add-ons.</Alert>
		{:else}
			<p class="mb-4 text-sm text-muted-foreground">
				Activate or deactivate features. Changes are prorated on your next invoice.
			</p>
		{/if}

		<div class="grid gap-4 sm:grid-cols-2">
			{#each ADDONS as addon (addon.key)}
				{@const isActive = hasAddon(activeAddons, addon.key)}
				{@const canToggle = isPaidPlan && data.hasStripeSubscription && !isPaused}
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
									<p class="text-xs text-muted-foreground">${addon.price}/mo</p>
								</div>
							</div>
							{#if isActive}
								<Badge class="shrink-0 bg-success/10 text-success">Active</Badge>
							{/if}
						</div>
						<p class="mb-3 text-sm text-muted-foreground">{addon.description}</p>
						{#if canActivate && !isActive}
							<Button
								type="button"
								onclick={() => openModal(addon, 'activate')}
								variant="default"
								class="w-full"
							>
								Activate
							</Button>
						{/if}
					</div>
					{#if canToggle && isActive}
						<div class="flex items-center justify-end gap-3 border-t border-gray-100 px-4 py-2">
							<button
								type="button"
								onclick={() => openModal(addon, 'deactivate')}
								class="text-sm font-medium text-red-500 transition-colors hover:text-red-600"
							>
								Deactivate
							</button>
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
				<Button type="button" onclick={closeModal} variant="outline" class="flex-1">Cancel</Button>
				<form
					method="post"
					action={isActivate ? '?/activateAddon' : '?/deactivateAddon'}
					use:enhance={() =>
						({ update }) => {
							pendingAddon = null;
							update();
						}}
					class="flex-1"
				>
					<input type="hidden" name="key" value={pendingAddon.key} />
					<Button type="submit" variant={isActivate ? 'default' : 'destructive'} class="w-full">
						{#if isActivate}
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
					class="flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors {cancelChoice ===
					'period_end'
						? 'border-primary bg-primary/5'
						: 'border-gray-200 hover:border-gray-300'}"
				>
					<input
						type="radio"
						name="cancelChoice"
						value="period_end"
						class="sr-only"
						checked={cancelChoice === 'period_end'}
						onchange={() => (cancelChoice = 'period_end')}
					/>
					<div
						class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 {cancelChoice ===
						'period_end'
							? 'border-primary'
							: 'border-muted-foreground/50'}"
					>
						{#if cancelChoice === 'period_end'}
							<div class="h-2 w-2 rounded-full bg-primary"></div>
						{/if}
					</div>
					<div>
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
				{#if cancelPreview && cancelPreview.unusedMonths > 0}
					<label
						class="flex cursor-pointer gap-3 rounded-xl border p-4 transition-colors {cancelChoice ===
						'immediate_refund'
							? 'border-primary bg-primary/5'
							: 'border-gray-200 hover:border-gray-300'}"
					>
						<input
							type="radio"
							name="cancelChoice"
							value="immediate_refund"
							class="sr-only"
							checked={cancelChoice === 'immediate_refund'}
							onchange={() => (cancelChoice = 'immediate_refund')}
						/>
						<div
							class="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 {cancelChoice ===
							'immediate_refund'
								? 'border-primary'
								: 'border-muted-foreground/50'}"
						>
							{#if cancelChoice === 'immediate_refund'}
								<div class="h-2 w-2 rounded-full bg-primary"></div>
							{/if}
						</div>
						<div>
							<p class="text-sm font-medium text-foreground">Cancel now — get a refund</p>
							<p class="mt-0.5 text-xs text-muted-foreground">
								Cancel immediately and receive a prorated refund of
								<strong class="font-semibold text-foreground"
									>{fmtMoney(cancelPreview.refundCents / 100)}</strong
								>
								for {cancelPreview.unusedMonths}
								unused {cancelPreview.unusedMonths === 1 ? 'month' : 'months'}. Access ends today.
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
				>
					Keep plan
				</Button>
				<form
					method="post"
					action={cancelChoice === 'immediate_refund' ? '?/cancelImmediate' : '?/downgrade'}
					use:enhance={() => {
						const wasImmediate = cancelChoice === 'immediate_refund';
						return async ({ result, update }) => {
							pendingCancelOpen = false;
							if (result.type === 'success') {
								window.location.href =
									resolve('/dashboard/account/billing') +
									(wasImmediate ? '?refunded=1' : '?downgraded=1');
							} else {
								await update({ invalidateAll: true });
							}
						};
					}}
					class="flex-1"
				>
					<input type="hidden" name="planKey" value="starter" />
					<Button type="submit" variant="destructive" class="w-full">
						{cancelChoice === 'immediate_refund' && cancelPreview
							? `Cancel & refund ${fmtMoney(cancelPreview.refundCents / 100)}`
							: 'Downgrade to Starter'}
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
						You'll be charged <strong>~{fmtMoney(todayChargeEstimate)}</strong> today (annual price
						minus credit for unused days in your current cycle). Your subscription renews next on {fmtDate(
							new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
						)}.
					</Alert>
				{:else}
					<Alert severity="info" dismissible={false} autofade={0}>
						You'll receive a prorated credit of <strong>~{fmtMoney(todayCreditEstimate)}</strong> on your
						next invoice. Monthly billing starts on your next cycle.
					</Alert>
				{/if}

				<!-- Trust footer -->
				<p class="text-center text-xs text-muted-foreground">
					Secure payment by Stripe · Cancel anytime · Receipt sent to your email
				</p>
			</div>

			<DialogFooter class="flex gap-3 sm:flex-row">
				<Button type="button" onclick={closeIntervalSwitchModal} variant="outline" class="flex-1">
					Cancel
				</Button>
				<form
					method="post"
					action="?/switchInterval"
					use:enhance={() =>
						({ update }) => {
							pendingIntervalSwitch = null;
							update({ invalidateAll: true });
						}}
					class="flex-1"
				>
					<input type="hidden" name="interval" value={target} />
					<Button type="submit" variant="default" class="w-full">
						{#if switchingToAnnual}
							Confirm — {fmtMoney(todayChargeEstimate)} today
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
					{#each [{ value: '30', label: '30 days' }, { value: '60', label: '60 days' }, { value: '90', label: '90 days' }] as opt (opt.value)}
						<button
							type="button"
							onclick={() => {
								pauseDuration = opt.value as typeof pauseDuration;
							}}
							class="rounded-lg border px-3 py-2 text-sm transition-colors {pauseDuration ===
							opt.value
								? 'border-primary bg-primary/5 font-medium text-primary'
								: 'border-gray-200 text-muted-foreground hover:border-gray-300'}"
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
						? 'border-primary bg-primary/5 font-medium text-primary'
						: 'border-gray-200 text-muted-foreground hover:border-gray-300'}"
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
							class="h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
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
					Pause duration cannot exceed 90 days.
				</p>
			</div>

			<DialogFooter class="flex gap-3 sm:flex-row">
				<Button type="button" onclick={closePauseModal} variant="outline" class="flex-1">
					Cancel
				</Button>
				<form
					method="post"
					action="?/pauseSubscription"
					use:enhance={() =>
						async ({ result, update }) => {
							closePauseModal();
							if (result.type === 'redirect') {
								window.location.href = result.location;
							} else {
								await update({ invalidateAll: true });
							}
						}}
					class="flex-1"
				>
					<input type="hidden" name="pauseUntilDate" value={computePauseDate()} />
					<Button
						type="submit"
						variant="default"
						class="w-full"
						disabled={pauseDuration === 'custom' && !pauseCustomDate}
					>
						Pause until {pauseDuration !== 'custom'
							? fmtDate(computePauseDate())
							: pauseCustomDate
								? fmtDate(pauseCustomDate)
								: '…'}
					</Button>
				</form>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}

<!-- Upgrade confirmation modal (paid → paid tier change) -->
{#if pendingUpgrade}
	{@const targetIsAnnual = pendingUpgrade.targetInterval === 'annual'}
	{@const currentIsAnnual = data.billingInterval === 'annual'}

	{@const newTierCost = targetIsAnnual
		? pendingUpgrade.targetAnnualTotal
		: calcUnusedMonthlyCredit(pendingUpgrade.targetMonthlyPrice)}

	{@const currentCredit = currentIsAnnual
		? calcUnusedAnnualCredit(
				'annualTotal' in tierInfo ? (tierInfo as { annualTotal: number }).annualTotal : 0
			)
		: calcUnusedMonthlyCredit(tierInfo.price)}

	{@const nextInvoiceEstimate = Math.max(0, newTierCost - currentCredit)}

	<Dialog
		open={!!pendingUpgrade}
		onOpenChange={(open) => {
			if (!open) closeUpgradeModal();
		}}
	>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle>
					Upgrade to {pendingUpgrade.targetTierName}{targetIsAnnual ? ' — Annual' : ''}
				</DialogTitle>
				<DialogDescription class="text-sm text-muted-foreground">
					You'll get {pendingUpgrade.targetTierName} access right away. The prorated charge appears on
					your next invoice.
				</DialogDescription>
			</DialogHeader>

			<div class="flex flex-col gap-3">
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
							{pendingUpgrade.targetTierName}
							{#if targetIsAnnual}
								· ${pendingUpgrade.targetAnnualTotal}/yr
								<span class="text-xs text-muted-foreground"
									>(${pendingUpgrade.targetAnnualMonthly}/mo)</span
								>
							{:else}
								· ${pendingUpgrade.targetMonthlyPrice}/mo
							{/if}
						</span>
					</div>
					<div
						class="flex items-center justify-between border-t pt-2 text-sm font-semibold text-foreground"
					>
						<span>Added to next invoice</span>
						<span>~{fmtMoney(nextInvoiceEstimate)}</span>
					</div>
				</div>

				<!-- Proration note -->
				<Alert severity="info" dismissible={false} autofade={0}>
					Stripe credits the unused portion of your current plan and adds the new plan's prorated
					cost to your next invoice. Your access to {pendingUpgrade.targetTierName} starts immediately.
				</Alert>

				<!-- Trust footer -->
				<p class="text-center text-xs text-muted-foreground">
					Secure payment by Stripe · Cancel anytime · Receipt sent to your email
				</p>
			</div>

			<DialogFooter class="flex gap-3 sm:flex-row">
				<Button type="button" onclick={closeUpgradeModal} variant="outline" class="flex-1">
					Cancel
				</Button>
				<form
					method="post"
					action="?/upgrade"
					use:enhance={() =>
						async ({ result, update }) => {
							pendingUpgrade = null;
							if (result.type === 'success') {
								window.location.href = resolve('/dashboard/account/billing') + '?upgraded=1';
							} else {
								await update({ invalidateAll: true });
							}
						}}
					class="flex-1"
				>
					<input type="hidden" name="planKey" value={pendingUpgrade.targetTierKey} />
					<input type="hidden" name="interval" value={pendingUpgrade.targetInterval} />
					<Button type="submit" variant="default" class="w-full">Confirm upgrade</Button>
				</form>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}
