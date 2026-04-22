<script lang="ts">
	import { signIn, authClient } from '$lib/auth-client';
	let loading = $state(false);
	let magicEmail = $state('');
	let magicSent = $state(false);
	let magicError = $state<string | null>(null);

	async function signInWithGoogle() {
		loading = true;
		await signIn.social({ provider: 'google', callbackURL: `${window.location.origin}/tenants` });
	}

	async function sendMagicLink(e: SubmitEvent) {
		e.preventDefault();
		if (!magicEmail) return;
		loading = true;
		magicError = null;
		const { error } = await authClient.signIn.magicLink({
			email: magicEmail,
			callbackURL: `${window.location.origin}/tenants`
		});
		loading = false;
		if (error) {
			magicError = error.message ?? 'Failed to send link. Please try again.';
		} else {
			magicSent = true;
		}
	}
</script>

<div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
	<!-- Google button -->
	<button
		onclick={signInWithGoogle}
		disabled={loading}
		class="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-60"
	>
		<svg class="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
			<path
				fill="#4285F4"
				d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
			/>
			<path
				fill="#34A853"
				d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
			/>
			<path
				fill="#FBBC05"
				d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
			/>
			<path
				fill="#EA4335"
				d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
			/>
		</svg>
		{loading ? 'Redirecting…' : 'Continue with Google'}
	</button>

	<!-- Divider -->
	<div class="my-5 flex items-center gap-3">
		<div class="h-px flex-1 bg-gray-200"></div>
		<span class="text-xs text-gray-400">or</span>
		<div class="h-px flex-1 bg-gray-200"></div>
	</div>

	<!-- Magic link form -->
	{#if magicSent}
		<div class="rounded-lg border border-green-200 bg-green-50 px-4 py-4 text-center">
			<p class="text-sm font-medium text-green-800">Check your email</p>
			<p class="mt-1 text-sm text-green-700">
				We sent a sign-in link to <strong>{magicEmail}</strong>.
			</p>
			<button
				onclick={() => {
					magicSent = false;
					magicEmail = '';
				}}
				class="mt-3 text-xs text-green-600 underline hover:text-green-800"
				>Use a different email</button
			>
		</div>
	{:else}
		<form onsubmit={sendMagicLink} class="space-y-3">
			<div>
				<label class="mb-1 block text-xs font-medium text-gray-600" for="magic-email">Email</label>
				<input
					id="magic-email"
					type="email"
					required
					bind:value={magicEmail}
					placeholder="you@example.com"
					class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
				/>
			</div>
			{#if magicError}
				<div class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
					{magicError}
				</div>
			{/if}
			<button
				type="submit"
				disabled={loading}
				class="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-60"
			>
				{loading ? 'Sending…' : 'Send sign-in link'}
			</button>
		</form>
	{/if}
</div>
