<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import Icon from '@iconify/svelte';
	import type { PageData, ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent } from '$lib/components/ui/card';
	import {
		Table,
		TableHeader,
		TableHead,
		TableBody,
		TableRow,
		TableCell
	} from '$lib/components/ui/table';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let search = $state('');

	const filteredTenants = $derived(
		search.trim()
			? data.tenants.filter(
					(t) =>
						t.name.toLowerCase().includes(search.toLowerCase()) ||
						t.slug.toLowerCase().includes(search.toLowerCase())
				)
			: data.tenants
	);

	function statusLabel(t: { isActive: boolean; deletedAt: Date | null }) {
		if (t.deletedAt) return 'Deleted';
		if (!t.isActive) return 'Archived';
		return 'Active';
	}

	function statusClass(t: { isActive: boolean; deletedAt: Date | null }) {
		if (t.deletedAt) return 'bg-destructive/10 text-red-600';
		if (!t.isActive) return 'bg-yellow-100 text-yellow-700';
		return 'bg-green-100 text-primary/90';
	}
</script>

<div class="max-w-5xl">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-foreground">Tenants</h1>
			<p class="mt-0.5 text-sm text-muted-foreground">
				{data.tenants.length} tenant{data.tenants.length === 1 ? '' : 's'} total
			</p>
		</div>

		{#if data.tenants.length > 6}
			<div class="relative w-64">
				<Icon
					icon="mdi:magnify"
					class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
				/>
				<input
					type="search"
					placeholder="Search tenants..."
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

	{#if filteredTenants.length === 0}
		<div class="rounded-xl border border-dashed p-10 text-center">
			<p class="text-sm text-muted-foreground">No tenants found.</p>
		</div>
	{:else}
		<Card class="p-0 shadow-sm">
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow class="hover:bg-transparent">
							<TableHead class="px-4 py-2.5 text-muted-foreground">Tenant</TableHead>
							<TableHead class="px-4 py-2.5 text-muted-foreground">Type</TableHead>
							<TableHead class="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">Plan</TableHead>
							<TableHead class="hidden px-4 py-2.5 text-muted-foreground md:table-cell">Created</TableHead>
							<TableHead class="px-4 py-2.5 text-muted-foreground">Status</TableHead>
							<TableHead class="px-4 py-2.5"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each filteredTenants as t (t.id)}
							<TableRow>
								<TableCell class="px-4 py-3">
									<p class="font-medium text-foreground">{t.name}</p>
									<p class="mt-0.5 text-xs text-muted-foreground">/{t.slug}</p>
								</TableCell>
								<TableCell class="px-4 py-3 text-sm text-muted-foreground capitalize">
									{t.type?.replace('_', ' ') ?? '—'}
								</TableCell>
								<TableCell class="hidden px-4 py-3 text-sm text-muted-foreground capitalize sm:table-cell">
									{t.subscriptionTier ?? '—'}
								</TableCell>
								<TableCell class="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
									{new Date(t.createdAt).toLocaleDateString()}
								</TableCell>
								<TableCell class="px-4 py-3">
									<Badge class={statusClass(t)}>
										{#if t.isActive && !t.deletedAt}
											<span class="h-1.5 w-1.5 rounded-full bg-primary/100"></span>
										{/if}
										{statusLabel(t)}
									</Badge>
								</TableCell>
								<TableCell class="px-4 py-3">
									<div class="flex items-center justify-end gap-1">
										{#if t.deletedAt || !t.isActive}
											<!-- Restore -->
											<form method="post" action="?/restore" use:enhance>
												<input type="hidden" name="id" value={t.id} />
												<Button
													type="submit"
													onclick={async (e) => {
														e.preventDefault();
														if (await confirmDialog('Restore this tenant?'))
															(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
													}}
													variant="outline"
													size="sm"
												>
													Restore
												</Button>
											</form>
										{:else}
											<!-- Archive -->
											<form method="post" action="?/archive" use:enhance>
												<input type="hidden" name="id" value={t.id} />
												<Button
													type="submit"
													onclick={async (e) => {
														e.preventDefault();
														if (await confirmDialog('Archive this tenant? It will be deactivated but not deleted.'))
															(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
													}}
													variant="ghost"
													size="sm"
													class="text-muted-foreground hover:text-foreground"
												>
													Archive
												</Button>
											</form>
										{/if}

										{#if !t.deletedAt}
											<!-- Soft delete -->
											<form method="post" action="?/delete" use:enhance>
												<input type="hidden" name="id" value={t.id} />
												<Button
													type="submit"
													onclick={async (e) => {
														e.preventDefault();
														if (
															await confirmDialog(
																`Delete "${t.name}"? This is a soft delete — the tenant can be restored.`
															)
														)
															(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
													}}
													variant="ghost"
													size="sm"
													class="text-red-600 hover:bg-destructive/10 hover:text-red-500"
												>
													Delete
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
