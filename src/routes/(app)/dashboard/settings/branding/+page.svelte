<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Color picker state
	let primaryColor = $state('');
	let secondaryColor = $state('');
	let accentColor = $state('');

	$effect(() => {
		primaryColor = data.branding.primaryColor ?? '#000000';
		secondaryColor = data.branding.secondaryColor ?? '#374151';
		accentColor = data.branding.accentColor ?? '#ffffff';
	});

	// Logo upload state
	let isUploading = $state(false);
	let uploadError = $state('');
	let fileInput = $state<HTMLInputElement | null>(null);

	async function handleLogoUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;

		const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
		if (!allowedTypes.includes(file.type)) {
			uploadError = 'Please select a valid image file (JPG, PNG, WebP, or SVG)';
			return;
		}
		if (file.size > 2 * 1024 * 1024) {
			uploadError = 'File size must be less than 2MB';
			return;
		}

		isUploading = true;
		uploadError = '';

		try {
			const fd = new FormData();
			fd.append('logo', file);
			const res = await fetch('/api/upload-logo', { method: 'POST', body: fd });
			const result = await res.json();
			if (result.success) {
				window.location.reload();
			} else {
				uploadError = result.error ?? 'Failed to upload logo';
			}
		} catch {
			uploadError = 'Network error occurred while uploading';
		} finally {
			isUploading = false;
			input.value = '';
		}
	}
</script>

