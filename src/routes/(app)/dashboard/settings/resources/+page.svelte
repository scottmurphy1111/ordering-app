<script lang="ts">
	import { resolve } from'$app/paths';
	import { page } from'$app/state';
	import Icon from'@iconify/svelte';
	import QRCode from'qrcode';
	import { hasAddon } from'$lib/billing';
	import { Button } from'$lib/components/ui/button';
	import { Badge } from'$lib/components/ui/badge';
	import { Input } from'$lib/components/ui/input';
	import { Label } from'$lib/components/ui/label';
	import { Card, CardContent } from'$lib/components/ui/card';

	const tenant = $derived(page.data.tenant);
	const menuUrl = $derived(tenant?.slug ? `${page.url.origin}/${tenant.slug}/menu` :'');

	// ── Menu QR ──────────────────────────────────────────────────────────────
	const qrDataUrl = $derived(
		menuUrl
			? QRCode.toDataURL(menuUrl, {
					width: 256,
					margin: 2,
					color: { dark:'#111827', light:'#ffffff' }
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
		a.download = `${tenant?.slug ??'menu'}-qr-code.png`;
		a.click();
	}

	const hasTableQr = $derived(hasAddon(tenant?.addons as string[] | null,'table_qr'));

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
					color: { dark:'#111827', light:'#ffffff' }
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
		a.download = `${tenant?.slug ??'menu'}-table-${index + 1}-qr.png`;
		a.click();
	}

	// ── Social share card ────────────────────────────────────────────────────
	const bgColor = $derived(tenant?.backgroundColor ?? '#000000');
	const fgColor = $derived(tenant?.foregroundColor ?? '#ffffff');
	const acColor = $derived(tenant?.accentColor ?? '#374151');

	let captionCopied = $state(false);

	const shareCaption = $derived(
		tenant
			? `We're now taking online orders! 🎉 Visit ${menuUrl} or scan the QR code to order. – ${tenant.name}`
			: ''
	);

	function copyCaption() {
		navigator.clipboard.writeText(shareCaption).then(() => {
			captionCopied = true;
			setTimeout(() => (captionCopied = false), 2000);
		});
	}

	async function downloadSocialCard() {
		const qrUrl = await qrDataUrl;
		if (!qrUrl || !tenant) return;

		const size = 1080;
		const canvas = document.createElement('canvas');
		canvas.width = size;
		canvas.height = size;
		const ctx = canvas.getContext('2d')!;

		// Background
		ctx.fillStyle = bgColor;
		ctx.fillRect(0, 0, size, size);

		// Top accent bar
		ctx.fillStyle = acColor;
		ctx.fillRect(0, 0, size, 72);

		// Bottom accent bar
		ctx.fillStyle = acColor;
		ctx.fillRect(0, size - 64, size, 64);

		// Logo (optional, best-effort — skip if CORS blocked)
		let logoLoaded = false;
		if (tenant.logoUrl) {
			try {
				const logoImg = new Image();
				logoImg.crossOrigin = 'anonymous';
				await new Promise<void>((res) => {
					logoImg.onload = () => res();
					logoImg.onerror = () => res();
					logoImg.src = tenant.logoUrl!;
				});
				if (logoImg.naturalWidth > 0) {
					const maxH = 120;
					const scale = maxH / logoImg.naturalHeight;
					const w = Math.min(logoImg.naturalWidth * scale, 320);
					ctx.drawImage(logoImg, (size - w) / 2, 112, w, maxH);
					logoLoaded = true;
				}
			} catch {
				// logo failed — continue without it
			}
		}

		// Restaurant name
		ctx.fillStyle = fgColor;
		ctx.textAlign = 'center';
		ctx.font = `bold 88px system-ui, sans-serif`;
		const nameY = logoLoaded ? 292 : 240;
		ctx.fillText(tenant.name, size / 2, nameY, size - 80);

		// Tagline
		ctx.fillStyle = acColor;
		ctx.font = `500 44px system-ui, sans-serif`;
		ctx.fillText('Order online now →', size / 2, nameY + 64);

		// QR code with white card background
		const qrImg = new Image();
		await new Promise<void>((res) => {
			qrImg.onload = () => res();
			qrImg.src = qrUrl;
		});
		const qrSize = 360;
		const qrX = (size - qrSize) / 2;
		const qrY = nameY + 110;
		const pad = 24;
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.roundRect(qrX - pad, qrY - pad, qrSize + pad * 2, qrSize + pad * 2, 20);
		ctx.fill();
		ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

		// Menu URL
		ctx.fillStyle = fgColor;
		ctx.globalAlpha = 0.75;
		ctx.font = `28px system-ui, sans-serif`;
		ctx.fillText(menuUrl, size / 2, qrY + qrSize + pad + 52);
		ctx.globalAlpha = 1;

		const a = document.createElement('a');
		a.href = canvas.toDataURL('image/png');
		a.download = `${tenant.slug}-social-card.png`;
		a.click();
	}

	async function downloadLandscapeCard() {
		const qrUrl = await qrDataUrl;
		if (!qrUrl || !tenant) return;

		const w = 1200, h = 628;
		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext('2d')!;

		// Full background
		ctx.fillStyle = bgColor;
		ctx.fillRect(0, 0, w, h);

		// Top accent bar
		ctx.fillStyle = acColor;
		ctx.fillRect(0, 0, w, 10);

		// Logo (left side, best-effort)
		let leftContentY = 100;
		if (tenant.logoUrl) {
			try {
				const logoImg = new Image();
				logoImg.crossOrigin = 'anonymous';
				await new Promise<void>((res) => {
					logoImg.onload = () => res();
					logoImg.onerror = () => res();
					logoImg.src = tenant.logoUrl!;
				});
				if (logoImg.naturalWidth > 0) {
					const maxH = 72;
					const scale = maxH / logoImg.naturalHeight;
					const logoW = Math.min(logoImg.naturalWidth * scale, 180);
					ctx.drawImage(logoImg, 60, leftContentY, logoW, maxH);
					leftContentY += maxH + 32;
				}
			} catch { /* continue */ }
		}

		// Restaurant name
		ctx.fillStyle = fgColor;
		ctx.textAlign = 'left';
		ctx.font = `bold 76px system-ui, sans-serif`;
		ctx.fillText(tenant.name, 60, h / 2 + 10, 640);

		// Tagline
		ctx.fillStyle = acColor;
		ctx.font = `500 38px system-ui, sans-serif`;
		ctx.fillText('Order online now →', 60, h / 2 + 66);

		// Menu URL bottom-left
		ctx.fillStyle = fgColor;
		ctx.globalAlpha = 0.5;
		ctx.font = `24px system-ui, sans-serif`;
		ctx.fillText(menuUrl, 60, h - 48, 640);
		ctx.globalAlpha = 1;

		// Right white panel
		const panelX = 768;
		const panelPad = 40;
		const panelW = w - panelX - panelPad;
		const panelH = h - 80;
		const panelY = 40;
		ctx.fillStyle = '#ffffff';
		ctx.beginPath();
		ctx.roundRect(panelX, panelY, panelW, panelH, 20);
		ctx.fill();

		// QR code centred in right panel
		const qrImg = new Image();
		await new Promise<void>((res) => {
			qrImg.onload = () => res();
			qrImg.src = qrUrl;
		});
		const qrSize = 260;
		const qrX = panelX + (panelW - qrSize) / 2;
		const qrY = panelY + (panelH - qrSize) / 2 - 18;
		ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

		// "Scan to order" label
		ctx.fillStyle = '#374151';
		ctx.textAlign = 'center';
		ctx.font = `500 26px system-ui, sans-serif`;
		ctx.fillText('Scan to order', panelX + panelW / 2, qrY + qrSize + 38);

		const a = document.createElement('a');
		a.href = canvas.toDataURL('image/png');
		a.download = `${tenant.slug}-social-card-landscape.png`;
		a.click();
	}

	// ── Embed snippet ─────────────────────────────────────────────────────────
	const embedSnippet = $derived(
		menuUrl
			? `<iframe\n  src="${menuUrl}"\n  width="100%"\n  height="800"\n  frameborder="0"\n  style="border: none; border-radius: 12px;"\n  title="${tenant?.name ??'Menu'}"\n></iframe>`
			:''
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
			class="mb-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-muted-foreground"
		>
			<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Settings
		</a>
		<h1 class="text-2xl font-bold text-foreground">Resources</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">
			Shareable links and marketing assets for your storefront.
		</p>
	</div>

	<div class="space-y-6">
		<!-- ── Menu QR code ──────────────────────────────────────────────────── -->
		{#if tenant?.slug}
			<Card class="shadow-sm">
				<CardContent>
				<div class="mb-5 flex items-center gap-3">
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
						<Icon icon="mdi:qrcode" class="h-5 w-5 text-primary" />
					</div>
					<div>
						<h2 class="font-semibold text-foreground">Menu QR Code</h2>
						<p class="text-sm text-muted-foreground">
							Print or share so customers can scan directly to your menu.
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
							<img src={dataUrl} alt="QR code for {tenant.slug} menu" class="h-40 w-40" />
						{/await}
					</div>

					<div class="flex w-full min-w-0 flex-col gap-3 sm:w-auto">
						<div>
							<p class="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Menu URL</p>
							<div class="flex items-center gap-2">
								<span
									class="max-w-xs truncate rounded-md border bg-muted/50 px-3 py-1.5 font-mono text-sm text-muted-foreground"
								>
									{menuUrl}
								</span>
								<Button onclick={copyMenuUrl} variant="outline" size="sm" class="shrink-0 gap-1.5">
									<Icon icon={menuUrlCopied ?'mdi:check' :'mdi:content-copy'} class="h-4 w-4" />
									{menuUrlCopied ?'Copied' :'Copy'}
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
				</CardContent>
			</Card>
		{/if}

		<!-- ── Google Business Profile ──────────────────────────────────────────── -->
		{#if tenant?.slug}
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
							Google Business Profile lets you add an <span class="font-medium">"Order online"</span
							> button directly to your Maps listing and search result. Customers can tap it to go straight
							to your menu.
						</p>
						<ol class="mt-3 list-inside list-decimal space-y-1 text-sm text-muted-foreground">
							<li>Go to <span class="font-medium">Google Business Profile</span> and sign in</li>
							<li>Select your business → <span class="font-medium">Edit profile → Links</span></li>
							<li>
								Paste your menu URL into the <span class="font-medium">Order online</span> field
							</li>
						</ol>
						<div class="mt-3 flex items-center gap-2">
							<span
								class="max-w-xs truncate rounded-md border border-blue-200 bg-background px-3 py-1.5 font-mono text-xs text-muted-foreground"
							>
								{menuUrl}
							</span>
							<Button onclick={copyMenuUrl} variant="outline" size="sm" class="shrink-0 gap-1.5">
								<Icon icon={menuUrlCopied ?'mdi:check' :'mdi:content-copy'} class="h-3.5 w-3.5" />
								{menuUrlCopied ?'Copied' :'Copy URL'}
							</Button>
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- ── Table QR codes ────────────────────────────────────────────────── -->
		{#if tenant?.slug}
			{#if hasTableQr}
				<Card class="shadow-sm">
					<CardContent>
					<div class="mb-5 flex items-start justify-between gap-4">
						<div class="flex items-center gap-3">
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"
							>
								<Icon icon="mdi:table-chair" class="h-5 w-5 text-primary" />
							</div>
							<div>
								<h2 class="font-semibold text-foreground">Table QR Codes</h2>
								<p class="text-sm text-muted-foreground">
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
							<Icon icon="mdi:loading" class="h-6 w-6 animate-spin text-muted-foreground/40" />
						</div>
					{:else}
						<div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
							{#each tableQrDataUrls as dataUrl, i (i)}
								<div
									class="flex flex-col items-center gap-2 rounded-lg border bg-muted/50 p-3"
								>
									<img src={dataUrl} alt="Table {i + 1} QR code" class="h-24 w-24" />
									<p class="text-xs font-semibold text-muted-foreground">Table {i + 1}</p>
									<Button onclick={() => downloadTableQr(i)} variant="outline" size="xs" class="gap-1">
										<Icon icon="mdi:download" class="h-3 w-3" /> PNG
									</Button>
								</div>
							{/each}
						</div>
					{/if}
					</CardContent>
				</Card>
			{:else}
				<div class="rounded-xl border border-dashed bg-muted/50 p-6">
					<div class="flex items-start gap-4">
						<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
							<Icon icon="mdi:table-chair" class="h-5 w-5 text-muted-foreground" />
						</div>
						<div class="flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<h2 class="font-semibold text-muted-foreground">Table QR Codes</h2>
								<Badge class="bg-muted text-muted-foreground">Add-on</Badge>
							</div>
							<p class="mt-1 text-sm text-muted-foreground">
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
			{@const isPro = tenant.subscriptionTier ==='pro'}
			<Card class="shadow-sm">
				<CardContent>
				<div class="mb-5 flex items-center gap-3">
					<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
						<Icon icon="mdi:code-tags" class="h-5 w-5 text-primary" />
					</div>
					<div>
						<h2 class="font-semibold text-foreground">Embed on Your Website</h2>
						<p class="text-sm text-muted-foreground">
							Paste this snippet into any webpage to embed your menu.
						</p>
					</div>
				</div>

				{#if isPro}
					<div class="relative rounded-lg border bg-muted/50">
						<pre
							class="overflow-x-auto px-4 py-3 font-mono text-xs text-muted-foreground">{embedSnippet}</pre>
						<Button onclick={copyEmbed} variant="outline" size="sm" class="absolute top-2 right-2 gap-1.5">
							<Icon icon={embedCopied ?'mdi:check' :'mdi:content-copy'} class="h-3.5 w-3.5" />
							{embedCopied ?'Copied' :'Copy'}
						</Button>
					</div>
					<p class="mt-2 text-xs text-muted-foreground">
						Tip: adjust the <code>height</code> value to fit your page layout.
					</p>
				{:else}
					<div class="rounded-lg border border-dashed bg-muted/50 px-5 py-8 text-center">
						<Icon icon="mdi:lock-outline" class="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
						<p class="text-sm font-medium text-muted-foreground">Website embed is a Pro feature</p>
						<p class="mt-1 text-sm text-muted-foreground">Upgrade to Pro to embed your menu on any website.</p>
						<Button href={resolve('/dashboard/settings/billing')} variant="default" class="mt-4">
							Upgrade to Pro
						</Button>
					</div>
				{/if}
				</CardContent>
			</Card>
		{/if}

		<!-- ── Printable menu (coming soon) ──────────────────────────────────── -->
		<div class="rounded-xl border border-dashed bg-muted/50 p-6">
			<div class="flex items-center gap-3">
				<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
					<Icon icon="mdi:printer-outline" class="h-5 w-5 text-muted-foreground" />
				</div>
				<div>
					<div class="flex items-center gap-2">
						<h2 class="font-semibold text-muted-foreground">Printable Menu</h2>
						<Badge class="bg-muted text-muted-foreground">Coming soon</Badge>
					</div>
					<p class="text-sm text-muted-foreground">Generate a print-ready PDF of your full menu.</p>
				</div>
			</div>
		</div>

		<!-- ── Social share cards ────────────────────────────────────────────── -->
		{#if tenant?.slug}
			<Card class="shadow-sm">
				<CardContent>
					<div class="mb-5 flex items-center gap-3">
						<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
							<Icon icon="mdi:share-variant-outline" class="h-5 w-5 text-primary" />
						</div>
						<div>
							<h2 class="font-semibold text-foreground">Social Share Cards</h2>
							<p class="text-sm text-muted-foreground">
								Branded images ready to share on Instagram, Facebook, and more.
							</p>
						</div>
					</div>

					<!-- Two card previews -->
					<div class="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
						<!-- Card 1 — Square (1080×1080) -->
						<div class="rounded-lg border bg-muted/30 p-4">
							<div class="mb-3 flex items-center justify-between">
								<div>
									<p class="text-sm font-medium text-foreground">Square</p>
									<p class="text-xs text-muted-foreground">1080 × 1080 · Instagram</p>
								</div>
								<Button onclick={downloadSocialCard} variant="default" size="sm" class="gap-1.5">
									<Icon icon="mdi:download" class="h-3.5 w-3.5" /> Download
								</Button>
							</div>
							<!-- Square preview -->
							<div
								class="relative mx-auto h-48 w-48 overflow-hidden rounded-xl shadow-md"
								style="background-color: {bgColor};"
							>
								<div class="absolute inset-x-0 top-0 h-4" style="background-color: {acColor};"></div>
								<div class="absolute inset-x-0 bottom-0 h-3" style="background-color: {acColor};"></div>
								<div class="flex h-full flex-col items-center justify-center gap-1.5 px-3 pb-3 pt-5">
									{#if tenant.logoUrl}
										<img src={tenant.logoUrl} alt={tenant.name} class="max-h-8 max-w-24 object-contain" />
									{/if}
									<p class="text-center text-sm font-bold leading-tight" style="color: {fgColor};">
										{tenant.name}
									</p>
									<p class="text-center text-[10px] font-medium" style="color: {acColor};">
										Order online now →
									</p>
									<div class="rounded-md bg-white p-1 shadow-sm">
										{#await qrDataUrl then dataUrl}
											{#if dataUrl}<img src={dataUrl} alt="QR" class="h-16 w-16" />{/if}
										{/await}
									</div>
									<p class="truncate font-mono text-[7px] opacity-60" style="color: {fgColor}; max-width: 160px;">
										{menuUrl}
									</p>
								</div>
							</div>
						</div>

						<!-- Card 2 — Landscape (1200×628) -->
						<div class="rounded-lg border bg-muted/30 p-4">
							<div class="mb-3 flex items-center justify-between">
								<div>
									<p class="text-sm font-medium text-foreground">Landscape</p>
									<p class="text-xs text-muted-foreground">1200 × 628 · Facebook / OG</p>
								</div>
								<Button onclick={downloadLandscapeCard} variant="default" size="sm" class="gap-1.5">
									<Icon icon="mdi:download" class="h-3.5 w-3.5" /> Download
								</Button>
							</div>
							<!-- Landscape preview — 16:9 ish container -->
							<div
								class="relative mx-auto overflow-hidden rounded-xl shadow-md"
								style="background-color: {bgColor}; aspect-ratio: 1200/628;"
							>
								<div class="absolute inset-x-0 top-0 h-1.5" style="background-color: {acColor};"></div>
								<!-- Left content -->
								<div class="absolute inset-y-0 left-0 flex flex-col justify-center px-4" style="width: 58%;">
									{#if tenant.logoUrl}
										<img src={tenant.logoUrl} alt={tenant.name} class="mb-1.5 max-h-6 max-w-20 object-contain" />
									{/if}
									<p class="text-sm font-bold leading-tight" style="color: {fgColor};">{tenant.name}</p>
									<p class="mt-1 text-[10px] font-medium" style="color: {acColor};">Order online now →</p>
									<p class="mt-auto truncate font-mono text-[7px] opacity-50" style="color: {fgColor};">{menuUrl}</p>
								</div>
								<!-- Right QR panel -->
								<div class="absolute inset-y-2 right-2 flex w-28 flex-col items-center justify-center gap-1 rounded-lg bg-white shadow-sm">
									{#await qrDataUrl then dataUrl}
										{#if dataUrl}<img src={dataUrl} alt="QR" class="h-20 w-20" />{/if}
									{/await}
									<p class="text-[7px] text-gray-500">Scan to order</p>
								</div>
							</div>
						</div>
					</div>

					<!-- Caption + share -->
					<div class="space-y-3">
						<div>
							<p class="mb-1 text-xs font-medium tracking-wide text-muted-foreground uppercase">Caption</p>
							<div class="relative rounded-lg border bg-muted/50 px-4 py-3 pr-20 text-sm text-muted-foreground">
								{shareCaption}
								<Button onclick={copyCaption} variant="outline" size="sm" class="absolute top-2 right-2 gap-1.5">
									<Icon icon={captionCopied ? 'mdi:check' : 'mdi:content-copy'} class="h-3.5 w-3.5" />
									{captionCopied ? 'Copied' : 'Copy'}
								</Button>
							</div>
						</div>
						<div class="flex flex-wrap gap-2">
							<Button
								href="https://wa.me/?text={encodeURIComponent(shareCaption)}"
								variant="outline"
								class="gap-2"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Icon icon="mdi:whatsapp" class="h-4 w-4" /> Share on WhatsApp
							</Button>
							<Button
								href="https://www.facebook.com/sharer/sharer.php?u={encodeURIComponent(menuUrl)}"
								variant="outline"
								class="gap-2"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Icon icon="mdi:facebook" class="h-4 w-4" /> Share on Facebook
							</Button>
						</div>
						<p class="text-xs text-muted-foreground">
							Card colors reflect your
							<a href={resolve('/dashboard/settings/branding')} class="underline hover:text-foreground">branding settings</a>.
						</p>
					</div>
				</CardContent>
			</Card>
		{/if}
	</div>
</div>
