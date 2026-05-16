<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	let { data, form: _form }: { data: PageData; form: ActionData } = $props();
	const form = $derived(_form as { error?: string } | null);

	const vendor = $derived(data.vendor);

	let photoFiles = $state<File[]>([]);
	let photoInput: HTMLInputElement | undefined = $state();

	function handleFileChange(e: Event) {
		const input = e.currentTarget as HTMLInputElement;
		const incoming = Array.from(input.files ?? []);
		if (incoming.length === 0) return;

		const combined = [...photoFiles];
		for (const f of incoming) {
			const isDuplicate = photoFiles.some((p) => p.name === f.name && p.size === f.size);
			if (!isDuplicate) combined.push(f);
		}

		const capped = combined.slice(0, 5);
		photoFiles = capped;

		const dt = new DataTransfer();
		capped.forEach((f) => dt.items.add(f));
		input.files = dt.files;
	}

	function removePhoto(index: number) {
		photoFiles = photoFiles.filter((_, i) => i !== index);
		if (photoInput) {
			const dt = new DataTransfer();
			photoFiles.forEach((f) => dt.items.add(f));
			photoInput.files = dt.files;
		}
	}
</script>

<svelte:head>
	<title>Custom order request — {vendor.name}</title>
</svelte:head>

<div class="min-h-screen bg-muted/30">
	<!-- Small branded header — vendor context only, not a marketing surface -->
	<header class="border-b bg-background">
		<div class="mx-auto flex max-w-2xl items-center gap-3 px-6 py-4">
			{#if vendor.logoUrl}
				<img
					src={vendor.logoUrl}
					alt={vendor.name}
					class="h-8 w-auto max-w-24 shrink-0 object-contain"
				/>
			{/if}
			<div class="min-w-0 flex-1">
				<p class="truncate text-sm font-semibold text-foreground">{vendor.name}</p>
			</div>
			<a
				href={resolve('/catalog' as `/${string}`)}
				class="text-xs font-medium text-muted-foreground hover:text-foreground"
			>
				← Back to shop
			</a>
		</div>
	</header>

	<main class="mx-auto max-w-2xl px-4 py-8 sm:py-10">
		<div class="rounded-lg border bg-background p-6 sm:p-8">
			<div class="mb-6">
				<h1 class="text-2xl font-bold text-foreground">Custom order request</h1>
				<p class="mt-1.5 text-sm text-muted-foreground">
					Tell {vendor.name} what you're looking for. They'll review your request and follow up.
				</p>
			</div>

			{#if form?.error}
				<div
					class="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
				>
					<Icon
						icon="mdi:alert-circle-outline"
						class="mr-1.5 mb-0.5 inline-block h-4 w-4 align-text-bottom"
					/>
					{form.error}
				</div>
			{/if}

			<form
				method="post"
				action="?/submit"
				use:enhance
				enctype="multipart/form-data"
				class="space-y-5"
			>
				<!-- Name + Email -->
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<label for="customerName" class="mb-1 block text-sm font-medium text-foreground">
							Your name *
						</label>
						<input
							id="customerName"
							name="customerName"
							type="text"
							required
							autocomplete="name"
							class="h-8 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-foreground placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-gray-400 focus:outline-none"
							placeholder="Jane Smith"
						/>
					</div>
					<div>
						<label for="customerEmail" class="mb-1 block text-sm font-medium text-foreground">
							Email address *
						</label>
						<input
							id="customerEmail"
							name="customerEmail"
							type="email"
							required
							autocomplete="email"
							class="h-8 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-foreground placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-gray-400 focus:outline-none"
							placeholder="jane@example.com"
						/>
					</div>
				</div>

				<!-- Phone -->
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<label for="customerPhone" class="mb-1 block text-sm font-medium text-foreground">
							Phone number <span class="font-normal text-gray-400">(optional)</span>
						</label>
						<input
							id="customerPhone"
							name="customerPhone"
							type="tel"
							autocomplete="tel"
							class="h-8 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-foreground placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-gray-400 focus:outline-none"
							placeholder="+1 (555) 000-0000"
						/>
					</div>
					<div class="hidden sm:block"></div>
				</div>

				<!-- Description -->
				<div>
					<label for="description" class="mb-1 block text-sm font-medium text-foreground">
						Describe your order *
					</label>
					<textarea
						id="description"
						name="description"
						required
						minlength="10"
						maxlength="4000"
						rows="5"
						class="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-foreground placeholder:text-gray-400 focus:border-transparent focus:ring-2 focus:ring-gray-400 focus:outline-none"
						placeholder="What would you like? Include any details about size, flavor, date, dietary needs, or anything else that would help…"
					></textarea>
					<p class="mt-1 text-xs text-gray-400">Minimum 10 characters, up to 4000.</p>
				</div>

				<!-- Target date -->
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<label for="targetDate" class="mb-1 block text-sm font-medium text-foreground">
							Desired date <span class="font-normal text-gray-400">(optional)</span>
						</label>
						<input
							id="targetDate"
							name="targetDate"
							type="date"
							class="h-8 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-foreground focus:border-transparent focus:ring-2 focus:ring-gray-400 focus:outline-none"
						/>
					</div>
					<div class="hidden sm:block"></div>
				</div>

				<!-- Photos -->
				<div>
					<p class="mb-1 block text-sm font-medium text-foreground">
						Reference photos <span class="font-normal text-gray-400">(optional, up to 5)</span>
					</p>
					<div class="space-y-2">
						{#if photoFiles.length > 0}
							<ul class="space-y-1.5">
								{#each photoFiles as file, i (file.name + i)}
									<li
										class="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
									>
										<Icon icon="mdi:image-outline" class="h-4 w-4 shrink-0 text-gray-400" />
										<span class="min-w-0 flex-1 truncate text-gray-700">{file.name}</span>
										<button
											type="button"
											onclick={() => removePhoto(i)}
											class="shrink-0 text-gray-400 hover:text-gray-600"
											aria-label="Remove photo"
										>
											<Icon icon="mdi:close" class="h-4 w-4" />
										</button>
									</li>
								{/each}
							</ul>
						{/if}
						{#if photoFiles.length < 5}
							<label
								for="photoUpload"
								class="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 transition-colors hover:border-gray-400 hover:bg-gray-50"
							>
								<Icon icon="mdi:upload-outline" class="h-4 w-4 shrink-0" />
								Add photos
								<input
									id="photoUpload"
									bind:this={photoInput}
									type="file"
									name="photos"
									accept="image/*"
									multiple
									onchange={handleFileChange}
									class="sr-only"
								/>
							</label>
						{/if}
					</div>
				</div>

				<div class="pt-2">
					<button
						type="submit"
						class="rounded-lg bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
					>
						Send request
					</button>
				</div>
			</form>
		</div>
	</main>
</div>