<div>
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-900">Branding</h1>
		<p class="mt-0.5 text-sm text-gray-500">Customize your storefront's appearance.</p>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{form.error}</div>
	{/if}
	{#if form?.success}
		<div class="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{form.message}</div>
	{/if}

	<div class="space-y-6">

		<!-- ── Color scheme ───────────────────────────────────── -->
		<div class="rounded-xl border border-gray-200 bg-white shadow-sm">
			<div class="border-b border-gray-100 px-5 py-4">
				<h2 class="font-semibold text-gray-900">Color scheme</h2>
				<p class="mt-0.5 text-xs text-gray-500">Sets the primary and accent colors on your public storefront.</p>
			</div>
			<div class="px-5 py-5">
				<form method="post" action="?/saveColors" use:enhance class="space-y-5">
					<div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
						<!-- Primary color -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2" for="primaryColor">
								Primary color
							</label>
							<div class="flex items-center gap-3">
								<div class="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-gray-300 shadow-sm">
									<input
										type="color"
										id="primaryColor"
										name="primaryColor"
										bind:value={primaryColor}
										class="absolute inset-0 h-full w-full cursor-pointer border-0 p-0 opacity-0"
									/>
									<div class="h-full w-full rounded-md" style="background-color: {primaryColor};"></div>
								</div>
								<input
									type="text"
									value={primaryColor}
									oninput={(e) => { primaryColor = (e.target as HTMLInputElement).value; }}
									maxlength="7"
									placeholder="#000000"
									class="w-28 rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
								/>
							</div>
							<p class="mt-1.5 text-xs text-gray-400">Buttons, headers, key actions.</p>
						</div>

						<!-- Secondary color -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2" for="secondaryColor">
								Secondary color
							</label>
							<div class="flex items-center gap-3">
								<div class="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-gray-300 shadow-sm">
									<input
										type="color"
										id="secondaryColor"
										name="secondaryColor"
										bind:value={secondaryColor}
										class="absolute inset-0 h-full w-full cursor-pointer border-0 p-0 opacity-0"
									/>
									<div class="h-full w-full rounded-md" style="background-color: {secondaryColor};"></div>
								</div>
								<input
									type="text"
									value={secondaryColor}
									oninput={(e) => { secondaryColor = (e.target as HTMLInputElement).value; }}
									maxlength="7"
									placeholder="#374151"
									class="w-28 rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
								/>
							</div>
							<p class="mt-1.5 text-xs text-gray-400">Category pills, badges, tinted sections.</p>
						</div>

						<!-- Accent color -->
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-2" for="accentColor">
								Accent color
							</label>
							<div class="flex items-center gap-3">
								<div class="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-gray-300 shadow-sm">
									<input
										type="color"
										id="accentColor"
										name="accentColor"
										bind:value={accentColor}
										class="absolute inset-0 h-full w-full cursor-pointer border-0 p-0 opacity-0"
									/>
									<div class="h-full w-full rounded-md" style="background-color: {accentColor};"></div>
								</div>
								<input
									type="text"
									value={accentColor}
									oninput={(e) => { accentColor = (e.target as HTMLInputElement).value; }}
									maxlength="7"
									placeholder="#ffffff"
									class="w-28 rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
								/>
							</div>
							<p class="mt-1.5 text-xs text-gray-400">Text on primary backgrounds.</p>
						</div>
					</div>

					<!-- Live preview -->
					<div>
						<p class="mb-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Preview</p>
						<div class="overflow-hidden rounded-lg border border-gray-200">
							<!-- Header bar (primary) -->
							<div class="flex items-center gap-3 px-4 py-3" style="background-color: {primaryColor};">
								<span class="text-sm font-bold" style="color: {accentColor};">My Restaurant</span>
								<span class="rounded-full px-2 py-0.5 text-xs font-medium" style="background-color: {secondaryColor}; color: {accentColor};">Quick service</span>
							</div>
							<!-- Body (accent) -->
							<div class="flex items-center gap-3 px-4 py-4" style="background-color: {accentColor};">
								<span class="rounded-full px-3 py-1 text-xs font-medium" style="background-color: {secondaryColor}; color: {accentColor};">Burgers</span>
								<span class="rounded-full px-3 py-1 text-xs font-medium border" style="border-color: {secondaryColor}; color: {secondaryColor};">Drinks</span>
								<button
									type="button"
									class="ml-auto rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm"
									style="background-color: {primaryColor}; color: {accentColor};"
								>
									+ Add
								</button>
							</div>
						</div>
					</div>

					<div>
						<button
							type="submit"
							class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
						>
							Save colors
						</button>
					</div>
				</form>
			</div>
		</div>

		<!-- ── Logo ──────────────────────────────────────────── -->
		<div class="rounded-xl border border-gray-200 bg-white shadow-sm">
			<div class="border-b border-gray-100 px-5 py-4">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="font-semibold text-gray-900">Logo</h2>
						<p class="mt-0.5 text-xs text-gray-500">Shown in your menu header and tiled as a subtle background pattern.</p>
					</div>
					{#if data.branding.logoUrl}
						<span class="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">
							<span class="h-1.5 w-1.5 rounded-full bg-green-500"></span>
							Active
						</span>
					{:else}
						<span class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-500">
							Not set
						</span>
					{/if}
				</div>
			</div>

			<div class="px-5 py-5 space-y-4">
				{#if data.branding.logoUrl}
					<div class="flex items-center gap-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
						<img
							src={data.branding.logoUrl}
							alt="Current logo"
							class="h-16 w-auto max-w-40 object-contain"
						/>
						<div class="text-xs text-gray-400">
							<p>Displays in menu header</p>
							<p>Tiled as background pattern</p>
						</div>
					</div>
				{/if}

				{#if uploadError}
					<div class="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{uploadError}</div>
				{/if}

				<div class="flex items-center gap-3">
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp,image/svg+xml"
						bind:this={fileInput}
						onchange={handleLogoUpload}
						class="hidden"
					/>
					<button
						type="button"
						onclick={() => fileInput?.click()}
						disabled={isUploading}
						class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors disabled:opacity-50"
					>
						{isUploading ? 'Uploading…' : data.branding.logoUrl ? 'Replace logo' : 'Upload logo'}
					</button>

					{#if data.branding.logoUrl}
						<form method="post" action="?/removeLogo" use:enhance>
							<button
								type="submit"
								class="rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
							>
								Remove
							</button>
						</form>
					{/if}
				</div>
				<p class="text-xs text-gray-400">JPG, PNG, WebP, or SVG · max 2 MB · transparent PNG or SVG recommended</p>
			</div>
		</div>

	</div>
</div>
