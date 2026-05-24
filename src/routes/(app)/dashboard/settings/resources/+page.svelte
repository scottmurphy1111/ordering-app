<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '@iconify/svelte';

	let { data }: { data: PageData } = $props();
	import QRCode from 'qrcode';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';

	const vendor = $derived(page.data.vendor);
	const catalogUrl = $derived(data.catalogUrl ?? '');

	// ── Catalog QR ───────────────────────────────────────────────────────────
	const qrDataUrl = $derived(
		catalogUrl
			? QRCode.toDataURL(catalogUrl, {
					width: 256,
					margin: 2,
					color: { dark: '#111827', light: '#ffffff' }
				})
			: Promise.resolve('')
	);

	let catalogUrlCopied = $state(false);

	function copyCatalogUrl() {
		navigator.clipboard.writeText(catalogUrl).then(() => {
			catalogUrlCopied = true;
			setTimeout(() => (catalogUrlCopied = false), 2000);
		});
	}

	async function downloadCatalogQr() {
		const dataUrl = await qrDataUrl;
		if (!dataUrl) return;
		const a = document.createElement('a');
		a.href = dataUrl;
		a.download = `${vendor?.slug ?? 'catalog'}-qr-code.png`;
		a.click();
	}

	// ── Embed snippet ─────────────────────────────────────────────────────────
	const embedSnippet = $derived(
		catalogUrl
			? `<iframe\n  src="${catalogUrl}"\n  width="100%"\n  height="800"\n  frameborder="0"\n  style="border: none; border-radius: 12px;"\n  title="${vendor?.name ?? 'Catalog'}"\n></iframe>`
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
		<h1 class="text-2xl font-bold text-foreground">Resources</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">
			Shareable links and marketing assets for your storefront.
		</p>
	</div>

	<div class="space-y-6">
		<!-- ── Catalog QR code ──────────────────────────────────────────────────── -->
		{#if vendor?.slug}
			<Card class="shadow-sm">
				<CardContent>
					<div class="mb-5 flex items-center gap-3">
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"
						>
							<Icon icon="mdi:qrcode" class="h-5 w-5 text-primary" />
						</div>
						<div>
							<h2 class="font-semibold text-foreground">Catalog QR Code</h2>
							<p class="text-sm text-muted-foreground">
								Print or share so customers can scan directly to your catalog.
							</p>
						</div>
					</div>

					<div class="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
						<div class="shrink-0 rounded-lg border bg-background p-2 shadow-sm">
							{#await qrDataUrl}
								<div class="flex h-40 w-40 items-center justify-center">
									<Icon icon="mdi:loading" class="h-8 w-8 animate-spin text-muted-foreground/40" />
								</div>
							{:then dataUrl}
								<img src={dataUrl} alt="QR code for {vendor.slug} catalog" class="h-40 w-40" />
							{/await}
						</div>

						<div class="flex w-full min-w-0 flex-col gap-3 sm:w-auto">
							<div>
								<p class="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">
									Catalog URL
								</p>
								<div class="flex items-center gap-2">
									<span
										class="max-w-xs truncate rounded-md border bg-muted/50 px-3 py-1.5 font-mono text-sm text-muted-foreground"
									>
										{catalogUrl}
									</span>
									<Button onclick={copyCatalogUrl} variant="outline" class="shrink-0 gap-1.5">
										<Icon
											icon={catalogUrlCopied ? 'mdi:check' : 'mdi:content-copy'}
											class="h-4 w-4"
										/>
										{catalogUrlCopied ? 'Copied' : 'Copy'}
									</Button>
								</div>
							</div>
							<div class="flex gap-2">
								<Button onclick={downloadCatalogQr} variant="default" class="gap-2">
									<Icon icon="mdi:download" class="h-4 w-4" /> Download PNG
								</Button>
								<Button href={data.catalogUrl} variant="outline" class="gap-2">
									<Icon icon="mdi:open-in-new" class="h-4 w-4" /> Preview catalog
								</Button>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>
		{/if}

		<!-- ── Google Business Profile ──────────────────────────────────────────── -->
		{#if vendor?.slug}
			<div class="rounded-xl border border-blue-100 bg-blue-50 p-6">
				<div class="flex items-start gap-4">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm"
					>
						<Icon icon="mdi:google-maps" class="h-5 w-5 text-blue-600" />
					</div>
					<div class="min-w-0 flex-1">
						<h2 class="font-semibold text-foreground">Add ordering to your Google Maps listing</h2>
						<p class="mt-1 text-sm text-muted-foreground">
							Add an <span class="font-medium">"Order online"</span> button to your Google Maps listing.
							Customers tap it to reach your catalog.
						</p>
						<ol class="mt-3 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
							<li>Open <span class="font-medium">Google Business Profile</span></li>
							<li>Select your business → <span class="font-medium">Edit profile → Links</span></li>
							<li>
								Paste your catalog URL into the <span class="font-medium">Order online</span> field
							</li>
						</ol>
						<div class="mt-3 flex items-center gap-2">
							<span
								class="max-w-xs truncate rounded-md border border-blue-200 bg-background px-3 py-1.5 font-mono text-xs text-muted-foreground"
							>
								{catalogUrl}
							</span>
							<Button onclick={copyCatalogUrl} variant="outline" class="shrink-0 gap-1.5">
								<Icon
									icon={catalogUrlCopied ? 'mdi:check' : 'mdi:content-copy'}
									class="h-3.5 w-3.5"
								/>
								{catalogUrlCopied ? 'Copied' : 'Copy URL'}
							</Button>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- ── Embed snippet (Pro only) ───────────────────────────────────────── -->
		{#if vendor?.slug && vendor.subscriptionTier === 'pro'}
			<Card class="shadow-sm">
				<CardContent>
					<div class="mb-5 flex items-center gap-3">
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"
						>
							<Icon icon="mdi:code-tags" class="h-5 w-5 text-primary" />
						</div>
						<div>
							<h2 class="font-semibold text-foreground">Embed on Your Website</h2>
							<p class="text-sm text-muted-foreground">
								Paste this snippet into any webpage to embed your catalog.
							</p>
						</div>
					</div>

					<div class="relative rounded-lg border bg-muted/50">
						<pre
							class="overflow-x-auto px-4 py-3 font-mono text-xs text-muted-foreground">{embedSnippet}</pre>
						<Button
							onclick={copyEmbed}
							variant="outline"
							class="absolute top-2 right-2 gap-1.5 text-xs"
						>
							<Icon icon={embedCopied ? 'mdi:check' : 'mdi:content-copy'} class="h-3.5 w-3.5" />
							{embedCopied ? 'Copied' : 'Copy'}
						</Button>
					</div>
					<p class="mt-2 text-xs text-muted-foreground">
						Tip: adjust the <code>height</code> value to fit your page layout.
					</p>
				</CardContent>
			</Card>
		{/if}

		{#if vendor?.slug && vendor.subscriptionTier !== 'pro'}
			<p class="px-1 text-xs text-muted-foreground">
				Want to embed your catalog on your own website?
				<a
					href={resolve('/dashboard/account/billing')}
					class="font-medium text-foreground underline underline-offset-2 hover:text-primary"
				>
					Available on Pro
				</a>.
			</p>
		{/if}

	</div>
</div>
