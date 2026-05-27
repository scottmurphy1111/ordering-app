<script lang="ts">
	import { enhance } from '$app/forms';
	import { SvelteMap } from 'svelte/reactivity';
	import type { PageData } from './$types';
	import Icon from '@iconify/svelte';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Alert } from '$lib/components/ui/alert';
	import { enhanceWithToasts } from '$lib/forms/enhance-with-toasts';

	let { data }: { data: PageData } = $props();

	let updateError = $state<string | null>(null);
	let assignError = $state<string | null>(null);
	let submittingAction = $state<'update' | 'assignItems' | null>(null);

	let isActiveOverride = $state<boolean | null>(null);
	const isActive = $derived(isActiveOverride ?? data.category.isActive ?? true);

	// Explicit user toggles; undefined = follow server data
	let overrides = new SvelteMap<number, boolean>();

	const selections = $derived(
		new Set(
			data.items
				.filter((i) => overrides.get(i.id) ?? i.categoryId === data.category.id)
				.map((i) => i.id)
		)
	);

	function toggleItem(id: number) {
		overrides.set(id, !selections.has(id));
	}

	function resetOverrides() {
		overrides.clear();
	}
</script>

<div class="max-w-2xl space-y-8">
	<div class="flex items-center gap-3">
		<a
			href={resolve('/dashboard/catalog/categories')}
			class="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Categories
		</a>
		<span class="text-muted-foreground/40">/</span>
		<h1 class="text-2xl font-bold text-foreground">{data.category.name}</h1>
	</div>

	{#if updateError}
		<Alert severity="error" class="mb-3">{updateError}</Alert>
	{/if}
	{#if assignError}
		<Alert severity="error" class="mb-3">{assignError}</Alert>
	{/if}

	<!-- Category details -->
	<Card class="shadow-sm">
		<form
			id="details-form"
			method="post"
			action="?/update"
			use:enhance={enhanceWithToasts({
				successMessage: 'Category saved',
				preserveValues: true,
				onStart: () => {
					submittingAction = 'update';
					updateError = null;
				},
				onEnd: () => {
					submittingAction = null;
				},
				onError: (msg) => {
					updateError = msg;
				}
			})}
		>
			<CardContent class="space-y-4 pt-6">
				<h2 class="font-semibold text-foreground">Details</h2>
				<div>
					<Label class="mb-1 block" for="name">Name</Label>
					<Input id="name" name="name" type="text" required value={data.category.name} />
				</div>
				<div>
					<Label class="mb-1 block" for="description">Description</Label>
					<Input
						id="description"
						name="description"
						type="text"
						value={data.category.description ?? ''}
						placeholder="Optional"
					/>
				</div>
				<input type="hidden" name="sortOrder" value={data.category.sortOrder ?? 0} />

				<!-- Active / Hidden toggle -->
				<div class="flex items-center justify-between rounded-lg border px-4 py-3">
					<div>
						<p class="text-sm font-medium text-muted-foreground">Status</p>
						<p class="text-xs text-muted-foreground">Controls visibility on your public catalog</p>
					</div>
					<input type="hidden" name="isActive" value={isActive ? 'on' : ''} />
					<label class="flex cursor-pointer items-center gap-3">
						<Switch
							checked={isActive}
							onCheckedChange={(v) => {
								isActiveOverride = v === true;
							}}
						/>
						<span
							class="w-14 text-sm font-medium {isActive ? 'text-success' : 'text-muted-foreground'}"
						>
							{isActive ? 'Active' : 'Hidden'}
						</span>
					</label>
				</div>
			</CardContent>
			<CardFooter>
				<Button type="submit" variant="default" disabled={submittingAction !== null}>
					{#if submittingAction === 'update'}
						<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
						Saving...
					{:else}
						Save changes
					{/if}
				</Button>
			</CardFooter>
		</form>
	</Card>

	<!-- Item assignment -->
	<Card class="shadow-sm">
		<CardContent class="space-y-4 pt-6">
			<div>
				<h2 class="font-semibold text-foreground">Assign items</h2>
				<p class="mt-0.5 text-sm text-muted-foreground">
					Check items that belong to this category.
				</p>
			</div>
			{#if data.items.length === 0}
				<p class="text-sm text-muted-foreground">No catalog items yet.</p>
			{:else}
				<form
					id="assign-form"
					method="post"
					action="?/assignItems"
					use:enhance={enhanceWithToasts({
						successMessage: 'Assignments saved',
						preserveValues: true,
						onStart: () => {
							submittingAction = 'assignItems';
							assignError = null;
						},
						onEnd: () => {
							submittingAction = null;
						},
						onSuccess: () => {
							resetOverrides();
						},
						onError: (msg) => {
							assignError = msg;
						}
					})}
				>
					<div class="space-y-2">
						{#each data.items as item (item.id)}
							<label
								class="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors
									{selections.has(item.id) ? ' bg-muted/50' : ' hover:bg-muted/50'}"
							>
								<Checkbox
									name="itemId"
									value={String(item.id)}
									checked={selections.has(item.id)}
									onCheckedChange={() => toggleItem(item.id)}
								/>
								<span class="flex-1 text-sm text-foreground">{item.name}</span>
								<span class="text-xs text-muted-foreground">${(item.price / 100).toFixed(2)}</span>
								{#if item.categoryId !== null && item.categoryId !== data.category.id}
									<StatusBadge tone="bg-yellow-100 text-yellow-700">Other category</StatusBadge>
								{/if}
							</label>
						{/each}
					</div>
				</form>
			{/if}
		</CardContent>
		{#if data.items.length > 0}
			<CardFooter>
				<Button
					type="submit"
					form="assign-form"
					variant="default"
					disabled={submittingAction !== null}
				>
					{#if submittingAction === 'assignItems'}
						<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
						Saving...
					{:else}
						Save assignments
					{/if}
				</Button>
			</CardFooter>
		{/if}
	</Card>
</div>
