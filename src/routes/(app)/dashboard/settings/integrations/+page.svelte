<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showKeyInput = $state(false);
	let showKey = $state(false);
</script>

<div>
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-900">Integrations</h1>
		<p class="text-sm text-gray-500 mt-0.5">Connect third-party services to your account.</p>
	</div>

	<div class="rounded-xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
		<!-- Stripe -->
		<div class="px-5 py-4">
			<div class="flex items-start justify-between gap-4">
				<div class="flex items-center gap-3">
					<!-- Stripe logo mark -->
					<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#635BFF]">
						<svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
							<path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"/>
						</svg>
					</div>
					<div>
						<p class="font-medium text-gray-900">Stripe</p>
						<p class="text-xs text-gray-500 mt-0.5">Discover and import products from your Stripe account</p>
					</div>
				</div>
				<div class="shrink-0">
					{#if data.hasStripeKey}
						<span class="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
							<span class="h-1.5 w-1.5 rounded-full bg-green-500"></span>
							Connected
						</span>
					{:else}
						<span class="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500">
							Not connected
						</span>
					{/if}
				</div>
			</div>

			{#if form?.error}
				<div class="mt-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{form.error}</div>
			{/if}
			{#if form?.success}
				<div class="mt-3 rounded-md bg-green-50 border border-green-200 px-3 py-2 text-sm text-green-700">Stripe connected successfully.</div>
			{/if}
			{#if form?.cleared}
				<div class="mt-3 rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-600">Stripe key removed.</div>
			{/if}

			<div class="mt-4 flex flex-wrap gap-2">
				{#if !data.hasStripeKey}
					{#if !showKeyInput}
						<button
							onclick={() => (showKeyInput = true)}
							class="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
						>
							Connect Stripe
						</button>
					{:else}
						<form
							method="post"
							action="?/saveStripeKey"
							use:enhance={() => ({ update }) => { update(); showKeyInput = false; }}
							class="w-full space-y-2"
						>
							<div class="relative">
								<input
									name="stripeSecretKey"
									type={showKey ? 'text' : 'password'}
									required
									placeholder="sk_test_..."
									autocomplete="off"
									class="w-full rounded-md border border-gray-300 px-3 py-2 pr-20 text-sm font-mono focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
								/>
								<button
									type="button"
									onclick={() => (showKey = !showKey)}
									class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
								>
									{showKey ? 'Hide' : 'Show'}
								</button>
							</div>
							<p class="text-xs text-gray-400">
								Find your secret key at
								<a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" class="underline hover:text-gray-600">
									dashboard.stripe.com/apikeys
								</a>.
								Use a restricted key with read-only access to Products and Prices.
							</p>
							<div class="flex gap-2">
								<button
									type="submit"
									class="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
								>
									Save & verify
								</button>
								<button
									type="button"
									onclick={() => (showKeyInput = false)}
									class="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
								>
									Cancel
								</button>
							</div>
						</form>
					{/if}
				{:else}
					<button
						onclick={() => (showKeyInput = true)}
						class="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
					>
						Replace key
					</button>
					<form method="post" action="?/clearStripeKey" use:enhance>
						<button
							type="submit"
							onclick={(e) => { if (!confirm('Remove Stripe connection?')) e.preventDefault(); }}
							class="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
						>
							Disconnect
						</button>
					</form>

					{#if showKeyInput}
						<form
							method="post"
							action="?/saveStripeKey"
							use:enhance={() => ({ update }) => { update(); showKeyInput = false; }}
							class="w-full mt-1 space-y-2"
						>
							<div class="relative">
								<input
									name="stripeSecretKey"
									type={showKey ? 'text' : 'password'}
									required
									placeholder="sk_test_..."
									autocomplete="off"
									class="w-full rounded-md border border-gray-300 px-3 py-2 pr-20 text-sm font-mono focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
								/>
								<button
									type="button"
									onclick={() => (showKey = !showKey)}
									class="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
								>
									{showKey ? 'Hide' : 'Show'}
								</button>
							</div>
							<div class="flex gap-2">
								<button
									type="submit"
									class="rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
								>
									Save & verify
								</button>
								<button
									type="button"
									onclick={() => (showKeyInput = false)}
									class="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
								>
									Cancel
								</button>
							</div>
						</form>
					{/if}
				{/if}
			</div>
		</div>
	</div>
</div>
