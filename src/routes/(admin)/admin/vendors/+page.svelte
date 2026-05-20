<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import Icon from '@iconify/svelte';
	import type { PageData, ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
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
		DropdownMenu,
		DropdownMenuTrigger,
		DropdownMenuContent,
		DropdownMenuItem
	} from '$lib/components/ui/dropdown-menu';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	function compatibleArchetypes(fulfillmentModel: string) {
		return data.archetypesList.filter((a) =>
			(a.allowedFulfillmentModels as string[]).includes(fulfillmentModel)
		);
	}

	let search = $state('');
	let submittingVendorAction = $state<{ id: number; action: 'restore' | 'archive' | 'delete' | 'reseed' } | null>(null);

	const filteredVendors = $derived(
		search.trim()
			? data.vendors.filter(
					(t) =>
						t.name.toLowerCase().includes(search.toLowerCase()) ||
						t.slug.toLowerCase().includes(search.toLowerCase())
				)
			: data.vendors
	);

	function statusLabel(t: { isActive: boolean; deletedAt: Date | null }) {
		if (t.deletedAt) return 'Deleted';
		if (!t.isActive) return 'Archived';
		return 'Active';
	}

	function statusClass(t: { isActive: boolean; deletedAt: Date | null }) {
		if (t.deletedAt) return 'bg-destructive/10 text-red-600';
		if (!t.isActive) return 'bg-yellow-100 text-yellow-700';
		return 'bg-success/10 text-success';
	}
</script>

