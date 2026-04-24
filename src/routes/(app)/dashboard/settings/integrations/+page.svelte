<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import type { PageData, ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card } from '$lib/components/ui/card';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let editing = $state(untrack(() => !data.hasStripeKey));
	let showPk = $state(false);
	let showKey = $state(false);
</script>

<div>
	<div class="mb-6">
		<a
			href={resolve('/dashboard/settings')}
			class="mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
		>
			<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Settings
		</a>
		<h1 class="text-2xl font-bold text-gray-900">Integrations</h1>
		<p class="mt-0.5 text-sm text-gray-500">Connect third-party services to your account.</p>
	</div>

	<Card class="divide-y divide-gray-100 shadow-sm">
		<!-- Stripe -->
		<div class="px-5 py-4">
			<div class="flex items-start justify-between gap-4">
				<div class="flex items-center gap-3">
					<!-- Stripe logo mark -->
					<div class="flex h-9 w-9 items-center justify-center rounded-lg bg-[#635BFF]">
						<svg
							class="h-5 w-5 text-white"
							viewBox="0 0 24 24"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"
							/>
						</svg>
					</div>
					<div>
						<p class="font-medium text-gray-900">Stripe</p>
						<p class="mt-0.5 text-xs text-gray-500">
							Discover and import products from your Stripe account
						</p>
						<a
							href={resolve('/dashboard/settings/integrations/stripe-setup')}
							class="mt-1 inline-flex items-center gap-1 text-xs text-[#635BFF] transition-opacity hover:opacity-75"
						>
							<Icon icon="mdi:help-circle-outline" class="h-3.5 w-3.5" />
							Need help setting up Stripe?
						</a>
					</div>
				</div>
				<div class="shrink-0">
					{#if data.hasStripeKey}
						<Badge class="bg-green-100 text-green-700">
							<span class="h-1.5 w-1.5 rounded-full bg-green-500"></span>
							Connected
						</Badge>
					{:else}
						<Badge class="bg-gray-100 text-gray-500">
							Not connected
						</Badge>
					{/if}
				</div>
			</div>

			{#if form?.error}
				<div class="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
					{form.error}
				</div>
			{/if}
			{#if form?.success}
				<div
					class="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
				>
					Stripe connected successfully.
				</div>
			{/if}
			{#if form?.cleared}
				<div
					class="mt-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600"
				>
					Stripe key removed.
				</div>
			{/if}

			<div class="mt-4 space-y-2">
				<form
					id="save-stripe-form"
					method="post"
					action="?/saveStripeKey"
					use:enhance={() =>
						({ result, update }) => {
							if (result.type === 'success') {
								editing = false;
								showKey = false;
								showPk = false;
							}
							update({ reset: false });
						}}
				>
					<!-- Publishable key -->
					<div class="mb-1">
						<Label for="publishable-key-input" class="mb-1 block text-xs">Publishable key</Label>
					</div>
					<div class="relative mb-3">
						<Input
							id="publishable-key-input"
							name="stripePublishableKey"
							type={showPk ? 'text' : 'password'}
							readonly={!editing}
							value={editing ? '' : (data.stripePublishableKeyMasked ?? '')}
							placeholder={editing ? 'pk_test_...' : ''}
							autocomplete="off"
							class="pr-16 font-mono {editing ? '' : 'cursor-default bg-gray-50 text-gray-600 select-none'}"
						/>
						<Button
							type="button"
							onclick={() => (showPk = !showPk)}
							variant="ghost"
							size="icon-sm"
							class="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
						>
							<Icon
								icon={showPk ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}
								class="h-3.5 w-3.5"
							/>
						</Button>
					</div>

					<!-- Secret key -->
					<div class="mb-1">
						<Label for="secret-key-input" class="mb-1 block text-xs">Secret key</Label>
					</div>
					<div class="relative mb-2">
						<Input
							id="secret-key-input"
							name="stripeSecretKey"
							type={showKey ? 'text' : 'password'}
							readonly={!editing}
							required={editing && !data.hasStripeKey}
							value={editing ? '' : (data.stripeKeyMasked ?? '')}
							placeholder={editing
								? data.hasStripeKey
									? 'Leave blank to keep existing key'
									: 'sk_test_...'
								: ''}
							autocomplete="off"
							class="pr-16 font-mono {editing ? '' : 'cursor-default bg-gray-50 text-gray-600 select-none'}"
						/>
						<Button
							type="button"
							onclick={() => (showKey = !showKey)}
							variant="ghost"
							size="icon-sm"
							class="absolute top-1/2 right-2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
						>
							<Icon
								icon={showKey ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}
								class="h-3.5 w-3.5"
							/>
						</Button>
					</div>
					{#if editing}
						<p class="mb-2 text-xs text-gray-400">
							Find both keys at
							<a
								href="https://dashboard.stripe.com/apikeys"
								target="_blank"
								rel="noopener noreferrer"
								class="underline hover:text-gray-600"
							>
								dashboard.stripe.com/apikeys
							</a>.
						</p>
					{/if}
				</form>

				<form
					id="disconnect-stripe-form"
					method="post"
					action="?/clearStripeKey"
					use:enhance={() =>
						({ update }) => {
							editing = true;
							showKey = false;
							update({ reset: false });
						}}
				></form>

				<div class="flex gap-2">
					{#if editing}
						<Button type="submit" form="save-stripe-form" variant="default" size="sm">
							{data.hasStripeKey ? 'Save & verify' : 'Connect Stripe'}
						</Button>
						{#if data.hasStripeKey}
							<Button
								type="button"
								onclick={() => {
									editing = false;
									showKey = false;
								}}
								variant="outline"
								size="sm"
							>
								Cancel
							</Button>
						{/if}
					{:else}
						<Button
							type="button"
							onclick={() => {
								editing = true;
								showKey = false;
							}}
							variant="outline"
							size="sm"
						>
							Replace key
						</Button>
						<Button
							type="submit"
							form="disconnect-stripe-form"
							onclick={async (e) => {
								e.preventDefault();
								if (await confirmDialog('Remove Stripe connection?'))
									(
										document.getElementById('disconnect-stripe-form') as HTMLFormElement
									)?.requestSubmit();
							}}
							variant="destructive"
							size="sm"
						>
							Disconnect
						</Button>
					{/if}
				</div>
			</div>
			<!-- Webhook status (auto-configured) -->
			{#if data.hasStripeKey}
				<div class="mt-5 border-t border-gray-100 pt-4">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-gray-900">Webhooks</p>
							<p class="mt-0.5 text-xs text-gray-500">
								Payment confirmations are received automatically via a registered Stripe webhook
								endpoint.
							</p>
						</div>
						<div class="ml-4 shrink-0">
							{#if data.hasWebhookEndpoint}
								<Badge class="bg-green-100 text-green-700">
									<span class="h-1.5 w-1.5 rounded-full bg-green-500"></span>
									Auto-configured
								</Badge>
							{:else}
								<Badge class="bg-yellow-100 text-yellow-700">
									Not set
								</Badge>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</div>
	</Card>
</div>
