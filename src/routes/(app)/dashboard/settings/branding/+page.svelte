<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Icon from '@iconify/svelte';
	import { resolve } from '$app/paths';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from '$lib/components/ui/card';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let backgroundColor = $state('');
	let accentColor = $state('');
	let foregroundColor = $state('');

	$effect(() => {
		backgroundColor = data.branding.backgroundColor ?? '#000000';
		accentColor = data.branding.accentColor ?? '#374151';
		foregroundColor = data.branding.foregroundColor ?? '#ffffff';
	});

	// suppress stale $state warning — branding data initialized from server


	// ── Upload helpers ─────────────────────────────────────────────────────────
	type UploadState = { uploading: boolean; error: string };

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
			class="mb-1 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
		>
			<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Settings
		</a>
		<h1 class="text-2xl font-bold text-gray-900">Branding</h1>
		<p class="mt-0.5 text-sm text-gray-500">Customize your storefront's appearance.</p>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
			{form.error}
		</div>
	{/if}
	{#if form?.success}
		<div
			class="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
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
				<p class="mb-4 text-xs text-gray-500">Sets the colors on your public storefront.</p>
				<form
					method="post"
					action="?/saveColors"
					use:enhance={() =>
						({ update }) =>
							update({ reset: false })}
					class="space-y-5"
				>
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
						{#each [
							{ id: 'backgroundColor', label: 'Background', note: 'Header, buttons, and key elements.', value: backgroundColor },
							{ id: 'foregroundColor', label: 'Foreground', note: 'Text and icons on the background color.', value: foregroundColor },
							{ id: 'accentColor', label: 'Accent', note: 'Category pills, tags, and highlights.', value: accentColor }
						] as col (col.id)}
							<div>
								<label class="mb-2 block text-sm font-medium text-gray-700" for={col.id}
									>{col.label}</label
								>
								<div class="flex items-center gap-3">
									<div
										class="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-gray-300 shadow-sm"
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
								<p class="mt-1.5 text-xs text-gray-400">{col.note}</p>
							</div>
						{/each}
					</div>

					<!-- Live preview -->
					<div>
						<p class="mb-2 text-xs font-medium tracking-wide text-gray-500 uppercase">Preview</p>
						<div class="overflow-hidden rounded-lg border border-gray-200">
							<div
								class="flex items-center gap-3 px-4 py-3"
								style="background-color: {backgroundColor};"
							>
								<span class="text-sm font-bold" style="color: {foregroundColor};">My Restaurant</span>
								<span
									class="rounded-full px-2 py-0.5 text-xs font-medium"
									style="background-color: {accentColor}; color: {foregroundColor};"
									>Quick service</span
								>
							</div>
							<div
								class="flex items-center gap-3 px-4 py-4"
								style="background-color: {foregroundColor};"
							>
								<span
									class="rounded-full px-3 py-1 text-xs font-medium"
									style="background-color: color-mix(in srgb, {accentColor} 20%, {foregroundColor}); color: {accentColor};">Burgers</span
								>
								<span
									class="rounded-full border px-3 py-1 text-xs font-medium"
									style="border-color: {accentColor}; color: {accentColor};">Drinks</span
								>
								<button
									type="button"
									class="ml-auto rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm"
									style="background-color: {backgroundColor}; color: {foregroundColor};">+ Add</button
								>
							</div>
						</div>
					</div>

					<Button type="submit" variant="default">Save colors</Button>
				</form>
			</CardContent>
		</Card>

		<!-- ── Logo ─────────────────────────────────────────────────────────────── -->
		<Card class="shadow-sm">
			<CardHeader class="border-b border-gray-100">
				<CardTitle>Logo</CardTitle>
				<CardDescription>Shown in your menu header and tiled as a subtle background pattern.</CardDescription>
				<CardAction>
					<span
						class="rounded-full px-2.5 py-0.5 text-xs font-medium {data.branding.logoUrl
							? 'bg-green-100 text-green-700'
							: 'bg-gray-100 text-gray-500'}"
					>
						{data.branding.logoUrl ? 'Active' : 'Not set'}
					</span>
				</CardAction>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if data.branding.logoUrl}
					<div class="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
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
							<Button type="submit" variant="destructive">Remove</Button>
						</form>
					{/if}
				</div>
				<p class="text-xs text-gray-400">
					JPG, PNG, WebP, or SVG · max 2MB · transparent PNG or SVG recommended
				</p>
			</CardContent>
		</Card>

		<!-- ── Banner image ──────────────────────────────────────────────────────── -->
		<Card class="shadow-sm">
			<CardHeader class="border-b border-gray-100">
				<CardTitle>Banner image</CardTitle>
				<CardDescription>Full-bleed hero image shown at the top of your menu page.</CardDescription>
				<CardAction>
					<span
						class="rounded-full px-2.5 py-0.5 text-xs font-medium {data.branding.bannerUrl
							? 'bg-green-100 text-green-700'
							: 'bg-gray-100 text-gray-500'}"
					>
						{data.branding.bannerUrl ? 'Active' : 'Not set'}
					</span>
				</CardAction>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if data.branding.bannerUrl}
					<div class="overflow-hidden rounded-lg border border-gray-200">
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
							<Button type="submit" variant="destructive">Remove</Button>
						</form>
					{/if}
				</div>
				<p class="text-xs text-gray-400">
					JPG, PNG, or WebP · max 5MB · wide landscape image recommended (1600×600px or similar)
				</p>
			</CardContent>
		</Card>

		<!-- ── Background image ──────────────────────────────────────────────────── -->
		<Card class="shadow-sm">
			<CardHeader class="border-b border-gray-100">
				<CardTitle>Background image</CardTitle>
				<CardDescription>Subtle full-page texture behind your menu and cart. Works best with low-contrast images (wood, marble, linen).</CardDescription>
				<CardAction>
					<span
						class="rounded-full px-2.5 py-0.5 text-xs font-medium {data.branding.backgroundImageUrl
							? 'bg-green-100 text-green-700'
							: 'bg-gray-100 text-gray-500'}"
					>
						{data.branding.backgroundImageUrl ? 'Active' : 'Not set'}
					</span>
				</CardAction>
			</CardHeader>
			<CardContent class="space-y-4">
				{#if data.branding.backgroundImageUrl}
					<div class="overflow-hidden rounded-lg border border-gray-200">
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
							<Button type="submit" variant="destructive">Remove</Button>
						</form>
					{/if}
				</div>
				<p class="text-xs text-gray-400">
					JPG, PNG, or WebP · max 5MB · tileable textures work best
				</p>
			</CardContent>
		</Card>
	</div>
</div>
