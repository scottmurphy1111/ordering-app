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

	const filteredUsers = $derived(
		search.trim()
			? data.users.filter(
					(u) =>
						u.name.toLowerCase().includes(search.toLowerCase()) ||
						u.email.toLowerCase().includes(search.toLowerCase())
				)
			: data.users
	);
</script>

<div class="max-w-5xl">
	<div class="mb-6 flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold text-foreground">Users</h1>
			<p class="mt-0.5 text-sm text-muted-foreground">
				{data.users.length} user{data.users.length === 1 ? '' : 's'} total
			</p>
		</div>

		{#if data.users.length > 6}
			<div class="relative w-64">
				<Icon
					icon="mdi:magnify"
					class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
				/>
				<input
					type="search"
					placeholder="Search users..."
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

	{#if filteredUsers.length === 0}
		<div class="rounded-xl border border-dashed p-10 text-center">
			<p class="text-sm text-muted-foreground">No users found.</p>
		</div>
	{:else}
		<Card class="p-0 shadow-sm">
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow class="hover:bg-transparent">
							<TableHead class="px-4 py-2.5 text-muted-foreground">User</TableHead>
							<TableHead class="hidden px-4 py-2.5 text-muted-foreground sm:table-cell">Tenants</TableHead>
							<TableHead class="hidden px-4 py-2.5 text-muted-foreground md:table-cell">Joined</TableHead>
							<TableHead class="px-4 py-2.5 text-muted-foreground">Status</TableHead>
							<TableHead class="px-4 py-2.5"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each filteredUsers as u (u.id)}
							<TableRow>
								<TableCell class="px-4 py-3">
									<p class="font-medium text-foreground">{u.name}</p>
									<p class="mt-0.5 text-xs text-muted-foreground">{u.email}</p>
									{#if u.isInternal}
										<Badge class="mt-1 bg-purple-100 text-purple-700">
											<Icon icon="mdi:shield-crown-outline" class="h-3 w-3" />
											Super admin
										</Badge>
									{/if}
								</TableCell>
								<TableCell class="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
									{u.tenantCount}
								</TableCell>
								<TableCell class="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
									{new Date(u.createdAt).toLocaleDateString()}
								</TableCell>
								<TableCell class="px-4 py-3">
									{#if u.bannedAt}
										<Badge class="bg-destructive/10 text-red-600">Suspended</Badge>
									{:else if u.emailVerified}
										<Badge class="bg-green-100 text-primary/90">
											<span class="h-1.5 w-1.5 rounded-full bg-primary/100"></span>
											Active
										</Badge>
									{:else}
										<Badge class="bg-muted text-muted-foreground">Unverified</Badge>
									{/if}
								</TableCell>
								<TableCell class="px-4 py-3">
									<div class="flex items-center justify-end gap-1">
										<!-- Toggle super admin -->
										<form method="post" action="?/toggleInternal" use:enhance>
											<input type="hidden" name="id" value={u.id} />
											<input type="hidden" name="value" value={String(!u.isInternal)} />
											<Button
												type="submit"
												onclick={async (e) => {
													e.preventDefault();
													const msg = u.isInternal
														? `Remove super admin from ${u.name}?`
														: `Make ${u.name} a super admin?`;
													if (await confirmDialog(msg))
														(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
												}}
												variant="ghost"
												size="sm"
												class="text-muted-foreground hover:text-foreground"
											>
												{u.isInternal ? 'Demote' : 'Promote'}
											</Button>
										</form>

										<!-- Ban / Unban -->
										{#if u.bannedAt}
											<form method="post" action="?/unban" use:enhance>
												<input type="hidden" name="id" value={u.id} />
												<Button
													type="submit"
													onclick={async (e) => {
														e.preventDefault();
														if (await confirmDialog(`Restore access for ${u.name}?`))
															(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
													}}
													variant="outline"
													size="sm"
												>
													Unban
												</Button>
											</form>
										{:else}
											<form method="post" action="?/ban" use:enhance>
												<input type="hidden" name="id" value={u.id} />
												<Button
													type="submit"
													onclick={async (e) => {
														e.preventDefault();
														if (
															await confirmDialog(
																`Suspend ${u.name}? They will be logged out immediately.`
															)
														)
															(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
													}}
													variant="ghost"
													size="sm"
													class="text-red-600 hover:bg-destructive/10 hover:text-red-500"
												>
													Suspend
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
