<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { untrack } from 'svelte';
	import Icon from '@iconify/svelte';
	import type { PageData, ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		Select,
		SelectTrigger,
		SelectContent,
		SelectItem,
		SelectValue
	} from '$lib/components/ui/select';
	import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '$lib/components/ui/table';
	import { confirmDialog } from '$lib/confirm.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Promo codes state
	let showForm = $state(false);
	let typeVal = $state<'percent' | 'flat'>('percent');

	function formatAmount(type: string, amount: number) {
		return type === 'percent' ? `${amount}%` : `$${(amount / 100).toFixed(2)}`;
	}

	// Loyalty state
	let programType = $state<'stamps' | 'points'>(untrack(() => data.loyalty.type ?? 'stamps'));
	let stampsPerOrder = $state(untrack(() => data.loyalty.stamps.stampsPerOrder ?? 1));
	let rewardAt = $state(untrack(() => data.loyalty.stamps.rewardAt ?? 10));
	let rewardDescription = $state(untrack(() => data.loyalty.stamps.rewardDescription ?? 'Free item up to $15'));
	let pointsPerDollar = $state(untrack(() => data.loyalty.points.pointsPerDollar ?? 1));
	let redeemAt = $state(untrack(() => data.loyalty.points.redeemAt ?? 100));
	let redeemValue = $state(untrack(() => (data.loyalty.points.redeemValue ?? 500) / 100));

	const isStamps = $derived(data.loyalty.type === 'stamps');
</script>

