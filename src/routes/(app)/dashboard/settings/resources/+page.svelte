<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '@iconify/svelte';
	import QRCode from 'qrcode';
	import { hasAddon } from '$lib/billing';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card } from '$lib/components/ui/card';

	const tenant = $derived(page.data.tenant);
	const menuUrl = $derived(tenant?.slug ? `${page.url.origin}/${tenant.slug}/menu` : '');

	// ── Menu QR ──────────────────────────────────────────────────────────────
	const qrDataUrl = $derived(
		menuUrl
			? QRCode.toDataURL(menuUrl, {
					width: 256,
					margin: 2,
					color: { dark: '#111827', light: '#ffffff' }
				})
			: Promise.resolve('')
	);

	let menuUrlCopied = $state(false);

	function copyMenuUrl() {
		navigator.clipboard.writeText(menuUrl).then(() => {
			menuUrlCopied = true;
			setTimeout(() => (menuUrlCopied = false), 2000);
		});
	}

	async function downloadMenuQr() {
		const dataUrl = await qrDataUrl;
		if (!dataUrl) return;
		const a = document.createElement('a');
		a.href = dataUrl;
		a.download = `${tenant?.slug ?? 'menu'}-qr-code.png`;
		a.click();
	}

	const hasTableQr = $derived(hasAddon(tenant?.addons as string[] | null, 'table_qr'));

	// ── Table QR codes ───────────────────────────────────────────────────────
	let tableCount = $state(10);
	let tableQrDataUrls = $state<string[]>([]);

	$effect(() => {
		if (!menuUrl) return;
		const count = tableCount;
		Promise.all(
			Array.from({ length: count }, (_, i) =>
				QRCode.toDataURL(`${menuUrl}?table=${i + 1}`, {
					width: 200,
					margin: 2,
					color: { dark: '#111827', light: '#ffffff' }
				})
			)
		).then((urls) => {
			tableQrDataUrls = urls;
		});
	});

	function downloadTableQr(index: number) {
		const dataUrl = tableQrDataUrls[index];
		if (!dataUrl) return;
		const a = document.createElement('a');
		a.href = dataUrl;
		a.download = `${tenant?.slug ?? 'menu'}-table-${index + 1}-qr.png`;
		a.click();
	}

	// ── Embed snippet ─────────────────────────────────────────────────────────
	const embedSnippet = $derived(
		menuUrl
			? `<iframe\n  src="${menuUrl}"\n  width="100%"\n  height="800"\n  frameborder="0"\n  style="border: none; border-radius: 12px;"\n  title="${tenant?.name ?? 'Menu'}"\n></iframe>`
			: ''
	);

	let embedCopied = $state(false);

	function copyEmbed() {
		navigator.clipboard.writeText(embedSnippet).then(() => {
			embedCopied = true;
			setTimeout(() => (embedCopied = false), 2000);
		});
	}
</script>

