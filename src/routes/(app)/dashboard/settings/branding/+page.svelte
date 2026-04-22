<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Icon from '@iconify/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let primaryColor = $state('');
	let secondaryColor = $state('');
	let accentColor = $state('');

	$effect(() => {
		primaryColor = data.branding.primaryColor ?? '#000000';
		secondaryColor = data.branding.secondaryColor ?? '#374151';
		accentColor = data.branding.accentColor ?? '#ffffff';
	});

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
			href="/dashboard/settings"
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
		<div class="rounded-xl border border-gray-200 bg-white shadow-sm">
			<div class="border-b border-gray-100 px-5 py-4">
				<h2 class="font-semibold text-gray-900">Color scheme</h2>
				<p class="mt-0.5 text-xs text-gray-500">
					Sets the primary and accent colors on your public storefront.
				</p>
			</div>
			<div class="px-5 py-5">
				<form
					method="post"
					action="?/saveColors"
					use:enhance={() =>
						({ update }) =>
							update({ reset: false })}
					class="space-y-5"
				>
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
						{#each [{ id: 'primaryColor', label: 'Primary color', bind: 'primaryColor', note: 'Buttons, headers, key actions.', value: primaryColor }, { id: 'secondaryColor', label: 'Secondary color', bind: 'secondaryColor', note: 'Category pills, badges, tinted sections.', value: secondaryColor }, { id: 'accentColor', label: 'Accent color', bind: 'accentColor', note: 'Text on primary backgrounds.', value: accentColor }] as col (col.id)}
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
											value={col.id === 'primaryColor'
												? primaryColor
												: col.id === 'secondaryColor'
													? secondaryColor
													: accentColor}
											oninput={(e) => {
												const v = (e.target as HTMLInputElement).value;
												if (col.id === 'primaryColor') primaryColor = v;
												else if (col.id === 'secondaryColor') secondaryColor = v;
												else accentColor = v;
											}}
											class="absolute inset-0 h-full w-full cursor-pointer border-0 p-0 opacity-0"
										/>
										<div
											class="h-full w-full rounded-md"
											style="background-color: {col.id === 'primaryColor'
												? primaryColor
												: col.id === 'secondaryColor'
													? secondaryColor
													: accentColor};"
										></div>
									</div>
									<input
										type="text"
										value={col.id === 'primaryColor'
											? primaryColor
											: col.id === 'secondaryColor'
												? secondaryColor
												: accentColor}
										oninput={(e) => {
											const v = (e.target as HTMLInputElement).value;
											if (col.id === 'primaryColor') primaryColor = v;
											else if (col.id === 'secondaryColor') secondaryColor = v;
											else accentColor = v;
										}}
										maxlength="7"
										class="w-28 rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
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
								style="background-color: {primaryColor};"
							>
								<span class="text-sm font-bold" style="color: {accentColor};">My Restaurant</span>
								<span
									class="rounded-full px-2 py-0.5 text-xs font-medium"
									style="background-color: {secondaryColor}; color: {accentColor};"
									>Quick service</span
								>
							</div>
							<div
								class="flex items-center gap-3 px-4 py-4"
								style="background-color: {accentColor};"
							>
								<span
									class="rounded-full px-3 py-1 text-xs font-medium"
									style="background-color: {secondaryColor}; color: {accentColor};">Burgers</span
								>
								<span
									class="rounded-full border px-3 py-1 text-xs font-medium"
									style="border-color: {secondaryColor}; color: {secondaryColor};">Drinks</span
								>
								<button
									type="button"
									class="ml-auto rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm"
									style="background-color: {primaryColor}; color: {accentColor};">+ Add</button
								>
							</div>
						</div>
					</div>

					<button
						type="submit"
						class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
					>
						Save colors
					</button>
				</form>
			</div>
		</div>

		<!-- ── Logo ─────────────────────────────────────────────────────────────── -->
		<div class="rounded-xl border border-gray-200 bg-white shadow-sm">
			<div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
				<div>
					<h2 class="font-semibold text-gray-900">Logo</h2>
					<p class="mt-0.5 text-xs text-gray-500">
						Shown in your menu header and tiled as a subtle background pattern.
					</p>
				</div>
				<span
					class="rounded-full px-2.5 py-0.5 text-xs font-medium {data.branding.logoUrl
						? 'bg-green-100 text-green-700'
						: 'bg-gray-100 text-gray-500'}"
				>
					{data.branding.logoUrl ? 'Active' : 'Not set'}
				</span>
			</div>
			<div class="space-y-4 px-5 py-5">
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
					<button
						type="button"
						onclick={() => logoInput?.click()}
						disabled={logoState.uploading}
						class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
					>
						{logoState.uploading
							? 'Uploading…'
							: data.branding.logoUrl
								? 'Replace logo'
								: 'Upload logo'}
					</button>
					{#if data.branding.logoUrl}
						<form method="post" action="?/removeLogo" use:enhance>
							<button
								type="submit"
								class="rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
								>Remove</button
							>
						</form>
					{/if}
				</div>
				<p class="text-xs text-gray-400">
					JPG, PNG, WebP, or SVG · max 2MB · transparent PNG or SVG recommended
				</p>
			</div>
		</div>

		<!-- ── Banner image ──────────────────────────────────────────────────────── -->
		<div class="rounded-xl border border-gray-200 bg-white shadow-sm">
			<div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
				<div>
					<h2 class="font-semibold text-gray-900">Banner image</h2>
					<p class="mt-0.5 text-xs text-gray-500">
						Full-bleed hero image shown at the top of your menu page.
					</p>
				</div>
				<span
					class="rounded-full px-2.5 py-0.5 text-xs font-medium {data.branding.bannerUrl
						? 'bg-green-100 text-green-700'
						: 'bg-gray-100 text-gray-500'}"
				>
					{data.branding.bannerUrl ? 'Active' : 'Not set'}
				</span>
			</div>
			<div class="space-y-4 px-5 py-5">
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
					<button
						type="button"
						onclick={() => bannerInput?.click()}
						disabled={bannerState.uploading}
						class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
					>
						{bannerState.uploading
							? 'Uploading…'
							: data.branding.bannerUrl
								? 'Replace banner'
								: 'Upload banner'}
					</button>
					{#if data.branding.bannerUrl}
						<form method="post" action="?/removeBanner" use:enhance>
							<button
								type="submit"
								class="rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
								>Remove</button
							>
						</form>
					{/if}
				</div>
				<p class="text-xs text-gray-400">
					JPG, PNG, or WebP · max 5MB · wide landscape image recommended (1600×600px or similar)
				</p>
			</div>
		</div>

		<!-- ── Background image ──────────────────────────────────────────────────── -->
		<div class="rounded-xl border border-gray-200 bg-white shadow-sm">
			<div class="flex items-center justify-between border-b border-gray-100 px-5 py-4">
				<div>
					<h2 class="font-semibold text-gray-900">Background image</h2>
					<p class="mt-0.5 text-xs text-gray-500">
						Subtle full-page texture behind your menu and cart. Works best with low-contrast images
						(wood, marble, linen).
					</p>
				</div>
				<span
					class="rounded-full px-2.5 py-0.5 text-xs font-medium {data.branding.backgroundImageUrl
						? 'bg-green-100 text-green-700'
						: 'bg-gray-100 text-gray-500'}"
				>
					{data.branding.backgroundImageUrl ? 'Active' : 'Not set'}
				</span>
			</div>
			<div class="space-y-4 px-5 py-5">
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
					<button
						type="button"
						onclick={() => bgInput?.click()}
						disabled={bgState.uploading}
						class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
					>
						{bgState.uploading
							? 'Uploading…'
							: data.branding.backgroundImageUrl
								? 'Replace background'
								: 'Upload background'}
					</button>
					{#if data.branding.backgroundImageUrl}
						<form method="post" action="?/removeBackground" use:enhance>
							<button
								type="submit"
								class="rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50"
								>Remove</button
							>
						</form>
					{/if}
				</div>
				<p class="text-xs text-gray-400">
					JPG, PNG, or WebP · max 5MB · tileable textures work best
				</p>
			</div>
		</div>
	</div>
</div>