<div class="max-w-3xl">
	<div class="mb-6">
		<a
			href={resolve('/dashboard/settings')}
			class="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
		>
			<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Settings
		</a>
		<h1 class="text-2xl font-bold text-foreground">Promos & Loyalty</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">
			Discount codes and loyalty programs to reward your customers.
		</p>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
			{form.error}
		</div>
	{/if}

	<!-- ── PROMO CODES ──────────────────────────────────────────────────────── -->
	<div class="mb-4 flex items-center justify-between gap-4">
		<h2 class="text-lg font-semibold text-foreground">Promo Codes</h2>
		{#if data.hasPromos}
			<Button onclick={() => { showForm = !showForm; }} variant="default" size="sm" class="gap-1.5">
				<Icon icon={showForm ? 'mdi:close' : 'mdi:plus'} class="h-4 w-4" />
				{showForm ? 'Cancel' : 'New code'}
			</Button>
		{/if}
	</div>

	{#if !data.hasPromos}
		<Card class="mb-10 shadow-sm">
			<CardContent class="py-10 text-center">
				<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
					<Icon icon="mdi:ticket-percent-outline" class="h-6 w-6 text-primary" />
				</div>
				<p class="text-sm font-medium text-foreground">Promo Codes — $9/mo add-on</p>
				<p class="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
					Create percent-off or flat-dollar discount codes for promotions, events, or loyal customers.
				</p>
				<Button href={resolve('/dashboard/account/billing')} class="mt-4 gap-1.5">
					<Icon icon="mdi:arrow-right" class="h-4 w-4" />
					Activate add-on
				</Button>
			</CardContent>
		</Card>
	{:else}
		{#if showForm}
			<Card class="mb-6 shadow-sm">
				<CardContent class="pt-6 pb-2">
					<form
						method="POST"
						action="?/create"
						use:enhance={async () =>
							async ({ update, result }) => {
								await update({ reset: false });
								if (result.type === 'success') showForm = false;
							}}
						class="space-y-4"
					>
						<h3 class="font-semibold text-foreground">New promo code</h3>
						<div class="grid gap-4 sm:grid-cols-2">
							<div>
								<Label class="mb-1 block text-xs" for="code">Code *</Label>
								<Input id="code" name="code" type="text" required placeholder="e.g. SUMMER20" class="uppercase" />
								<p class="mt-1 text-xs text-muted-foreground">2–20 characters, letters, numbers, - or _</p>
							</div>
							<div>
								<Label class="mb-1 block text-xs" for="description">Description</Label>
								<Input id="description" name="description" type="text" placeholder="Summer sale, VIP, etc." />
							</div>
							<div>
								<Label class="mb-1 block text-xs" for="discountType">Discount type *</Label>
								<Select type="single" name="type" bind:value={typeVal}>
									<SelectTrigger id="discountType" class="w-full">
										<SelectValue placeholder="Select type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="percent">Percent off (%)</SelectItem>
										<SelectItem value="flat">Flat amount ($)</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label class="mb-1 block text-xs" for="amount">Amount * {typeVal === 'percent' ? '(%)' : '($)'}</Label>
								<Input id="amount" name="amount" type="number" required min={1} step={typeVal === 'percent' ? '1' : '0.01'} max={typeVal === 'percent' ? 100 : undefined} placeholder={typeVal === 'percent' ? '20' : '5.00'} />
							</div>
							<div>
								<Label class="mb-1 block text-xs" for="minOrderAmount">Min order amount ($)</Label>
								<Input id="minOrderAmount" name="minOrderAmount" type="number" min={0} step="0.01" placeholder="0.00 (no minimum)" />
							</div>
							<div>
								<Label class="mb-1 block text-xs" for="maxUses">Max uses</Label>
								<Input id="maxUses" name="maxUses" type="number" min={1} step="1" placeholder="Unlimited" />
							</div>
							<div class="sm:col-span-2">
								<Label class="mb-1 block text-xs" for="expiresAt">Expiry date</Label>
								<Input id="expiresAt" name="expiresAt" type="date" />
							</div>
						</div>
						<Button type="submit" variant="default">Create code</Button>
					</form>
				</CardContent>
			</Card>
		{/if}

		{#if data.codes.length === 0}
			<div class="mb-10 rounded-xl border border-dashed p-10 text-center">
				<p class="text-sm text-muted-foreground">No promo codes yet. Create your first one above.</p>
			</div>
		{:else}
			<Card class="mb-10 shadow-sm">
				<CardContent class="p-0">
					<Table>
						<TableHeader>
							<TableRow class="hover:bg-transparent">
								<TableHead class="px-4 py-2.5">Code</TableHead>
								<TableHead class="px-4 py-2.5">Discount</TableHead>
								<TableHead class="hidden px-4 py-2.5 sm:table-cell">Usage</TableHead>
								<TableHead class="hidden px-4 py-2.5 md:table-cell">Expires</TableHead>
								<TableHead class="px-4 py-2.5">Status</TableHead>
								<TableHead class="px-4 py-2.5"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each data.codes as promo (promo.id)}
								{@const expired = promo.expiresAt && Date.now() > new Date(promo.expiresAt).getTime()}
								<TableRow>
									<TableCell class="px-4 py-3">
										<p class="font-mono font-semibold text-foreground">{promo.code}</p>
										{#if promo.description}<p class="mt-0.5 text-xs text-muted-foreground">{promo.description}</p>{/if}
										{#if promo.minOrderAmount > 0}<p class="text-xs text-muted-foreground">Min ${(promo.minOrderAmount / 100).toFixed(2)}</p>{/if}
									</TableCell>
									<TableCell class="px-4 py-3 font-semibold text-foreground">{formatAmount(promo.type, promo.amount)}</TableCell>
									<TableCell class="hidden px-4 py-3 text-muted-foreground sm:table-cell">{promo.usedCount}{promo.maxUses !== null ? ` / ${promo.maxUses}` : ''}</TableCell>
									<TableCell class="hidden px-4 py-3 text-muted-foreground md:table-cell">{promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString() : '—'}</TableCell>
									<TableCell class="px-4 py-3">
										<form method="POST" action="?/toggle" use:enhance={() => ({ update }) => update({ reset: false })}>
											<input type="hidden" name="id" value={promo.id} />
											<input type="hidden" name="isActive" value={String(!promo.isActive)} />
											<button type="submit" class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors {promo.isActive && !expired ? 'bg-primary/10 text-primary hover:bg-destructive/10 hover:text-red-600' : 'bg-muted text-muted-foreground hover:bg-primary/5 hover:text-primary'}">
												{expired ? 'Expired' : promo.isActive ? 'Active' : 'Inactive'}
											</button>
										</form>
									</TableCell>
									<TableCell class="px-4 py-3">
										<form method="POST" action="?/delete" use:enhance>
											<input type="hidden" name="id" value={promo.id} />
											<Button type="submit" onclick={async (e) => { e.preventDefault(); if (await confirmDialog('Delete this code?')) (e.currentTarget as HTMLButtonElement).form?.requestSubmit(); }} variant="ghost" size="sm" class="text-destructive hover:text-destructive/80">Delete</Button>
										</form>
									</TableCell>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		{/if}
	{/if}

	<!-- ── LOYALTY PROGRAM ─────────────────────────────────────────────────── -->
	<h2 class="mb-4 text-lg font-semibold text-foreground">Loyalty Program</h2>

	{#if !data.hasLoyalty}
		<Card class="shadow-sm">
			<CardContent class="py-10 text-center">
				<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
					<Icon icon="mdi:star-circle-outline" class="h-6 w-6 text-primary" />
				</div>
				<p class="text-sm font-medium text-foreground">Loyalty Program — $29/mo add-on</p>
				<p class="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
					Reward repeat customers with stamp cards or a points system.
				</p>
				<Button href={resolve('/dashboard/account/billing')} class="mt-4 gap-1.5">
					<Icon icon="mdi:arrow-right" class="h-4 w-4" />
					Activate add-on
				</Button>
			</CardContent>
		</Card>
	{:else}
		<!-- Program type picker -->
		<Card class="mb-6 shadow-sm">
			<CardHeader><CardTitle>Program type</CardTitle></CardHeader>
			<CardContent class="pb-4">
				<div class="grid grid-cols-2 gap-3">
					<button
						type="button"
						onclick={() => (programType = 'stamps')}
						class="flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors {programType === 'stamps' ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-muted-foreground/40'}"
					>
						<div class="flex h-9 w-9 items-center justify-center rounded-full {programType === 'stamps' ? 'bg-primary/10' : 'bg-muted'}">
							<Icon icon="mdi:card-account-details-star-outline" class="h-5 w-5 {programType === 'stamps' ? 'text-primary' : 'text-muted-foreground'}" />
						</div>
						<div>
							<p class="text-sm font-semibold text-foreground">Stamp Card</p>
							<p class="mt-0.5 text-xs text-muted-foreground">Earn a stamp per order. Collect enough to unlock a reward.</p>
						</div>
					</button>
					<button
						type="button"
						onclick={() => (programType = 'points')}
						class="flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-colors {programType === 'points' ? 'border-primary bg-primary/5' : 'border-border bg-background hover:border-muted-foreground/40'}"
					>
						<div class="flex h-9 w-9 items-center justify-center rounded-full {programType === 'points' ? 'bg-primary/10' : 'bg-muted'}">
							<Icon icon="mdi:gift-outline" class="h-5 w-5 {programType === 'points' ? 'text-primary' : 'text-muted-foreground'}" />
						</div>
						<div>
							<p class="text-sm font-semibold text-foreground">Points & Rewards</p>
							<p class="mt-0.5 text-xs text-muted-foreground">Earn points per dollar spent. Redeem points for a discount.</p>
						</div>
					</button>
				</div>
			</CardContent>
		</Card>

		<!-- Config form -->
		<form
			id="loyalty-form"
			method="POST"
			action="?/saveLoyalty"
			use:enhance={() => ({ update }) => update({ reset: false })}
		>
			<input type="hidden" name="type" value={programType} />
			<input type="hidden" name="stampsPerOrder" value={stampsPerOrder} />
			<input type="hidden" name="rewardAt" value={rewardAt} />
			<input type="hidden" name="rewardDescription" value={rewardDescription} />
			<input type="hidden" name="pointsPerDollar" value={pointsPerDollar} />
			<input type="hidden" name="redeemAt" value={redeemAt} />
			<input type="hidden" name="redeemValue" value={redeemValue} />

			{#if programType === 'stamps'}
				<Card class="mb-6 shadow-sm">
					<CardHeader><CardTitle>Stamp card rules</CardTitle></CardHeader>
					<CardContent class="space-y-4 pb-2">
						<div class="grid gap-4 sm:grid-cols-2">
							<div>
								<Label class="mb-1 block" for="stampsPerOrderInput">Stamps per order</Label>
								<Input id="stampsPerOrderInput" type="number" min="1" max="5" bind:value={stampsPerOrder} />
								<p class="mt-1 text-xs text-muted-foreground">Stamps earned per completed order.</p>
							</div>
							<div>
								<Label class="mb-1 block" for="rewardAtInput">Reward after (stamps)</Label>
								<Input id="rewardAtInput" type="number" min="2" max="50" bind:value={rewardAt} />
								<p class="mt-1 text-xs text-muted-foreground">Stamps needed to earn the reward.</p>
							</div>
						</div>
						<div>
							<Label class="mb-1 block" for="rewardDescriptionInput">Reward description</Label>
							<Input id="rewardDescriptionInput" type="text" placeholder="e.g. Free item up to $15" bind:value={rewardDescription} />
							<p class="mt-1 text-xs text-muted-foreground">Shown to customers on their digital stamp card.</p>
						</div>
						<div class="rounded-xl border bg-muted/40 p-4">
							<p class="mb-3 text-xs font-semibold text-muted-foreground uppercase">Preview</p>
							<div class="flex flex-wrap gap-1.5">
								{#each { length: Math.min(rewardAt, 20) } as _, i (i)}
									<div class="flex h-8 w-8 items-center justify-center rounded-full border-2 {i < stampsPerOrder ? 'border-primary bg-primary/10' : 'border-dashed border-muted-foreground/30 bg-background'}">
										{#if i < stampsPerOrder}<Icon icon="mdi:star" class="h-4 w-4 text-primary" />{/if}
									</div>
								{/each}
								{#if rewardAt > 20}<span class="self-center text-xs text-muted-foreground">+{rewardAt - 20} more</span>{/if}
							</div>
							<p class="mt-3 text-xs text-muted-foreground">
								Collect {rewardAt} stamp{rewardAt !== 1 ? 's' : ''} → <span class="font-medium text-foreground">{rewardDescription}</span>
							</p>
						</div>
					</CardContent>
					<CardFooter class="gap-3">
						<Button type="submit" form="loyalty-form">Save program</Button>
						{#if data.loyalty.enabled}
							<form method="POST" action="?/disableLoyalty" use:enhance>
								<Button type="submit" variant="outline" class="text-destructive hover:text-destructive">Disable loyalty</Button>
							</form>
						{/if}
					</CardFooter>
				</Card>
			{:else}
				<Card class="mb-6 shadow-sm">
					<CardHeader><CardTitle>Points & rewards rules</CardTitle></CardHeader>
					<CardContent class="space-y-4 pb-2">
						<div class="grid gap-4 sm:grid-cols-2">
							<div>
								<Label class="mb-1 block" for="pointsPerDollarInput">Points per dollar</Label>
								<Input id="pointsPerDollarInput" type="number" min="1" max="100" bind:value={pointsPerDollar} />
								<p class="mt-1 text-xs text-muted-foreground">Points awarded per dollar of order total.</p>
							</div>
							<div>
								<Label class="mb-1 block" for="redeemAtInput">Points to redeem</Label>
								<Input id="redeemAtInput" type="number" min="1" bind:value={redeemAt} />
								<p class="mt-1 text-xs text-muted-foreground">Points needed to claim a reward.</p>
							</div>
						</div>
						<div class="sm:w-1/2">
							<Label class="mb-1 block" for="redeemValueInput">Reward value ($)</Label>
							<div class="flex rounded-md border focus-within:border-ring focus-within:ring-1 focus-within:ring-ring">
								<span class="flex items-center rounded-l-md border-r bg-muted/50 px-3 text-sm text-muted-foreground">$</span>
								<Input id="redeemValueInput" type="number" min="0.01" step="0.01" bind:value={redeemValue} class="min-w-0 flex-1 rounded-none rounded-r-md border-0 shadow-none focus-visible:ring-0" />
							</div>
							<p class="mt-1 text-xs text-muted-foreground">Discount applied when points are redeemed.</p>
						</div>
						<div class="rounded-xl border bg-muted/40 p-4">
							<p class="mb-2 text-xs font-semibold text-muted-foreground uppercase">Preview</p>
							<div class="flex items-center gap-3">
								<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
									<Icon icon="mdi:gift-outline" class="h-5 w-5 text-primary" />
								</div>
								<div>
									<p class="text-sm font-medium text-foreground">Earn {pointsPerDollar} pt{pointsPerDollar !== 1 ? 's' : ''} per $1 spent</p>
									<p class="text-xs text-muted-foreground">{redeemAt} points = <span class="font-medium text-foreground">${redeemValue.toFixed(2)} off</span> your next order</p>
								</div>
							</div>
						</div>
					</CardContent>
					<CardFooter class="gap-3">
						<Button type="submit" form="loyalty-form">Save program</Button>
						{#if data.loyalty.enabled}
							<form method="POST" action="?/disableLoyalty" use:enhance>
								<Button type="submit" variant="outline" class="text-destructive hover:text-destructive">Disable loyalty</Button>
							</form>
						{/if}
					</CardFooter>
				</Card>
			{/if}
		</form>

		<!-- How rewards are delivered -->
		<div class="mb-6 flex gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
			<div class="mt-0.5 shrink-0">
				<Icon icon="mdi:email-fast-outline" class="h-5 w-5 text-blue-600 dark:text-blue-400" />
			</div>
			<div>
				<p class="text-sm font-semibold text-blue-900 dark:text-blue-200">Rewards are sent by email</p>
				<p class="mt-0.5 text-xs text-blue-700 dark:text-blue-400">
					When a customer crosses the reward threshold on a completed order, they automatically receive an
					email with a unique promo code. They apply it at checkout on their next order — no app or account
					needed.
				</p>
			</div>
		</div>

		<!-- Member stats -->
		<div class="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
			<Card class="shadow-sm">
				<CardContent class="pt-4 pb-3">
					<p class="text-xs font-medium text-muted-foreground uppercase">Members</p>
					<p class="mt-1 text-2xl font-bold text-foreground">{data.memberCount}</p>
				</CardContent>
			</Card>
			<Card class="shadow-sm">
				<CardContent class="pt-4 pb-3">
					<p class="text-xs font-medium text-muted-foreground uppercase">{isStamps ? 'Stamps issued' : 'Points issued'}</p>
					<p class="mt-1 text-2xl font-bold text-foreground">
						{isStamps
							? data.members.reduce((s, m) => s + m.totalStampsEarned, 0)
							: data.members.reduce((s, m) => s + m.totalPointsEarned, 0).toLocaleString()}
					</p>
				</CardContent>
			</Card>
			<Card class="shadow-sm">
				<CardContent class="pt-4 pb-3">
					<p class="text-xs font-medium text-muted-foreground uppercase">Rewards earned</p>
					<p class="mt-1 text-2xl font-bold text-foreground">{data.members.reduce((s, m) => s + m.totalRewardsEarned, 0)}</p>
				</CardContent>
			</Card>
			<Card class="shadow-sm">
				<CardContent class="pt-4 pb-3">
					<p class="text-xs font-medium text-muted-foreground uppercase">{isStamps ? 'Ready to redeem' : 'Can redeem now'}</p>
					<p class="mt-1 text-2xl font-bold text-foreground">
						{isStamps
							? data.members.filter((m) => m.currentStamps >= (data.loyalty.stamps.rewardAt || 10)).length
							: data.members.filter((m) => m.currentPoints >= (data.loyalty.points.redeemAt || 100)).length}
					</p>
				</CardContent>
			</Card>
		</div>

		<!-- Members table -->
		{#if data.members.length === 0}
			<Card class="shadow-sm">
				<CardContent class="py-10 text-center">
					<div class="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
						<Icon icon="mdi:account-group-outline" class="h-5 w-5 text-muted-foreground" />
					</div>
					<p class="text-sm font-medium text-foreground">No members yet</p>
					<p class="mt-1 text-xs text-muted-foreground">
						Members are added automatically when a customer completes their first paid order.
					</p>
				</CardContent>
			</Card>
		{:else}
			<Card class="shadow-sm">
				<CardHeader><CardTitle>Members</CardTitle></CardHeader>
				<CardContent class="p-0">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Customer</TableHead>
								<TableHead>{isStamps ? 'Stamps' : 'Points'}</TableHead>
								<TableHead>Progress</TableHead>
								<TableHead>Rewards</TableHead>
								<TableHead>Last order</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each data.members as member (member.id)}
								{@const rewardTarget = isStamps ? (data.loyalty.stamps.rewardAt || 10) : (data.loyalty.points.redeemAt || 100)}
								{@const current = isStamps ? member.currentStamps % rewardTarget : member.currentPoints}
								{@const pct = Math.min(100, Math.round((current / rewardTarget) * 100))}
								<TableRow>
									<TableCell>
										<p class="text-sm font-medium text-foreground">{member.name ?? '—'}</p>
										<p class="text-xs text-muted-foreground">{member.email}</p>
									</TableCell>
									<TableCell class="font-medium">{isStamps ? member.currentStamps : member.currentPoints.toLocaleString()}</TableCell>
									<TableCell class="min-w-30">
										<div class="flex items-center gap-2">
											<div class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
												<div class="h-full rounded-full bg-primary transition-all" style="width: {pct}%"></div>
											</div>
											<span class="shrink-0 text-xs text-muted-foreground">{current}/{rewardTarget}</span>
										</div>
									</TableCell>
									<TableCell>{member.totalRewardsEarned}</TableCell>
									<TableCell class="text-sm text-muted-foreground">
										{member.lastOrderAt ? new Date(member.lastOrderAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
									</TableCell>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		{/if}
	{/if}
</div>
