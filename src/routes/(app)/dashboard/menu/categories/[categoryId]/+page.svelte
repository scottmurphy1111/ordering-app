<script lang="ts">
	import { enhance } from '$app/forms';
	import { SvelteMap } from 'svelte/reactivity';
	import type { PageData, ActionData } from './$types';
	import Icon from '@iconify/svelte';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';

	let { data, form }: { data: PageData; form: ActionData } = $props();

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
			href={resolve('/dashboard/menu/categories')}
			class="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Categories
		</a>
		<span class="text-muted-foreground/40">/</span>
		<h1 class="text-2xl font-bold text-foreground">{data.category.name}</h1>
	</div>

	{#if form?.error}
		<div
			class="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
		>
			{form.error}
		</div>
	{/if}
	{#if form?.success}
		<div class="rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary/90">
			Saved.
		</div>
	{/if}

	<!-- Category details -->
	<section class="space-y-4 rounded-xl border bg-background p-6 shadow-sm">
		<h2 class="font-semibold text-foreground">Details</h2>
		<form
			method="post"
			action="?/update"
			use:enhance={() =>
				({ update }) =>
					update({ reset: false })}
			class="space-y-4"
		>
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

			<!-- Active / Inactive toggle -->
			<div class="flex items-center justify-between rounded-lg border px-4 py-3">
				<div>
					<p class="text-sm font-medium text-muted-foreground">Status</p>
					<p class="text-xs text-muted-foreground">Controls visibility on your public menu</p>
				</div>
				<input type="hidden" name="isActive" value={isActive ? 'on' : ''} />
				<button
					type="button"
					onclick={() => (isActiveOverride = !isActive)}
					class="flex cursor-pointer items-center gap-3"
				>
					<div
						class="relative h-6 w-11 rounded-full transition-colors duration-200 {isActive
							? 'bg-primary'
							: 'bg-muted'}"
					>
						<span
							class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform duration-200 {isActive
								? 'translate-x-5'
								: 'translate-x-0'}"
						></span>
					</div>
					<span
						class="w-14 text-sm font-medium {isActive
							? 'text-primary/90'
							: 'text-muted-foreground'}"
					>
						{isActive ? 'Active' : 'Inactive'}
					</span>
				</button>
			</div>

			<Button type="submit" variant="default">Save changes</Button>
		</form>
	</section>

	<!-- Item assignment -->
	<section class="space-y-4 rounded-xl border bg-background p-6 shadow-sm">
		<div>
			<h2 class="font-semibold text-foreground">Assign items</h2>
			<p class="mt-0.5 text-sm text-muted-foreground">Check items that belong to this category.</p>
		</div>
		{#if data.items.length === 0}
			<p class="text-sm text-muted-foreground">No menu items yet.</p>
		{:else}
			<form
				method="post"
				action="?/assignItems"
				use:enhance={() =>
					({ result, update }) => {
						if (result.type === 'success') resetOverrides();
						return update({ reset: false });
					}}
			>
				<div class="mb-4 space-y-2">
					{#each data.items as item (item.id)}
						<label
							class="flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors
								{selections.has(item.id) ? ' bg-muted/50' : ' hover:bg-muted/50'}"
						>
							<input
								type="checkbox"
								name="itemId"
								value={item.id}
								checked={selections.has(item.id)}
								onchange={() => toggleItem(item.id)}
								class="h-4 w-4 rounded"
							/>
							<span class="flex-1 text-sm text-foreground">{item.name}</span>
							<span class="text-xs text-muted-foreground">${(item.price / 100).toFixed(2)}</span>
							{#if item.categoryId !== null && item.categoryId !== data.category.id}
								<Badge class="bg-yellow-100 text-yellow-700">Other category</Badge>
							{/if}
						</label>
					{/each}
				</div>
				<Button type="submit" variant="default">Save assignments</Button>
			</form>
		{/if}
	</section>
</div>
