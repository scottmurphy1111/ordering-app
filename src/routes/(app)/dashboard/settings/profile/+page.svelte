<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Icon from '@iconify/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

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

	</div>
</div>
