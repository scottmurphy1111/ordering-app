<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import type { PageData, ActionData } from './$types';
	import Icon from '@iconify/svelte';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import {
		Select,
		SelectTrigger,
		SelectContent,
		SelectItem,
		SelectValue
	} from '$lib/components/ui/select';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Tabs, TabsList, TabsTrigger, TabsContent } from '$lib/components/ui/tabs';
	import {
		Table,
		TableHeader,
		TableHead,
		TableBody,
		TableRow,
		TableCell
	} from '$lib/components/ui/table';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let tab = $state<'members' | 'internal'>('members');
	let showAddForm = $state(false);
	let showInviteForm = $state(false);
	let copiedToken = $state<string | null>(null);

	const inviteUrl = $derived((form as { inviteUrl?: string } | null)?.inviteUrl ?? null);
	const inviteEmail = $derived((form as { inviteEmail?: string } | null)?.inviteEmail ?? null);

	async function copyLink(url: string, id: string) {
		await navigator.clipboard.writeText(url);
		copiedToken = id;
		setTimeout(() => (copiedToken = null), 2000);
	}

	const roleLabels: Record<string, string> = {
		owner: 'Owner',
		manager: 'Manager',
		kitchen: 'Kitchen',
		staff: 'Staff',
		viewer: 'Viewer'
	};
	const roleColors: Record<string, string> = {
		owner: 'bg-purple-100 text-purple-700',
		manager: 'bg-blue-100 text-blue-700',
		kitchen: 'bg-orange-100 text-orange-700',
		staff: 'bg-muted text-muted-foreground',
		viewer: 'bg-muted text-muted-foreground'
	};

	const nonInternalMembers = $derived(data.members.filter((m) => !m.isInternal));
</script>

