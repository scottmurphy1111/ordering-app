<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	const integrationsHref = resolve('/dashboard/settings/integrations');
	const stripeHref = 'https://stripe.com';
	const stripeApiKeysHref = 'https://dashboard.stripe.com/apikeys';

	const steps = [
		{
			number: 1,
			title: 'Create a Stripe account',
			description:
				"Go to stripe.com and sign up. You'll need an email address and a password to get started."
		},
		{
			number: 2,
			title: 'Verify your identity',
			description:
				"Stripe requires identity verification before you can accept live payments. You'll be prompted to provide your legal name, date of birth, and the last 4 digits of your SSN (or equivalent for your country). This is standard for any payment processor."
		},
		{
			number: 3,
			title: 'Add your bank account',
			description:
				'To receive payouts, connect a bank account under Settings → Bank accounts and scheduling in your Stripe dashboard. Payouts typically arrive within 2 business days.'
		},
		{
			number: 4,
			title: 'Get your secret API key',
			description:
				"In your Stripe dashboard, go to Developers → API keys. You'll see a Publishable key and a Secret key. Copy the Secret key — it starts with sk_live_ for live mode or sk_test_ for test mode."
		},
		{
			number: 5,
			title: 'Paste it into OrderLocal',
			description:
				'Go back to Integrations, click"Connect Stripe", and paste your secret key. We\'ll verify it immediately. Use sk_test_ keys while testing and swap to sk_live_ when you\'re ready to go live.'
		}
	];
</script>

<div class="max-w-2xl">
	<div class="mb-2">
		<a
			href={integrationsHref}
			class="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<Icon icon="mdi:arrow-left" class="h-4 w-4" /> Integrations
		</a>
	</div>

	<div class="mb-8">
		<div class="flex items-center gap-3">
			<div class="flex h-10 w-10 items-center justify-center rounded-lg bg-[#635BFF]">
				<svg class="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path
						d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305z"
					/>
				</svg>
			</div>
			<div>
				<h1 class="text-2xl font-bold text-foreground">Setting up Stripe</h1>
				<p class="mt-0.5 text-sm text-muted-foreground">
					Follow these steps to start accepting payments.
				</p>
			</div>
		</div>
	</div>

	<!-- Steps -->
	<div class="space-y-4">
		{#each steps as step (step.number)}
			<div class="flex gap-4 rounded-xl border bg-background p-5 shadow-sm">
				<div
					class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-bold text-white"
				>
					{step.number}
				</div>
				<div class="min-w-0 flex-1">
					<p class="font-semibold text-foreground">{step.title}</p>
					<p class="mt-1 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
					{#if step.number === 1}
						<a
							href={stripeHref}
							target="_blank"
							rel="noopener noreferrer"
							class="mt-3 inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-gray-400 hover:bg-muted"
						>
							Go to stripe.com
							<Icon icon="mdi:open-in-new" class="h-3.5 w-3.5" />
						</a>
					{:else if step.number === 4}
						<a
							href={stripeApiKeysHref}
							target="_blank"
							rel="noopener noreferrer"
							class="mt-3 inline-flex items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-gray-400 hover:bg-muted"
						>
							Open Stripe API keys
							<Icon icon="mdi:open-in-new" class="h-3.5 w-3.5" />
						</a>
					{:else if step.number === 5}
						<a
							href={integrationsHref}
							class="mt-3 inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-gray-700"
						>
							Go to Integrations
							<Icon icon="mdi:arrow-right" class="h-3.5 w-3.5" />
						</a>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Test vs Live note -->
	<div class="mt-6 rounded-xl border border-yellow-100 bg-yellow-50 p-5">
		<div class="flex gap-3">
			<Icon icon="mdi:information-outline" class="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
			<div>
				<p class="text-sm font-semibold text-yellow-800">Test mode vs. live mode</p>
				<p class="mt-1 text-sm leading-relaxed text-yellow-700">
					During development, use a <span class="font-mono font-medium">sk_test_</span> key — no
					real charges will be made. When you're ready to accept real payments, swap it for your
					<span class="font-mono font-medium">sk_live_</span> key. You can toggle between modes in the
					top-left of your Stripe dashboard.
				</p>
			</div>
		</div>
	</div>
</div>
