<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Icon from '@iconify/svelte';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardHeader, CardTitle, CardContent } from '$lib/components/ui/card';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="max-w-xl">
	<div class="mb-6">
		<a
			href={resolve('/dashboard/settings')}
			class="mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
		>
			<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Settings
		</a>
		<h1 class="text-2xl font-bold text-gray-900">Profile</h1>
		<p class="mt-0.5 text-sm text-gray-500">Update your personal information.</p>
	</div>

	<div class="space-y-6">
		<!-- Profile info -->
		<Card class="shadow-sm">
			<CardHeader>
				<CardTitle>Personal information</CardTitle>
			</CardHeader>
			<CardContent>
				{#if form?.profileError}
					<div
						class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
					>
						{form.profileError}
					</div>
				{/if}
				{#if form?.profileSuccess}
					<div
						class="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
					>
						Profile updated.
					</div>
				{/if}

				<form method="post" action="?/updateProfile" use:enhance class="space-y-4">
					<div>
						<Label class="mb-1 block" for="name">Name</Label>
						<Input
							id="name"
							name="name"
							type="text"
							required
							value={data.user.name}
						/>
					</div>
					<div>
						<Label class="mb-1 block" for="email">Email</Label>
						<Input
							id="email"
							type="email"
							value={data.user.email}
							disabled
						/>
						<p class="mt-1 text-xs text-gray-400">Email cannot be changed here.</p>
					</div>
					<div class="flex justify-end">
						<Button type="submit" variant="default">Save changes</Button>
					</div>
				</form>
			</CardContent>
		</Card>
	</div>
</div>
