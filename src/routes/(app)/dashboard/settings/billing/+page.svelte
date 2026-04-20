<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Icon from '@iconify/svelte';
	import type { PageData, ActionData } from './$types';
	import { TIERS, ADDONS, getTier, hasAddon } from '$lib/billing';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const currentTierKey = $derived(data.subscriptionTier ?? 'starter');
	const tierInfo = $derived(getTier(currentTierKey));
	const itemCount = $derived(data.itemCount ?? 0);
	const activeAddons = $derived(data.addons ?? []);
	const isPaidPlan = $derived(currentTierKey !== 'starter');
	const isUpgraded = $derived(page.url.searchParams.get('upgraded') === '1');

	const itemLimit = $derived(tierInfo.itemLimit);
	const usagePct = $derived(itemLimit ? Math.min(100, (itemCount / itemLimit) * 100) : 0);
	const atLimit = $derived(itemLimit !== null && itemCount >= itemLimit);
	const nearLimit = $derived(itemLimit !== null && itemCount >= itemLimit * 0.7 && !atLimit);

	const addonMonthlyTotal = $derived(
		ADDONS.filter((a) => hasAddon(activeAddons, a.key)).reduce((s, a) => s + a.price, 0)
	);

	const statusColors: Record<string, string> = {
		active: 'bg-green-100 text-green-700',
		past_due: 'bg-amber-100 text-amber-700',
		cancelled: 'bg-red-100 text-red-600'
	};
</script>

