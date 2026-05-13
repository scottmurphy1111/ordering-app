<script lang="ts">
	import { resolve } from '$app/paths';
	import { enhance } from '$app/forms';
	import Icon from '@iconify/svelte';
	import type { PageData, ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Alert } from '$lib/components/ui/alert';
	import { FULFILLMENT_MODELS, fulfillmentModelLabel } from '$lib/utils/fulfillment-model-labels';

	let { data, form: _form }: { data: PageData; form: ActionData } = $props();
	const form = $derived(_form as { error?: string } | null);

	const targetModels = $derived(FULFILLMENT_MODELS.filter((m) => m.value !== data.currentModel));
</script>

<div class="max-w-2xl">
	<div class="mb-6 flex items-center gap-3">
		<a
			href={resolve('/dashboard/settings/general')}
			class="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<Icon icon="mdi:chevron-left" class="h-4 w-4" /> General
		</a>
		<span class="text-muted-foreground/40">/</span>
		<h1 class="text-2xl font-bold text-foreground">Change fulfillment model</h1>
	</div>

	{#if form?.error}
		<Alert severity="error" class="mb-4">{form.error}</Alert>
	{/if}

	{#if data.target === null}
		<!-- Step 1: select target model -->
		<p class="mb-6 text-sm text-muted-foreground">
			Currently: <span class="font-medium text-foreground"
				>{fulfillmentModelLabel(data.currentModel)}</span
			>. Choose the model that fits your business.
		</p>

		<form method="get" class="space-y-3">
			{#each targetModels as model (model.value)}
				<label
					class="block cursor-pointer rounded-xl border bg-background px-5 py-4 transition-all hover:border-primary/50 hover:shadow-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
				>
					<input type="radio" name="to" value={model.value} class="sr-only" />
					<p class="text-sm font-semibold text-foreground">{model.label}</p>
					<p class="mt-1 text-xs text-muted-foreground">{model.description}</p>
				</label>
			{/each}

			<div class="pt-2">
				<Button type="submit">Review change →</Button>
			</div>
		</form>
	{:else}
		<!-- Step 2: review orphans + confirm -->
		<div class="mb-6 flex items-center gap-3 text-sm">
			<span class="rounded-md bg-muted/50 px-2.5 py-1 font-medium text-foreground">
				{fulfillmentModelLabel(data.currentModel)}
			</span>
			<Icon icon="mdi:arrow-right" class="h-4 w-4 shrink-0 text-muted-foreground" />
			<span class="rounded-md bg-primary/10 px-2.5 py-1 font-medium text-primary">
				{fulfillmentModelLabel(data.target)}
			</span>
		</div>

		{#if data.orphans}
			{@const { storefrontItems, eventsItems, hoursRows, windowTemplates } = data.orphans}
			{@const hasOrphans =
				storefrontItems > 0 || eventsItems > 0 || hoursRows > 0 || windowTemplates > 0}

			{#if hasOrphans}
				<div class="mb-6 space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
					<p class="text-sm font-medium text-amber-800">Review before confirming</p>
					<ul class="space-y-1.5 text-xs text-amber-700">
						{#if storefrontItems > 0}
							<li class="flex items-start gap-1.5">
								<Icon icon="mdi:alert-outline" class="mt-0.5 h-3.5 w-3.5 shrink-0" />
								{storefrontItems}
								{storefrontItems === 1 ? 'item is' : 'items are'} set to "Storefront only" — they won't
								match any pickup event. Update their availability after switching.
							</li>
						{/if}
						{#if eventsItems > 0}
							<li class="flex items-start gap-1.5">
								<Icon icon="mdi:alert-outline" class="mt-0.5 h-3.5 w-3.5 shrink-0" />
								{eventsItems}
								{eventsItems === 1 ? 'item is' : 'items are'} set to "Events only" — they won't be available
								on the storefront. Update their availability after switching.
							</li>
						{/if}
						{#if hoursRows > 0}
							<li class="flex items-start gap-1.5">
								<Icon icon="mdi:information-outline" class="mt-0.5 h-3.5 w-3.5 shrink-0" />
								Your operating hours will be preserved but won't affect the customer storefront in pickup-only
								mode.
							</li>
						{/if}
						{#if windowTemplates > 0}
							<li class="flex items-start gap-1.5">
								<Icon icon="mdi:information-outline" class="mt-0.5 h-3.5 w-3.5 shrink-0" />
								{windowTemplates} active pickup
								{windowTemplates === 1 ? 'schedule' : 'schedules'} will be preserved but won't appear
								on the storefront-only view.
							</li>
						{/if}
					</ul>
				</div>
			{:else}
				<p class="mb-6 text-sm text-muted-foreground">
					No items or schedules are affected by this change.
				</p>
			{/if}
		{/if}

		<form method="post" action="?/commit" use:enhance class="flex items-center gap-4">
			<input type="hidden" name="target" value={data.target} />
			<a
				href={resolve('/dashboard/settings/fulfillment-model/change')}
				class="text-sm text-muted-foreground transition-colors hover:text-foreground"
			>
				← Change selection
			</a>
			<Button type="submit">Confirm change</Button>
		</form>
	{/if}
</div>
