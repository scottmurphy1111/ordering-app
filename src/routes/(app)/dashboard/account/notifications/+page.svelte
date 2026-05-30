<script lang="ts">
	import type { PageData } from './$types';
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { SvelteSet } from 'svelte/reactivity';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Switch } from '$lib/components/ui/switch';
	import { Alert } from '$lib/components/ui/alert';
	import { CATEGORY_DISPLAY, GROUP_LABELS, type CategoryDisplay } from '$lib/notification-meta';
	import type { EmailCategory } from '$lib/server/email';
	import { enhanceWithToasts } from '$lib/forms/enhance-with-toasts';

	let { data }: { data: PageData } = $props();
	let submittingAction = $state<'savePrefs' | 'markAllRead' | null>(null);

	// Per-form save errors.
	let prefsSaveError = $state<string | null>(null);
	let markReadError = $state<string | null>(null);

	type GroupedCategory = { category: EmailCategory; meta: CategoryDisplay };
	const grouped = Object.entries(CATEGORY_DISPLAY).reduce<Record<string, GroupedCategory[]>>(
		(acc, [category, meta]) => {
			if (!meta) return acc;
			const key = meta.group;
			if (!acc[key]) acc[key] = [];
			acc[key].push({ category: category as EmailCategory, meta });
			return acc;
		},
		{}
	);

	let optOuts = $state<SvelteSet<string>>(
		new SvelteSet(untrack(() => data.prefs.emailOptOuts ?? []))
	);
	let marketingOptIn = $state(untrack(() => data.prefs.marketingOptIn));

	function toggleCategory(cat: string, currentlyOn: boolean) {
		if (currentlyOn) optOuts.add(cat);
		else optOuts.delete(cat);
	}

	function categoryEnabled(cat: string): boolean {
		return !optOuts.has(cat);
	}

	function timeAgo(date: Date | string): string {
		const d = typeof date === 'string' ? new Date(date) : date;
		const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
		if (seconds < 60) return 'just now';
		if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
		if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
		if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	const severityClasses: Record<string, string> = {
		info: 'border-gray-200 bg-white',
		warning: 'border-amber-300 bg-amber-50/40',
		critical: 'border-red-300 bg-red-50/40'
	};

	const severityIcons: Record<string, string> = {
		info: 'mdi:information-outline',
		warning: 'mdi:alert-outline',
		critical: 'mdi:alert-circle'
	};

	const severityIconColors: Record<string, string> = {
		info: 'text-gray-400',
		warning: 'text-amber-600',
		critical: 'text-red-600'
	};

	const hasUnread = $derived(data.entries.some((e) => !e.readAt));
	const optOutsSerialized = $derived(JSON.stringify([...optOuts]));
</script>

<div class="max-w-2xl">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-foreground">Notifications</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">Account activity and email preferences.</p>
	</div>

	<!-- ─── Recent activity ─── -->
	<section class="mb-12">
		<div class="mb-3 flex items-center justify-between">
			<h2 class="text-base font-semibold text-foreground">Recent activity</h2>
			{#if markReadError}
				<Alert severity="error" class="mb-2">{markReadError}</Alert>
			{/if}
			{#if hasUnread}
				<form
					method="POST"
					action="?/markAllRead"
					use:enhance={enhanceWithToasts({
						successMessage: 'Marked all as read',
						onStart: () => {
							submittingAction = 'markAllRead';
							markReadError = null;
						},
						onEnd: () => {
							submittingAction = null;
						},
						onError: (msg) => {
							markReadError = msg;
						}
					})}
				>
					<Button
						type="submit"
						variant="ghost"
						size="xs"
						class="text-xs"
						disabled={submittingAction !== null}
					>
						{#if submittingAction === 'markAllRead'}
							<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
							Saving...
						{:else}
							Mark all read
						{/if}
					</Button>
				</form>
			{/if}
		</div>

		{#if data.entries.length === 0}
			<Card>
				<CardContent class="flex flex-col items-center py-12 text-center">
					<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
						<Icon icon="mdi:bell-outline" class="h-7 w-7 text-muted-foreground/50" />
					</div>
					<h3 class="mt-4 text-base font-semibold text-foreground">No notifications yet</h3>
					<p class="mt-1 max-w-sm text-sm text-muted-foreground">
						Account updates, billing events, and customer requests will appear here.
					</p>
				</CardContent>
			</Card>
		{:else}
			<ul class="space-y-2">
				{#each data.entries as entry (entry.id)}
					<li
						class="flex gap-3 rounded-xl border px-4 py-3 {severityClasses[
							entry.severity
						]} {entry.readAt ? 'opacity-70' : ''}"
					>
						<Icon
							icon={severityIcons[entry.severity]}
							class="mt-0.5 h-5 w-5 shrink-0 {severityIconColors[entry.severity]}"
						/>
						<div class="min-w-0 flex-1">
							<div class="flex items-baseline justify-between gap-3">
								<p class="text-sm font-semibold text-foreground">{entry.title}</p>
								<span class="shrink-0 text-xs text-muted-foreground">
									{timeAgo(entry.createdAt)}
								</span>
							</div>
							<p class="mt-0.5 text-sm text-muted-foreground">{entry.body}</p>
							{#if entry.actionUrl}
								<a
									href={resolve(entry.actionUrl as `/${string}`)}
									class="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
								>
									{entry.actionLabel ?? 'View'}
									<Icon icon="mdi:arrow-right" class="h-3 w-3" />
								</a>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- ─── Preferences ─── -->
	<section>
		<h2 class="text-base font-semibold text-foreground">Email preferences</h2>
		<p class="mt-1 text-sm text-muted-foreground">
			Control which emails Order Local sends to you. Critical account emails (billing, subscription
			state) cannot be turned off.
		</p>

		{#if prefsSaveError}
			<Alert severity="error" class="mt-6">{prefsSaveError}</Alert>
		{/if}

		<Card class="mt-6">
			<CardContent>
				<form
					id="prefs-form"
					method="POST"
					action="?/savePrefs"
					use:enhance={enhanceWithToasts({
						successMessage: 'Notification preferences saved',
						preserveValues: true,
						onStart: () => {
							submittingAction = 'savePrefs';
							prefsSaveError = null;
						},
						onEnd: () => {
							submittingAction = null;
						},
						onError: (msg) => {
							prefsSaveError = msg;
						}
					})}
					class="space-y-8"
				>
					<input type="hidden" name="emailOptOuts" value={optOutsSerialized} />
					<input type="hidden" name="marketingOptIn" value={marketingOptIn ? 'on' : ''} />

					{#each Object.keys(GROUP_LABELS) as groupKey (groupKey)}
						{@const items = grouped[groupKey] ?? []}
						{#if items.length > 0 || groupKey === 'marketing'}
							<div>
								<h3 class="text-xs font-medium tracking-wider text-muted-foreground uppercase">
									{GROUP_LABELS[groupKey as keyof typeof GROUP_LABELS]}
								</h3>

								{#if groupKey === 'marketing'}
									<div class="mt-3 flex items-start justify-between bg-background py-3">
										<div class="pr-4">
											<p class="text-sm font-medium text-foreground">Product updates</p>
											<p class="mt-0.5 text-xs text-muted-foreground">
												Occasional emails about new features and tips. Opt in below.
											</p>
										</div>
										<Switch
											checked={marketingOptIn}
											onCheckedChange={(v) => {
												marketingOptIn = v === true;
											}}
										/>
									</div>
								{:else}
									<ul class="mt-3 space-y-2">
										{#each items as { category, meta } (category)}
											<li class="flex items-start justify-between bg-background py-3">
												<div class="pr-4">
													<p class="text-sm font-medium text-foreground">
														{meta.label}
														{#if meta.isCritical}
															<span
																class="ml-2 text-[10px] font-medium tracking-wider text-muted-foreground uppercase"
																>Always on</span
															>
														{/if}
													</p>
													<p class="mt-0.5 text-xs text-muted-foreground">{meta.description}</p>
												</div>
												{#if meta.isCritical}
													<Switch checked disabled />
												{:else}
													<Switch
														checked={categoryEnabled(category)}
														onCheckedChange={(checked) =>
															toggleCategory(category, !(checked === true))}
													/>
												{/if}
											</li>
										{/each}
									</ul>
								{/if}
							</div>
						{/if}
					{/each}
				</form>
			</CardContent>
			<CardFooter class="gap-2">
				<Button type="submit" form="prefs-form" disabled={submittingAction !== null}>
					{#if submittingAction === 'savePrefs'}
						<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
						Saving...
					{:else}
						Save preferences
					{/if}
				</Button>
			</CardFooter>
		</Card>
	</section>
</div>
