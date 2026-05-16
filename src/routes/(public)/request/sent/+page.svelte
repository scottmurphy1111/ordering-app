<script lang="ts">
	import type { PageData } from './$types';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';

	let { data }: { data: PageData } = $props();
	const vendor = $derived(data.vendor);
</script>

<svelte:head>
	<title>Request sent — {vendor.name}</title>
</svelte:head>

<div class="min-h-screen bg-muted/30">
	<!-- Same small branded header as the request page -->
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

	<main class="mx-auto max-w-xl px-4 py-12 sm:py-16">
		<div class="rounded-lg border bg-background p-8 text-center sm:p-12">
			<div
				class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"
			>
				<Icon icon="mdi:check" class="h-6 w-6" />
			</div>
			<h1 class="text-2xl font-bold text-foreground">Request sent</h1>
			<p class="mt-2 text-sm text-muted-foreground">
				{vendor.name} will review your request and reply by email. Check your inbox in the next day
				or two.
			</p>
			<div class="mt-6">
				<Button href={resolve('/catalog' as `/${string}`)} variant="outline">
					Back to {vendor.name}
				</Button>
			</div>
		</div>
	</main>
</div>
