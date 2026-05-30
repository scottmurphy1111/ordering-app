<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto, invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from '$lib/toast';
	import { enhanceWithToasts } from '$lib/forms/enhance-with-toasts';
	import { onMount } from 'svelte';
	import { confirmDialog } from '$lib/confirm.svelte';
	import type { PageData } from './$types';
	import Icon from '@iconify/svelte';
	import CatalogTabs from '$lib/components/CatalogTabs.svelte';
	import Sortable from 'sortablejs';
	import { Button } from '$lib/components/ui/button';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuTrigger,
		DropdownMenuItem
	} from '$lib/components/ui/dropdown-menu';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Switch } from '$lib/components/ui/switch';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Alert } from '$lib/components/ui/alert';
	import { Skeleton } from '$lib/components/ui/skeleton';
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

	let { data }: { data: PageData } = $props();

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
	// Row-action errors (table dropdowns, delete buttons) — page-level Alert.
	let rowActionError = $state<string | null>(null);
	let isSubmittingDrawer = $state(false);
	let submittingDeleteId = $state<number | null>(null);

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
		isSubmittingDrawer = true;
		drawerError = null;
		return async ({
			result,
			update
		}: {
			result: { type: string; data?: Record<string, unknown>; error?: { message?: string } };
			update: (opts?: { reset?: boolean }) => Promise<void>;
		}) => {
			isSubmittingDrawer = false;
			if (result.type === 'failure') {
				const msg = (result.data?.error as string) ?? 'Something went wrong.';
				drawerError = msg;
				toast.error(msg);
				return;
			}
			if (result.type === 'error') {
				const msg = result.error?.message ?? 'Something went wrong. Please try again.';
				drawerError = msg;
				toast.error(msg);
				return;
			}
			drawerError = null;
			await update({ reset: drawerMode === 'new' });
			toast.success(drawerMode === 'new' ? 'Category created' : 'Category saved');
			closeDrawer();
		};
	}

	// ── Mounted / skeleton ────────────────────────────────────────
	let mounted = $state(false);
	onMount(() => {
		mounted = true;
	});

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
			await invalidateAll();
			toast.success('Order saved');
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
					<CatalogTabs />
					<DropdownMenu>
						<DropdownMenuTrigger>
							{#snippet child({ props })}
								<Button {...props} variant="outline" class="gap-1.5">
									<Icon icon="mdi:dots-horizontal" class="h-4 w-4" /> More
								</Button>
							{/snippet}
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

	{#if rowActionError}
		<Alert severity="error" class="mb-4">{rowActionError}</Alert>
	{/if}
	{#if saveError}
		<Alert severity="error" class="mb-4">{saveError}</Alert>
	{/if}

	{#if data.categories.length === 0}
		<Card>
			<CardContent class="flex flex-col items-center py-12 text-center">
				<div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
					<Icon icon="mdi:folder-outline" class="h-7 w-7 text-muted-foreground/50" />
				</div>
				<h3 class="mt-4 text-base font-semibold text-foreground">No categories yet</h3>
				<p class="mt-1 max-w-sm text-sm text-muted-foreground">
					Create one to organize your catalog items.
				</p>
			</CardContent>
		</Card>
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
							<StatusBadge variant={cat.isActive ? 'success' : 'neutral'}>
								{cat.isActive ? 'Active' : 'Hidden'}
							</StatusBadge>
						</li>
					{/each}
				</ul>
			</CardContent>
		</Card>
	{:else}
		{#snippet statusDropdown(cat: (typeof sortedCategories)[number])}
			<DropdownMenu>
				<DropdownMenuTrigger>
					{#snippet child({ props })}
						<button
							{...props}
							type="button"
							class="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize transition-colors hover:opacity-80 {cat.isActive
								? 'bg-success/10 text-success'
								: 'bg-gray-100 text-gray-400'}"
						>
							{cat.isActive ? 'Active' : 'Hidden'}
							<Icon icon="mdi:chevron-down" class="h-3 w-3" />
						</button>
					{/snippet}
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start">
					{#each [['true', 'Active'], ['false', 'Hidden']] as const as [val, label] (val)}
						<DropdownMenuItem>
							<form
								method="post"
								action="?/setStatus"
								use:enhance={enhanceWithToasts({
									successMessage: val === 'true' ? 'Category activated' : 'Category hidden',
									onStart: () => {
										rowActionError = null;
									},
									onError: (msg) => {
										rowActionError = msg;
									}
								})}
								class="w-full"
							>
								<input type="hidden" name="id" value={cat.id} />
								<input type="hidden" name="isActive" value={val} />
								<button
									type="submit"
									class="flex w-full items-center gap-2 text-sm {String(cat.isActive) === val
										? 'font-semibold'
										: ''}"
								>
									<span class="h-2 w-2 rounded-full {val === 'true' ? 'bg-success' : 'bg-gray-300'}"
									></span>
									{label}
								</button>
							</form>
						</DropdownMenuItem>
					{/each}
				</DropdownMenuContent>
			</DropdownMenu>
		{/snippet}

		<!-- ── Mobile card list ────────────────────────────────────── -->
		<div class="block space-y-2 md:hidden">
			{#if !mounted}
				{#each [0, 1, 2, 3, 4] as i (i)}
					<div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
						<div class="px-4 pt-3 pb-2">
							<Skeleton class="h-4 w-2/3 rounded" />
							<Skeleton class="mt-1.5 h-3 w-1/2 rounded" />
							<Skeleton class="mt-1 h-3 w-20 rounded" />
						</div>
						<div class="flex items-center justify-between gap-2 border-t border-gray-100 px-4 py-2">
							<Skeleton class="h-6 w-20 rounded-full" />
							<div class="flex items-center gap-1">
								<Skeleton class="h-8 w-8 rounded-md" />
								<Skeleton class="h-8 w-8 rounded-md" />
							</div>
						</div>
					</div>
				{/each}
			{:else}
				{#each sortedCategories as cat (cat.id)}
					<div class="overflow-hidden rounded-xl border border-gray-200 bg-white">
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
							{@render statusDropdown(cat)}
							<div class="flex items-center gap-1">
								<Button
									variant="ghost"
									size="icon"
									onclick={() => openEditDrawer(cat)}
									aria-label="Edit category"
								>
									<Icon icon="mdi:pencil-outline" class="h-3.5 w-3.5" />
								</Button>
								<form
									method="post"
									action="?/delete"
									use:enhance={enhanceWithToasts({
										successMessage: 'Category deleted',
										onStart: () => {
											submittingDeleteId = cat.id;
											rowActionError = null;
										},
										onEnd: () => {
											submittingDeleteId = null;
										},
										onError: (msg) => {
											rowActionError = msg;
										}
									})}
								>
									<input type="hidden" name="id" value={cat.id} />
									<Button
										type="submit"
										size="icon"
										variant="ghost"
										class="text-red-500 hover:bg-red-50 hover:text-red-600"
										disabled={submittingDeleteId !== null}
										onclick={async (e) => {
											e.preventDefault();
											const form = (e.currentTarget as HTMLButtonElement).form;
											const itemCount = Number(cat.itemCount);
											const msg =
												itemCount > 0
													? `Delete '${cat.name}'? This category contains ${itemCount} ${itemCount === 1 ? 'item' : 'items'}. They will become uncategorized.`
													: `Delete '${cat.name}'?`;
											if (await confirmDialog(msg)) form?.requestSubmit();
										}}
										aria-label="Delete category"
									>
										{#if submittingDeleteId === cat.id}
											<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
										{:else}
											<Icon icon="mdi:trash-can-outline" class="h-3.5 w-3.5" />
										{/if}
									</Button>
								</form>
							</div>
						</div>
					</div>
				{/each}
			{/if}
		</div>

		<!-- ── Desktop table ───────────────────────────────────────── -->
		<div
			class="hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block"
		>
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
					{#if !mounted}
						{#each [0, 1, 2, 3, 4] as i (i)}
							<TableRow class="hover:bg-transparent">
								<TableCell class="px-4 py-3">
									<div class="space-y-1.5">
										<Skeleton class="h-4 w-2/3 rounded" />
										<Skeleton class="h-3 w-1/2 rounded" />
									</div>
								</TableCell>
								<TableCell class="px-4 py-3">
									<Skeleton class="h-4 w-16 rounded" />
								</TableCell>
								<TableCell class="w-28 px-4 py-3">
									<Skeleton class="h-6 w-20 rounded-full" />
								</TableCell>
								<TableCell class="w-20 px-4 py-3">
									<div class="flex items-center justify-end gap-1">
										<Skeleton class="h-8 w-8 rounded-md" />
										<Skeleton class="h-8 w-8 rounded-md" />
									</div>
								</TableCell>
							</TableRow>
						{/each}
					{:else}
						{#each sortedCategories as cat (cat.id)}
							<TableRow class="hover:bg-gray-50">
								<TableCell class="px-4 py-3">
									<a
										href={resolve(`/dashboard/catalog/categories/${cat.id}`)}
										class="truncate text-sm font-medium text-gray-900 hover:text-gray-700"
										>{cat.name}</a
									>
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
								<TableCell class="w-28 px-4 py-3">
									{@render statusDropdown(cat)}
								</TableCell>
								<TableCell class="w-20 px-4 py-3 text-right">
									<div class="flex items-center justify-end gap-1">
										<Button
											variant="ghost"
											size="icon"
											onclick={() => openEditDrawer(cat)}
											aria-label="Edit category"
										>
											<Icon icon="mdi:pencil-outline" class="h-3.5 w-3.5" />
										</Button>
										<form
											method="post"
											action="?/delete"
											use:enhance={enhanceWithToasts({
												successMessage: 'Category deleted',
												onStart: () => {
													submittingDeleteId = cat.id;
													rowActionError = null;
												},
												onEnd: () => {
													submittingDeleteId = null;
												},
												onError: (msg) => {
													rowActionError = msg;
												}
											})}
										>
											<input type="hidden" name="id" value={cat.id} />
											<Button
												type="submit"
												size="icon"
												variant="ghost"
												class="text-red-400 hover:bg-red-50 hover:text-red-600"
												disabled={submittingDeleteId !== null}
												onclick={async (e) => {
													e.preventDefault();
													const form = (e.currentTarget as HTMLButtonElement).form;
													const itemCount = Number(cat.itemCount);
													const msg =
														itemCount > 0
															? `Delete '${cat.name}'? This category contains ${itemCount} ${itemCount === 1 ? 'item' : 'items'}. They will become uncategorized.`
															: `Delete '${cat.name}'?`;
													if (await confirmDialog(msg)) form?.requestSubmit();
												}}
												aria-label="Delete category"
											>
												{#if submittingDeleteId === cat.id}
													<Icon icon="mdi:loading" class="h-3.5 w-3.5 animate-spin" />
												{:else}
													<Icon icon="mdi:trash-can-outline" class="h-3.5 w-3.5" />
												{/if}
											</Button>
										</form>
									</div>
								</TableCell>
							</TableRow>
						{/each}
					{/if}
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
				<Alert severity="error" class="mb-4">{drawerError}</Alert>
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
						<Switch bind:checked={drawerIsActive} />
					</div>
				</div>

				<div class="flex flex-col gap-3 pt-6 md:flex-row">
					<Button
						type="submit"
						variant="default"
						class="w-full md:w-auto"
						disabled={isSubmittingDrawer}
					>
						{#if isSubmittingDrawer}
							<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
							Saving...
						{:else}
							{drawerMode === 'new' ? 'Create category' : 'Save changes'}
						{/if}
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