<div>
	<div class="mb-6">
		<a
			href={resolve('/dashboard/settings')}
			class="mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
		>
			<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Settings
		</a>
		<h1 class="text-2xl font-bold text-gray-900">Resources</h1>
		<p class="mt-0.5 text-sm text-gray-500">
			Shareable links and marketing assets for your storefront.
		</p>
	</div>

	<div class="space-y-6">
		<!-- ── Menu QR code ──────────────────────────────────────────────────── -->
		{#if tenant?.slug}
			<Card class="p-6 shadow-sm">
				<div class="mb-5 flex items-center gap-3">
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100">
						<Icon icon="mdi:qrcode" class="h-5 w-5 text-green-700" />
					</div>
					<div>
						<h2 class="font-semibold text-gray-900">Menu QR Code</h2>
						<p class="text-sm text-gray-500">
							Print or share so customers can scan directly to your menu.
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
								<Button onclick={copyMenuUrl} variant="outline" size="sm" class="shrink-0 gap-1.5">
									<Icon icon={menuUrlCopied ? 'mdi:check' : 'mdi:content-copy'} class="h-4 w-4" />
									{menuUrlCopied ? 'Copied' : 'Copy'}
								</Button>
							</div>
						</div>
						<div class="flex gap-2">
							<Button onclick={downloadMenuQr} variant="default" class="gap-2">
								<Icon icon="mdi:download" class="h-4 w-4" /> Download PNG
							</Button>
							<Button
								href={resolve(`/${tenant.slug}/menu` as `/${string}`)}
								variant="outline"
								class="gap-2"
							>
								<Icon icon="mdi:open-in-new" class="h-4 w-4" /> Preview menu
							</Button>
						</div>
					</div>
				</div>
			</Card>
		{/if}

		<!-- ── Google Business Profile ──────────────────────────────────────────── -->
		{#if tenant?.slug}
			<div class="rounded-xl border border-blue-100 bg-blue-50 p-6">
				<div class="flex items-start gap-4">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm"
					>
						<Icon icon="mdi:google-maps" class="h-5 w-5 text-blue-600" />
					</div>
					<div class="min-w-0 flex-1">
						<h2 class="font-semibold text-gray-900">Add ordering to your Google Maps listing</h2>
						<p class="mt-1 text-sm text-gray-600">
							Google Business Profile lets you add an <span class="font-medium">"Order online"</span
							> button directly to your Maps listing and search result. Customers can tap it to go straight
							to your menu.
						</p>
						<ol class="mt-3 list-inside list-decimal space-y-1 text-sm text-gray-600">
							<li>Go to <span class="font-medium">Google Business Profile</span> and sign in</li>
							<li>Select your business → <span class="font-medium">Edit profile → Links</span></li>
							<li>
								Paste your menu URL into the <span class="font-medium">Order online</span> field
							</li>
						</ol>
						<div class="mt-3 flex items-center gap-2">
							<span
								class="max-w-xs truncate rounded-md border border-blue-200 bg-white px-3 py-1.5 font-mono text-xs text-gray-700"
							>
								{menuUrl}
							</span>
							<Button onclick={copyMenuUrl} variant="outline" size="sm" class="shrink-0 gap-1.5">
								<Icon icon={menuUrlCopied ? 'mdi:check' : 'mdi:content-copy'} class="h-3.5 w-3.5" />
								{menuUrlCopied ? 'Copied' : 'Copy URL'}
							</Button>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- ── Table QR codes ────────────────────────────────────────────────── -->
		{#if tenant?.slug}
			{#if hasTableQr}
				<Card class="p-6 shadow-sm">
					<div class="mb-5 flex items-start justify-between gap-4">
						<div class="flex items-center gap-3">
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100"
							>
								<Icon icon="mdi:table-chair" class="h-5 w-5 text-green-700" />
							</div>
							<div>
								<h2 class="font-semibold text-gray-900">Table QR Codes</h2>
								<p class="text-sm text-gray-500">
									One QR per table — scans to your menu with dine-in pre-selected.
								</p>
							</div>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							<Label class="text-sm" for="table-count">Tables:</Label>
							<Input
								id="table-count"
								type="number"
								min={1}
								max={50}
								bind:value={tableCount}
								class="w-16 text-center"
							/>
						</div>
					</div>

					{#if tableQrDataUrls.length === 0}
						<div class="flex items-center justify-center py-8">
							<Icon icon="mdi:loading" class="h-6 w-6 animate-spin text-gray-300" />
						</div>
					{:else}
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
							{#each tableQrDataUrls as dataUrl, i (i)}
								<div
									class="flex flex-col items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 p-3"
								>
									<img src={dataUrl} alt="Table {i + 1} QR code" class="h-24 w-24" />
									<p class="text-xs font-semibold text-gray-700">Table {i + 1}</p>
									<Button onclick={() => downloadTableQr(i)} variant="outline" size="xs" class="gap-1">
										<Icon icon="mdi:download" class="h-3 w-3" /> PNG
									</Button>
								</div>
							{/each}
						</div>
					{/if}
				</Card>
			{:else}
				<div class="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6">
					<div class="flex items-start gap-4">
						<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
							<Icon icon="mdi:table-chair" class="h-5 w-5 text-gray-400" />
						</div>
						<div class="flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<h2 class="font-semibold text-gray-400">Table QR Codes</h2>
								<Badge class="bg-gray-200 text-gray-500">Add-on</Badge>
							</div>
							<p class="mt-1 text-sm text-gray-400">
								Per-table QR codes for dine-in ordering. Activate this add-on in Billing to unlock.
							</p>
							<Button
								href={resolve('/dashboard/settings/billing')}
								variant="default"
								size="sm"
								class="mt-3 gap-1.5"
							>
								<Icon icon="mdi:arrow-right" class="h-3.5 w-3.5" /> Go to Billing
							</Button>
						</div>
					</div>
				</div>
			{/if}
		{/if}

		<!-- ── Embed snippet ──────────────────────────────────────────────────── -->
		{#if tenant?.slug}
			{@const isPro = tenant.subscriptionTier === 'pro'}
			<Card class="p-6 shadow-sm">
				<div class="mb-5 flex items-center gap-3">
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100">
						<Icon icon="mdi:code-tags" class="h-5 w-5 text-green-700" />
					</div>
					<div>
						<h2 class="font-semibold text-gray-900">Embed on Your Website</h2>
						<p class="text-sm text-gray-500">
							Paste this snippet into any webpage to embed your menu.
						</p>
					</div>
				</div>

				{#if isPro}
					<div class="relative rounded-lg border border-gray-200 bg-gray-50">
						<pre
							class="overflow-x-auto px-4 py-3 font-mono text-xs text-gray-700">{embedSnippet}</pre>
						<Button onclick={copyEmbed} variant="outline" size="sm" class="absolute top-2 right-2 gap-1.5">
							<Icon icon={embedCopied ? 'mdi:check' : 'mdi:content-copy'} class="h-3.5 w-3.5" />
							{embedCopied ? 'Copied' : 'Copy'}
						</Button>
					</div>
					<p class="mt-2 text-xs text-gray-400">
						Tip: adjust the <code>height</code> value to fit your page layout.
					</p>
				{:else}
					<div class="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-5 py-8 text-center">
						<Icon icon="mdi:lock-outline" class="mx-auto mb-2 h-6 w-6 text-gray-400" />
						<p class="text-sm font-medium text-gray-700">Website embed is a Pro feature</p>
						<p class="mt-1 text-sm text-gray-500">Upgrade to Pro to embed your menu on any website.</p>
						<Button href={resolve('/dashboard/settings/billing')} variant="default" class="mt-4">
							Upgrade to Pro
						</Button>
					</div>
				{/if}
			</Card>
		{/if}

		<!-- ── Printable menu (coming soon) ──────────────────────────────────── -->
		<div class="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6">
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
					<Icon icon="mdi:printer-outline" class="h-5 w-5 text-gray-400" />
				</div>
				<div>
					<div class="flex items-center gap-2">
						<h2 class="font-semibold text-gray-400">Printable Menu</h2>
						<Badge class="bg-gray-200 text-gray-500">Coming soon</Badge>
					</div>
					<p class="text-sm text-gray-400">Generate a print-ready PDF of your full menu.</p>
				</div>
			</div>
		</div>

		<!-- ── Social share card (coming soon) ───────────────────────────────── -->
		<div class="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-6">
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-100">
					<Icon icon="mdi:share-variant-outline" class="h-5 w-5 text-gray-400" />
				</div>
				<div>
					<div class="flex items-center gap-2">
						<h2 class="font-semibold text-gray-400">Social Share Card</h2>
						<Badge class="bg-gray-200 text-gray-500">Coming soon</Badge>
					</div>
					<p class="text-sm text-gray-400">
						A branded image card ready to share on Instagram, Facebook, and more.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
