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

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let search = $state('');
	let submittingUserAction = $state<{ id: string; action: 'ban' | 'unban' } | null>(null);

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
	<div class="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-2xl font-bold text-foreground">Users</h1>
			<p class="mt-0.5 text-sm text-muted-foreground">
				{data.users.length} user{data.users.length === 1 ? '' : 's'} total
			</p>
		</div>

		{#if data.users.length > 6}
			<div class="relative w-full md:w-64">
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
							<TableHead class="hidden px-4 py-2.5 text-muted-foreground sm:table-cell"
								>Vendors</TableHead
							>
							<TableHead class="hidden px-4 py-2.5 text-muted-foreground md:table-cell"
								>Joined</TableHead
							>
							<TableHead class="hidden px-4 py-2.5 text-muted-foreground lg:table-cell"
								>Last login</TableHead
							>
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
										<StatusBadge tone="bg-purple-100 text-purple-700" class="mt-1">
											<Icon icon="mdi:shield-crown-outline" class="h-3 w-3" />
											Super admin
										</StatusBadge>
									{/if}
								</TableCell>
								<TableCell class="hidden px-4 py-3 text-sm text-muted-foreground sm:table-cell">
									{u.vendorCount}
								</TableCell>
								<TableCell class="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
									{new Date(u.createdAt).toLocaleDateString()}
								</TableCell>
								<TableCell class="hidden px-4 py-3 text-sm text-muted-foreground lg:table-cell">
									{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '—'}
								</TableCell>
								<TableCell class="px-4 py-3">
									{#if u.bannedAt}
										<StatusBadge variant="danger">Suspended</StatusBadge>
									{:else if u.emailVerified}
										<StatusBadge variant="success">
											<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
											Active
										</StatusBadge>
									{:else}
										<StatusBadge variant="neutral">Unverified</StatusBadge>
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
													const form = (e.currentTarget as HTMLButtonElement).form;
													const msg = u.isInternal
														? `Remove super admin from ${u.name}?`
														: `Make ${u.name} a super admin?`;
													if (await confirmDialog(msg)) form?.requestSubmit();
												}}
												variant="ghost"
												class="w-full text-muted-foreground hover:text-foreground md:w-auto"
											>
												{u.isInternal ? 'Demote' : 'Promote'}
											</Button>
										</form>

										<!-- Ban / Unban -->
										{#if u.bannedAt}
											<form
												method="post"
												action="?/unban"
												use:enhance={() => {
													submittingUserAction = { id: u.id, action: 'unban' };
													return async ({ update }) => {
														submittingUserAction = null;
														await update();
													};
												}}
											>
												<input type="hidden" name="id" value={u.id} />
												<Button
													type="submit"
													onclick={async (e) => {
														e.preventDefault();
														const form = (e.currentTarget as HTMLButtonElement).form;
														if (await confirmDialog(`Restore access for ${u.name}?`))
															form?.requestSubmit();
													}}
													disabled={submittingUserAction !== null}
													variant="outline"
													class="w-full md:w-auto"
												>
													{#if submittingUserAction?.id === u.id && submittingUserAction?.action === 'unban'}
														<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
														Unbanning...
													{:else}
														Unban
													{/if}
												</Button>
											</form>
										{:else}
											<form
												method="post"
												action="?/ban"
												use:enhance={() => {
													submittingUserAction = { id: u.id, action: 'ban' };
													return async ({ update }) => {
														submittingUserAction = null;
														await update();
													};
												}}
											>
												<input type="hidden" name="id" value={u.id} />
												<Button
													type="submit"
													onclick={async (e) => {
														e.preventDefault();
														const form = (e.currentTarget as HTMLButtonElement).form;
														if (
															await confirmDialog(
																`Suspend ${u.name}? They will be logged out immediately.`
															)
														)
															form?.requestSubmit();
													}}
													disabled={submittingUserAction !== null}
													variant="ghost"
													class="w-full text-red-500 hover:bg-red-50 hover:text-red-600 md:w-auto"
												>
													{#if submittingUserAction?.id === u.id && submittingUserAction?.action === 'ban'}
														<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
														Suspending...
													{:else}
														Suspend
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
