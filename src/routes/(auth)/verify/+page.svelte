<script lang="ts">
	import { page } from '$app/state';
	import Icon from '@iconify/svelte';

	const token = $derived(page.url.searchParams.get('token'));
	const callbackURL = $derived(page.url.searchParams.get('callbackURL') ?? '/tenants');

	// Build the real better-auth verify URL - navigating here creates the session
	const verifyHref = $derived(
		token
			? `/api/auth/magic-link/verify?token=${encodeURIComponent(token)}&callbackURL=${encodeURIComponent(callbackURL)}`
			: null
	);
</script>

<div class="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
	{#if !token || !verifyHref}
		<Icon icon="mdi:link-off" class="mx-auto mb-3 h-8 w-8 text-gray-300" />
		<p class="text-sm font-medium text-gray-700">Invalid link</p>
		<p class="mt-1 text-sm text-gray-400">This sign-in link is missing or malformed.</p>
		<a href="/login" class="mt-4 inline-block text-sm text-green-600 hover:underline"
			>Back to sign in</a
		>
	{:else}
		<Icon icon="mdi:email-check-outline" class="mx-auto mb-3 h-8 w-8 text-green-500" />
		<p class="text-sm font-medium text-gray-700">Ready to sign in</p>
		<p class="mt-1 mb-5 text-sm text-gray-400">Click the button below to complete your sign-in.</p>
		<a
			href={verifyHref}
			class="block w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
		>
			Sign in to Order Local
		</a>
	{/if}
</div>
