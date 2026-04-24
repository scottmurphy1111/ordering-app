<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Icon from '@iconify/svelte';
	import { tourState } from '$lib/tour-state.svelte';
	import { Button } from '$lib/components/ui/button';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showCreate = $state(false);
	let slugValue = $state('');
	let search = $state('');

	const filteredTenants = $derived(
		search.trim()
			? data.tenants.filter(
					(t) =>
						t.name.toLowerCase().includes(search.toLowerCase()) ||
						t.slug.toLowerCase().includes(search.toLowerCase())
				)
			: data.tenants
	);

	function startTour() {
		showCreate = false;
		tourState.active = true;
	}

	function toSlug(name: string) {
		return name
			.toLowerCase()
			.replace(/[^a-z0-9\s-]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.slice(0, 50);
	}
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-16">
	<div class="w-full max-w-lg">
		<h1 class="mb-1 text-2xl font-bold text-gray-900">Your tenants</h1>
		<p class="mb-6 text-sm text-gray-500">Select a tenant to manage, or create a new one.</p>

		{#if form?.error}
			<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
				{form.error}
			</div>
		{/if}

		{#if data.tenants.length > 4}
			<div class="relative mb-4">
				<Icon
					icon="mdi:magnify"
					class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
				/>
				<input
					type="search"
					placeholder="Search tenants..."
					bind:value={search}
					class="w-full rounded-lg border border-gray-200 bg-white py-2 pr-3 pl-9 text-sm focus:border-gray-400 focus:ring-1 focus:ring-gray-400 focus:outline-none"
				/>
			</div>
		{/if}

		{#if data.tenants.length > 0}
			<div class="mb-6 space-y-2">
				{#each filteredTenants as t (t.id)}
					<form method="post" action="?/select" use:enhance>
						<input type="hidden" name="tenantId" value={t.id} />
						<button
							type="submit"
							class="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left shadow-sm transition-all hover:border-gray-400 hover:shadow"
						>
							<div class="flex min-w-0 items-center gap-3">
								{#if t.logoUrl}
									<img
										src={t.logoUrl}
										alt={t.name}
										class="h-10 w-10 shrink-0 rounded-md border border-gray-100 object-contain p-0.5"
									/>
								{:else}
									<div
										class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-100 bg-gray-100"
									>
										<Icon icon="mdi:store-outline" class="h-5 w-5 text-gray-400" />
									</div>
								{/if}
								<div class="min-w-0">
									<p class="font-medium text-gray-900">{t.name}</p>
									<p class="mt-0.5 text-xs text-gray-400">
										/{t.slug} · {t.type?.replace('_', ' ')} · {t.role}
									</p>
								</div>
							</div>
							<Icon icon="mdi:chevron-right" class="ml-2 h-5 w-5 shrink-0 text-gray-400" />
						</button>
					</form>
				{/each}
			</div>
		{/if}

		{#if data.canCreate && !showCreate}
			<Button
				data-tour="create-tenant"
				onclick={() => (showCreate = true)}
				variant="outline"
				class="w-full border-2 border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700"
			>
				<Icon icon="mdi:plus" class="h-4 w-4" /> Create new tenant
			</Button>
		{:else if data.canCreate}
			<form
				method="post"
				action="?/create"
				use:enhance
				class="space-y-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm"
			>
				<h2 class="font-semibold text-gray-800">New tenant</h2>

				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700" for="name"
						>Business name</label
					>
					<input
						id="name"
						name="name"
						type="text"
						required
						placeholder="Acme Burger Co."
						oninput={(e) => {
							slugValue = toSlug((e.target as HTMLInputElement).value);
						}}
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					/>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700" for="slug">URL slug</label>
					<div class="flex items-center gap-1.5">
						<span class="text-sm text-gray-400">getorderlocal.com/</span>
						<input
							id="slug"
							name="slug"
							type="text"
							required
							bind:value={slugValue}
							placeholder="acme-burger"
							class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
						/>
					</div>
				</div>

				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700" for="type"
						>Business type</label
					>
					<select
						id="type"
						name="type"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
					>
						<option value="quick_service">Quick Service</option>
						<option value="full_service">Full Service</option>
						<option value="cafe">Café</option>
						<option value="food_truck">Food Truck</option>
						<option value="bar">Bar</option>
						<option value="bakery">Bakery</option>
						<option value="other">Other</option>
					</select>
				</div>

				<div class="flex gap-2 pt-1">
					<Button type="submit" variant="default" class="flex-1">
						Create & go to dashboard
					</Button>
					<Button type="button" onclick={() => (showCreate = false)} variant="outline">
						Cancel
					</Button>
				</div>
			</form>
		{/if}

		<div class="mt-6 flex justify-center">
			<Button onclick={startTour} variant="ghost" size="sm" class="gap-1.5 text-gray-400 hover:text-gray-600">
				<Icon icon="mdi:compass-outline" class="h-4 w-4" />
				Take the tour
			</Button>
		</div>
	</div>
</div>
