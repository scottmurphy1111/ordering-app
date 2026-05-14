<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Alert } from '$lib/components/ui/alert';
	import { confirmDialog } from '$lib/confirm.svelte';
	import FilterPills from '$lib/components/FilterPills.svelte';

	let { data, form: _form }: { data: PageData; form: ActionData } = $props();
	const form = $derived(_form as { error?: string; declineSuccess?: boolean } | null);

	let expandedId = $state<number | null>(null);

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

	const pills = $derived([
		{ label: 'Pending', value: 'pending', count: data.pendingCount, dot: true },
		{ label: 'Quoted', value: 'quoted', count: data.quotedCount },
		{ label: 'Accepted', value: 'accepted', count: data.acceptedCount },
		{ label: 'Declined', value: 'declined', count: data.declinedCount },
		{ label: 'Expired', value: 'expired', count: data.expiredCount },
		{ label: 'All', value: 'all', count: data.totalCount }
	]);
</script>

<div>
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-gray-900">Special orders</h1>
			<p class="mt-0.5 text-sm text-gray-500">Custom order requests from your customers.</p>
		</div>
	</div>

	{#if form?.error}
		<Alert severity="error" class="mb-4">{form.error}</Alert>
	{/if}
	{#if form?.declineSuccess}
		<Alert severity="success" class="mb-4">Request declined.</Alert>
	{/if}

	<div class="mb-4">
		<FilterPills
			{pills}
			active={data.stateFilter}
			onSelect={(value) => goto(resolve(`/dashboard/special-orders?state=${value}`))}
		/>
	</div>

	{#if data.requests.length === 0}
		<div class="rounded-xl border border-gray-200 bg-white p-12 text-center">
			<Icon icon="mdi:message-question-outline" class="mx-auto mb-3 h-8 w-8 text-gray-300" />
			<h3 class="mb-1 text-base font-semibold text-gray-900">
				{data.stateFilter === 'pending'
					? 'No pending requests'
					: data.stateFilter === 'quoted'
						? 'No quoted requests'
						: data.stateFilter === 'accepted'
							? 'No accepted requests'
							: data.stateFilter === 'declined'
								? 'No declined requests'
								: data.stateFilter === 'expired'
									? 'No expired requests'
									: 'No requests yet'}
			</h3>
			<p class="text-sm text-gray-500">
				{data.stateFilter === 'pending'
					? 'New customer requests will appear here.'
					: data.stateFilter === 'quoted'
						? 'Requests you have sent quotes for will appear here.'
						: data.stateFilter === 'accepted'
							? 'Requests where the customer accepted and paid will appear here.'
							: data.stateFilter === 'declined'
								? 'Declined requests will appear here.'
								: data.stateFilter === 'expired'
									? 'Requests whose quotes expired without a response will appear here.'
									: 'Custom order requests from your storefront will appear here.'}
			</p>
		</div>
	{:else}
		<div class="space-y-3">
			{#each data.requests as req (req.id)}
				{@const isExpanded = expandedId === req.id}
				{@const isPending = req.state === 'pending'}
				<div
					class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow {req.state === 'pending' || req.state === 'quoted'
						? 'hover:shadow-md'
						: 'opacity-60'}"
				>
					<!-- Card header — always visible, clickable to expand -->
					<button
						type="button"
						class="w-full cursor-pointer px-4 py-3 text-left"
						onclick={() => (expandedId = isExpanded ? null : req.id)}
					>
						<div class="flex items-start justify-between gap-3">
							<div class="min-w-0 flex-1">
								<div class="flex flex-wrap items-center gap-2">
									<span class="text-sm font-medium text-gray-900">{req.customerName}</span>
									<span class="text-xs text-gray-500">{req.customerEmail}</span>
									{#if req.state === 'pending'}
										<span
											class="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700"
											>Pending</span
										>
									{:else if req.state === 'quoted'}
										<span
											class="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700"
											>Quoted</span
										>
									{:else if req.state === 'accepted'}
										<span
											class="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
											>Accepted</span
										>
									{:else if req.state === 'declined'}
										<span
											class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700"
											>Declined</span
										>
									{:else if req.state === 'expired'}
										<span
											class="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500"
											>Expired</span
										>
									{/if}
								</div>
								<p class="mt-1 line-clamp-2 text-xs text-gray-500">{req.description}</p>
							</div>
							<div class="flex shrink-0 flex-col items-end gap-1">
								<span class="text-xs text-gray-400">{formatDate(req.createdAt)}</span>
								{#if req.targetDate}
									<span class="text-xs text-amber-700">
										<Icon
											icon="mdi:calendar-outline"
											class="mr-0.5 mb-0.5 inline-block h-3 w-3 align-text-bottom"
										/>
										{formatTargetDate(req.targetDate)}
									</span>
								{/if}
								<Icon
									icon={isExpanded ? 'mdi:chevron-up' : 'mdi:chevron-down'}
									class="mt-1 h-4 w-4 text-gray-400"
								/>
							</div>
						</div>
					</button>

					{#if isExpanded}
						<!-- Expanded detail -->
						<div class="border-t border-gray-100 px-4 py-4">
							<div class="space-y-3">
								<!-- Contact info -->
								<div class="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-500">
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
									{#if req.targetDate}
										<span class="text-amber-700">
											<Icon
												icon="mdi:calendar-outline"
												class="mr-1 mb-0.5 inline-block h-3.5 w-3.5 align-text-bottom"
											/>
											Requested for {formatTargetDate(req.targetDate)}
										</span>
									{/if}
								</div>

								<!-- Description -->
								<div>
									<p class="mb-1 text-xs font-medium tracking-wide text-gray-500 uppercase">
										Request details
									</p>
									<p class="text-sm whitespace-pre-wrap text-gray-700">{req.description}</p>
								</div>

								<!-- Photos -->
								{#if (req.photoUrls as string[]).length > 0}
									<div>
										<p class="mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase">
											Photos
										</p>
										<div class="flex flex-wrap gap-2">
											{#each req.photoUrls as string[] as url, i (i)}
												<!-- eslint-disable svelte/no-navigation-without-resolve -->
												<a
													href={url}
													target="_blank"
													rel="noopener noreferrer"
													class="block h-20 w-20 overflow-hidden rounded-lg border border-gray-200"
												>
													<img
														src={url}
														alt="Reference photo {i + 1}"
														class="h-full w-full object-cover"
													/>
												</a>
												<!-- eslint-enable svelte/no-navigation-without-resolve -->
											{/each}
										</div>
									</div>
								{/if}

								<!-- Declined reason -->
								{#if req.state === 'declined' && req.declinedReason}
									<div
										class="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700"
									>
										<strong>Declined:</strong>
										{req.declinedReason}
									</div>
								{/if}
							</div>

							<!-- Action strip -->
							{#if isPending}
								<div
									data-slot="card-footer"
									class="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-3"
								>
									<form method="post" action="?/decline" use:enhance>
										<input type="hidden" name="id" value={req.id} />
										<div class="flex items-center gap-2">
											<textarea
												name="reason"
												rows="1"
												placeholder="Reason for declining (optional)"
												class="h-8 w-56 resize-none rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-transparent focus:ring-1 focus:ring-gray-300 focus:outline-none"
											></textarea>
											<Button
												type="submit"
												variant="ghost"
												class="text-red-500 hover:bg-red-50 hover:text-red-600"
												onclick={async (e) => {
													e.preventDefault();
													const form = (e.currentTarget as HTMLButtonElement).form;
													if (
														await confirmDialog(`Decline request from ${req.customerName}?`, {
															confirmLabel: 'Decline',
															danger: true
														})
													)
														form?.requestSubmit();
												}}
											>
												Decline
											</Button>
										</div>
									</form>
									<Button
										href={resolve(`/dashboard/special-orders/${req.id}`)}
										variant="outline"
									>
										<Icon icon="mdi:send-outline" class="h-3.5 w-3.5" />
										Send quote
									</Button>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
