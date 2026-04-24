<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Icon from '@iconify/svelte';
	import type { PageData, ActionData } from './$types';
	import { untrack } from 'svelte';
	import { TIERS, ADDONS, ANNUAL_ADDON_PRICING, getTier, hasAddon, type BillingInterval } from '$lib/billing';
	import { confirmDialog } from '$lib/confirm.svelte';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardHeader, CardTitle, CardAction, CardContent } from '$lib/components/ui/card';
	import { Tabs, TabsList, TabsTrigger } from '$lib/components/ui/tabs';
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

	// Annual billing toggle — defaults to the user's current interval
	let selectedInterval = $state<BillingInterval>(untrack(() => data.billingInterval ?? 'monthly'));
	const proTier = TIERS.find((t) => t.key === 'pro')!;
	const proDisplayPrice = $derived(
		selectedInterval === 'annual' ? proTier.annualMonthly : proTier.price
	);

	const statusColors: Record<string, string> = {
		active: 'bg-green-100 text-green-700',
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
		<a
			href={resolve('/dashboard/settings')}
			class="mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
		>
			<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Settings
		</a>
		<h1 class="text-2xl font-bold text-gray-900">Billing</h1>
		<p class="mt-0.5 text-sm text-gray-500">Manage your subscription plan and add-ons.</p>
	</div>

	{#if isUpgraded}
		<div
			class="mb-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
		>
			<Icon icon="mdi:check-circle-outline" class="h-4 w-4 shrink-0" />
			Your plan has been upgraded. Welcome to {tierInfo.name}!
		</div>
	{/if}
	{#if isDowngraded}
		<div
			class="mb-4 flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700"
		>
			<Icon icon="mdi:check-circle-outline" class="h-4 w-4 shrink-0" />
			Your plan has been changed to {tierInfo.name}.
		</div>
	{/if}
	{#if form?.error}
		<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			{form.error}
		</div>
	{/if}

	<!-- Current plan -->
	<Card class="mb-8 shadow-sm">
		<CardHeader class="border-b border-gray-100">
			<CardTitle>Current plan</CardTitle>
			<CardAction>
				{#if isPaidPlan}
					<form method="post" action="?/openPortal" use:enhance>
						<Button type="submit" variant="outline" size="sm" class="gap-1.5">
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
						<span class="text-xl font-bold text-gray-900">{tierInfo.name}</span>
						<Badge class={statusColors[data.subscriptionStatus ?? 'active'] ?? statusColors.active}>
						{data.subscriptionStatus === 'past_due'
							? 'Payment past due'
							: data.subscriptionStatus === 'cancelled'
								? 'Cancelled'
								: 'Active'}
					</Badge>
					{#if isPaidPlan}
						<Badge class="bg-gray-100 text-gray-600">
							{data.billingInterval === 'annual' ? 'Annual' : 'Monthly'}
						</Badge>
					{/if}
					</div>
					<p class="mt-0.5 text-sm text-gray-500">
						{#if tierInfo.price === 0}
							Free
						{:else if data.billingInterval === 'annual'}
							${proTier.annualMonthly}/mo · ${proTier.annualTotal}/yr
						{:else}
							${tierInfo.price}/month
						{/if}
						{#if addonMonthlyTotal > 0}
							<span class="text-gray-400">+ ${addonMonthlyTotal}/mo add-ons</span>
						{/if}
					</p>
					{#if data.nextBillingDate && isPaidPlan}
						<p class="mt-0.5 text-xs text-gray-400">
							Renews {fmtDate(data.nextBillingDate)}
						</p>
					{/if}
				</div>
				{#if data.subscriptionStatus === 'past_due'}
					<form method="post" action="?/openPortal" use:enhance>
						<Button type="submit" size="sm" class="gap-1.5 bg-amber-600 hover:bg-amber-700">
							<Icon icon="mdi:alert-outline" class="h-3.5 w-3.5" /> Update payment method
						</Button>
					</form>
				{/if}
			</div>

			<!-- Switch billing interval (Pro only) -->
			{#if isPaidPlan && data.hasStripeSubscription}
				<div class="mt-4 flex items-center gap-3">
					{#if data.billingInterval === 'monthly'}
						<form method="post" action="?/switchInterval" use:enhance={() => ({ update }) => update({ invalidateAll: true })}>
							<input type="hidden" name="interval" value="annual" />
							<Button type="submit" variant="outline" size="sm" class="gap-1.5 border-green-200 bg-green-50 text-green-700 hover:bg-green-100">
								<Icon icon="mdi:arrow-up-circle-outline" class="h-3.5 w-3.5" />
								Switch to annual — save ${proTier.annualSavings}/yr
							</Button>
						</form>
					{:else}
						<form method="post" action="?/switchInterval" use:enhance={() => ({ update }) => update({ invalidateAll: true })}>
							<input type="hidden" name="interval" value="monthly" />
							<Button type="submit" variant="outline" size="sm" class="gap-1.5">
								Switch to monthly
							</Button>
						</form>
					{/if}
				</div>
			{/if}

			<!-- Item usage -->
			{#if itemLimit !== null}
				<div class="mt-5">
					<div class="mb-1.5 flex items-center justify-between text-sm">
						<span class="font-medium text-gray-700">Menu items</span>
						<span
							class={atLimit
								? 'font-semibold text-red-600'
								: nearLimit
									? 'font-semibold text-amber-600'
									: 'text-gray-500'}
						>
							{itemCount} / {itemLimit}
						</span>
					</div>
					<div class="h-2 w-full rounded-full bg-gray-100">
						<div
							class="h-2 rounded-full transition-all {atLimit
								? 'bg-red-500'
								: nearLimit
									? 'bg-amber-400'
									: 'bg-green-500'}"
							style="width: {usagePct}%"
						></div>
					</div>
					{#if atLimit}
						<p class="mt-2 flex items-center gap-1.5 text-sm text-red-600">
							<Icon icon="mdi:alert-circle-outline" class="h-4 w-4 shrink-0" />
							Item limit reached. Upgrade to Pro to add more.
						</p>
					{:else if nearLimit}
						<p class="mt-2 flex items-center gap-1.5 text-sm text-amber-600">
							<Icon icon="mdi:alert-outline" class="h-4 w-4 shrink-0" />
							Approaching your item limit.
						</p>
					{/if}
				</div>
			{:else}
				<div class="mt-4 flex items-center gap-2 text-sm text-gray-500">
					<Icon icon="mdi:infinity" class="h-4 w-4 text-green-600" />
					Unlimited menu items
				</div>
			{/if}
		</CardContent>
	</Card>

	<!-- Plans -->
	<div class="mb-8">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="font-semibold text-gray-900">Plans</h2>
			<!-- Monthly / Annual toggle (only relevant for Starter users upgrading) -->
			{#if !isPaidPlan}
				<Tabs bind:value={selectedInterval}>
					<TabsList>
						<TabsTrigger value="monthly">Monthly</TabsTrigger>
						<TabsTrigger value="annual" class="gap-1.5">
							Annual
							<span class="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">Save $168</span>
						</TabsTrigger>
					</TabsList>
				</Tabs>
			{/if}
		</div>
		<div class="grid gap-4 sm:grid-cols-2">
			{#each TIERS as tier (tier.key)}
				{@const isCurrent = tier.key === currentTierKey}
				{@const tierIndex = TIERS.findIndex((t) => t.key === tier.key)}
				{@const currentIndex = TIERS.findIndex((t) => t.key === currentTierKey)}
				{@const isUpgrade = tierIndex > currentIndex}
				<Card
					class="relative p-5 shadow-sm {isCurrent
						? 'ring-2 ring-green-400 ring-offset-0'
						: ''}"
				>
					{#if isCurrent}
						<span
							class="absolute -top-2.5 left-4 rounded-full bg-green-500 px-2.5 py-0.5 text-xs font-semibold text-white"
							>Current</span
						>
					{/if}
					<div class="mb-4">
						<p class="font-semibold text-gray-900">{tier.name}</p>
						{#if tier.key === 'pro'}
							<p class="mt-0.5 text-2xl font-bold text-gray-900">
								${proDisplayPrice}<span class="text-sm font-normal text-gray-500">/mo</span>
							</p>
							{#if selectedInterval === 'annual'}
								<p class="mt-0.5 text-xs text-green-600 font-medium">
									Billed ${proTier.annualTotal}/yr · 2 months free
								</p>
							{/if}
						{:else}
							<p class="mt-0.5 text-2xl font-bold text-gray-900">Free</p>
						{/if}
					</div>
					<ul class="mb-5 space-y-2">
						{#each tier.features as feature (feature)}
							<li class="flex items-start gap-2 text-sm text-gray-600">
								<Icon
									icon="mdi:check-circle-outline"
									class="mt-0.5 h-4 w-4 shrink-0 text-green-500"
								/>
								{feature}
							</li>
						{/each}
					</ul>
					{#if isCurrent}
						<Button disabled variant="outline" class="w-full cursor-default text-gray-400">
							Current plan
						</Button>
					{:else if isUpgrade}
						<form method="post" action="?/upgrade" use:enhance>
							<input type="hidden" name="planKey" value={tier.key} />
							<input type="hidden" name="interval" value={selectedInterval} />
							<Button type="submit" variant="default" class="w-full">
								Upgrade to {tier.name}
								{#if selectedInterval === 'annual'} — Annual{/if}
							</Button>
						</form>
					{:else}
						{@const downgradeMsg =
							activeAddons.length > 0
								? `Downgrade to Starter? Your subscription will be cancelled immediately and all active add-ons will be removed.`
								: `Downgrade to Starter? Your subscription will be cancelled immediately and you'll lose access to Pro features.`}
						<form
							method="post"
							action="?/downgrade"
							use:enhance={() =>
								({ update }) =>
									update({ invalidateAll: true })}
						>
							<input type="hidden" name="planKey" value={tier.key} />
							<Button
								type="submit"
								onclick={async (e) => {
									e.preventDefault();
									if (
										await confirmDialog(downgradeMsg, {
											title: `Downgrade to ${tier.name}`,
											confirmLabel: 'Downgrade',
											cancelLabel: 'Keep current plan',
											danger: true
										})
									)
										(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
								}}
								variant="outline"
								class="w-full text-gray-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
							>
								Downgrade to {tier.name}
							</Button>
						</form>
					{/if}
				</Card>
			{/each}
		</div>
		<p class="mt-2 text-xs text-gray-400">
			All plans include Stripe payment processing. Stripe charges 2.9% + 30¢ per transaction — we
			never take a cut.
		</p>
	</div>

	<!-- Add-ons -->
	<div>
		<h2 class="mb-1 font-semibold text-gray-900">Add-ons</h2>
		{#if !isPaidPlan}
			<div
				class="mb-4 flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3"
			>
				<Icon icon="mdi:lock-outline" class="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
				<p class="text-sm text-amber-700">
					Add-ons require an active Pro plan. Upgrade above to unlock.
				</p>
			</div>
		{:else if !data.hasStripeSubscription}
			<div
				class="mb-4 flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3"
			>
				<Icon icon="mdi:alert-outline" class="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
				<p class="text-sm text-amber-700">
					Complete your plan upgrade through Stripe to activate add-ons.
				</p>
			</div>
		{:else}
			<p class="mb-4 text-sm text-gray-500">
				Activate or deactivate features. Changes are prorated on your next invoice.
			</p>
		{/if}

		<div class="grid gap-4 sm:grid-cols-2">
			{#each ADDONS as addon (addon.key)}
				{@const isActive = hasAddon(activeAddons, addon.key)}
				{@const canToggle = isPaidPlan && data.hasStripeSubscription}
				<Card
					class="p-5 shadow-sm {isActive
						? 'ring-green-300 bg-green-50/40'
						: ''}"
				>
					<div class="mb-3 flex items-start justify-between gap-3">
						<div class="flex items-center gap-3">
							<div
								class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl {isActive
									? 'bg-green-100'
									: 'bg-gray-100'}"
							>
								<Icon
									icon={addon.icon}
									class="h-5 w-5 {isActive ? 'text-green-700' : 'text-gray-500'}"
								/>
							</div>
							<div>
								<p class="text-sm font-semibold text-gray-900">{addon.name}</p>
								<p class="text-xs text-gray-500">${addon.price}/mo</p>
							</div>
						</div>
						{#if isActive}
							<Badge class="shrink-0 bg-green-100 text-green-700">Active</Badge>
						{/if}
					</div>
					<p class="mb-4 text-sm text-gray-500">{addon.description}</p>
					{#if isActive}
						<Button
							type="button"
							disabled={!canToggle}
							onclick={() => openModal(addon, 'deactivate')}
							variant="destructive"
							class="w-full"
						>
							Deactivate
						</Button>
					{:else}
						<Button
							type="button"
							disabled={!canToggle}
							onclick={() => openModal(addon, 'activate')}
							variant="default"
							class="w-full"
						>
							Activate — ${addon.price}/mo
						</Button>
					{/if}
				</Card>
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

	<Dialog open={!!pendingAddon} onOpenChange={(open) => { if (!open) closeModal(); }}>
		<DialogContent class="max-w-md">
			<DialogHeader>
				<DialogTitle>
					{isActivate ? 'Activate' : 'Deactivate'}
					{pendingAddon.name}?
				</DialogTitle>
				<DialogDescription class="sr-only">Addon billing confirmation</DialogDescription>
			</DialogHeader>

			<!-- Annual billing toggle (activate only, for supported add-ons) -->
			{#if isActivate && pendingAddon.supportsAnnual}
				<div class="flex items-center justify-between">
					<p class="text-sm text-gray-600">Billing cycle</p>
					<div class="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5">
						<Button
							type="button"
							onclick={() => (addonInterval = 'monthly')}
							variant="ghost"
							size="sm"
							class="rounded-md px-3 py-1 {addonInterval === 'monthly' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
						>
							Monthly
						</Button>
						<Button
							type="button"
							onclick={() => (addonInterval = 'annual')}
							variant="ghost"
							size="sm"
							class="gap-1 rounded-md px-3 py-1 {addonInterval === 'annual' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}"
						>
							Annual
							{#if addonAnnualPricing}
								<span class="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
									Save ${addonAnnualPricing.savings}/yr
								</span>
							{/if}
						</Button>
					</div>
				</div>
			{/if}

			<!-- Billing summary -->
			<div class="space-y-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-4">
				<p class="mb-3 text-xs font-medium tracking-wide text-gray-400 uppercase">
					Billing summary
				</p>
				<div class="flex items-center justify-between text-sm text-gray-600">
					<span>Current monthly bill</span>
					<span class="font-medium">${currentMonthly}/mo</span>
				</div>
				<div
					class="flex items-center justify-between text-sm {isActivate
						? 'text-gray-800'
						: 'text-red-600'}"
				>
					<span>{isActivate ? '+' : '−'} {pendingAddon.name}</span>
					{#if isActivate && addonInterval === 'annual' && addonAnnualPricing}
						<span class="font-medium">${addonAnnualPricing.total}/yr <span class="text-xs text-gray-400">(${addonAnnualPricing.monthly}/mo)</span></span>
					{:else}
						<span class="font-medium">{isActivate ? '+' : '−'}${addonEffectiveMonthly}/mo</span>
					{/if}
				</div>
				<div
					class="flex items-center justify-between border-t border-gray-200 pt-2 text-sm font-semibold text-gray-900"
				>
					<span>New monthly bill</span>
					<span>~${newMonthly}/mo</span>
				</div>
			</div>

			<!-- Proration note -->
			{#if proration !== null}
				<div
					class="flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50 px-3.5 py-3"
				>
					<Icon icon="mdi:information-outline" class="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
					<p class="text-sm text-blue-700">
						{#if isActivate}
							You'll be charged a prorated amount of <strong>{fmtMoney(proration)}</strong> today for
							the remaining days in this billing cycle.
						{:else}
							You'll receive a prorated credit of <strong>{fmtMoney(proration)}</strong> on your next
							invoice.
						{/if}
					</p>
				</div>
			{/if}

			<!-- Next billing date -->
			{#if data.nextBillingDate}
				<p class="text-xs text-gray-400">
					Next full charge of <strong>~${newMonthly}/mo</strong> on {fmtDate(data.nextBillingDate)}.
				</p>
			{/if}

			<DialogFooter class="flex gap-3 sm:flex-row">
				<Button type="button" onclick={closeModal} variant="outline" class="flex-1">
					Cancel
				</Button>
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
					<Button
						type="submit"
						variant={isActivate ? 'default' : 'destructive'}
						class="w-full"
					>
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
