<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import Icon from '@iconify/svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	interface Props {
		type: 'banner' | 'background';
		/** Tailwind aspect-ratio class for the preview thumbnail. */
		aspect: 'aspect-video' | 'aspect-[21/9]';
	}

	let { type, aspect }: Props = $props();

	let description = $state('');
	let generating = $state(false);
	let accepting = $state(false);
	let previewUrl = $state<string | null>(null);
	let errorMessage = $state<string | null>(null);

	const placeholder = $derived(
		type === 'banner'
			? 'e.g. a cozy artisan bakery with sourdough loaves'
			: 'e.g. blurred wildflowers in a sunlit field'
	);

	const labelHeading = $derived(
		type === 'banner' ? 'Generate banner with AI' : 'Generate background with AI'
	);

	const helpText = $derived(
		type === 'banner'
			? 'Describe your business or the feeling you want. Takes about 3 seconds.'
			: 'Describe the mood, palette, or theme. Takes about 3 seconds.'
	);

	async function generate() {
		if (generating) return;
		generating = true;
		errorMessage = null;

		try {
			const res = await fetch('/api/generate-image', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ type, description })
			});

			if (!res.ok) {
				const data = await res.json().catch(() => ({}));
				errorMessage =
					(data as { message?: string }).message ?? 'Generation failed. Please try again.';
				previewUrl = null;
				return;
			}

			const data = (await res.json()) as { url: string };
			previewUrl = data.url;
		} catch (err) {
			console.error('[AiImageGenerator] generate failed:', err);
			errorMessage = 'Network error. Please try again.';
			previewUrl = null;
		} finally {
			generating = false;
		}
	}

	function reset() {
		previewUrl = null;
		errorMessage = null;
	}
</script>

<div class="space-y-3">
	<div>
		<Label>{labelHeading}</Label>
		<p class="text-xs text-muted-foreground">{helpText}</p>
	</div>

	<div class="flex flex-col gap-2 md:flex-row">
		<Input
			type="text"
			bind:value={description}
			{placeholder}
			maxlength={500}
			disabled={generating}
			class="flex-1"
		/>
		<Button onclick={generate} disabled={generating} class="shrink-0">
			{#if generating}
				<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
				Generating...
			{:else}
				<Icon icon="mdi:sparkles" class="h-4 w-4" />
				Generate
			{/if}
		</Button>
	</div>

	{#if errorMessage}
		<p class="text-sm text-red-600">{errorMessage}</p>
	{/if}

	{#if previewUrl}
		<div class="space-y-2 rounded-lg border bg-muted/30 p-3">
			<div class="overflow-hidden rounded-md {aspect}">
				<img src={previewUrl} alt="Generated preview" class="h-full w-full object-cover" />
			</div>

			<div class="flex flex-col gap-2 md:flex-row">
				<form
					method="post"
					action="?/acceptGenerated{type === 'banner' ? 'Banner' : 'Background'}"
					use:enhance={() => {
						accepting = true;
						return async ({ result, update }) => {
							accepting = false;
							if (result.type === 'success') {
								previewUrl = null;
								description = '';
								await invalidateAll();
							} else {
								await update();
							}
						};
					}}
					class="flex-1"
				>
					<input type="hidden" name="url" value={previewUrl} />
					<Button type="submit" disabled={accepting || generating} class="w-full">
						{#if accepting}
							<Icon icon="mdi:loading" class="h-4 w-4 animate-spin" />
							Saving...
						{:else}
							<Icon icon="mdi:check" class="h-4 w-4" />
							Use this {type}
						{/if}
					</Button>
				</form>

				<Button variant="outline" onclick={generate} disabled={accepting || generating}>
					<Icon icon="mdi:refresh" class="h-4 w-4" />
					Try again
				</Button>

				<Button variant="ghost" onclick={reset} disabled={accepting || generating}>Discard</Button>
			</div>
		</div>
	{/if}
</div>
