<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import {
		Select,
		SelectTrigger,
		SelectContent,
		SelectItem,
		SelectValue,
		SelectGroup,
		SelectGroupHeading,
		SelectSeparator
	} from '$lib/components/ui/select';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { BUSINESS_TYPES, businessTypeLabel } from '$lib/utils/business-type-labels';
	import { US_TIMEZONES, getAllTimezones, getTimezoneLabel } from '$lib/utils/timezones';
	import { Alert } from '$lib/components/ui/alert';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const US_TZ_SET = new Set(US_TIMEZONES.map((t) => t.value));
	const otherTimezones = getAllTimezones().filter((tz) => !US_TZ_SET.has(tz));

	let typeValue = $state('bakery');
	let timezoneValue = $state('America/New_York');

	onMount(() => {
		try {
			const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
			if (detected) timezoneValue = detected;
		} catch {
			// keep default
		}
	});

	let showCreate = $state(false);
	let slugValue = $state('');
	let search = $state('');

	const filteredVendors = $derived(
		search.trim()
			? data.vendors.filter(
					(t) =>
						t.name.toLowerCase().includes(search.toLowerCase()) ||
						t.slug.toLowerCase().includes(search.toLowerCase())
				)
			: data.vendors
	);

	function toSlug(name: string) {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.slice(0, 50);
	}
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-muted/50 px-4 py-16">
	<div class="w-full max-w-lg">
		<div class="mb-6">
			<h1 class="text-2xl font-bold text-foreground">Your shops</h1>
			{#if data.vendors.length > 1}
				<p class="mt-1 text-sm text-muted-foreground">{data.vendors.length} shops</p>
			{/if}
		</div>

		{#if form?.error}
			<Alert severity="error" class="mb-4">{form.error}</Alert>
		{/if}

		{#if data.vendors.length > 4}
			<div class="relative mb-4">
				<Icon
					icon="mdi:magnify"
					class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
				/>
				<input
					type="search"
					placeholder="Search shops..."
					bind:value={search}
					class="w-full rounded-lg border bg-background py-2 pr-3 pl-9 text-sm focus:border-gray-400 focus:ring-1 focus:ring-ring focus:outline-none"
				/>
			</div>
		{/if}

		{#if data.vendors.length > 0}
			<div class="mb-6 space-y-2">
				{#each filteredVendors as t (t.id)}
					<form method="post" action="?/select" use:enhance>
						<input type="hidden" name="vendorId" value={t.id} />
						<Card class="shadow-sm transition-all hover:border-gray-400 hover:shadow">
							<CardContent class="flex cursor-pointer items-center justify-between">
								<button type="submit" class="flex min-w-0 flex-1 items-center gap-3 text-left">
									{#if t.logoUrl}
										<img
											src={t.logoUrl}
											alt={t.name}
											class="h-10 w-10 shrink-0 rounded-md border object-contain p-0.5"
										/>
									{:else}
										<div
											class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted"
										>
											<Icon icon="mdi:store-outline" class="h-5 w-5 text-muted-foreground" />
										</div>
									{/if}
									<div class="min-w-0">
										<p class="font-medium text-foreground">{t.name}</p>
										<p class="mt-0.5 text-xs text-muted-foreground">
											getorderlocal.com/{t.slug} · {businessTypeLabel(t.type)} · {t.role
												.charAt(0)
												.toUpperCase() + t.role.slice(1)}
										</p>
									</div>
								</button>
								<Icon
									icon="mdi:chevron-right"
									class="ml-2 h-5 w-5 shrink-0 text-muted-foreground"
								/>
							</CardContent>
						</Card>
					</form>
				{/each}
			</div>
		{/if}

		{#if data.canCreate && !showCreate}
			<Button
				onclick={() => (showCreate = true)}
				variant="outline"
				class="w-full border-primary text-primary hover:bg-primary/5 hover:text-primary"
			>
				<Icon icon="mdi:plus" class="h-4 w-4" /> Add a shop
			</Button>
		{:else if data.canCreate}
			<Card class="shadow-sm">
				<CardHeader>
					<CardTitle>New shop</CardTitle>
				</CardHeader>
				<CardContent>
					<form method="post" action="?/create" use:enhance class="space-y-4">
						<div>
							<label class="mb-1 block text-sm font-medium text-muted-foreground" for="name"
								>Business name</label
							>
							<Input
								id="name"
								name="name"
								type="text"
								required
								placeholder="Acme Burger Co."
								oninput={(e) => {
									slugValue = toSlug((e.target as HTMLInputElement).value);
								}}
							/>
						</div>

						<div>
							<label class="mb-1 block text-sm font-medium text-muted-foreground" for="slug"
								>URL slug</label
							>
							<div class="flex items-center gap-1.5">
								<span class="text-sm text-muted-foreground">getorderlocal.com/</span>
								<Input
									id="slug"
									name="slug"
									type="text"
									required
									bind:value={slugValue}
									placeholder="acme-burger"
									class="flex-1"
								/>
							</div>
						</div>

						<div>
							<label class="mb-1 block text-sm font-medium text-muted-foreground" for="type"
								>Business type</label
							>
							<Select type="single" name="type" bind:value={typeValue}>
								<SelectTrigger id="type" class="w-full">
									<SelectValue>
										{BUSINESS_TYPES.find((bt) => bt.value === typeValue)?.label ?? 'Select type'}
									</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{#each BUSINESS_TYPES as bt (bt.value)}
										<SelectItem value={bt.value}>{bt.label}</SelectItem>
									{/each}
								</SelectContent>
							</Select>
						</div>

						<div>
							<label class="mb-1 block text-sm font-medium text-muted-foreground" for="timezone"
								>Timezone</label
							>
							<Select type="single" name="timezone" bind:value={timezoneValue}>
								<SelectTrigger id="timezone" class="w-full">
									<SelectValue>{getTimezoneLabel(timezoneValue)}</SelectValue>
								</SelectTrigger>
								<SelectContent class="max-h-100">
									<SelectGroup>
										<SelectGroupHeading>United States</SelectGroupHeading>
										{#each US_TIMEZONES as tz (tz.value)}
											<SelectItem value={tz.value}>{tz.label}</SelectItem>
										{/each}
									</SelectGroup>
									<SelectSeparator />
									<SelectGroup>
										<SelectGroupHeading>All timezones</SelectGroupHeading>
										{#each otherTimezones as tz (tz)}
											<SelectItem value={tz}>{tz}</SelectItem>
										{/each}
									</SelectGroup>
								</SelectContent>
							</Select>
						</div>

						<label
							class="flex cursor-pointer items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5"
						>
							<Checkbox name="seedDemo" value="1" checked={true} />
							<div>
								<p class="text-sm font-medium text-foreground">Add example catalog items</p>
								<p class="text-xs text-muted-foreground">
									Pre-fill with demo categories and items you can edit or delete.
								</p>
							</div>
						</label>

						<div class="flex gap-2 pt-1">
							<Button type="submit" variant="default" class="flex-1">
								Create & go to dashboard
							</Button>
							<Button type="button" onclick={() => (showCreate = false)} variant="outline">
								Cancel
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		{/if}
	</div>
</div>