<div class="max-w-5xl">
	<div class="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-foreground">Vendors</h1>
			<p class="mt-0.5 text-sm text-muted-foreground">
				{data.vendors.length} vendor{data.vendors.length === 1 ? '' : 's'} total
			</p>
		</div>

		{#if data.vendors.length > 6}
			<div class="relative w-full md:w-64">
				<Icon
					icon="mdi:magnify"
					class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
				/>
				<input
					type="search"
					placeholder="Search vendors..."
					bind:value={search}
					class="w-full rounded-lg border bg-background py-2 pr-3 pl-9 text-sm focus:border-gray-400 focus:ring-1 focus:ring-ring focus:outline-none"
				/>
			</div>
		{/if}
	</div>

	{#if (form as { error?: string } | null)?.error}
		<div
			class="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
		>
			{(form as { error: string }).error}
		</div>
	{/if}

	{#if filteredVendors.length === 0}
		<div class="rounded-xl border border-dashed p-10 text-center">
			<p class="text-sm text-muted-foreground">No vendors found.</p>
		</div>
	{:else}
		<Card class="p-0 shadow-sm">
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow class="hover:bg-transparent">
							<TableHead class="px-4 py-2.5 text-muted-foreground">Vendor</TableHead>
							<TableHead class="px-4 py-2.5 text-muted-foreground">Type</TableHead>
							<TableHead class="hidden px-4 py-2.5 text-muted-foreground lg:table-cell"
								>Model</TableHead
							>
							<TableHead class="hidden px-4 py-2.5 text-muted-foreground sm:table-cell"
								>Plan</TableHead
							>
							<TableHead class="hidden px-4 py-2.5 text-muted-foreground md:table-cell"
								>Created</TableHead
							>
							<TableHead class="px-4 py-2.5 text-muted-foreground">Status</TableHead>
							<TableHead class="px-4 py-2.5"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each filteredVendors as t (t.id)}
							<TableRow>
								<TableCell class="px-4 py-3">
									<p class="font-medium text-foreground">{t.name}</p>
									<p class="mt-0.5 text-xs text-muted-foreground">/{t.slug}</p>
								</TableCell>
								<TableCell class="px-4 py-3 text-sm text-muted-foreground capitalize">
									{t.type?.replace('_', ' ') ?? '—'}
								</TableCell>
								<TableCell class="hidden px-4 py-3 text-xs text-muted-foreground lg:table-cell">
									{t.fulfillmentModel?.replace('_', ' ') ?? '—'}
								</TableCell>
								<TableCell
									class="hidden px-4 py-3 text-sm text-muted-foreground capitalize sm:table-cell"
								>
									{t.subscriptionTier ?? '—'}
								</TableCell>
								<TableCell class="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
									{new Date(t.createdAt).toLocaleDateString()}
								</TableCell>
								<TableCell class="px-4 py-3">
									<StatusBadge tone={statusClass(t)}>
										{#if t.isActive && !t.deletedAt}
											<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
										{/if}
										{statusLabel(t)}
									</StatusBadge>
								</TableCell>
								<TableCell class="px-4 py-3">
									<div
										class="flex flex-col items-stretch gap-1 md:flex-row md:items-center md:justify-end"
									>
										{#if !t.deletedAt && compatibleArchetypes(t.fulfillmentModel ?? '').length > 0}
											<!-- Reseed -->
											<DropdownMenu>
												<DropdownMenuTrigger>
													{#snippet child({ props })}
														<Button
															{...props}
															variant="ghost"
															size="xs"
															class="w-full text-muted-foreground md:w-auto"
														>
															Reseed…
														</Button>
													{/snippet}
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end">
													{#each compatibleArchetypes(t.fulfillmentModel ?? '') as archetype (archetype.key)}
														<DropdownMenuItem>
															<form
																method="post"
																action="?/reseed"
																use:enhance={() => {
																	submittingVendorAction = { id: t.id, action: 'reseed' };
																	return async ({ update }) => {
																		submittingVendorAction = null;
																		await update();
																	};
																}}
																class="w-full"
																onsubmit={async (e) => {
																	e.preventDefault();
																	const form = e.currentTarget as HTMLFormElement;
																	if (
																		await confirmDialog(
																			`Reseed "${t.name}" as "${archetype.label}"? This wipes all current vendor data.`
																		)
																	)
																		form.requestSubmit();
																}}
															>
																<input type="hidden" name="id" value={t.id} />
																<input type="hidden" name="archetypeKey" value={archetype.key} />
																<button
																	type="submit"
																	disabled={submittingVendorAction !== null}
																	class="w-full cursor-pointer text-left text-sm disabled:opacity-50"
																>
																	{#if submittingVendorAction?.id === t.id && submittingVendorAction?.action === 'reseed'}
																		Reseeding...
																	{:else}
																		{archetype.label}
																	{/if}
																</button>
															</form>
														</DropdownMenuItem>
													{/each}
												</DropdownMenuContent>
											</DropdownMenu>
										{/if}
										{#if t.deletedAt || !t.isActive}
											<!-- Restore -->
											<form method="post" action="?/restore" use:enhance={() => {
												submittingVendorAction = { id: t.id, action: 'restore' };
												return async ({ update }) => {
													submittingVendorAction = null;
													await update();
												};
											}}>
												<input type="hidden" name="id" value={t.id} />
												<Button
													type="submit"
													onclick={async (e) => {
														e.preventDefault();
														const form = (e.currentTarget as HTMLButtonElement).form;
														if (await confirmDialog('Restore this vendor?')) form?.requestSubmit();
													}}
													disabled={submittingVendorAction !== null}
													variant="outline"
													class="w-full md:w-auto"
												>
													{#if submittingVendorAction?.id === t.id && submittingVendorAction?.action === 'restore'}
														<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
														Restoring...
													{:else}
														Restore
													{/if}
												</Button>
											</form>
										{:else}
											<!-- Archive -->
											<form method="post" action="?/archive" use:enhance={() => {
												submittingVendorAction = { id: t.id, action: 'archive' };
												return async ({ update }) => {
													submittingVendorAction = null;
													await update();
												};
											}}>
												<input type="hidden" name="id" value={t.id} />
												<Button
													type="submit"
													onclick={async (e) => {
														e.preventDefault();
														const form = (e.currentTarget as HTMLButtonElement).form;
														if (
															await confirmDialog(
																'Archive this vendor? It will be deactivated but not deleted.'
															)
														)
															form?.requestSubmit();
													}}
													disabled={submittingVendorAction !== null}
													variant="ghost"
													class="w-full text-muted-foreground hover:text-foreground md:w-auto"
												>
													{#if submittingVendorAction?.id === t.id && submittingVendorAction?.action === 'archive'}
														<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
														Archiving...
													{:else}
														Archive
													{/if}
												</Button>
											</form>
										{/if}

										{#if !t.deletedAt}
											<!-- Soft delete -->
											<form method="post" action="?/delete" use:enhance={() => {
												submittingVendorAction = { id: t.id, action: 'delete' };
												return async ({ update }) => {
													submittingVendorAction = null;
													await update();
												};
											}}>
												<input type="hidden" name="id" value={t.id} />
												<Button
													type="submit"
													onclick={async (e) => {
														e.preventDefault();
														const form = (e.currentTarget as HTMLButtonElement).form;
														if (
															await confirmDialog(
																`Delete "${t.name}"? This is a soft delete — the vendor can be restored.`
															)
														)
															form?.requestSubmit();
													}}
													disabled={submittingVendorAction !== null}
													variant="ghost"
													class="w-full text-red-500 hover:bg-red-50 hover:text-red-600 md:w-auto"
												>
													{#if submittingVendorAction?.id === t.id && submittingVendorAction?.action === 'delete'}
														<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
														Deleting...
													{:else}
														Delete
													{/if}
												</Button>
											</form>
										{/if}
									</div>
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	{/if}
</div>
