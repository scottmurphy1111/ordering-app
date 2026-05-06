<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Icon from '@iconify/svelte';
	import type { PageData, ActionData } from './$types';
	import { untrack } from 'svelte';
	import {
		TIERS,
		ADDONS,
		ANNUAL_ADDON_PRICING,
		getTier,
		hasAddon,
		type BillingInterval
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

	// --- Addon confirmation modal ---
	type PendingAddon = {
		key: string;
		name: string;
		price: number;
		action: 'activate' | 'deactivate';
		supportsAnnual: boolean;
	};
	let pendingAddon = $state<PendingAddon | null>(null);
	let addonInterval = $state<BillingInterval>('monthly');

	const addonAnnualPricing = $derived(
		pendingAddon?.supportsAnnual
			? ANNUAL_ADDON_PRICING[pendingAddon.key as keyof typeof ANNUAL_ADDON_PRICING]
			: null
	);
	const addonEffectiveMonthly = $derived(
		addonInterval === 'annual' && addonAnnualPricing
			? addonAnnualPricing.monthly
			: (pendingAddon?.price ?? 0)
	);
	const addonEffectiveTotal = $derived(
		addonInterval === 'annual' && addonAnnualPricing
			? addonAnnualPricing.total
			: (pendingAddon?.price ?? 0)
	);

	function openModal(addon: (typeof ADDONS)[number], action: 'activate' | 'deactivate') {
		pendingAddon = {
			key: addon.key,
			name: addon.name,
			price: addon.price,
			action,
			supportsAnnual: addon.key in ANNUAL_ADDON_PRICING
		};
		addonInterval = 'monthly';
	}

	function closeModal() {
		pendingAddon = null;
		addonInterval = 'monthly';
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
	{#if isDowngraded && isCancelScheduled && data.subscriptionEndsAt}
		<Alert severity="info" class="mb-4">
			Your subscription will end on {fmtDate(data.subscriptionEndsAt)}. You'll keep paid features
			until then. Use Manage billing to reverse if you change your mind.
		</Alert>
	{:else if isDowngraded}
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
					<form method="post" action="?/openPortal" use:enhance>
						<Button type="submit" variant="outline" class="gap-1.5">
							<Icon icon="mdi:cog-outline" class="h-3.5 w-3.5" /> Manage billing
						</Button>
					</form>
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
					<p class="mt-0.5 text-sm text-muted-foreground">
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
					{#if isCancelScheduled && data.subscriptionEndsAt}
						<p class="mt-0.5 text-xs font-medium text-amber-700">
							Plan ends {fmtDate(data.subscriptionEndsAt)}
						</p>
					{:else if data.nextBillingDate && isPaidPlan}
						<p class="mt-0.5 text-xs text-muted-foreground">
							Renews {fmtDate(data.nextBillingDate)}
						</p>
					{/if}
				</div>
				{#if data.subscriptionStatus === 'past_due'}
					<form method="post" action="?/openPortal" use:enhance>
						<Button
							type="submit"
							class="gap-1.5 border border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100"
						>
							<Icon icon="mdi:alert-outline" class="h-3.5 w-3.5" /> Update payment method
						</Button>
					</form>
				{/if}
			</div>

			<!-- Switch billing interval -->
			{#if isPaidPlan && data.hasStripeSubscription && !isCancelScheduled}
				<div class="mt-4 flex items-center gap-3">
					{#if data.billingInterval === 'monthly'}
						<form
							method="post"
							action="?/switchInterval"
							use:enhance={() =>
								({ update }) =>
									update({ invalidateAll: true })}
						>
							<input type="hidden" name="interval" value="annual" />
							<Button
								type="submit"
								variant="outline"
								class="gap-1.5 border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
							>
								<Icon icon="mdi:arrow-up-circle-outline" class="h-3.5 w-3.5" />
								Switch to annual — save ${tierAnnualInfo?.savings ?? 0}/yr
							</Button>
						</form>
					{:else}
						<form
							method="post"
							action="?/switchInterval"
							use:enhance={() =>
								({ update }) =>
									update({ invalidateAll: true })}
						>
							<input type="hidden" name="interval" value="monthly" />
							<Button type="submit" variant="outline" class="gap-1.5">Switch to monthly</Button>
						</form>
					{/if}
				</div>
			{/if}

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
							{:else if isCancelScheduled && tier.key === 'starter'}
								<!-- Already scheduled to end at period — hide redundant downgrade button. -->
								<Button
									disabled
									variant="outline"
									class="w-full cursor-default text-muted-foreground"
								>
									Ends {data.subscriptionEndsAt ? fmtDate(data.subscriptionEndsAt) : 'soon'}
								</Button>
							{:else}
								{@const isCancellation = tier.key === 'starter'}
								{@const endsAtStr = data.subscriptionEndsAt
									? fmtDate(data.subscriptionEndsAt)
									: 'the end of your billing cycle'}
								{@const downgradeMsg = isCancellation
									? activeAddons.length > 0
										? `Downgrade to Starter? Your subscription will continue until ${endsAtStr}. After that, you'll be moved to Starter and active add-ons will be removed.`
										: `Downgrade to Starter? Your subscription will continue until ${endsAtStr}. After that, you'll be moved to Starter.`
									: `Downgrade to ${tier.name}? Your subscription will be moved to ${tier.name} pricing on the next billing cycle (Stripe credits the unused portion). Add-ons stay active.`}
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
			<Alert severity="warning" class="mb-4"
				>Complete your plan upgrade through Stripe to activate add-ons.</Alert
			>
		{:else}
			<p class="mb-4 text-sm text-muted-foreground">
				Activate or deactivate features. Changes are prorated on your next invoice.
			</p>
		{/if}

		<div class="grid gap-4 sm:grid-cols-2">
			{#each ADDONS as addon (addon.key)}
				{@const isActive = hasAddon(activeAddons, addon.key)}
				{@const canToggle = isPaidPlan && data.hasStripeSubscription}
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
	{@const proration = calcProration(addonEffectiveMonthly, pendingAddon.action)}
	{@const newMonthly =
		pendingAddon.action === 'activate'
			? currentMonthly + addonEffectiveMonthly
			: currentMonthly - addonEffectiveMonthly}
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
				<DialogDescription class="sr-only">Addon billing confirmation</DialogDescription>
			</DialogHeader>
			<div class="flex flex-col gap-3">
				<!-- Annual billing toggle (activate only, for supported add-ons) -->
				{#if isActivate && pendingAddon.supportsAnnual}
					<div class="flex items-center justify-between">
						<p class="text-sm text-muted-foreground">Billing cycle</p>
						<Tabs
							value={addonInterval}
							onValueChange={(v) => (addonInterval = v as BillingInterval)}
						>
							<TabsList>
								<TabsTrigger value="monthly">Monthly</TabsTrigger>
								<TabsTrigger value="annual">
									Annual
									{#if addonAnnualPricing}
										<span
											class="rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold text-primary"
										>
											Save ${addonAnnualPricing.savings}/yr
										</span>
									{/if}
								</TabsTrigger>
							</TabsList>
						</Tabs>
					</div>
				{/if}

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
						{#if isActivate && addonInterval === 'annual' && addonAnnualPricing}
							<span class="font-medium"
								>${addonAnnualPricing.total}/yr
								<span class="text-xs text-muted-foreground">(${addonAnnualPricing.monthly}/mo)</span
								></span
							>
						{:else}
							<span class="font-medium">{isActivate ? '+' : '−'}${addonEffectiveMonthly}/mo</span>
						{/if}
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
					<Alert severity="info" dismissible={false}>
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
					{#if isActivate}
						<input type="hidden" name="interval" value={addonInterval} />
					{/if}
					<Button type="submit" variant={isActivate ? 'default' : 'destructive'} class="w-full">
						{#if isActivate}
							Confirm — {fmtMoney(proration ?? addonEffectiveTotal)} today
						{:else}
							Confirm removal
						{/if}
					</Button>
				</form>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}
