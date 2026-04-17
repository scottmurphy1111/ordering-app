<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '@iconify/svelte';
	import QRCode from 'qrcode';

	const sections = [
		{
			href: '/dashboard/settings/team',
			icon: 'mdi:account-group-outline',
			label: 'Team',
			description: 'Invite team members and manage roles.'
		},
		{
			href: '/dashboard/settings/branding',
			icon: 'mdi:palette-outline',
			label: 'Branding',
			description: 'Customize your storefront with logos, colors, and background images.'
		},
		{
			href: '/dashboard/settings/integrations',
			icon: 'mdi:puzzle-outline',
			label: 'Integrations',
			description: 'Connect Stripe and other third-party services.'
		},
		{
			href: '/dashboard/settings/profile',
			icon: 'mdi:account-circle-outline',
			label: 'Profile',
			description: 'Update your name, email, and password.'
		},
		{
			href: '/dashboard/settings/billing',
			icon: 'mdi:credit-card-outline',
			label: 'Billing',
			description: 'Manage your subscription and billing details.'
		}
	];

	const tenant = $derived(page.data.tenant);
	const menuUrl = $derived(tenant?.slug ? `${page.url.origin}/${tenant.slug}/menu` : '');

	const qrDataUrl = $derived(
		menuUrl
			? QRCode.toDataURL(menuUrl, {
					width: 256,
					margin: 2,
					color: { dark: '#111827', light: '#ffffff' }
				})
			: Promise.resolve('')
	);

	let copied = $state(false);

	function copyUrl() {
		navigator.clipboard.writeText(menuUrl).then(() => {
			copied = true;
			setTimeout(() => (copied = false), 2000);
		});
	}

	async function downloadQr() {
		const dataUrl = await qrDataUrl;
		if (!dataUrl) return;
		const a = document.createElement('a');
		a.href = dataUrl;
		a.download = `${tenant?.slug ?? 'menu'}-qr-code.png`;
		a.click();
	}
</script>

<div>
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-900">Settings</h1>
		<p class="mt-0.5 text-sm text-gray-500">Manage your account and tenant configuration.</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		{#each sections as section (section.href)}
			<a
				href={resolve(section.href as `/${string}`)}
				class="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
			>
				<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100">
					<Icon icon={section.icon} class="h-5 w-5 text-green-700" />
				</div>
				<div>
					<p class="font-semibold text-gray-900">{section.label}</p>
					<p class="mt-0.5 text-sm text-gray-500">{section.description}</p>
				</div>
			</a>
		{/each}
	</div>

	{#if tenant?.slug}
		<div class="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
			<div class="mb-5 flex items-center gap-3">
				<Icon icon="mdi:qrcode" class="h-6 w-6 text-gray-500" />
				<div>
					<h2 class="font-semibold text-gray-900">Public Menu QR Code</h2>
					<p class="text-sm text-gray-500">
						Share this QR code so customers can scan and view your menu.
					</p>
				</div>
			</div>

			<div class="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
				<div class="shrink-0 rounded-lg border border-gray-100 bg-white p-2 shadow-sm">
					{#await qrDataUrl}
						<div class="flex h-40 w-40 items-center justify-center">
							<Icon icon="mdi:loading" class="h-8 w-8 animate-spin text-gray-300" />
						</div>
					{:then dataUrl}
						<img src={dataUrl} alt="QR code for {tenant.slug} menu" class="h-40 w-40" />
					{/await}
				</div>

				<div class="flex w-full min-w-0 flex-col gap-3 sm:w-auto">
					<div>
						<p class="mb-1 text-xs font-medium tracking-wide text-gray-500 uppercase">Menu URL</p>
						<div class="flex items-center gap-2">
							<span
								class="max-w-xs truncate rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 font-mono text-sm text-gray-700"
							>
								{menuUrl}
							</span>
							<button
								onclick={copyUrl}
								class="flex shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 transition-colors hover:bg-gray-50"
							>
								<Icon icon={copied ? 'mdi:check' : 'mdi:content-copy'} class="h-4 w-4" />
								{copied ? 'Copied' : 'Copy'}
							</button>
						</div>
					</div>

					<div class="flex gap-2">
						<button
							onclick={downloadQr}
							class="flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
						>
							<Icon icon="mdi:download" class="h-4 w-4" />
							Download PNG
						</button>
						<a
							href={resolve(`/${tenant.slug}/menu` as `/${string}`)}
							rel="noopener noreferrer"
							class="flex items-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
						>
							<Icon icon="mdi:open-in-new" class="h-4 w-4" />
							Preview
						</a>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
