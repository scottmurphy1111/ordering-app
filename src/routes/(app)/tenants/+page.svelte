<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Icon from '@iconify/svelte';
	import { tourState } from '$lib/tour-state.svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showCreate = $state(false);
	let slugValue = $state('');
	let search = $state('');

	const filteredTenants = $derived(
		search.trim()
			? data.tenants.filter((t) =>
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

<div class="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-16">
	<div class="w-full max-w-lg">
		<h1 class="text-2xl font-bold text-gray-900 mb-1">Your tenants</h1>
		<p class="text-gray-500 text-sm mb-6">Select a tenant to manage, or create a new one.</p>

		{#if form?.error}
			<div class="mb-4 rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
				{form.error}
			</div>
		{/if}

		{#if data.tenants.length > 4}
			<div class="relative mb-4">
				<Icon icon="mdi:magnify" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
				<input
					type="search"
					placeholder="Search tenants..."
					bind:value={search}
					class="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
				/>
			</div>
		{/if}

		{#if data.tenants.length > 0}
			<div class="space-y-2 mb-6">
				{#each filteredTenants as t (t.id)}
					<form method="post" action="?/select" use:enhance>
						<input type="hidden" name="tenantId" value={t.id} />
						<button
							type="submit"
							class="w-full flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left shadow-sm hover:border-gray-400 hover:shadow transition-all"
						>
							<div class="flex items-center gap-3 min-w-0">
								{#if t.logoUrl}
									<img src={t.logoUrl} alt={t.name} class="h-10 w-10 shrink-0 rounded-md border border-gray-100 object-contain p-0.5" />
								{:else}
									<div class="h-10 w-10 shrink-0 rounded-md border border-gray-100 bg-gray-100 flex items-center justify-center">
										<Icon icon="mdi:store-outline" class="h-5 w-5 text-gray-400" />
									</div>
								{/if}
								<div class="min-w-0">
									<p class="font-medium text-gray-900">{t.name}</p>
									<p class="text-xs text-gray-400 mt-0.5">/{t.slug} · {t.type?.replace('_', ' ')} · {t.role}</p>
								</div>
							</div>
							<Icon icon="mdi:chevron-right" class="h-5 w-5 text-gray-400 shrink-0 ml-2" />
						</button>
					</form>
				{/each}
			</div>
		{/if}

		{#if data.canCreate && !showCreate}
			<button
				data-tour="create-tenant"
				onclick={() => (showCreate = true)}
				class="flex items-center justify-center gap-2 w-full rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
			>
				<Icon icon="mdi:plus" class="h-4 w-4" /> Create new tenant
			</button>
		{:else if data.canCreate}
			<form
				method="post"
				action="?/create"
				use:enhance
				class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm space-y-4"
			>
				<h2 class="font-semibold text-gray-800">New tenant</h2>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1" for="name">Business name</label>
					<input
						id="name"
						name="name"
						type="text"
						required
						placeholder="Acme Burger Co."
						oninput={(e) => { slugValue = toSlug((e.target as HTMLInputElement).value); }}
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
					/>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1" for="slug">URL slug</label>
					<div class="flex items-center gap-1.5">
						<span class="text-sm text-gray-400">yourapp.com/</span>
						<input
							id="slug"
							name="slug"
							type="text"
							required
							bind:value={slugValue}
							placeholder="acme-burger"
							class="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
						/>
					</div>
				</div>

				<div>
					<label class="block text-sm font-medium text-gray-700 mb-1" for="type">Business type</label>
					<select
						id="type"
						name="type"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
					<button
						type="submit"
						class="flex-1 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
					>
						Create & go to dashboard
					</button>
					<button
						type="button"
						onclick={() => (showCreate = false)}
						class="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
					>
						Cancel
					</button>
				</div>
			</form>
		{/if}

		<div class="mt-6 flex justify-center">
			<button
				onclick={startTour}
				class="inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-600"
			>
				<Icon icon="mdi:compass-outline" class="h-4 w-4" />
				Take the tour
			</button>
		</div>
	</div>
</div>
