<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { confirmDialog } from '$lib/confirm.svelte';
	import type { PageData, ActionData } from './$types';
	import Icon from '@iconify/svelte';
	import CatalogViewToggle from '$lib/components/CatalogViewToggle.svelte';
	import Sortable from 'sortablejs';
	import { Button } from '$lib/components/ui/button';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuTrigger,
		DropdownMenuItem
	} from '$lib/components/ui/dropdown-menu';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent } from '$lib/components/ui/card';
	import {
		Table,
		TableHeader,
		TableHead,
		TableBody,
		TableRow,
		TableCell
	} from '$lib/components/ui/table';
	import {
		Sheet,
		SheetContent,
		SheetHeader,
		SheetTitle,
		SheetDescription
	} from '$lib/components/ui/sheet';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// ── Drawer state ──────────────────────────────────────────────
	type DrawerCategory = {
		id: number;
		name: string;
		description: string | null;
		isActive: boolean | null;
		sortOrder: number | null;
	};
	let drawerOpen = $state(false);
	let drawerMode = $state<'new' | 'edit'>('new');
	let drawerCategory = $state<DrawerCategory | null>(null);
	let drawerIsActive = $state(true);
	let drawerError = $state<string | null>(null);
	let drawerSuccess = $state(false);

	$effect(() => {
		if (!data.drawer) return;
		if (data.drawer.mode === 'new') {
			drawerMode = 'new';
			drawerCategory = null;
			drawerIsActive = true;
			drawerError = null;
			drawerOpen = true;
		} else if (data.drawer.mode === 'edit' && data.drawer.category) {
			drawerMode = 'edit';
			drawerCategory = data.drawer.category;
			drawerIsActive = data.drawer.category.isActive ?? true;
			drawerOpen = true;
		}
	});

	function clearDrawerParam() {
		goto(resolve('/dashboard/catalog/categories'), {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}

	function closeDrawer() {
		drawerOpen = false;
		clearDrawerParam();
	}

	function openNewDrawer() {
		goto(resolve('/dashboard/catalog/categories?drawer=new'), {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}

	function openEditDrawer(cat: DrawerCategory) {
		goto(resolve(`/dashboard/catalog/categories?drawer=${cat.id}` as `/${string}`), {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}

	function handleDrawerEnhance() {
		return async ({
			result,
			update
		}: {
			result: { type: string; data?: Record<string, unknown> };
			update: (opts?: { reset?: boolean }) => Promise<void>;
		}) => {
			drawerSuccess = false;
			if (result.type === 'failure') {
				drawerError = (result.data?.error as string) ?? 'Something went wrong.';
				return;
			}
			drawerError = null;
			if (drawerMode === 'new') {
				await update({ reset: true });
				closeDrawer();
			} else {
				drawerSuccess = true;
				await update({ reset: false });
			}
		};
	}

	// ── Sort mode ─────────────────────────────────────────────────
	let sortMode = $state(false);
	let saving = $state(false);
	let saveError = $state<string | null>(null);
	let sortListEl = $state<HTMLElement | null>(null);
	let sortable: Sortable | null = null;

	$effect(() => {
		if (sortMode && sortListEl) {
			sortable = Sortable.create(sortListEl, {
				animation: 150,
				handle: '.drag-handle',
				ghostClass: 'opacity-40'
			});
		} else {
			sortable?.destroy();
			sortable = null;
		}
	});

	async function saveSortOrder() {
		if (!sortListEl) return;
		saving = true;
		saveError = null;
		const ids = [...sortListEl.querySelectorAll('[data-id]')].map((el, i) => ({
			id: parseInt((el as HTMLElement).dataset.id!),
			sortOrder: i
		}));
		try {
			const res = await fetch('/api/reorder-categories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ order: ids })
			});
			if (!res.ok) throw new Error('Failed to save order');
			sortMode = false;
			window.location.reload();
		} catch {
			saveError = 'Failed to save. Please try again.';
		} finally {
			saving = false;
		}
	}

	// ── Table sorting ─────────────────────────────────────────────
	type SortCol = 'name' | 'description' | 'items' | 'status';
	let sortCol = $state<SortCol>('name');
	let sortDir = $state<'asc' | 'desc'>('asc');

	function sortBy(col: SortCol) {
		if (sortCol === col) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else {
			sortCol = col;
			sortDir = 'asc';
		}
	}

	const sortedCategories = $derived(
		[...data.categories].sort((a, b) => {
			let cmp = 0;
			if (sortCol === 'name') cmp = a.name.localeCompare(b.name);
			else if (sortCol === 'description')
				cmp = (a.description ?? '').localeCompare(b.description ?? '');
			else if (sortCol === 'items') cmp = (a.itemCount as number) - (b.itemCount as number);
			else if (sortCol === 'status') cmp = Number(b.isActive) - Number(a.isActive);
			return sortDir === 'asc' ? cmp : -cmp;
		})
	);
</script>

<div>
	<div class="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
		<h1 class="text-2xl font-bold text-foreground">Catalog</h1>
		{#if !sortMode}
			<div class="flex flex-col gap-3 md:flex-row md:items-center md:gap-2">
				<div class="flex items-center justify-between gap-2 md:justify-start">
					<CatalogViewToggle />
					<DropdownMenu>
						<DropdownMenuTrigger>
							<button
								type="button"
								class="flex h-10 items-center gap-1.5 rounded-md border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
							>
								<Icon icon="mdi:dots-horizontal" class="h-4 w-4" /> More
							</button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem
								onclick={() => {
									sortMode = true;
									closeDrawer();
								}}
							>
								<Icon icon="mdi:drag-vertical" class="h-4 w-4" /> Reorder categories
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				<Button onclick={openNewDrawer} variant="default" class="w-full gap-1.5 md:w-auto">
					<Icon icon="mdi:plus" class="h-4 w-4" /> New category
				</Button>
			</div>
		{:else}
			<div class="flex gap-2">
				<Button
					onclick={() => {
						sortMode = false;
						saveError = null;
					}}
					variant="outline"
				>
					Cancel
				</Button>
				<Button onclick={saveSortOrder} disabled={saving} variant="default" class="gap-1.5">
					<Icon icon="mdi:check" class="h-4 w-4" />
					{saving ? 'Saving…' : 'Save order'}
				</Button>
			</div>
		{/if}
	</div>

	{#if form?.error}
		<div
			class="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
		>
			{form.error}
		</div>
	{/if}
	{#if saveError}
		<div
			class="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
		>
			{saveError}
		</div>
	{/if}

	{#if data.categories.length === 0}
		<div class="rounded-xl border border-dashed p-12 text-center">
			<p class="text-sm text-muted-foreground">
				No categories yet. Create one to organize your catalog items.
			</p>
		</div>
	{:else if sortMode}
		<!-- ── Drag-and-drop reorder list ──────────────────────────── -->
		<Card class="shadow-sm">
			<CardContent class="border-b py-3">
				<p class="text-sm text-muted-foreground">
					Drag rows to reorder, then click <strong>Save order</strong>.
				</p>
			</CardContent>
			<CardContent class="p-0">
				<ul bind:this={sortListEl} class="divide-y divide-border">
					{#each data.categories as cat (cat.id)}
						<li
							data-id={cat.id}
							class="flex items-center gap-3 bg-background px-4 py-3 transition-colors hover:bg-muted/50"
						>
							<span
								class="drag-handle cursor-grab text-muted-foreground/40 transition-colors hover:text-muted-foreground active:cursor-grabbing"
							>
								<Icon icon="mdi:drag-horizontal-variant" class="h-5 w-5" />
							</span>
							<span class="flex-1 text-sm font-medium text-foreground">{cat.name}</span>
							<span class="text-xs text-muted-foreground">{cat.itemCount} items</span>
							<Badge
								class={cat.isActive
									? 'bg-green-100 text-green-700'
									: 'bg-muted text-muted-foreground'}
							>
								{cat.isActive ? 'Active' : 'Hidden'}
							</Badge>
						</li>
					{/each}
				</ul>
			</CardContent>
		</Card>
	{:else}
		<!-- ── Mobile card list ────────────────────────────────────── -->
		<div class="block space-y-2 md:hidden">
			{#each sortedCategories as cat (cat.id)}
				<div class="rounded-xl border bg-background shadow-sm">
					<div class="px-4 pt-3 pb-2">
						<p class="text-sm font-medium text-foreground">{cat.name}</p>
						{#if cat.description}
							<p class="mt-0.5 text-xs text-muted-foreground">{cat.description}</p>
						{/if}
						<a
							href={resolve(`/dashboard/catalog/items?categoryId=${cat.id}` as `/${string}`)}
							class="mt-1 inline-block text-xs text-muted-foreground transition-colors hover:text-primary hover:underline"
							>{cat.itemCount} {Number(cat.itemCount) === 1 ? 'item' : 'items'}</a
						>
					</div>
					<div class="flex items-center justify-between border-t border-gray-100 px-4 py-2">
						<form method="post" action="?/toggleActive" use:enhance>
							<input type="hidden" name="id" value={cat.id} />
							<input type="hidden" name="isActive" value={String(cat.isActive)} />
							<button
								type="submit"
								title={cat.isActive ? 'Active — click to hide' : 'Hidden — click to show'}
								class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {cat.isActive
									? 'bg-primary'
									: 'bg-gray-200'}"
							>
								<span
									class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform {cat.isActive
										? 'translate-x-4.5'
										: 'translate-x-0.5'}"
								></span>
							</button>
						</form>
						<div class="flex items-center gap-1">
							<Button size="sm" variant="outline" onclick={() => openEditDrawer(cat)}>Edit</Button>
							<form method="post" action="?/delete" use:enhance>
								<input type="hidden" name="id" value={cat.id} />
								<Button
									type="submit"
									size="icon"
									variant="ghost"
									class="text-red-400 hover:text-red-600"
									onclick={async (e) => {
										e.preventDefault();
										const itemCount = Number(cat.itemCount);
										const msg =
											itemCount > 0
												? `Delete '${cat.name}'? This category contains ${itemCount} ${itemCount === 1 ? 'item' : 'items'}. They will become uncategorized.`
												: `Delete '${cat.name}'?`;
										if (await confirmDialog(msg))
											(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
									}}
									aria-label="Delete category"
								>
									<Icon icon="mdi:trash-can-outline" class="h-3.5 w-3.5" />
								</Button>
							</form>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- ── Desktop table ───────────────────────────────────────── -->
		<div class="hidden overflow-hidden rounded-xl border shadow-sm md:block">
			<Table>
				<TableHeader>
					<TableRow class="hover:bg-transparent">
						{#each [['name', 'Name'], ['items', 'Items'], ['status', 'Status']] as const as [col, label] (col)}
							<TableHead class="px-4 py-2.5">
								<button
									type="button"
									onclick={() => sortBy(col)}
									class="inline-flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-foreground"
								>
									{label}
									<Icon
										icon={sortCol === col
											? sortDir === 'asc'
												? 'mdi:chevron-up'
												: 'mdi:chevron-down'
											: 'mdi:unfold-more-horizontal'}
										class="h-3.5 w-3.5 {sortCol === col
											? 'text-foreground'
											: 'text-muted-foreground/40'}"
									/>
								</button>
							</TableHead>
						{/each}
						<TableHead class="px-4 py-2.5 text-muted-foreground">Actions</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{#each sortedCategories as cat (cat.id)}
						<TableRow class="hover:bg-gray-50">
							<TableCell class="px-4 py-3">
								<p class="font-medium text-foreground">{cat.name}</p>
								{#if cat.description}
									<p class="mt-0.5 text-xs text-muted-foreground">{cat.description}</p>
								{/if}
							</TableCell>
							<TableCell class="px-4 py-3">
								<a
									href={resolve(`/dashboard/catalog/items?categoryId=${cat.id}` as `/${string}`)}
									class="text-sm text-muted-foreground transition-colors hover:text-primary hover:underline"
									>{cat.itemCount} {Number(cat.itemCount) === 1 ? 'item' : 'items'}</a
								>
							</TableCell>
							<TableCell class="px-4 py-3">
								<form method="post" action="?/toggleActive" use:enhance>
									<input type="hidden" name="id" value={cat.id} />
									<input type="hidden" name="isActive" value={String(cat.isActive)} />
									<button
										type="submit"
										title={cat.isActive ? 'Active — click to hide' : 'Hidden — click to show'}
										class="relative inline-flex h-5 w-9 items-center rounded-full transition-colors {cat.isActive
											? 'bg-primary'
											: 'bg-gray-200'}"
									>
										<span
											class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform {cat.isActive
												? 'translate-x-4.5'
												: 'translate-x-0.5'}"
										></span>
									</button>
								</form>
							</TableCell>
							<TableCell class="px-4 py-3">
								<div class="flex items-center gap-2">
									<Button size="sm" variant="outline" onclick={() => openEditDrawer(cat)}
										>Edit</Button
									>
									<form method="post" action="?/delete" use:enhance>
										<input type="hidden" name="id" value={cat.id} />
										<Button
											type="submit"
											size="icon"
											variant="ghost"
											class="text-red-400 hover:text-red-600"
											onclick={async (e) => {
												e.preventDefault();
												const itemCount = Number(cat.itemCount);
												const msg =
													itemCount > 0
														? `Delete '${cat.name}'? This category contains ${itemCount} ${itemCount === 1 ? 'item' : 'items'}. They will become uncategorized.`
														: `Delete '${cat.name}'?`;
												if (await confirmDialog(msg))
													(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
											}}
											aria-label="Delete category"
										>
											<Icon icon="mdi:trash-can-outline" class="h-3.5 w-3.5" />
										</Button>
									</form>
								</div>
							</TableCell>
						</TableRow>
					{/each}
				</TableBody>
			</Table>
		</div>
	{/if}
</div>

<!-- ── Category drawer ────────────────────────────────────────── -->
<Sheet
	bind:open={drawerOpen}
	onOpenChange={(open) => {
		if (!open) clearDrawerParam();
	}}
>
	<SheetContent
		side="right"
		class="flex flex-col gap-0 p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-none data-[side=right]:md:max-w-[720px]"
	>
		<SheetHeader class="shrink-0 border-b px-6 py-4">
			<SheetTitle>{drawerMode === 'new' ? 'New category' : 'Edit category'}</SheetTitle>
			<SheetDescription class="sr-only">
				{drawerMode === 'new' ? 'Create a new catalog category' : 'Edit this catalog category'}
			</SheetDescription>
		</SheetHeader>

		<div class="flex-1 overflow-y-auto px-6 py-5">
			{#if drawerError}
				<div
					class="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
				>
					{drawerError}
				</div>
			{/if}
			{#if drawerSuccess}
				<div
					class="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
				>
					Saved.
				</div>
			{/if}

			<form
				method="post"
				action={drawerMode === 'new' ? '?/create' : '?/update'}
				use:enhance={handleDrawerEnhance}
			>
				{#if drawerMode === 'edit' && drawerCategory}
					<input type="hidden" name="id" value={drawerCategory.id} />
					<input type="hidden" name="sortOrder" value={drawerCategory.sortOrder ?? 0} />
				{/if}

				<div class="space-y-4">
					<div>
						<Label class="mb-1 block" for="drawer-name">Name *</Label>
						<Input
							id="drawer-name"
							name="name"
							type="text"
							required
							value={drawerCategory?.name ?? ''}
							placeholder="e.g. Breads, Pastries, Seasonal"
						/>
					</div>
					<div>
						<Label class="mb-1 block" for="drawer-description">Description</Label>
						<Input
							id="drawer-description"
							name="description"
							type="text"
							value={drawerCategory?.description ?? ''}
							placeholder="Optional"
						/>
					</div>

					<!-- Active toggle -->
					<div class="flex items-center justify-between rounded-lg border px-4 py-3">
						<div>
							<p class="text-sm font-medium text-muted-foreground">Active</p>
							<p class="text-xs text-muted-foreground">Visible to customers on your storefront</p>
						</div>
						<input type="hidden" name="isActive" value={drawerIsActive ? 'on' : ''} />
						<button
							type="button"
							onclick={() => (drawerIsActive = !drawerIsActive)}
							aria-label={drawerIsActive ? 'Disable category' : 'Enable category'}
							class="flex items-center"
						>
							<div
								class="relative h-6 w-11 rounded-full transition-colors duration-200 {drawerIsActive
									? 'bg-primary'
									: 'bg-muted'}"
							>
								<span
									class="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-background shadow transition-transform duration-200 {drawerIsActive
										? 'translate-x-5'
										: 'translate-x-0'}"
								></span>
							</div>
						</button>
					</div>
				</div>

				<div class="flex flex-col gap-3 pt-6 md:flex-row">
					<Button type="submit" variant="default" class="w-full md:w-auto">
						{drawerMode === 'new' ? 'Create category' : 'Save changes'}
					</Button>
					<Button type="button" onclick={closeDrawer} variant="outline" class="w-full md:w-auto">
						Cancel
					</Button>
				</div>
			</form>

			{#if drawerMode === 'edit' && drawerCategory}
				<div class="mt-6 border-t pt-5">
					<a
						href={resolve(`/dashboard/catalog/categories/${drawerCategory.id}` as `/${string}`)}
						class="text-sm font-medium text-primary hover:underline"
					>
						Manage item assignments →
					</a>
				</div>
			{/if}
		</div>
	</SheetContent>
</Sheet>