<div>
	<div class="mb-6">
		<a
			href={resolve('/dashboard/settings')}
			class="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-muted-foreground"
		>
			<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Settings
		</a>
		<h1 class="text-2xl font-bold text-foreground">Team</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">Manage who has access to this vendor.</p>
	</div>

	<Tabs bind:value={tab}>
		<TabsList class="mb-6">
			<TabsTrigger value="members">Members</TabsTrigger>
			{#if data.canManageInternal}
				<TabsTrigger value="internal">
					Internal users
					{#if data.internalUsers.length > 0}
						<Badge class="ml-1.5 bg-muted text-muted-foreground">{data.internalUsers.length}</Badge>
					{/if}
				</TabsTrigger>
			{/if}
		</TabsList>

		<!-- ── MEMBERS TAB ── -->
		<TabsContent value="members">
			{#if form?.addError}
				<div
					class="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
				>
					{form.addError}
				</div>
			{/if}
			{#if form?.error}
				<div
					class="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
				>
					{form.error}
				</div>
			{/if}
			{#if form?.addSuccess}
				<div
					class="mb-4 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary/90"
				>
					Member added.
				</div>
			{/if}
			{#if form?.inviteError}
				<div
					class="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
				>
					{form.inviteError}
				</div>
			{/if}

			{#if data.currentRole === 'owner' || data.currentRole === 'manager'}
				<div class="mb-5 flex gap-2">
					{#if !showAddForm}
						<Button
							onclick={() => {
								showAddForm = true;
								showInviteForm = false;
							}}
							variant="outline"
						>
							+ Add existing member
						</Button>
					{/if}
					{#if !showInviteForm}
						<Button
							onclick={() => {
								showInviteForm = true;
								showAddForm = false;
							}}
							variant="outline"
						>
							+ Invite by link
						</Button>
					{/if}
				</div>

				{#if showAddForm}
					<Card class="mb-5 shadow-sm">
						<CardContent>
							<form
								method="post"
								action="?/addMember"
								use:enhance={() =>
									({ update }) => {
										update();
										showAddForm = false;
									}}
							>
								<h2 class="mb-3 text-sm font-semibold text-foreground">Add member by email</h2>
								<div class="flex flex-wrap gap-2">
									<Input
										name="email"
										type="email"
										required
										placeholder="user@example.com"
										class="min-w-48 flex-1"
									/>
									<Select type="single" name="role">
										<SelectTrigger class="w-auto">
											<SelectValue placeholder="Role" />
										</SelectTrigger>
										<SelectContent>
											{#each data.roles as role (role)}
												{#if role !== 'owner' || data.currentRole === 'owner'}
													<SelectItem value={role}>{roleLabels[role]}</SelectItem>
												{/if}
											{/each}
										</SelectContent>
									</Select>
									<Button type="submit" variant="default">Add</Button>
									<Button type="button" onclick={() => (showAddForm = false)} variant="outline">
										Cancel
									</Button>
								</div>
								<p class="mt-2 text-xs text-muted-foreground">
									The user must already have an account. They'll have access on their next login.
								</p>
							</form>
						</CardContent>
					</Card>
				{/if}

				{#if showInviteForm}
					<Card class="mb-5 border-blue-200 bg-blue-50 shadow-sm">
						<CardContent>
							<form
								method="post"
								action="?/sendInvite"
								use:enhance={() =>
									({ update }) => {
										update();
										showInviteForm = false;
									}}
							>
								<h2 class="mb-1 text-sm font-semibold text-foreground">Invite by link</h2>
								<p class="mb-3 text-xs text-muted-foreground">
									Generate a 7-day invite link — works even if they don't have an account yet.
								</p>
								<div class="flex flex-wrap gap-2">
									<Input
										name="email"
										type="email"
										required
										placeholder="user@example.com"
										class="min-w-48 flex-1"
									/>
									<Select type="single" name="role">
										<SelectTrigger class="w-auto">
											<SelectValue placeholder="Role" />
										</SelectTrigger>
										<SelectContent>
											{#each data.roles as role (role)}
												{#if role !== 'owner' || data.currentRole === 'owner'}
													<SelectItem value={role}>{roleLabels[role]}</SelectItem>
												{/if}
											{/each}
										</SelectContent>
									</Select>
									<Button type="submit" variant="default">Generate link</Button>
									<Button type="button" onclick={() => (showInviteForm = false)} variant="outline">
										Cancel
									</Button>
								</div>
							</form>
						</CardContent>
					</Card>
				{/if}

				<!-- Show the generated invite link -->
				{#if inviteUrl}
					<div class="mb-5 rounded-lg border border-primary/20 bg-primary/5 p-4">
						<p class="mb-1 text-sm font-medium text-primary">
							Invite link for <span class="font-semibold">{inviteEmail}</span>
						</p>
						<p class="mb-2 text-xs text-muted-foreground">
							Share this link with them — expires in 7 days.
						</p>
						<div class="flex items-center gap-2">
							<Input type="text" readonly value={inviteUrl} class="flex-1 text-xs" />
							<Button
								type="button"
								onclick={() => copyLink(inviteUrl!, 'new')}
								variant="outline"
								size="sm"
							>
								{copiedToken === 'new' ? 'Copied!' : 'Copy'}
							</Button>
						</div>
					</div>
				{/if}
			{/if}

			<Card class="p-0 shadow-sm">
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow class="hover:bg-transparent">
								<TableHead class="px-4 py-2.5">User</TableHead>
								<TableHead class="px-4 py-2.5">Role</TableHead>
								<TableHead class="hidden px-4 py-2.5 sm:table-cell">Added</TableHead>
								<TableHead class="px-4 py-2.5"></TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{#each data.members as member (member.userId)}
								<TableRow>
									<TableCell class="px-4 py-3">
										<p class="font-medium text-foreground">
											{member.name}
											{#if member.userId === data.currentUserId}
												<span class="ml-1 text-xs text-muted-foreground">(you)</span>
											{/if}
											{#if member.isInternal}
												<Badge class="ml-1 bg-indigo-100 text-indigo-600">internal</Badge>
											{/if}
										</p>
										<p class="text-xs text-muted-foreground">{member.email}</p>
									</TableCell>
									<TableCell class="px-4 py-3">
										{#if (data.currentRole === 'owner' || data.currentRole === 'manager') && member.userId !== data.currentUserId}
											<form method="post" action="?/changeRole" use:enhance>
												<input type="hidden" name="userId" value={member.userId} />
												<select
													name="role"
													onchange={(e) => (e.target as HTMLSelectElement).form?.requestSubmit()}
													class="rounded-md border px-2 py-1 pr-6 text-xs focus:border-ring focus:outline-none"
												>
													{#each data.roles as role (role)}
														{#if role !== 'owner' || data.currentRole === 'owner'}
															<option value={role} selected={member.role === role}
																>{roleLabels[role]}</option
															>
														{/if}
													{/each}
												</select>
											</form>
										{:else}
											<Badge class={roleColors[member.role] ?? 'bg-muted text-muted-foreground'}>
												{roleLabels[member.role] ?? member.role}
											</Badge>
										{/if}
									</TableCell>
									<TableCell class="hidden px-4 py-3 text-xs text-muted-foreground sm:table-cell">
										{new Date(member.assignedAt).toLocaleDateString([], {
											month: 'short',
											day: 'numeric',
											year: 'numeric'
										})}
									</TableCell>
									<TableCell class="px-4 py-3 text-right">
										{#if member.userId !== data.currentUserId && (data.currentRole === 'owner' || data.currentRole === 'manager')}
											<div class="flex items-center justify-end gap-3">
												{#if data.canManageInternal && !member.isInternal}
													<form method="post" action="?/toggleInternal" use:enhance>
														<input type="hidden" name="userId" value={member.userId} />
														<input type="hidden" name="isInternal" value="false" />
														<Button
															type="submit"
															onclick={async (e) => {
																e.preventDefault();
																if (
																	await confirmDialog(
																		`Grant internal platform access to ${member.name}?`,
																		{ danger: false }
																	)
																)
																	(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
															}}
															variant="ghost"
															size="sm"
															class="hidden text-indigo-500 hover:text-indigo-700 sm:inline-flex"
														>
															Make internal
														</Button>
													</form>
												{/if}
												<form method="post" action="?/removeMember" use:enhance>
													<input type="hidden" name="userId" value={member.userId} />
													<Button
														type="submit"
														onclick={async (e) => {
															e.preventDefault();
															if (await confirmDialog(`Remove ${member.name} from this vendor?`))
																(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
														}}
														variant="ghost"
														size="sm"
														class="text-destructive hover:text-destructive/80"
													>
														Remove
													</Button>
												</form>
											</div>
										{/if}
									</TableCell>
								</TableRow>
							{/each}
						</TableBody>
					</Table>
				</CardContent>
			</Card>

			<!-- Pending invitations -->
			{#if data.pendingInvitations.length > 0}
				<div class="mt-6">
					<h2 class="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
						Pending invitations
						<Badge class="bg-yellow-100 text-yellow-700">{data.pendingInvitations.length}</Badge>
					</h2>
					<Card class="p-0 shadow-sm">
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow class="hover:bg-transparent">
										<TableHead class="px-4 py-2.5">Email</TableHead>
										<TableHead class="px-4 py-2.5">Role</TableHead>
										<TableHead class="hidden px-4 py-2.5 sm:table-cell">Expires</TableHead>
										<TableHead class="px-4 py-2.5"></TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{#each data.pendingInvitations as invite (invite.id)}
										<TableRow>
											<TableCell class="max-w-40 min-w-0 truncate px-4 py-3 text-muted-foreground"
												>{invite.email}</TableCell
											>
											<TableCell class="px-4 py-3">
												<Badge class={roleColors[invite.role] ?? 'bg-muted text-muted-foreground'}>
													{roleLabels[invite.role] ?? invite.role}
												</Badge>
											</TableCell>
											<TableCell
												class="hidden px-4 py-3 text-xs text-muted-foreground sm:table-cell"
											>
												{new Date(invite.expiresAt).toLocaleDateString([], {
													month: 'short',
													day: 'numeric',
													year: 'numeric'
												})}
											</TableCell>
											<TableCell class="px-4 py-3 text-right">
												<div class="flex items-center justify-end gap-3">
													<Button
														type="button"
														onclick={() =>
															copyLink(`${data.origin}/invite/${invite.id}`, invite.id)}
														variant="ghost"
														size="sm"
														class="text-blue-500 hover:text-blue-700"
													>
														{copiedToken === invite.id ? 'Copied!' : 'Copy link'}
													</Button>
													<form method="post" action="?/cancelInvite" use:enhance>
														<input type="hidden" name="id" value={invite.id} />
														<Button
															type="submit"
															onclick={async (e) => {
																e.preventDefault();
																if (await confirmDialog(`Cancel invite for ${invite.email}?`))
																	(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
															}}
															variant="ghost"
															size="sm"
															class="text-destructive hover:text-destructive/80"
														>
															Cancel
														</Button>
													</form>
												</div>
											</TableCell>
										</TableRow>
									{/each}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</div>
			{/if}
		</TabsContent>

		<!-- ── INTERNAL TAB ── -->
		{#if data.canManageInternal}
			<TabsContent value="internal">
				<div
					class="mb-5 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700"
				>
					Internal users are platform-level staff with access to all vendors. This is separate from
					vendor membership roles.
				</div>

				{#if data.internalUsers.length === 0}
					<div class="mb-6 rounded-xl border border-dashed p-10 text-center">
						<p class="text-sm text-muted-foreground">No internal users yet.</p>
						<p class="mt-1 text-xs text-muted-foreground">
							Promote a vendor member using"Make internal" on the Members tab.
						</p>
					</div>
				{:else}
					<Card class="mb-6 p-0 shadow-sm">
						<CardContent>
							<Table>
								<TableHeader>
									<TableRow class="hover:bg-transparent">
										<TableHead class="px-4 py-2.5">User</TableHead>
										<TableHead class="hidden px-4 py-2.5 sm:table-cell">Account created</TableHead>
										<TableHead class="px-4 py-2.5"></TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{#each data.internalUsers as u (u.id)}
										<TableRow>
											<TableCell class="px-4 py-3">
												<p class="font-medium text-foreground">{u.name}</p>
												<p class="text-xs text-muted-foreground">{u.email}</p>
											</TableCell>
											<TableCell
												class="hidden px-4 py-3 text-xs text-muted-foreground sm:table-cell"
											>
												{new Date(u.createdAt).toLocaleDateString([], {
													month: 'short',
													day: 'numeric',
													year: 'numeric'
												})}
											</TableCell>
											<TableCell class="px-4 py-3 text-right">
												<form method="post" action="?/toggleInternal" use:enhance>
													<input type="hidden" name="userId" value={u.id} />
													<input type="hidden" name="isInternal" value="true" />
													<Button
														type="submit"
														onclick={async (e) => {
															e.preventDefault();
															if (await confirmDialog(`Revoke internal access for ${u.name}?`))
																(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
														}}
														variant="ghost"
														size="sm"
														class="text-destructive hover:text-destructive/80"
													>
														Revoke internal
													</Button>
												</form>
											</TableCell>
										</TableRow>
									{/each}
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				{/if}

				<!-- Quick promote from current vendor members -->
				{#if nonInternalMembers.length > 0}
					<div>
						<h2 class="mb-3 text-sm font-semibold text-muted-foreground">
							Promote a current member to internal
						</h2>
						<Card class="p-0 shadow-sm">
							<CardContent>
								<Table>
									<TableBody>
										{#each nonInternalMembers as member (member.userId)}
											<TableRow>
												<TableCell class="px-4 py-3">
													<p class="font-medium text-foreground">{member.name}</p>
													<p class="text-xs text-muted-foreground">{member.email}</p>
												</TableCell>
												<TableCell class="px-4 py-3 text-right">
													<form method="post" action="?/toggleInternal" use:enhance>
														<input type="hidden" name="userId" value={member.userId} />
														<input type="hidden" name="isInternal" value="false" />
														<Button
															type="submit"
															onclick={async (e) => {
																e.preventDefault();
																if (
																	await confirmDialog(
																		`Grant internal platform access to ${member.name}?`,
																		{ danger: false }
																	)
																)
																	(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
															}}
															variant="outline"
															size="sm"
															class="border-indigo-300 text-indigo-600 hover:bg-indigo-50"
														>
															Make internal
														</Button>
													</form>
												</TableCell>
											</TableRow>
										{/each}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					</div>
				{/if}
			</TabsContent>
		{/if}
	</Tabs>
</div>
