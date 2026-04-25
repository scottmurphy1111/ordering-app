<script lang="ts">
	import { enhance } from'$app/forms';
	import { confirmDialog } from'$lib/confirm.svelte';
	import { resolve } from'$app/paths';
	import Icon from'@iconify/svelte';
	import type { PageData, ActionData } from'./$types';
	import { Button } from'$lib/components/ui/button';
	import { Input } from'$lib/components/ui/input';
	import { Label } from'$lib/components/ui/label';
	import {
		Select,
		SelectTrigger,
		SelectContent,
		SelectItem,
		SelectValue
	} from'$lib/components/ui/select';
	import { Card, CardContent } from'$lib/components/ui/card';
	import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from'$lib/components/ui/table';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showForm = $state(false);
	let typeVal = $state<'percent' |'flat'>('percent');

	$effect(() => {
		if (form?.success) showForm = false;
	});

	function formatAmount(type: string, amount: number) {
		return type ==='percent' ? `${amount}%` : `$${(amount / 100).toFixed(2)}`;
	}
</script>

<div class="max-w-3xl">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-foreground">Promotions</h1>
			<p class="mt-0.5 text-sm text-muted-foreground">
				Create discount codes for customers to apply at checkout.
			</p>
		</div>
		{#if data.hasAccess}
			<Button
				onclick={() => {
					showForm = !showForm;
				}}
				variant="default"
				class="gap-1.5"
			>
				<Icon icon={showForm ?'mdi:close' :'mdi:plus'} class="h-4 w-4" />
				{showForm ?'Cancel' :'New code'}
			</Button>
		{/if}
	</div>

	{#if !data.hasAccess}
		<!-- Upsell -->
		<div
			class="rounded-xl border border-dashed bg-background p-10 text-center shadow-sm"
		>
			<div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
				<Icon icon="mdi:ticket-percent-outline" class="h-7 w-7 text-primary" />
			</div>
			<h2 class="text-lg font-semibold text-foreground">Promo Codes — $9/mo add-on</h2>
			<p class="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
				Create percent-off or flat-dollar discount codes for promotions, events, or loyal customers.
				Activate from your billing page.
			</p>
			<a
				href={resolve('/dashboard/settings/billing')}
				class="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
			>
				<Icon icon="mdi:arrow-right" class="h-4 w-4" /> Activate add-on
			</a>
		</div>
	{:else}
		{#if form?.error}
			<div class="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
				{form.error}
			</div>
		{/if}

		<!-- Create form -->
		{#if showForm}
			<Card class="mb-6 shadow-sm">
				<CardContent>
				<form
					method="post"
					action="?/create"
					use:enhance
					class="space-y-4"
				>
				<h2 class="font-semibold text-foreground">New promo code</h2>

				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<Label class="mb-1 block text-xs" for="code">Code *</Label>
						<Input
							id="code"
							name="code"
							type="text"
							required
							placeholder="e.g. SUMMER20"
							class="uppercase"
						/>
						<p class="mt-1 text-xs text-muted-foreground">2–20 characters, letters, numbers, - or _</p>
					</div>
					<div>
						<Label class="mb-1 block text-xs" for="description">Description</Label>
						<Input
							id="description"
							name="description"
							type="text"
							placeholder="Summer sale, VIP, etc."
						/>
					</div>
					<div>
						<Label class="mb-1 block text-xs" for="type">Discount type *</Label>
						<Select type="single" name="type" bind:value={typeVal}>
							<SelectTrigger id="type" class="w-full">
								<SelectValue placeholder="Select type" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="percent">Percent off (%)</SelectItem>
								<SelectItem value="flat">Flat amount ($)</SelectItem>
							</SelectContent>
						</Select>
					</div>
					<div>
						<Label class="mb-1 block text-xs" for="amount">
							Amount * {typeVal ==='percent' ?'(%)' :'($)'}
						</Label>
						<Input
							id="amount"
							name="amount"
							type="number"
							required
							min={1}
							step={typeVal ==='percent' ?'1' :'0.01'}
							max={typeVal ==='percent' ? 100 : undefined}
							placeholder={typeVal ==='percent' ?'20' :'5.00'}
						/>
					</div>
					<div>
						<Label class="mb-1 block text-xs" for="minOrderAmount">Min order amount ($)</Label>
						<Input
							id="minOrderAmount"
							name="minOrderAmount"
							type="number"
							min={0}
							step="0.01"
							placeholder="0.00 (no minimum)"
						/>
					</div>
					<div>
						<Label class="mb-1 block text-xs" for="maxUses">Max uses</Label>
						<Input
							id="maxUses"
							name="maxUses"
							type="number"
							min={1}
							step="1"
							placeholder="Unlimited"
						/>
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

		<!-- Codes list -->
		{#if data.codes.length === 0}
			<div class="rounded-xl border border-dashed p-10 text-center">
				<p class="text-sm text-muted-foreground">No promo codes yet. Create your first one above.</p>
			</div>
		{:else}
			<Card class="shadow-sm">
			<CardContent>
				<Table>
					<TableHeader class="bg-muted/50">
						<TableRow class="hover:bg-transparent">
							<TableHead class="px-4 py-3 text-muted-foreground">Code</TableHead>
							<TableHead class="px-4 py-3 text-muted-foreground">Discount</TableHead>
							<TableHead class="hidden px-4 py-3 text-muted-foreground sm:table-cell">Usage</TableHead>
							<TableHead class="hidden px-4 py-3 text-muted-foreground md:table-cell">Expires</TableHead>
							<TableHead class="px-4 py-3 text-muted-foreground">Status</TableHead>
							<TableHead class="px-4 py-3"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each data.codes as promo (promo.id)}
							{@const expired = promo.expiresAt && Date.now() > new Date(promo.expiresAt).getTime()}
							<TableRow>
								<TableCell class="px-4 py-3">
									<p class="font-mono font-semibold text-foreground">{promo.code}</p>
									{#if promo.description}
										<p class="mt-0.5 text-xs text-muted-foreground">{promo.description}</p>
									{/if}
									{#if promo.minOrderAmount > 0}
										<p class="text-xs text-muted-foreground">
											Min ${(promo.minOrderAmount / 100).toFixed(2)}
										</p>
									{/if}
								</TableCell>
								<TableCell class="px-4 py-3 font-semibold text-foreground">
									{formatAmount(promo.type, promo.amount)}
								</TableCell>
								<TableCell class="hidden px-4 py-3 text-muted-foreground sm:table-cell">
									{promo.usedCount}{promo.maxUses !== null ? ` / ${promo.maxUses}` :''}
								</TableCell>
								<TableCell class="hidden px-4 py-3 text-muted-foreground md:table-cell">
									{promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString() :'—'}
								</TableCell>
								<TableCell class="px-4 py-3">
									<form
										method="post"
										action="?/toggle"
										use:enhance={() =>
											({ update }) =>
												update({ reset: false })}
									>
										<input type="hidden" name="id" value={promo.id} />
										<input type="hidden" name="isActive" value={String(!promo.isActive)} />
										<button
											type="submit"
											class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors
												{promo.isActive && !expired
												?'bg-primary/10 text-primary hover:bg-destructive/10 hover:text-red-600'
												:'bg-muted text-muted-foreground hover:bg-primary/5 hover:text-primary'}"
										>
											{expired ?'Expired' : promo.isActive ?'Active' :'Inactive'}
										</button>
									</form>
								</TableCell>
								<TableCell class="px-4 py-3">
									<form method="post" action="?/delete" use:enhance>
										<input type="hidden" name="id" value={promo.id} />
										<Button
											type="submit"
											onclick={async (e) => {
												e.preventDefault();
												if (await confirmDialog('Delete this code?'))
													(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
											}}
											variant="ghost"
											size="sm"
											class="text-destructive hover:text-destructive/80"
										>
											Delete
										</Button>
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
</div>
