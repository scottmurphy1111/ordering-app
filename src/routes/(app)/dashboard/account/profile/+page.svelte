<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Alert } from '$lib/components/ui/alert';
	import { signOut } from '$lib/auth-client';
	import { confirmDialog } from '$lib/confirm.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const memberSince = $derived(
		new Date(data.user.createdAt).toLocaleDateString('en-US', {
			month: 'long',
			year: 'numeric'
		})
	);

	async function handleSignOut() {
		if (!(await confirmDialog('Sign out of your account?'))) return;
		signOut({
			fetchOptions: {
				onSuccess: () => {
					window.location.href = '/login';
				}
			}
		});
	}

	let avatarInput = $state<HTMLInputElement | null>(null);
	let avatarUploading = $state(false);
	let avatarError = $state('');

	async function uploadAvatar(file: File) {
		const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
		if (!allowedTypes.includes(file.type)) {
			avatarError = 'Please select a JPG, PNG, or WebP file';
			return;
		}
		if (file.size > 2 * 1024 * 1024) {
			avatarError = 'File size must be less than 2MB';
			return;
		}
		avatarUploading = true;
		avatarError = '';
		try {
			const fd = new FormData();
			fd.append('avatar', file);
			const res = await fetch('/api/upload-avatar', { method: 'POST', body: fd });
			const result = await res.json();
			if (result.success) {
				window.location.reload();
			} else {
				avatarError = result.error ?? 'Upload failed';
			}
		} catch {
			avatarError = 'Network error during upload';
		} finally {
			avatarUploading = false;
		}
	}
</script>

<div class="max-w-xl">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-foreground">Profile</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">Update your personal information.</p>
	</div>

	<div class="space-y-6">
		<!-- Avatar -->
		<Card class="shadow-sm">
			<CardHeader>
				<CardTitle>Avatar</CardTitle>
			</CardHeader>
			<CardContent>
				{#if avatarError}
					<Alert severity="error" class="mb-4">{avatarError}</Alert>
				{/if}
				<div class="flex items-center gap-4">
					<div
						class="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-xl font-medium text-white"
					>
						{#if data.user.image}
							<img src={data.user.image} alt="Avatar" class="h-full w-full object-cover" />
						{:else}
							{data.user.email.split('@')[0]?.[0]?.toUpperCase() ?? '?'}
						{/if}
					</div>
					<div class="flex flex-wrap items-center gap-2">
						<input
							bind:this={avatarInput}
							type="file"
							accept="image/jpeg,image/png,image/webp"
							onchange={(e) => {
								const f = (e.target as HTMLInputElement).files?.[0];
								if (f) uploadAvatar(f);
							}}
							class="hidden"
						/>
						<Button
							type="button"
							variant="default"
							onclick={() => avatarInput?.click()}
							disabled={avatarUploading}
						>
							{avatarUploading ? 'Uploading…' : data.user.image ? 'Replace' : 'Upload'}
						</Button>
						{#if data.user.image}
							<form method="post" action="?/removeAvatar" use:enhance>
								<Button
									type="submit"
									variant="ghost"
									class="text-red-600 hover:bg-destructive/10 hover:text-red-500"
								>
									Remove
								</Button>
							</form>
						{/if}
					</div>
				</div>
				<p class="mt-3 text-xs text-muted-foreground">JPG, PNG, or WebP · max 2MB</p>
			</CardContent>
		</Card>

		<!-- Profile info -->
		<Card class="shadow-sm">
			<CardHeader>
				<CardTitle>Personal information</CardTitle>
			</CardHeader>
			<CardContent>
				{#if form?.profileError}
					<Alert severity="error" class="mb-4">{form.profileError}</Alert>
				{/if}
				{#if form?.profileSuccess}
					<Alert severity="success" class="mb-4">Profile updated.</Alert>
				{/if}

				<form
					id="profile-form"
					method="post"
					action="?/updateProfile"
					use:enhance
					class="space-y-4"
				>
					<div>
						<Label class="mb-1 block" for="name">Name</Label>
						<Input id="name" name="name" type="text" required value={data.user.name} />
					</div>
					<div>
						<Label class="mb-1 block" for="email">Email</Label>
						<Input id="email" type="email" value={data.user.email} disabled />
						<p class="mt-1 text-xs text-muted-foreground">Email cannot be changed here.</p>
					</div>
				</form>
			</CardContent>
			<CardFooter>
				<Button type="submit" form="profile-form" variant="default">Save changes</Button>
			</CardFooter>
		</Card>

		<!-- Account metadata -->
		<Card class="shadow-sm">
			<CardHeader>
				<CardTitle>Account</CardTitle>
			</CardHeader>
			<CardContent class="space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-sm text-muted-foreground">Member since</span>
					<span class="text-sm font-medium text-foreground">{memberSince}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-sm text-muted-foreground">Email verification</span>
					{#if data.user.emailVerified}
						<span
							class="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success"
						>
							<Icon icon="mdi:check-circle-outline" class="h-3 w-3" />
							Verified
						</span>
					{:else}
						<span
							class="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
						>
							<Icon icon="mdi:alert-outline" class="h-3 w-3" />
							Unverified — contact support
						</span>
					{/if}
				</div>
			</CardContent>
		</Card>

		<!-- Sign out -->
		<Card class="shadow-sm">
			<CardContent>
				<div class="flex items-center justify-between gap-3">
					<div>
						<p class="text-sm font-semibold text-foreground">Sign out</p>
						<p class="text-xs text-muted-foreground">Sign out of your account on this device.</p>
					</div>
					<Button
						type="button"
						variant="outline"
						class="text-red-600 hover:bg-red-50 hover:text-red-700"
						onclick={handleSignOut}
					>
						<Icon icon="mdi:logout" class="h-4 w-4" />
						Sign out
					</Button>
				</div>
			</CardContent>
		</Card>
	</div>
</div>
