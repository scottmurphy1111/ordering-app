<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showForm = $state(false);
	let typeVal = $state<'percent' | 'flat'>('percent');

	$effect(() => {
		if (form?.success) showForm = false;
	});

	function formatAmount(type: string, amount: number) {
		return type === 'percent' ? `${amount}%` : `$${(amount / 100).toFixed(2)}`;
	}
</script>

<div class="max-w-3xl">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Promotions</h1>
			<p class="mt-0.5 text-sm text-gray-500">Create discount codes for customers to apply at checkout.</p>
		</div>
		{#if data.hasAccess}
			<button
				onclick={() => { showForm = !showForm; }}
				class="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
			>
				<Icon icon={showForm ? 'mdi:close' : 'mdi:plus'} class="h-4 w-4" />
				{showForm ? 'Cancel' : 'New code'}
			</button>
		{/if}
	</div>

	{#if !data.hasAccess}
		<!-- Upsell -->
		<div class="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
			<div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50">
				<Icon icon="mdi:ticket-percent-outline" class="h-7 w-7 text-green-600" />
			</div>
			<h2 class="text-lg font-semibold text-gray-900">Promo Codes — $9/mo add-on</h2>
			<p class="mx-auto mt-2 max-w-sm text-sm text-gray-500">
				Create percent-off or flat-dollar discount codes for promotions, events, or loyal customers. Activate from your billing page.
			</p>
			<a
				href={resolve('/dashboard/settings/billing')}
				class="mt-6 inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700"
			>
				<Icon icon="mdi:arrow-right" class="h-4 w-4" /> Activate add-on
			</a>
		</div>

	{:else}
		{#if form?.error}
			<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{form.error}</div>
		{/if}

		<!-- Create form -->
		{#if showForm}
			<form
				method="post"
				action="?/create"
				use:enhance
				class="mb-6 space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
			>
				<h2 class="font-semibold text-gray-800">New promo code</h2>

				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600" for="code">Code *</label>
						<input
							id="code"
							name="code"
							type="text"
							required
							placeholder="e.g. SUMMER20"
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm uppercase focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
						/>
						<p class="mt-1 text-xs text-gray-400">2–20 characters, letters, numbers, - or _</p>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600" for="description">Description</label>
						<input
							id="description"
							name="description"
							type="text"
							placeholder="Summer sale, VIP, etc."
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600" for="type">Discount type *</label>
						<select
							id="type"
							name="type"
							bind:value={typeVal}
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
						>
							<option value="percent">Percent off (%)</option>
							<option value="flat">Flat amount ($)</option>
						</select>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600" for="amount">
							Amount * {typeVal === 'percent' ? '(%)' : '($)'}
						</label>
						<input
							id="amount"
							name="amount"
							type="number"
							required
							min="1"
							step={typeVal === 'percent' ? '1' : '0.01'}
							max={typeVal === 'percent' ? '100' : undefined}
							placeholder={typeVal === 'percent' ? '20' : '5.00'}
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600" for="minOrderAmount">Min order amount ($)</label>
						<input
							id="minOrderAmount"
							name="minOrderAmount"
							type="number"
							min="0"
							step="0.01"
							placeholder="0.00 (no minimum)"
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
						/>
					</div>
					<div>
						<label class="mb-1 block text-xs font-medium text-gray-600" for="maxUses">Max uses</label>
						<input
							id="maxUses"
							name="maxUses"
							type="number"
							min="1"
							step="1"
							placeholder="Unlimited"
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
						/>
					</div>
					<div class="sm:col-span-2">
						<label class="mb-1 block text-xs font-medium text-gray-600" for="expiresAt">Expiry date</label>
						<input
							id="expiresAt"
							name="expiresAt"
							type="date"
							class="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
						/>
					</div>
				</div>

				<button
					type="submit"
					class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
				>
					Create code
				</button>
			</form>
		{/if}

		<!-- Codes list -->
		{#if data.codes.length === 0}
			<div class="rounded-xl border border-dashed border-gray-300 p-10 text-center">
				<p class="text-sm text-gray-400">No promo codes yet. Create your first one above.</p>
			</div>
		{:else}
			<div class="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
				<table class="w-full text-sm">
					<thead class="border-b border-gray-100 bg-gray-50">
						<tr>
							<th class="px-4 py-3 text-left font-medium text-gray-500">Code</th>
							<th class="px-4 py-3 text-left font-medium text-gray-500">Discount</th>
							<th class="px-4 py-3 text-left font-medium text-gray-500 hidden sm:table-cell">Usage</th>
							<th class="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Expires</th>
							<th class="px-4 py-3 text-left font-medium text-gray-500">Status</th>
							<th class="px-4 py-3"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						{#each data.codes as promo (promo.id)}
							{@const expired = promo.expiresAt && new Date() > new Date(promo.expiresAt)}
							<tr class="hover:bg-gray-50 transition-colors">
								<td class="px-4 py-3">
									<p class="font-mono font-semibold text-gray-900">{promo.code}</p>
									{#if promo.description}
										<p class="text-xs text-gray-400 mt-0.5">{promo.description}</p>
									{/if}
									{#if promo.minOrderAmount > 0}
										<p class="text-xs text-gray-400">Min ${(promo.minOrderAmount / 100).toFixed(2)}</p>
									{/if}
								</td>
								<td class="px-4 py-3 font-semibold text-gray-800">
									{formatAmount(promo.type, promo.amount)}
								</td>
								<td class="px-4 py-3 text-gray-500 hidden sm:table-cell">
									{promo.usedCount}{promo.maxUses !== null ? ` / ${promo.maxUses}` : ''}
								</td>
								<td class="px-4 py-3 text-gray-500 hidden md:table-cell">
									{promo.expiresAt ? new Date(promo.expiresAt).toLocaleDateString() : '—'}
								</td>
								<td class="px-4 py-3">
									<form method="post" action="?/toggle" use:enhance={() => ({ update }) => update({ reset: false })}>
										<input type="hidden" name="id" value={promo.id} />
										<input type="hidden" name="isActive" value={String(!promo.isActive)} />
										<button
											type="submit"
											class="rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors
												{promo.isActive && !expired
													? 'bg-green-100 text-green-700 hover:bg-red-50 hover:text-red-600'
													: 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-700'}"
										>
											{expired ? 'Expired' : promo.isActive ? 'Active' : 'Inactive'}
										</button>
									</form>
								</td>
								<td class="px-4 py-3">
									<form method="post" action="?/delete" use:enhance
										onsubmit={(e) => { if (!confirm('Delete this code?')) e.preventDefault(); }}>
										<input type="hidden" name="id" value={promo.id} />
										<button type="submit" class="text-xs text-red-500 hover:text-red-700 transition-colors">
											Delete
										</button>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/if}
</div>
