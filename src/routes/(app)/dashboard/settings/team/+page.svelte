<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import type { PageData, ActionData } from './$types';
	import Icon from '@iconify/svelte';
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
	import {
		Table,
		TableHeader,
		TableHead,
		TableBody,
		TableRow,
		TableCell
	} from '$lib/components/ui/table';
	import { Alert } from '$lib/components/ui/alert';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showAddForm = $state(false);
	let showInviteForm = $state(false);
	let addRoleValue = $state('');
	let inviteRoleValue = $state('');
	let copiedToken = $state<string | null>(null);
	let submittingRemoveMemberId = $state<string | null>(null);
	let submittingCancelInviteId = $state<string | null>(null);

	const inviteUrl = $derived((form as { inviteUrl?: string } | null)?.inviteUrl ?? null);
	const inviteEmail = $derived((form as { inviteEmail?: string } | null)?.inviteEmail ?? null);

	async function copyLink(url: string, id: string) {
		await navigator.clipboard.writeText(url);
		copiedToken = id;
		setTimeout(() => (copiedToken = null), 2000);
	}

	const roleLabels: Record<string, string> = {
		owner: 'Owner',
		admin: 'Admin',
		staff: 'Staff',
		viewer: 'Viewer'
	};
	const roleColors: Record<string, string> = {
		owner: 'bg-purple-100 text-purple-700',
		admin: 'bg-blue-100 text-blue-700',
		staff: 'bg-muted text-muted-foreground',
		viewer: 'bg-muted text-muted-foreground'
	};


</script>

<div>
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-foreground">Team</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">Manage who has access to this vendor.</p>
	</div>

	<div>
		{#if form?.addError}
				<Alert severity="error" class="mb-4">{form.addError}</Alert>
			{/if}
			{#if form?.error}
				<Alert severity="error" class="mb-4">{form.error}</Alert>
			{/if}
			{#if form?.addSuccess}
				<Alert severity="success" class="mb-4">Member added.</Alert>
			{/if}
			{#if form?.inviteError}
				<Alert severity="error" class="mb-4">{form.inviteError}</Alert>
			{/if}

			{#if data.currentRole === 'owner' || data.currentRole === 'admin'}
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
									<Select type="single" name="role" bind:value={addRoleValue}>
										<SelectTrigger class="w-auto">
											<SelectValue>{roleLabels[addRoleValue] ?? 'Role'}</SelectValue>
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
									<Select type="single" name="role" bind:value={inviteRoleValue}>
										<SelectTrigger class="w-auto">
											<SelectValue>{roleLabels[inviteRoleValue] ?? 'Role'}</SelectValue>
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
							<Button type="button" onclick={() => copyLink(inviteUrl!, 'new')} variant="outline">
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
								<TableHead class="hidden px-4 py-2.5 md:table-cell">Added</TableHead>
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
										</p>
										<p class="text-xs text-muted-foreground">{member.email}</p>
									</TableCell>
									<TableCell class="px-4 py-3">
										{#if (data.currentRole === 'owner' || data.currentRole === 'admin') && member.userId !== data.currentUserId}
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
									<TableCell class="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell">
										{new Date(member.assignedAt).toLocaleDateString([], {
											month: 'short',
											day: 'numeric',
											year: 'numeric'
										})}
									</TableCell>
									<TableCell class="px-4 py-3 text-right">
										{#if member.userId !== data.currentUserId && (data.currentRole === 'owner' || data.currentRole === 'admin')}
											<div class="flex flex-col items-stretch gap-1 md:flex-row md:items-center md:justify-end md:gap-3">
												<form method="post" action="?/removeMember" use:enhance={() => {
													submittingRemoveMemberId = member.userId;
													return async ({ update }) => {
														submittingRemoveMemberId = null;
														await update();
													};
												}}>
													<input type="hidden" name="userId" value={member.userId} />
													<Button
														type="submit"
														onclick={async (e) => {
															e.preventDefault();
															const form = (e.currentTarget as HTMLButtonElement).form;
															if (await confirmDialog(`Remove ${member.name} from this vendor?`))
																form?.requestSubmit();
														}}
														disabled={submittingRemoveMemberId !== null}
														variant="ghost"
														class="w-full text-red-500 hover:bg-red-50 hover:text-red-600 md:w-auto"
													>
														{#if submittingRemoveMemberId === member.userId}
															<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
															Removing...
														{:else}
															Remove
														{/if}
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
										<TableHead class="hidden px-4 py-2.5 md:table-cell">Expires</TableHead>
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
												class="hidden px-4 py-3 text-xs text-muted-foreground md:table-cell"
											>
												{new Date(invite.expiresAt).toLocaleDateString([], {
													month: 'short',
													day: 'numeric',
													year: 'numeric'
												})}
											</TableCell>
											<TableCell class="px-4 py-3 text-right">
												<div class="flex flex-col items-stretch gap-1 md:flex-row md:items-center md:justify-end md:gap-3">
													<Button
														type="button"
														onclick={() =>
															copyLink(`${data.origin}/invite/${invite.id}`, invite.id)}
														variant="ghost"
														class="w-full text-blue-500 hover:text-blue-700 md:w-auto"
													>
														{copiedToken === invite.id ? 'Copied!' : 'Copy link'}
													</Button>
													<form method="post" action="?/cancelInvite" use:enhance={() => {
														submittingCancelInviteId = invite.id;
														return async ({ update }) => {
															submittingCancelInviteId = null;
															await update();
														};
													}}>
														<input type="hidden" name="id" value={invite.id} />
														<Button
															type="submit"
															disabled={submittingCancelInviteId !== null}
															onclick={async (e) => {
																e.preventDefault();
																const form = (e.currentTarget as HTMLButtonElement).form;
																if (await confirmDialog(`Cancel invite for ${invite.email}?`))
																	form?.requestSubmit();
															}}
															variant="ghost"
															class="w-full text-red-500 hover:bg-red-50 hover:text-red-600 md:w-auto"
														>
															{#if submittingCancelInviteId === invite.id}
																<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
																Cancelling...
															{:else}
																Cancel
															{/if}
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
	</div>
</div>
