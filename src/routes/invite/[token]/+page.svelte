<script lang="ts">
	import { enhance } from '$app/forms';
	import { signIn } from '$lib/auth-client';
	import { resolve } from '$app/paths';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showSignUp = $state(false);
	let loading = $state(false);

	const roleLabels: Record<string, string> = {
		owner: 'Owner',
		manager: 'Manager',
		kitchen: 'Kitchen',
		staff: 'Staff',
		viewer: 'Viewer'
	};

	async function signInWithGoogle() {
		loading = true;
		// After Google OAuth, user lands back here and load() auto-accepts
		await signIn.social({ provider: 'google', callbackURL: window.location.pathname });
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<h1 class="text-2xl font-bold text-gray-900">Order<span class="text-green-600">Local</span></h1>
		</div>

		{#if data.invalid}
			<div class="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
				<p class="mb-2 text-2xl">🔗</p>
				<h2 class="mb-1 text-lg font-semibold text-gray-900">Invalid invite</h2>
				<p class="text-sm text-gray-500">This invite link is not valid.</p>
				<a href={resolve('/login')} class="mt-4 inline-block text-sm text-blue-600 hover:underline"
					>Go to sign in</a
				>
			</div>
		{:else if data.expired}
			<div class="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
				<p class="mb-2 text-2xl">⏰</p>
				<h2 class="mb-1 text-lg font-semibold text-gray-900">Invite expired</h2>
				<p class="text-sm text-gray-500">
					This invite link has expired. Ask the team admin to send a new one.
				</p>
				<a href={resolve('/login')} class="mt-4 inline-block text-sm text-blue-600 hover:underline"
					>Go to sign in</a
				>
			</div>
		{:else if data.alreadyAccepted}
			<div class="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
				<p class="mb-2 text-2xl">✅</p>
				<h2 class="mb-1 text-lg font-semibold text-gray-900">Already accepted</h2>
				<p class="text-sm text-gray-500">This invite has already been used.</p>
				<a
					href={resolve('/tenants')}
					class="mt-4 inline-block text-sm text-blue-600 hover:underline">Go to dashboard</a
				>
			</div>
		{:else if data.wrongEmail}
			<div class="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
				<p class="mb-2 text-2xl">👤</p>
				<h2 class="mb-1 text-lg font-semibold text-gray-900">Wrong account</h2>
				<p class="mb-1 text-sm text-gray-500">
					This invite was sent to <strong>{data.invite?.email}</strong>.
				</p>
				<p class="text-sm text-gray-500">
					You're signed in as <strong>{data.wrongEmail}</strong>. Please sign in with the correct
					account.
				</p>
				<a href={resolve('/login')} class="mt-4 inline-block text-sm text-blue-600 hover:underline"
					>Switch account</a
				>
			</div>
		{:else if data.invite}
			<div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
				<!-- Invite summary -->
				<div class="mb-6 text-center">
					<h2 class="text-lg font-semibold text-gray-900">You've been invited</h2>
					<p class="mt-1 text-sm text-gray-500">
						Join <strong>{data.tenantName}</strong> as
						<span class="font-medium text-gray-700"
							>{roleLabels[data.invite.role] ?? data.invite.role}</span
						>
					</p>
					<p class="mt-1 text-xs text-gray-400">Invite sent to {data.invite.email}</p>
				</div>

				{#if form?.message}
					<div
						class="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
					>
						{form.message}
					</div>
				{/if}

				<!-- Google -->
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

				<div class="my-5 flex items-center gap-3">
					<div class="h-px flex-1 bg-gray-200"></div>
					<span class="text-xs text-gray-400">or</span>
					<div class="h-px flex-1 bg-gray-200"></div>
				</div>

				{#if !showSignUp}
					<!-- Sign in form -->
					<form method="post" action="?/signInAndAccept" use:enhance class="space-y-3">
						<div>
							<label class="mb-1 block text-xs font-medium text-gray-600" for="email">Email</label>
							<input
								id="email"
								name="email"
								type="email"
								required
								value={data.invite.email}
								class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							/>
						</div>
						<div>
							<label class="mb-1 block text-xs font-medium text-gray-600" for="password"
								>Password</label
							>
							<input
								id="password"
								name="password"
								type="password"
								required
								placeholder="••••••••"
								class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							/>
						</div>
						<button
							type="submit"
							class="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
						>
							Sign in &amp; accept invite
						</button>
					</form>

					<button
						type="button"
						onclick={() => (showSignUp = true)}
						class="mt-4 w-full text-center text-xs text-gray-400 transition-colors hover:text-gray-600"
					>
						Don't have an account? Create one
					</button>
				{:else}
					<!-- Sign up form -->
					<form method="post" action="?/signUpAndAccept" use:enhance class="space-y-3">
						<div>
							<label class="mb-1 block text-xs font-medium text-gray-600" for="name">Name</label>
							<input
								id="name"
								name="name"
								type="text"
								required
								placeholder="Your name"
								class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							/>
						</div>
						<div>
							<label class="mb-1 block text-xs font-medium text-gray-600" for="signup-email"
								>Email</label
							>
							<input
								id="signup-email"
								name="email"
								type="email"
								required
								value={data.invite.email}
								class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							/>
						</div>
						<div>
							<label class="mb-1 block text-xs font-medium text-gray-600" for="signup-password"
								>Password</label
							>
							<input
								id="signup-password"
								name="password"
								type="password"
								required
								placeholder="••••••••"
								class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
							/>
						</div>
						<button
							type="submit"
							class="w-full rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-700"
						>
							Create account &amp; accept invite
						</button>
					</form>

					<button
						type="button"
						onclick={() => (showSignUp = false)}
						class="mt-4 w-full text-center text-xs text-gray-400 transition-colors hover:text-gray-600"
					>
						Already have an account? Sign in
					</button>
				{/if}
			</div>
		{/if}
	</div>
</div>
