<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import { untrack } from 'svelte';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import type { PageData, ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Alert } from '$lib/components/ui/alert';
	import { toast } from '$lib/toast';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let editingPublishable = $state(false);
	let editingSecret = $state(untrack(() => !data.hasStripeKey));
	let showPk = $state(false);
	let showSk = $state(false);
	let lastSubmitted: 'pk' | 'sk' | null = $state(null);
	let submittingAction = $state<
		'saveStripePublishableKey' | 'saveStripeSecretKey' | 'clearStripeKey' | null
	>(null);
</script>

<div>
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-foreground">Integrations</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">
			Connect third-party services to your account.
		</p>
	</div>

	<Card class="shadow-sm">
		<CardContent>
			<!-- Stripe header -->
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
						<p class="font-medium text-foreground">Stripe</p>
						<p class="mt-0.5 text-xs text-muted-foreground">
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
						<StatusBadge variant="success">
							<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
							Connected
						</StatusBadge>
					{:else}
						<StatusBadge variant="neutral">Not connected</StatusBadge>
					{/if}
				</div>
			</div>

			<div class="mt-4 space-y-4">
				<!-- Publishable key row -->
				<form
					id="save-pk-form"
					method="post"
					action="?/saveStripePublishableKey"
					use:enhance={() => {
						lastSubmitted = 'pk';
						submittingAction = 'saveStripePublishableKey';
						return async ({ result, update }) => {
							submittingAction = null;
							if (result.type === 'success') {
								editingPublishable = false;
								showPk = false;
							}
							await update({ reset: false });
							if (result.type === 'success') toast.success('Stripe settings updated');
						};
					}}
				>
					<Label for="publishable-key-input" class="mb-1 block text-xs">Publishable key</Label>
					<div class="flex items-start gap-2">
						<div class="relative flex-1">
							<Input
								id="publishable-key-input"
								name="stripePublishableKey"
								type={showPk ? 'text' : 'password'}
								readonly={!editingPublishable}
								value={editingPublishable ? '' : (data.stripePublishableKeyMasked ?? '')}
								placeholder={editingPublishable ? 'pk_test_...' : ''}
								autocomplete="off"
								required={editingPublishable}
								class="pr-10 font-mono {editingPublishable
									? ''
									: 'cursor-default bg-muted/50 text-muted-foreground select-none'}"
							/>
							<Button
								type="button"
								onclick={() => (showPk = !showPk)}
								variant="ghost"
								size="icon-xs"
								class="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
							>
								<Icon
									icon={showPk ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}
									class="h-3.5 w-3.5"
								/>
							</Button>
						</div>
						{#if editingPublishable}
							<Button type="submit" variant="default" disabled={submittingAction !== null}>
								{#if submittingAction === 'saveStripePublishableKey'}
									<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
									Saving...
								{:else}
									Save
								{/if}
							</Button>
							<Button
								type="button"
								variant="outline"
								onclick={() => {
									editingPublishable = false;
									showPk = false;
								}}
							>
								Cancel
							</Button>
						{:else if data.hasStripePublishableKey}
							<Button
								type="button"
								variant="outline"
								onclick={() => {
									editingPublishable = true;
									showPk = false;
								}}
							>
								Replace
							</Button>
						{:else}
							<Button type="button" variant="outline" onclick={() => (editingPublishable = true)}>
								Add
							</Button>
						{/if}
					</div>
					{#if form?.error && lastSubmitted === 'pk'}
						<Alert severity="error" class="mt-2">{form.error}</Alert>
					{/if}
				</form>

				<!-- Secret key row -->
				<form
					id="save-sk-form"
					method="post"
					action="?/saveStripeSecretKey"
					use:enhance={() => {
						lastSubmitted = 'sk';
						submittingAction = 'saveStripeSecretKey';
						return async ({ result, update }) => {
							submittingAction = null;
							if (result.type === 'success') {
								editingSecret = false;
								showSk = false;
							}
							await update({ reset: false });
							if (result.type === 'success') toast.success('Stripe settings updated');
						};
					}}
				>
					<Label for="secret-key-input" class="mb-1 block text-xs">Secret key</Label>
					<div class="flex items-start gap-2">
						<div class="relative flex-1">
							<Input
								id="secret-key-input"
								name="stripeSecretKey"
								type={showSk ? 'text' : 'password'}
								readonly={!editingSecret}
								value={editingSecret ? '' : (data.stripeKeyMasked ?? '')}
								placeholder={editingSecret ? 'sk_test_...' : ''}
								autocomplete="off"
								required={editingSecret}
								class="pr-10 font-mono {editingSecret
									? ''
									: 'cursor-default bg-muted/50 text-muted-foreground select-none'}"
							/>
							<Button
								type="button"
								onclick={() => (showSk = !showSk)}
								variant="ghost"
								size="icon-xs"
								class="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
							>
								<Icon
									icon={showSk ? 'mdi:eye-off-outline' : 'mdi:eye-outline'}
									class="h-3.5 w-3.5"
								/>
							</Button>
						</div>
						{#if editingSecret}
							<Button type="submit" variant="default" disabled={submittingAction !== null}>
								{#if submittingAction === 'saveStripeSecretKey'}
									<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
									Saving...
								{:else}
									{data.hasStripeKey ? 'Save & verify' : 'Connect Stripe'}
								{/if}
							</Button>
							{#if data.hasStripeKey}
								<Button
									type="button"
									variant="outline"
									onclick={() => {
										editingSecret = false;
										showSk = false;
									}}
								>
									Cancel
								</Button>
							{/if}
						{:else}
							<Button
								type="button"
								variant="outline"
								onclick={() => {
									editingSecret = true;
									showSk = false;
								}}
							>
								Replace
							</Button>
						{/if}
					</div>
					{#if form?.error && lastSubmitted === 'sk'}
						<Alert severity="error" class="mt-2">{form.error}</Alert>
					{/if}
				</form>

				{#if editingPublishable || editingSecret}
					<p class="text-xs text-muted-foreground">
						Find both keys at
						<a
							href="https://dashboard.stripe.com/apikeys"
							target="_blank"
							rel="noopener noreferrer"
							class="underline hover:text-muted-foreground"
						>
							dashboard.stripe.com/apikeys
						</a>.
					</p>
				{/if}
			</div>

			<form
				id="disconnect-stripe-form"
				method="post"
				action="?/clearStripeKey"
				use:enhance={() => {
					submittingAction = 'clearStripeKey';
					return async ({ result, update }) => {
						submittingAction = null;
						editingSecret = true;
						editingPublishable = false;
						showSk = false;
						showPk = false;
						await update({ reset: false });
						if (result.type === 'success') toast.success('Stripe keys removed');
					};
				}}
			></form>

			<!-- Webhook status -->
			{#if data.hasStripeKey}
				<div class="mt-5 border-t pt-4">
					<div class="flex items-center justify-between">
						<div>
							<p class="text-sm font-medium text-foreground">Webhooks</p>
							<p class="mt-0.5 text-xs text-muted-foreground">
								Payment confirmations are received automatically via a registered Stripe webhook
								endpoint.
							</p>
						</div>
						<div class="ml-4 shrink-0">
							{#if data.hasWebhookEndpoint}
								<StatusBadge variant="success">
									<span class="h-1.5 w-1.5 rounded-full bg-primary"></span>
									Auto-configured
								</StatusBadge>
							{:else}
								<StatusBadge tone="bg-yellow-100 text-yellow-700">Not set</StatusBadge>
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</CardContent>
		<CardFooter class="gap-2">
			{#if data.hasStripeKey}
				<Button
					type="submit"
					form="disconnect-stripe-form"
					onclick={async (e) => {
						e.preventDefault();
						if (
							await confirmDialog(
								'Remove Stripe connection? This will clear both keys and disable payments.'
							)
						)
							(
								document.getElementById('disconnect-stripe-form') as HTMLFormElement
							)?.requestSubmit();
					}}
					variant="destructive"
					disabled={submittingAction !== null}
				>
					{#if submittingAction === 'clearStripeKey'}
						<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
						Removing...
					{:else}
						Disconnect
					{/if}
				</Button>
			{/if}
		</CardFooter>
	</Card>
</div>
