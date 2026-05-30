<script lang="ts">
	import { enhance } from '$app/forms';
	import { untrack } from 'svelte';
	import type { PageData } from './$types';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		Card,
		CardHeader,
		CardTitle,
		CardDescription,
		CardAction,
		CardContent,
		CardFooter
	} from '$lib/components/ui/card';
	import { Alert } from '$lib/components/ui/alert';
	import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
	import { invalidateAll } from '$app/navigation';
	import { toast } from '$lib/toast';
	import { enhanceWithToasts } from '$lib/forms/enhance-with-toasts';
	import { FONT_PAIRS, googleFontsUrl, type FontPairSlug } from '$lib/storefront/font-pairs';
	import { getReadableTextColor } from '$lib/storefront/contrast';
	import AiImageGenerator from '$lib/components/AiImageGenerator.svelte';

	let { data }: { data: PageData } = $props();

	let backgroundColor = $state('');
	let accentColor = $state('');
	let foregroundColor = $state('');

	const accentForeground = $derived(getReadableTextColor(accentColor));

	$effect(() => {
		backgroundColor = data.branding.backgroundColor ?? '#000000';
		accentColor = data.branding.accentColor ?? '#374151';
		foregroundColor = data.branding.foregroundColor ?? '#ffffff';
	});

	let selectedFontPair = $state<FontPairSlug>(
		untrack(() => (data.branding.fontPair as FontPairSlug) ?? 'fraunces-dm-sans')
	);

	let headerMode = $state<'logo' | 'name'>(untrack(() => data.branding.headerMode ?? 'logo'));
	let heroDisplayMode = $state<'none' | 'headline' | 'headline_tagline'>(
		untrack(() => data.branding.heroDisplayMode ?? 'headline_tagline')
	);
	let heroHeadline = $state<string>(untrack(() => data.branding.heroHeadline ?? ''));

	// ── Upload helpers ─────────────────────────────────────────────────────────
	type UploadState = { uploading: boolean; error: string };

	let previewOpen = $state(false);

	let logoState = $state<UploadState>({ uploading: false, error: '' });
	let heroImageState = $state<UploadState>({ uploading: false, error: '' });
	let submittingAction = $state<string | null>(null);

	// Per-form save errors (separate so an error in one form doesn't bleed into others).
	let identitySaveError = $state<string | null>(null);
	let fontSaveError = $state<string | null>(null);
	let colorsSaveError = $state<string | null>(null);
	let logoSaveError = $state<string | null>(null);
	let heroImageSaveError = $state<string | null>(null);

	let logoInput = $state<HTMLInputElement | null>(null);
	let heroImageInput = $state<HTMLInputElement | null>(null);

	async function uploadImage(
		file: File,
		endpoint: string,
		fieldName: string,
		state: UploadState,
		maxMb: number,
		successMessage: string
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
				await invalidateAll();
				toast.success(successMessage);
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

<svelte:head>
	{#each Object.values(FONT_PAIRS) as pair (pair.slug)}
		<link rel="stylesheet" href={googleFontsUrl(pair)} />
	{/each}
</svelte:head>

<div>
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-foreground">Branding</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">Customize your storefront's appearance.</p>
	</div>

	<div class="space-y-6">
		<!-- ── Identity ─────────────────────────────────────────────────────────── -->
		<Card class="shadow-sm">
			<CardHeader>
				<CardTitle>Identity</CardTitle>
				<CardDescription>How your business appears in the storefront header.</CardDescription>
			</CardHeader>
			<CardContent>
				{#if identitySaveError}
					<Alert severity="error" class="mb-4">{identitySaveError}</Alert>
				{/if}
				<form
					id="identity-form"
					method="post"
					action="?/saveIdentity"
					use:enhance={enhanceWithToasts({
						successMessage: 'Identity saved',
						preserveValues: true,
						onStart: () => {
							submittingAction = 'saveIdentity';
							identitySaveError = null;
						},
						onEnd: () => {
							submittingAction = null;
						},
						onError: (msg) => {
							identitySaveError = msg;
						}
					})}
					class="space-y-4"
				>
					<div>
						<Label class="mb-1 block" for="tagline">Tagline</Label>
						<Input
							id="tagline"
							name="tagline"
							type="text"
							maxlength={255}
							value={data.branding.tagline ?? ''}
							placeholder="Baked fresh daily since 2018"
						/>
						<p class="mt-1 text-xs text-muted-foreground">
							A short phrase shown under your name on the storefront. Leave blank to hide.
						</p>
					</div>

					<div class="space-y-2 border-t pt-4">
						<p class="text-sm font-medium">Header displays</p>
						<p class="text-xs text-muted-foreground">
							The header shows the logo when set, or your business name as text.
						</p>
						<label class="flex cursor-pointer items-center gap-2">
							<input type="radio" name="headerMode" value="logo" bind:group={headerMode} />
							<span class="text-sm">Logo</span>
						</label>
						<label class="flex cursor-pointer items-center gap-2">
							<input type="radio" name="headerMode" value="name" bind:group={headerMode} />
							<span class="text-sm">Business name</span>
						</label>
					</div>

					<div class="space-y-3 border-t pt-4">
						<div class="space-y-1.5">
							<Label class="mb-1 block" for="heroHeadline">Hero headline</Label>
							<Input
								id="heroHeadline"
								name="heroHeadline"
								type="text"
								maxlength={80}
								bind:value={heroHeadline}
								placeholder="Welcome to your shop"
							/>
							<p class="mt-1 text-xs text-muted-foreground">{heroHeadline.length}/80 characters</p>
						</div>

						<div class="space-y-2">
							<p class="text-sm font-medium">Hero displays</p>
							<label class="flex cursor-pointer items-center gap-2">
								<input
									type="radio"
									name="heroDisplayMode"
									value="none"
									bind:group={heroDisplayMode}
								/>
								<span class="text-sm">Nothing (image only)</span>
							</label>
							<label class="flex cursor-pointer items-center gap-2">
								<input
									type="radio"
									name="heroDisplayMode"
									value="headline"
									bind:group={heroDisplayMode}
									disabled={!heroHeadline.trim()}
								/>
								<span class="text-sm {!heroHeadline.trim() ? 'text-muted-foreground' : ''}"
									>Headline only</span
								>
							</label>
							<label class="flex cursor-pointer items-center gap-2">
								<input
									type="radio"
									name="heroDisplayMode"
									value="headline_tagline"
									bind:group={heroDisplayMode}
									disabled={!heroHeadline.trim()}
								/>
								<span class="text-sm {!heroHeadline.trim() ? 'text-muted-foreground' : ''}"
									>Headline and tagline</span
								>
							</label>
						</div>
					</div>
				</form>
			</CardContent>
			<CardFooter class="gap-2">
				<Button type="submit" form="identity-form" disabled={submittingAction !== null}>
					{#if submittingAction === 'saveIdentity'}
						<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
						Saving...
					{:else}
						Save identity
					{/if}
				</Button>
			</CardFooter>
		</Card>

		<!-- ── Typography ───────────────────────────────────────────────────────── -->
		<Card class="shadow-sm">
			<CardHeader>
				<CardTitle>Typography</CardTitle>
				<CardDescription>Choose a font pairing that matches your brand's feel.</CardDescription>
			</CardHeader>
			<CardContent>
				{#if fontSaveError}
					<Alert severity="error" class="mb-4">{fontSaveError}</Alert>
				{/if}
				<form
					id="typography-form"
					method="post"
					action="?/saveFontPair"
					use:enhance={enhanceWithToasts({
						successMessage: 'Typography saved',
						preserveValues: true,
						onStart: () => {
							submittingAction = 'saveFontPair';
							fontSaveError = null;
						},
						onEnd: () => {
							submittingAction = null;
						},
						onError: (msg) => {
							fontSaveError = msg;
						}
					})}
					class="space-y-4"
				>
					<input type="hidden" name="fontPair" value={selectedFontPair} />

					<div class="grid grid-cols-1 gap-3 md:grid-cols-2">
						{#each Object.values(FONT_PAIRS) as pair (pair.slug)}
							<button
								type="button"
								onclick={() => (selectedFontPair = pair.slug)}
								aria-pressed={selectedFontPair === pair.slug}
								class="cursor-pointer rounded-lg border-2 p-4 text-left hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground {selectedFontPair ===
								pair.slug
									? 'border-foreground'
									: 'border-border'}"
							>
								<div class="space-y-1.5">
									<p class="text-xs font-medium text-muted-foreground">{pair.label}</p>
									<p
										style="font-family: {pair.heading.cssStack};"
										class="min-h-20 text-2xl leading-tight font-bold"
									>
										{pair.previewHeading}
									</p>
									<p style="font-family: {pair.body.cssStack};" class="text-sm leading-snug">
										{pair.previewBody}
									</p>
									<p class="text-xs text-muted-foreground">{pair.description}</p>
								</div>
							</button>
						{/each}
					</div>
				</form>
			</CardContent>
			<CardFooter class="gap-2">
				<Button type="submit" form="typography-form" disabled={submittingAction !== null}>
					{#if submittingAction === 'saveFontPair'}
						<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
						Saving...
					{:else}
						Save typography
					{/if}
				</Button>
			</CardFooter>
		</Card>

		<!-- ── Color scheme ─────────────────────────────────────────────────────── -->
		<Card class="shadow-sm">
			<CardHeader>
				<CardTitle>Color scheme</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="mb-4 text-xs text-muted-foreground">Sets the colors on your public storefront.</p>
				{#if colorsSaveError}
					<Alert severity="error" class="mb-4">{colorsSaveError}</Alert>
				{/if}
				<form
					id="colors-form"
					method="post"
					action="?/saveColors"
					use:enhance={enhanceWithToasts({
						successMessage: 'Colors saved',
						preserveValues: true,
						onStart: () => {
							submittingAction = 'saveColors';
							colorsSaveError = null;
						},
						onEnd: () => {
							submittingAction = null;
						},
						onError: (msg) => {
							colorsSaveError = msg;
						}
					})}
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
				</form>
			</CardContent>
			<CardFooter class="gap-2">
				<Button
					type="submit"
					form="colors-form"
					variant="default"
					disabled={submittingAction !== null}
				>
					{#if submittingAction === 'saveColors'}
						<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
						Saving...
					{:else}
						Save colors
					{/if}
				</Button>
				<Button type="button" variant="outline" onclick={() => (previewOpen = true)}>
					<Icon icon="mdi:eye-outline" class="h-4 w-4" />
					Preview
				</Button>
			</CardFooter>
		</Card>

		<!-- ── Color preview dialog ────────────────────────────────────────────── -->
		<Dialog bind:open={previewOpen}>
			<DialogContent class="max-w-sm overflow-hidden p-0">
				<DialogHeader class="px-5 pt-5 pb-3">
					<DialogTitle>Color preview</DialogTitle>
				</DialogHeader>
				<div class="mx-5 mb-5 space-y-3">
					<!-- 1. Header strip — background-color bar, foreground-color text/icon -->
					<div
						class="flex items-center justify-between rounded-lg px-4 py-3"
						style="background-color: {backgroundColor};"
					>
						<div class="flex items-center gap-2">
							<Icon
								icon="mdi:storefront-outline"
								class="h-5 w-5"
								style="color: {foregroundColor};"
							/>
							<span class="text-sm font-bold" style="color: {foregroundColor};">My Shop</span>
						</div>
						<Icon icon="mdi:cart-outline" class="h-5 w-5" style="color: {foregroundColor};" />
					</div>

					<!-- 2. Item card — white card, neutral text, + Add (accent-color bg) -->
					<div
						class="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3"
					>
						<div class="min-w-0">
							<p class="text-sm font-semibold text-neutral-900">Sample item</p>
							<p class="mt-0.5 text-xs text-neutral-600">A short description</p>
							<p class="mt-1 text-sm font-medium text-neutral-900">$12.00</p>
						</div>
						<button
							type="button"
							class="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium"
							style="background-color: {accentColor}; color: {accentForeground};"
						>
							+ Add
						</button>
					</div>

					<!-- 3. Item card — Options variant (outlined background-color button) -->
					<div
						class="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3"
					>
						<div class="min-w-0">
							<p class="text-sm font-semibold text-neutral-900">Customizable item</p>
							<p class="mt-0.5 text-xs text-neutral-600">Has options to choose</p>
							<p class="mt-1 text-sm font-medium text-neutral-900">$9.50</p>
						</div>
						<button
							type="button"
							class="shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium"
							style="border-color: {backgroundColor}; color: {backgroundColor};"
						>
							Options
						</button>
					</div>

					<!-- 4. Sticky View cart CTA — accent-color pill -->
					<button
						type="button"
						class="w-full rounded-xl py-3 text-sm font-semibold"
						style="background-color: {accentColor}; color: {accentForeground};"
					>
						View cart · 2 items · $27.50
					</button>
				</div>
			</DialogContent>
		</Dialog>

		<!-- ── Logo ─────────────────────────────────────────────────────────────── -->
		<Card class="shadow-sm">
			<CardHeader class="border-b">
				<CardTitle>Logo</CardTitle>
				<CardDescription
					>Shown in your catalog header and tiled as a subtle background pattern.</CardDescription
				>
				<CardAction>
					<span
						class="rounded-full px-2.5 py-0.5 text-xs font-medium {data.branding.logoUrl
							? 'bg-success/10 text-success'
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
				{#if logoSaveError}
					<Alert severity="error" class="mb-3">{logoSaveError}</Alert>
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
							if (f) uploadImage(f, '/api/upload-logo', 'logo', logoState, 2, 'Logo updated');
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
						<form
							method="post"
							action="?/removeLogo"
							use:enhance={enhanceWithToasts({
								successMessage: 'Logo removed',
								onStart: () => {
									submittingAction = 'removeLogo';
									logoSaveError = null;
								},
								onEnd: () => {
									submittingAction = null;
								},
								onError: (msg) => {
									logoSaveError = msg;
								}
							})}
						>
							<Button
								type="submit"
								disabled={submittingAction !== null}
								variant="ghost"
								class="text-red-500 hover:bg-red-50 hover:text-red-600"
							>
								{#if submittingAction === 'removeLogo'}
									<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
									Removing...
								{:else}
									Remove
								{/if}
							</Button>
						</form>
					{/if}
				</div>
				<p class="text-xs text-muted-foreground">
					JPG, PNG, WebP, or SVG · max 2MB · transparent PNG or SVG recommended
				</p>
			</CardContent>
		</Card>

		<!-- ── Hero image ──────────────────────────────────────────────────────── -->
		<Card class="shadow-sm">
			<CardHeader class="border-b">
				<CardTitle>Hero image</CardTitle>
				<CardDescription
					>Full-bleed hero image shown at the top of your catalog page.</CardDescription
				>
				<CardAction>
					<span
						class="rounded-full px-2.5 py-0.5 text-xs font-medium {data.branding.heroImageUrl
							? 'bg-success/10 text-success'
							: 'bg-muted text-muted-foreground'}"
					>
						{data.branding.heroImageUrl ? 'Active' : 'Not set'}
					</span>
				</CardAction>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if data.branding.heroImageUrl}
					<div class="overflow-hidden rounded-lg border">
						<img
							src={data.branding.heroImageUrl}
							alt="Storefront hero"
							class="h-36 w-full object-cover"
						/>
					</div>
				{/if}
				{#if heroImageSaveError}
					<Alert severity="error" class="mb-3">{heroImageSaveError}</Alert>
				{/if}
				{#if heroImageState.error}
					<p class="text-sm text-red-600">{heroImageState.error}</p>
				{/if}
				<div class="flex items-center gap-3">
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp"
						bind:this={heroImageInput}
						onchange={(e) => {
							const f = (e.target as HTMLInputElement).files?.[0];
							if (f)
								uploadImage(
									f,
									'/api/upload-hero-image',
									'heroImage',
									heroImageState,
									5,
									'Hero image updated'
								);
						}}
						class="hidden"
					/>
					<Button
						type="button"
						onclick={() => heroImageInput?.click()}
						disabled={heroImageState.uploading}
						variant="default"
					>
						{heroImageState.uploading
							? 'Uploading…'
							: data.branding.heroImageUrl
								? 'Replace hero image'
								: 'Upload hero image'}
					</Button>
					{#if data.branding.heroImageUrl}
						<form
							method="post"
							action="?/removeHeroImage"
							use:enhance={enhanceWithToasts({
								successMessage: 'Hero image removed',
								onStart: () => {
									submittingAction = 'removeHeroImage';
									heroImageSaveError = null;
								},
								onEnd: () => {
									submittingAction = null;
								},
								onError: (msg) => {
									heroImageSaveError = msg;
								}
							})}
						>
							<Button
								type="submit"
								disabled={submittingAction !== null}
								variant="ghost"
								class="text-red-500 hover:bg-red-50 hover:text-red-600"
							>
								{#if submittingAction === 'removeHeroImage'}
									<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
									Removing...
								{:else}
									Remove
								{/if}
							</Button>
						</form>
					{/if}
				</div>
				<p class="text-xs text-muted-foreground">
					JPG, PNG, or WebP · max 5MB · wide landscape image recommended (1600×600px or similar)
				</p>

				<div class="my-4 flex items-center gap-2">
					<div class="h-px flex-1 bg-border"></div>
					<span class="text-xs text-muted-foreground">or</span>
					<div class="h-px flex-1 bg-border"></div>
				</div>

				<AiImageGenerator type="heroImage" aspect="aspect-video" />
			</CardContent>
		</Card>
	</div>
</div>
