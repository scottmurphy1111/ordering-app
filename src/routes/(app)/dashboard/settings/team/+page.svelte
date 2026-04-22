<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import type { PageData, ActionData } from './$types';
	import Icon from '@iconify/svelte';

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
		staff: 'bg-gray-100 text-gray-600',
		viewer: 'bg-gray-100 text-gray-500'
	};

	const nonInternalMembers = $derived(data.members.filter((m) => !m.isInternal));
</script>

<div>
	<div class="mb-6">
		<a
			href="/dashboard/settings"
			class="mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
		>
			<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Settings
		</a>
		<h1 class="text-2xl font-bold text-gray-900">Team</h1>
		<p class="mt-0.5 text-sm text-gray-500">Manage who has access to this tenant.</p>
	</div>

	<!-- Tabs -->
	<div class="mb-6 flex gap-1 border-b border-gray-200">
		<button
			onclick={() => (tab = 'members')}
			class="-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors
				{tab === 'members'
				? 'border-gray-900 text-gray-900'
				: 'border-transparent text-gray-500 hover:text-gray-700'}"
		>
			Members
		</button>
		{#if data.canManageInternal}
			<button
				onclick={() => (tab = 'internal')}
				class="-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors
					{tab === 'internal'
					? 'border-gray-900 text-gray-900'
					: 'border-transparent text-gray-500 hover:text-gray-700'}"
			>
				Internal users
				{#if data.internalUsers.length > 0}
					<span class="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500">
						{data.internalUsers.length}
					</span>
				{/if}
			</button>
		{/if}
	</div>

	<!-- ── MEMBERS TAB ── -->
	{#if tab === 'members'}
		{#if form?.addError}
			<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
				{form.addError}
			</div>
		{/if}
		{#if form?.error}
			<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
				{form.error}
			</div>
		{/if}
		{#if form?.addSuccess}
			<div
				class="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
			>
				Member added.
			</div>
		{/if}
		{#if form?.inviteError}
			<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
				{form.inviteError}
			</div>
		{/if}

		{#if data.currentRole === 'owner' || data.currentRole === 'manager'}
			<div class="mb-5 flex gap-2">
				{#if !showAddForm}
					<button
						onclick={() => {
							showAddForm = true;
							showInviteForm = false;
						}}
						class="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-400 hover:bg-gray-100"
					>
						+ Add existing member
					</button>
				{/if}
				{#if !showInviteForm}
					<button
						onclick={() => {
							showInviteForm = true;
							showAddForm = false;
						}}
						class="rounded-md border border-blue-300 bg-blue-50 px-4 py-2 text-sm text-blue-700 transition-colors hover:bg-blue-100"
					>
						+ Invite by link
					</button>
				{/if}
			</div>

			{#if showAddForm}
				<form
					method="post"
					action="?/addMember"
					use:enhance={() =>
						({ update }) => {
							update();
							showAddForm = false;
						}}
					class="mb-5 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
				>
					<h2 class="mb-3 text-sm font-semibold text-gray-800">Add member by email</h2>
					<div class="flex flex-wrap gap-2">
						<input
							name="email"
							type="email"
							required
							placeholder="user@example.com"
							class="min-w-48 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						/>
						<select
							name="role"
							class="rounded-md border border-gray-300 px-3 py-2 pr-8 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						>
							{#each data.roles as role (role)}
								{#if role !== 'owner' || data.currentRole === 'owner'}
									<option value={role}>{roleLabels[role]}</option>
								{/if}
							{/each}
						</select>
						<button
							type="submit"
							class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
						>
							Add
						</button>
						<button
							type="button"
							onclick={() => (showAddForm = false)}
							class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-100"
						>
							Cancel
						</button>
					</div>
					<p class="mt-2 text-xs text-gray-400">
						The user must already have an account. They'll have access on their next login.
					</p>
				</form>
			{/if}

			{#if showInviteForm}
				<form
					method="post"
					action="?/sendInvite"
					use:enhance={() =>
						({ update }) => {
							update();
							showInviteForm = false;
						}}
					class="mb-5 rounded-lg border border-blue-200 bg-blue-50 p-4 shadow-sm"
				>
					<h2 class="mb-1 text-sm font-semibold text-gray-800">Invite by link</h2>
					<p class="mb-3 text-xs text-gray-500">
						Generate a 7-day invite link — works even if they don't have an account yet.
					</p>
					<div class="flex flex-wrap gap-2">
						<input
							name="email"
							type="email"
							required
							placeholder="user@example.com"
							class="min-w-48 flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						/>
						<select
							name="role"
							class="rounded-md border border-gray-300 px-3 py-2 pr-8 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						>
							{#each data.roles as role (role)}
								{#if role !== 'owner' || data.currentRole === 'owner'}
									<option value={role}>{roleLabels[role]}</option>
								{/if}
							{/each}
						</select>
						<button
							type="submit"
							class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
						>
							Generate link
						</button>
						<button
							type="button"
							onclick={() => (showInviteForm = false)}
							class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-100"
						>
							Cancel
						</button>
					</div>
				</form>
			{/if}

			<!-- Show the generated invite link -->
			{#if inviteUrl}
				<div class="mb-5 rounded-lg border border-green-200 bg-green-50 p-4">
					<p class="mb-1 text-sm font-medium text-green-800">
						Invite link for <span class="font-semibold">{inviteEmail}</span>
					</p>
					<p class="mb-2 text-xs text-gray-500">Share this link with them — expires in 7 days.</p>
					<div class="flex items-center gap-2">
						<input
							type="text"
							readonly
							value={inviteUrl}
							class="flex-1 rounded-md border border-green-300 bg-white px-3 py-2 text-xs text-gray-700 focus:outline-none"
						/>
						<button
							type="button"
							onclick={() => copyLink(inviteUrl!, 'new')}
							class="shrink-0 rounded-md border border-green-300 bg-white px-3 py-2 text-xs text-green-700 transition-colors hover:bg-green-100"
						>
							{copiedToken === 'new' ? 'Copied!' : 'Copy'}
						</button>
					</div>
				</div>
			{/if}
		{/if}

		<div class="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
			<table class="w-full text-sm">
				<thead class="border-b border-gray-200 bg-gray-50">
					<tr>
						<th class="px-4 py-2.5 text-left font-medium text-gray-500">User</th>
						<th class="px-4 py-2.5 text-left font-medium text-gray-500">Role</th>
						<th class="hidden px-4 py-2.5 text-left font-medium text-gray-500 sm:table-cell"
							>Added</th
						>
						<th class="px-4 py-2.5"></th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-100">
					{#each data.members as member (member.userId)}
						<tr class="transition-colors hover:bg-gray-50">
							<td class="px-4 py-3">
								<p class="font-medium text-gray-900">
									{member.name}
									{#if member.userId === data.currentUserId}
										<span class="ml-1 text-xs text-gray-400">(you)</span>
									{/if}
									{#if member.isInternal}
										<span
											class="ml-1 rounded-full bg-indigo-100 px-1.5 py-0.5 text-xs font-medium text-indigo-600"
											>internal</span
										>
									{/if}
								</p>
								<p class="text-xs text-gray-400">{member.email}</p>
							</td>
							<td class="px-4 py-3">
								{#if (data.currentRole === 'owner' || data.currentRole === 'manager') && member.userId !== data.currentUserId}
									<form method="post" action="?/changeRole" use:enhance>
										<input type="hidden" name="userId" value={member.userId} />
										<select
											name="role"
											onchange={(e) => (e.target as HTMLSelectElement).form?.requestSubmit()}
											class="rounded-md border border-gray-200 px-2 py-1 pr-6 text-xs focus:border-blue-500 focus:outline-none"
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
									<span
										class="rounded-full px-2 py-0.5 text-xs font-medium {roleColors[member.role] ??
											'bg-gray-100 text-gray-600'}"
									>
										{roleLabels[member.role] ?? member.role}
									</span>
								{/if}
							</td>
							<td class="hidden px-4 py-3 text-xs text-gray-400 sm:table-cell">
								{new Date(member.assignedAt).toLocaleDateString([], {
									month: 'short',
									day: 'numeric',
									year: 'numeric'
								})}
							</td>
							<td class="px-4 py-3 text-right">
								{#if member.userId !== data.currentUserId && (data.currentRole === 'owner' || data.currentRole === 'manager')}
									<div class="flex items-center justify-end gap-3">
										{#if data.canManageInternal && !member.isInternal}
											<form method="post" action="?/toggleInternal" use:enhance>
												<input type="hidden" name="userId" value={member.userId} />
												<input type="hidden" name="isInternal" value="false" />
												<button
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
													class="hidden text-xs text-indigo-500 transition-colors hover:text-indigo-700 sm:inline"
												>
													Make internal
												</button>
											</form>
										{/if}
										<form method="post" action="?/removeMember" use:enhance>
											<input type="hidden" name="userId" value={member.userId} />
											<button
												type="submit"
												onclick={async (e) => {
													e.preventDefault();
													if (await confirmDialog(`Remove ${member.name} from this tenant?`))
														(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
												}}
												class="text-xs text-red-500 transition-colors hover:text-red-700"
											>
												Remove
											</button>
										</form>
									</div>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pending invitations -->
		{#if data.pendingInvitations.length > 0}
			<div class="mt-6">
				<h2 class="mb-3 text-sm font-semibold text-gray-700">
					Pending invitations
					<span
						class="ml-1.5 rounded-full bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-700"
					>
						{data.pendingInvitations.length}
					</span>
				</h2>
				<div class="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
					<table class="w-full text-sm">
						<thead class="border-b border-gray-200 bg-gray-50">
							<tr>
								<th class="px-4 py-2.5 text-left font-medium text-gray-500">Email</th>
								<th class="px-4 py-2.5 text-left font-medium text-gray-500">Role</th>
								<th class="hidden px-4 py-2.5 text-left font-medium text-gray-500 sm:table-cell"
									>Expires</th
								>
								<th class="px-4 py-2.5"></th>
							</tr>
						</thead>
						<tbody class="divide-y divide-gray-100">
							{#each data.pendingInvitations as invite (invite.id)}
								<tr class="transition-colors hover:bg-gray-50">
									<td class="max-w-40 min-w-0 truncate px-4 py-3 text-gray-700">{invite.email}</td>
									<td class="px-4 py-3">
										<span
											class="rounded-full px-2 py-0.5 text-xs font-medium {roleColors[
												invite.role
											] ?? 'bg-gray-100 text-gray-600'}"
										>
											{roleLabels[invite.role] ?? invite.role}
										</span>
									</td>
									<td class="hidden px-4 py-3 text-xs text-gray-400 sm:table-cell">
										{new Date(invite.expiresAt).toLocaleDateString([], {
											month: 'short',
											day: 'numeric',
											year: 'numeric'
										})}
									</td>
									<td class="px-4 py-3 text-right">
										<div class="flex items-center justify-end gap-3">
											<button
												type="button"
												onclick={() => copyLink(`${data.origin}/invite/${invite.id}`, invite.id)}
												class="text-xs text-blue-500 transition-colors hover:text-blue-700"
											>
												{copiedToken === invite.id ? 'Copied!' : 'Copy link'}
											</button>
											<form method="post" action="?/cancelInvite" use:enhance>
												<input type="hidden" name="id" value={invite.id} />
												<button
													type="submit"
													onclick={async (e) => {
														e.preventDefault();
														if (await confirmDialog(`Cancel invite for ${invite.email}?`))
															(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
													}}
													class="text-xs text-red-500 transition-colors hover:text-red-700"
												>
													Cancel
												</button>
											</form>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}

	<!-- ── INTERNAL TAB ── -->
	{#if tab === 'internal' && data.canManageInternal}
		<div
			class="mb-5 rounded-md border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700"
		>
			Internal users are platform-level staff with access to all tenants. This is separate from
			tenant membership roles.
		</div>

		{#if data.internalUsers.length === 0}
			<div class="mb-6 rounded-xl border border-dashed border-gray-300 p-10 text-center">
				<p class="text-sm text-gray-400">No internal users yet.</p>
				<p class="mt-1 text-xs text-gray-400">
					Promote a tenant member using "Make internal" on the Members tab.
				</p>
			</div>
		{:else}
			<div class="mb-6 overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
				<table class="w-full text-sm">
					<thead class="border-b border-gray-200 bg-gray-50">
						<tr>
							<th class="px-4 py-2.5 text-left font-medium text-gray-500">User</th>
							<th class="hidden px-4 py-2.5 text-left font-medium text-gray-500 sm:table-cell"
								>Account created</th
							>
							<th class="px-4 py-2.5"></th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-100">
						{#each data.internalUsers as u (u.id)}
							<tr class="transition-colors hover:bg-gray-50">
								<td class="px-4 py-3">
									<p class="font-medium text-gray-900">{u.name}</p>
									<p class="text-xs text-gray-400">{u.email}</p>
								</td>
								<td class="hidden px-4 py-3 text-xs text-gray-400 sm:table-cell">
									{new Date(u.createdAt).toLocaleDateString([], {
										month: 'short',
										day: 'numeric',
										year: 'numeric'
									})}
								</td>
								<td class="px-4 py-3 text-right">
									<form method="post" action="?/toggleInternal" use:enhance>
										<input type="hidden" name="userId" value={u.id} />
										<input type="hidden" name="isInternal" value="true" />
										<button
											type="submit"
											onclick={async (e) => {
												e.preventDefault();
												if (await confirmDialog(`Revoke internal access for ${u.name}?`))
													(e.currentTarget as HTMLButtonElement).form?.requestSubmit();
											}}
											class="text-xs text-red-500 transition-colors hover:text-red-700"
										>
											Revoke internal
										</button>
									</form>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		<!-- Quick promote from current tenant members -->
		{#if nonInternalMembers.length > 0}
			<div>
				<h2 class="mb-3 text-sm font-semibold text-gray-700">
					Promote a current member to internal
				</h2>
				<div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
					<table class="w-full text-sm">
						<tbody class="divide-y divide-gray-100">
							{#each nonInternalMembers as member (member.userId)}
								<tr class="transition-colors hover:bg-gray-50">
									<td class="px-4 py-3">
										<p class="font-medium text-gray-900">{member.name}</p>
										<p class="text-xs text-gray-400">{member.email}</p>
									</td>
									<td class="px-4 py-3 text-right">
										<form method="post" action="?/toggleInternal" use:enhance>
											<input type="hidden" name="userId" value={member.userId} />
											<input type="hidden" name="isInternal" value="false" />
											<button
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
												class="rounded-md border border-indigo-300 px-3 py-1 text-xs text-indigo-600 transition-colors hover:bg-indigo-50"
											>
												Make internal
											</button>
										</form>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}
</div>
