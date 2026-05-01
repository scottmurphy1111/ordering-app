<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Card, CardContent } from '$lib/components/ui/card';

	type SetupStep = {
		id: string;
		label: string;
		description: string;
		href: string;
		complete: boolean;
	};

	let {
		checklist
	}: {
		checklist: {
			steps: SetupStep[];
			allComplete: boolean;
			completedCount: number;
		};
	} = $props();
</script>

<Card class="mb-6 shadow-sm">
	<CardContent>
		<div class="mb-4 flex items-center justify-between">
			<div>
				<h2 class="text-base font-semibold text-foreground">Set up your shop</h2>
				<p class="mt-0.5 text-xs text-muted-foreground">
					{checklist.completedCount} of {checklist.steps.length} complete
				</p>
			</div>
		</div>
		<div class="divide-y divide-gray-100">
			{#each checklist.steps as step (step.id)}
				<div class="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
					<div class="mt-0.5 shrink-0">
						{#if step.complete}
							<div class="flex h-5 w-5 items-center justify-center rounded-full bg-green-100">
								<Icon icon="mdi:check" class="h-3 w-3 text-green-600" />
							</div>
						{:else}
							<div class="h-5 w-5 rounded-full border-2 border-gray-300"></div>
						{/if}
					</div>
					<div class="min-w-0 flex-1">
						<p class="text-sm font-medium {step.complete ? 'text-gray-400' : 'text-gray-900'}">
							{step.label}
						</p>
						{#if !step.complete}
							<p class="mt-0.5 text-xs text-gray-500">{step.description}</p>
						{/if}
					</div>
					{#if !step.complete}
						<a
							href={resolve(step.href as `/${string}`)}
							class="shrink-0 text-xs font-medium text-green-600 hover:text-green-700"
						>
							Set up →
						</a>
					{/if}
				</div>
			{/each}
		</div>
	</CardContent>
</Card>