<div class="max-w-3xl">
	<div class="mb-6">
		<a href="/dashboard/settings" class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-1">
			<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Settings
		</a>
		<h1 class="text-2xl font-bold text-gray-900">Billing</h1>
		<p class="mt-0.5 text-sm text-gray-500">Manage your subscription plan and add-ons.</p>
	</div>

	{#if isUpgraded}
		<div class="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 flex items-center gap-2">
			<Icon icon="mdi:check-circle-outline" class="h-4 w-4 shrink-0" />
			Your plan has been upgraded. Welcome to {tierInfo.name}!
		</div>
	{/if}
	{#if form?.error}
		<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{form.error}</div>
	{/if}

	<!-- Current plan -->
	<div class="mb-8 rounded-xl border border-gray-200 bg-white shadow-sm">
		<div class="border-b border-gray-100 px-5 py-4 flex items-center justify-between">
			<h2 class="font-semibold text-gray-900">Current plan</h2>
			{#if isPaidPlan}
				<form method="post" action="?/openPortal" use:enhance>
					<button type="submit" class="flex items-center gap-1.5 rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors">
						<Icon icon="mdi:cog-outline" class="h-3.5 w-3.5" /> Manage billing
					</button>
				</form>
			{/if}
		</div>
		<div class="px-5 py-5">
			<div class="flex items-start justify-between gap-4 flex-wrap">
				<div>
					<div class="flex items-center gap-2 flex-wrap">
						<span class="text-xl font-bold text-gray-900">{tierInfo.name}</span>
						<span class="rounded-full px-2.5 py-0.5 text-xs font-medium {statusColors[data.subscriptionStatus ?? 'active'] ?? statusColors.active}">
							{data.subscriptionStatus === 'past_due' ? 'Payment past due' : data.subscriptionStatus === 'cancelled' ? 'Cancelled' : 'Active'}
						</span>
					</div>
					<p class="mt-0.5 text-sm text-gray-500">
						{tierInfo.price === 0 ? 'Free' : `$${tierInfo.price}/month`}
						{#if addonMonthlyTotal > 0}
							<span class="text-gray-400">+ ${addonMonthlyTotal}/mo add-ons</span>
						{/if}
					</p>
				</div>
				{#if data.subscriptionStatus === 'past_due'}
					<form method="post" action="?/openPortal" use:enhance>
						<button type="submit" class="flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 transition-colors">
							<Icon icon="mdi:alert-outline" class="h-3.5 w-3.5" /> Update payment method
						</button>
					</form>
				{/if}
			</div>

			<!-- Item usage -->
			{#if itemLimit !== null}
				<div class="mt-5">
					<div class="mb-1.5 flex items-center justify-between text-sm">
						<span class="font-medium text-gray-700">Menu items</span>
						<span class="{atLimit ? 'text-red-600 font-semibold' : nearLimit ? 'text-amber-600 font-semibold' : 'text-gray-500'}">
							{itemCount} / {itemLimit}
						</span>
					</div>
					<div class="h-2 w-full rounded-full bg-gray-100">
						<div
							class="h-2 rounded-full transition-all {atLimit ? 'bg-red-500' : nearLimit ? 'bg-amber-400' : 'bg-green-500'}"
							style="width: {usagePct}%"
						></div>
					</div>
					{#if atLimit}
						<p class="mt-2 flex items-center gap-1.5 text-sm text-red-600">
							<Icon icon="mdi:alert-circle-outline" class="h-4 w-4 shrink-0" />
							Item limit reached. Upgrade to Growth to add more.
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
		</div>
	</div>

	<!-- Plans -->
	<div class="mb-8">
		<h2 class="mb-3 font-semibold text-gray-900">Plans</h2>
		<div class="grid gap-4 sm:grid-cols-3">
			{#each TIERS as tier (tier.key)}
				{@const isCurrent = tier.key === currentTierKey}
				{@const tierIndex = TIERS.findIndex((t) => t.key === tier.key)}
				{@const currentIndex = TIERS.findIndex((t) => t.key === currentTierKey)}
				{@const isUpgrade = tierIndex > currentIndex}
				<div class="relative rounded-xl border {isCurrent ? 'border-green-400 shadow-md' : 'border-gray-200'} bg-white p-5">
					{#if isCurrent}
						<span class="absolute -top-2.5 left-4 rounded-full bg-green-500 px-2.5 py-0.5 text-xs font-semibold text-white">Current</span>
					{/if}
					<div class="mb-4">
						<p class="font-semibold text-gray-900">{tier.name}</p>
						<p class="mt-0.5 text-2xl font-bold text-gray-900">
							{tier.price === 0 ? 'Free' : `$${tier.price}`}
							{#if tier.price > 0}<span class="text-sm font-normal text-gray-500">/mo</span>{/if}
						</p>
					</div>
					<ul class="mb-5 space-y-2">
						{#each tier.features as feature (feature)}
							<li class="flex items-start gap-2 text-sm text-gray-600">
								<Icon icon="mdi:check-circle-outline" class="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
								{feature}
							</li>
						{/each}
					</ul>
					{#if isCurrent}
						<button disabled class="w-full rounded-md border border-gray-200 px-4 py-2 text-sm font-medium text-gray-400 cursor-default">
							Current plan
						</button>
					{:else if isUpgrade}
						{#if tier.key === 'pro'}
							<a
								href="mailto:hello@getorderlocal.com?subject=Order Local Pro upgrade"
								class="block w-full rounded-md bg-gray-900 px-4 py-2 text-center text-sm font-medium text-white hover:bg-gray-700 transition-colors"
							>
								Contact us
							</a>
						{:else}
							<form method="post" action="?/upgrade" use:enhance>
								<input type="hidden" name="planKey" value={tier.key} />
								<button type="submit" class="w-full rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors">
									Upgrade to {tier.name}
								</button>
							</form>
						{/if}
					{:else}
						<button disabled class="w-full rounded-md border border-gray-100 px-4 py-2 text-sm font-medium text-gray-300 cursor-default">
							Downgrade
						</button>
					{/if}
				</div>
			{/each}
		</div>
		<p class="mt-2 text-xs text-gray-400">
			All plans include Stripe payment processing. Stripe charges 2.9% + 30¢ per transaction — we never take a cut.
		</p>
	</div>

	<!-- Add-ons -->
	<div>
		<h2 class="mb-1 font-semibold text-gray-900">Add-ons</h2>
		{#if !isPaidPlan}
			<div class="mb-4 flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
				<Icon icon="mdi:lock-outline" class="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
				<p class="text-sm text-amber-700">Add-ons require an active Growth or Pro plan. Upgrade above to unlock.</p>
			</div>
		{:else if !data.hasStripeSubscription}
			<div class="mb-4 flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
				<Icon icon="mdi:alert-outline" class="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
				<p class="text-sm text-amber-700">Complete your plan upgrade through Stripe to activate add-ons.</p>
			</div>
		{:else}
			<p class="mb-4 text-sm text-gray-500">Activate or deactivate features. Changes are prorated on your next invoice.</p>
		{/if}

		<div class="grid gap-4 sm:grid-cols-2">
			{#each ADDONS as addon (addon.key)}
				{@const isActive = hasAddon(activeAddons, addon.key)}
				{@const canToggle = isPaidPlan && data.hasStripeSubscription}
				<div class="rounded-xl border {isActive ? 'border-green-300 bg-green-50/40' : 'border-gray-200 bg-white'} p-5 shadow-sm">
					<div class="mb-3 flex items-start justify-between gap-3">
						<div class="flex items-center gap-3">
							<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl {isActive ? 'bg-green-100' : 'bg-gray-100'}">
								<Icon icon={addon.icon} class="h-5 w-5 {isActive ? 'text-green-700' : 'text-gray-500'}" />
							</div>
							<div>
								<p class="font-semibold text-gray-900 text-sm">{addon.name}</p>
								<p class="text-xs text-gray-500">${addon.price}/mo</p>
							</div>
						</div>
						{#if isActive}
							<span class="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
						{/if}
					</div>
					<p class="mb-4 text-sm text-gray-500">{addon.description}</p>
					{#if isActive}
						<form method="post" action="?/deactivateAddon" use:enhance
							onsubmit={(e) => { if (!confirm(`Deactivate ${addon.name}? This will remove it from your next invoice.`)) e.preventDefault(); }}>
							<input type="hidden" name="key" value={addon.key} />
							<button type="submit" disabled={!canToggle} class="w-full rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
								Deactivate
							</button>
						</form>
					{:else}
						<form method="post" action="?/activateAddon" use:enhance>
							<input type="hidden" name="key" value={addon.key} />
							<button type="submit" disabled={!canToggle} class="w-full rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
								Activate — ${addon.price}/mo
							</button>
						</form>
					{/if}
				</div>
			{/each}
		</div>
	</div>
</div>
