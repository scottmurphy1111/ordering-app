<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Icon from '@iconify/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showCurrentPassword = $state(false);
	let showNewPassword = $state(false);
	let showConfirmPassword = $state(false);
</script>

<div class="max-w-xl">
	<div class="mb-6">
		<a href="/dashboard/settings" class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-1">
			<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Settings
		</a>
		<h1 class="text-2xl font-bold text-gray-900">Profile</h1>
		<p class="mt-0.5 text-sm text-gray-500">Update your personal information.</p>
	</div>

	<div class="space-y-6">
		<!-- Profile info -->
		<div class="rounded-xl border border-gray-200 bg-white shadow-sm">
			<div class="border-b border-gray-100 px-5 py-4">
				<h2 class="text-sm font-semibold text-gray-900">Personal information</h2>
			</div>
			<div class="px-5 py-5">
				{#if form?.profileError}
					<div class="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{form.profileError}</div>
				{/if}
				{#if form?.profileSuccess}
					<div class="mb-4 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">Profile updated.</div>
				{/if}

				<form method="post" action="?/updateProfile" use:enhance class="space-y-4">
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1" for="name">Name</label>
						<input
							id="name"
							name="name"
							type="text"
							required
							value={data.user.name}
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
						/>
					</div>
					<div>
						<label class="block text-sm font-medium text-gray-700 mb-1" for="email">Email</label>
						<input
							id="email"
							type="email"
							value={data.user.email}
							disabled
							class="w-full rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
						/>
						<p class="mt-1 text-xs text-gray-400">Email cannot be changed here.</p>
					</div>
					<div class="flex justify-end">
						<button
							type="submit"
							class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
						>
							Save changes
						</button>
					</div>
				</form>
			</div>
		</div>

		<!-- Change password -->
		{#if data.hasPassword}
			<div class="rounded-xl border border-gray-200 bg-white shadow-sm">
				<div class="border-b border-gray-100 px-5 py-4">
					<h2 class="text-sm font-semibold text-gray-900">Change password</h2>
				</div>
				<div class="px-5 py-5">
					{#if form?.passwordError}
						<div class="mb-4 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{form.passwordError}</div>
					{/if}
					{#if form?.passwordSuccess}
						<div class="mb-4 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">Password updated.</div>
					{/if}

					<form method="post" action="?/changePassword" use:enhance class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1" for="currentPassword">Current password</label>
							<div class="relative">
								<input
									id="currentPassword"
									name="currentPassword"
									type={showCurrentPassword ? 'text' : 'password'}
									required
									autocomplete="current-password"
									class="w-full rounded-md border border-gray-300 px-3 py-2 pr-16 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
								/>
								<button
									type="button"
									onclick={() => (showCurrentPassword = !showCurrentPassword)}
									class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
								>{showCurrentPassword ? 'Hide' : 'Show'}</button>
							</div>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1" for="newPassword">New password</label>
							<div class="relative">
								<input
									id="newPassword"
									name="newPassword"
									type={showNewPassword ? 'text' : 'password'}
									required
									minlength="8"
									autocomplete="new-password"
									class="w-full rounded-md border border-gray-300 px-3 py-2 pr-16 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
								/>
								<button
									type="button"
									onclick={() => (showNewPassword = !showNewPassword)}
									class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
								>{showNewPassword ? 'Hide' : 'Show'}</button>
							</div>
						</div>
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1" for="confirmPassword">Confirm new password</label>
							<div class="relative">
								<input
									id="confirmPassword"
									name="confirmPassword"
									type={showConfirmPassword ? 'text' : 'password'}
									required
									minlength="8"
									autocomplete="new-password"
									class="w-full rounded-md border border-gray-300 px-3 py-2 pr-16 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
								/>
								<button
									type="button"
									onclick={() => (showConfirmPassword = !showConfirmPassword)}
									class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
								>{showConfirmPassword ? 'Hide' : 'Show'}</button>
							</div>
						</div>
						<div class="flex justify-end">
							<button
								type="submit"
								class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
							>
								Update password
							</button>
						</div>
					</form>
				</div>
			</div>
		{:else}
			<div class="rounded-xl border border-gray-200 bg-white shadow-sm px-5 py-4">
				<p class="text-sm text-gray-500">You signed in with Google. Password management is handled by your Google account.</p>
			</div>
		{/if}
	</div>
</div>
