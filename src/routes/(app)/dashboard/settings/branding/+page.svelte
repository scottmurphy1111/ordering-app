<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Icon from '@iconify/svelte';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardAction,
		CardContent
	} from '$lib/components/ui/card';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle
	} from '$lib/components/ui/dialog';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let backgroundColor = $state('');
	let accentColor = $state('');
	let foregroundColor = $state('');

	$effect(() => {
		backgroundColor = data.branding.backgroundColor ?? '#000000';
		accentColor = data.branding.accentColor ?? '#374151';
		foregroundColor = data.branding.foregroundColor ?? '#ffffff';
	});

	// ── Upload helpers ─────────────────────────────────────────────────────────
	type UploadState = { uploading: boolean; error: string };

	let previewOpen = $state(false);

	let logoState = $state<UploadState>({ uploading: false, error: '' });
	let bannerState = $state<UploadState>({ uploading: false, error: '' });
	let bgState = $state<UploadState>({ uploading: false, error: '' });

	let logoInput = $state<HTMLInputElement | null>(null);
	let bannerInput = $state<HTMLInputElement | null>(null);
	let bgInput = $state<HTMLInputElement | null>(null);

	async function uploadImage(
		file: File,
		endpoint: string,
		fieldName: string,
		state: UploadState,
		maxMb: number
	) {
		const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
		if (!allowedTypes.includes(file.type)) {
			state.error = 'Please select a JPG, PNG, WebP, or SVG file';
			return;
		}
		if (file.size > maxMb * 1024 * 1024) {
			state.error = `File size must be less than ${maxMb}MB`;
			return;
		}
		state.uploading = true;
		state.error = '';
		try {
			const fd = new FormData();
			fd.append(fieldName, file);
			const res = await fetch(endpoint, { method: 'POST', body: fd });
			const result = await res.json();
			if (result.success) {
				window.location.reload();
			} else {
				state.error = result.error ?? 'Upload failed';
			}
		} catch {
			state.error = 'Network error during upload';
		} finally {
			state.uploading = false;
		}
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
		<h1 class="text-2xl font-bold text-foreground">Branding</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">Customize your storefront's appearance.</p>
	</div>

	{#if form?.error}
		<div
			class="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
		>
			{form.error}
		</div>
	{/if}
	{#if form?.success}
		<div
			class="mb-4 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary/90"
		>
			{form.message}
		</div>
	{/if}

	<div class="space-y-6">
		<!-- ── Color scheme ─────────────────────────────────────────────────────── -->
		<Card class="shadow-sm">
			<CardHeader>
				<CardTitle>Color scheme</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="mb-4 text-xs text-muted-foreground">Sets the colors on your public storefront.</p>
				<form
					method="post"
					action="?/saveColors"
					use:enhance={() =>
						({ update }) =>
							update({ reset: false })}
					class="space-y-5"
				>
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
						{#each [{ id: 'backgroundColor', label: 'Background', note: 'Header, buttons, and key elements.', value: backgroundColor }, { id: 'foregroundColor', label: 'Foreground', note: 'Text and icons on the background color.', value: foregroundColor }, { id: 'accentColor', label: 'Accent', note: 'Category pills, tags, and highlights.', value: accentColor }] as col (col.id)}
							<div>
								<label class="mb-2 block text-sm font-medium text-muted-foreground" for={col.id}
									>{col.label}</label
								>
								<div class="flex items-center gap-3">
									<div
										class="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border shadow-sm"
									>
										<input
											type="color"
											id={col.id}
											name={col.id}
											value={col.id === 'backgroundColor'
												? backgroundColor
												: col.id === 'foregroundColor'
													? foregroundColor
													: accentColor}
											oninput={(e) => {
												const v = (e.target as HTMLInputElement).value;
												if (col.id === 'backgroundColor') backgroundColor = v;
												else if (col.id === 'foregroundColor') foregroundColor = v;
												else accentColor = v;
											}}
											class="absolute inset-0 h-full w-full cursor-pointer border-0 p-0 opacity-0"
										/>
										<div
											class="h-full w-full rounded-md"
											style="background-color: {col.id === 'backgroundColor'
												? backgroundColor
												: col.id === 'foregroundColor'
													? foregroundColor
													: accentColor};"
										></div>
									</div>
									<Input
										type="text"
										value={col.id === 'backgroundColor'
											? backgroundColor
											: col.id === 'foregroundColor'
												? foregroundColor
												: accentColor}
										oninput={(e) => {
											const v = (e.target as HTMLInputElement).value;
											if (col.id === 'backgroundColor') backgroundColor = v;
											else if (col.id === 'foregroundColor') foregroundColor = v;
											else accentColor = v;
										}}
										maxlength={7}
										class="w-28 font-mono"
									/>
								</div>
								<p class="mt-1.5 text-xs text-muted-foreground">{col.note}</p>
							</div>
						{/each}
					</div>

					<div class="flex items-center gap-3">
						<Button type="submit" variant="default">Save colors</Button>
						<Button
							type="button"
							variant="outline"
							onclick={() => (previewOpen = true)}
						>
							<Icon icon="mdi:eye-outline" class="h-4 w-4" />
							Preview
						</Button>
					</div>
				</form>
			</CardContent>
		</Card>

		<!-- ── Color preview dialog ────────────────────────────────────────────── -->
		<Dialog bind:open={previewOpen}>
			<DialogContent class="max-w-sm overflow-hidden p-0">
				<DialogHeader class="px-5 pt-5 pb-3">
					<DialogTitle>Color preview</DialogTitle>
				</DialogHeader>
				<div class="mx-5 mb-5 overflow-hidden rounded-xl border shadow-sm">
					<!-- Menu header -->
					<div class="px-4 py-3" style="background-color: {backgroundColor};">
						<div class="flex items-center gap-2.5">
							<div
								class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
								style="background-color: {accentColor}; color: {foregroundColor};"
							>
								MR
							</div>
							<div>
								<p class="text-sm font-bold" style="color: {foregroundColor};">My Restaurant</p>
								<p class="text-xs opacity-70" style="color: {foregroundColor};">Order ahead · pickup</p>
							</div>
						</div>
					</div>
					<!-- Category pills -->
					<div class="flex gap-2 border-b px-4 py-2.5" style="background-color: {foregroundColor};">
						<span
							class="rounded-full px-3 py-1 text-xs font-semibold"
							style="background-color: {accentColor}; color: {foregroundColor};"
						>
							All
						</span>
						{#each ['Burgers', 'Drinks', 'Sides'] as cat (cat)}
							<span
								class="rounded-full border px-3 py-1 text-xs font-medium"
								style="border-color: {accentColor}; color: {accentColor};"
							>
								{cat}
							</span>
						{/each}
					</div>
					<!-- Menu items -->
					<div class="divide-y" style="background-color: {foregroundColor};">
						{#each [
							{ name: 'Classic Burger', desc: 'Beef patty, lettuce, tomato, pickles', price: '$14.00', color: '#fef3c7' },
							{ name: 'Crispy Chicken', desc: 'Buttermilk fried, house slaw', price: '$13.50', color: '#dbeafe' },
							{ name: 'Garden Salad', desc: 'Mixed greens, house vinaigrette', price: '$10.00', color: '#dcfce7' },
							{ name: 'Lemonade', desc: 'Fresh squeezed, mint', price: '$4.50', color: '#fef9c3' }
						] as item (item.name)}
							<div class="flex items-center justify-between gap-3 px-4 py-3">
								<div class="flex items-center gap-3">
									<div class="h-12 w-12 shrink-0 rounded-lg" style="background-color: {item.color};"></div>
									<div>
										<p class="text-sm font-semibold" style="color: {accentColor};">{item.name}</p>
										<p class="mt-0.5 text-xs leading-tight" style="color: {accentColor}; opacity: 0.6;">{item.desc}</p>
										<p class="mt-1 text-sm font-medium" style="color: {accentColor};">{item.price}</p>
									</div>
								</div>
								<button
									type="button"
									class="shrink-0 rounded-full p-1.5"
									style="background-color: {backgroundColor};"
								>
									<Icon icon="mdi:plus" class="h-4 w-4" style="color: {foregroundColor};" />
								</button>
							</div>
						{/each}
					</div>
					<!-- Cart bar -->
					<div class="px-4 py-3" style="background-color: {backgroundColor};">
						<button
							type="button"
							class="w-full rounded-xl py-2.5 text-sm font-semibold"
							style="background-color: {accentColor}; color: {foregroundColor};"
						>
							View cart · 2 items · $27.50
						</button>
					</div>
				</div>
			</DialogContent>
		</Dialog>

		<!-- ── Logo ─────────────────────────────────────────────────────────────── -->
		<Card class="shadow-sm">
			<CardHeader class="border-b">
				<CardTitle>Logo</CardTitle>
				<CardDescription
					>Shown in your menu header and tiled as a subtle background pattern.</CardDescription
				>
				<CardAction>
					<span
						class="rounded-full px-2.5 py-0.5 text-xs font-medium {data.branding.logoUrl
							? 'bg-green-100 text-primary/90'
							: 'bg-muted text-muted-foreground'}"
					>
						{data.branding.logoUrl ? 'Active' : 'Not set'}
					</span>
				</CardAction>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if data.branding.logoUrl}
					<div class="flex items-center gap-4 rounded-lg border bg-muted/50 p-4">
						<img
							src={data.branding.logoUrl}
							alt="Logo"
							class="h-16 w-auto max-w-40 object-contain"
						/>
					</div>
				{/if}
				{#if logoState.error}
					<p class="text-sm text-red-600">{logoState.error}</p>
				{/if}
				<div class="flex items-center gap-3">
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp,image/svg+xml"
						bind:this={logoInput}
						onchange={(e) => {
							const f = (e.target as HTMLInputElement).files?.[0];
							if (f) uploadImage(f, '/api/upload-logo', 'logo', logoState, 2);
						}}
						class="hidden"
					/>
					<Button
						type="button"
						onclick={() => logoInput?.click()}
						disabled={logoState.uploading}
						variant="default"
					>
						{logoState.uploading
							? 'Uploading…'
							: data.branding.logoUrl
								? 'Replace logo'
								: 'Upload logo'}
					</Button>
					{#if data.branding.logoUrl}
						<form method="post" action="?/removeLogo" use:enhance>
							<Button type="submit" variant="ghost" class="text-red-600 hover:bg-destructive/10 hover:text-red-500">Remove</Button>
						</form>
					{/if}
				</div>
				<p class="text-xs text-muted-foreground">
					JPG, PNG, WebP, or SVG · max 2MB · transparent PNG or SVG recommended
				</p>
			</CardContent>
		</Card>

		<!-- ── Banner image ──────────────────────────────────────────────────────── -->
		<Card class="shadow-sm">
			<CardHeader class="border-b">
				<CardTitle>Banner image</CardTitle>
				<CardDescription>Full-bleed hero image shown at the top of your menu page.</CardDescription>
				<CardAction>
					<span
						class="rounded-full px-2.5 py-0.5 text-xs font-medium {data.branding.bannerUrl
							? 'bg-green-100 text-primary/90'
							: 'bg-muted text-muted-foreground'}"
					>
						{data.branding.bannerUrl ? 'Active' : 'Not set'}
					</span>
				</CardAction>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if data.branding.bannerUrl}
					<div class="overflow-hidden rounded-lg border">
						<img src={data.branding.bannerUrl} alt="Banner" class="h-36 w-full object-cover" />
					</div>
				{/if}
				{#if bannerState.error}
					<p class="text-sm text-red-600">{bannerState.error}</p>
				{/if}
				<div class="flex items-center gap-3">
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp"
						bind:this={bannerInput}
						onchange={(e) => {
							const f = (e.target as HTMLInputElement).files?.[0];
							if (f) uploadImage(f, '/api/upload-banner', 'banner', bannerState, 5);
						}}
						class="hidden"
					/>
					<Button
						type="button"
						onclick={() => bannerInput?.click()}
						disabled={bannerState.uploading}
						variant="default"
					>
						{bannerState.uploading
							? 'Uploading…'
							: data.branding.bannerUrl
								? 'Replace banner'
								: 'Upload banner'}
					</Button>
					{#if data.branding.bannerUrl}
						<form method="post" action="?/removeBanner" use:enhance>
							<Button type="submit" variant="ghost" class="text-red-600 hover:bg-destructive/10 hover:text-red-500">Remove</Button>
						</form>
					{/if}
				</div>
				<p class="text-xs text-muted-foreground">
					JPG, PNG, or WebP · max 5MB · wide landscape image recommended (1600×600px or similar)
				</p>
			</CardContent>
		</Card>

		<!-- ── Background image ──────────────────────────────────────────────────── -->
		<Card class="shadow-sm">
			<CardHeader class="border-b">
				<CardTitle>Background image</CardTitle>
				<CardDescription
					>Subtle full-page texture behind your menu and cart. Works best with low-contrast images
					(wood, marble, linen).</CardDescription
				>
				<CardAction>
					<span
						class="rounded-full px-2.5 py-0.5 text-xs font-medium {data.branding.backgroundImageUrl
							? 'bg-green-100 text-primary/90'
							: 'bg-muted text-muted-foreground'}"
					>
						{data.branding.backgroundImageUrl ? 'Active' : 'Not set'}
					</span>
				</CardAction>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if data.branding.backgroundImageUrl}
					<div class="overflow-hidden rounded-lg border">
						<img
							src={data.branding.backgroundImageUrl}
							alt="Background"
							class="h-28 w-full object-cover opacity-60"
						/>
					</div>
				{/if}
				{#if bgState.error}
					<p class="text-sm text-red-600">{bgState.error}</p>
				{/if}
				<div class="flex items-center gap-3">
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp"
						bind:this={bgInput}
						onchange={(e) => {
							const f = (e.target as HTMLInputElement).files?.[0];
							if (f) uploadImage(f, '/api/upload-background-image', 'backgroundImage', bgState, 5);
						}}
						class="hidden"
					/>
					<Button
						type="button"
						onclick={() => bgInput?.click()}
						disabled={bgState.uploading}
						variant="default"
					>
						{bgState.uploading
							? 'Uploading…'
							: data.branding.backgroundImageUrl
								? 'Replace background'
								: 'Upload background'}
					</Button>
					{#if data.branding.backgroundImageUrl}
						<form method="post" action="?/removeBackground" use:enhance>
							<Button type="submit" variant="ghost" class="text-red-600 hover:bg-destructive/10 hover:text-red-500">Remove</Button>
						</form>
					{/if}
				</div>
				<p class="text-xs text-muted-foreground">
					JPG, PNG, or WebP · max 5MB · tileable textures work best
				</p>
			</CardContent>
		</Card>
	</div>
</div>
