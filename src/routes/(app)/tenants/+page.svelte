<script lang="ts">
	import { enhance } from'$app/forms';
	import type { PageData, ActionData } from'./$types';
	import Icon from'@iconify/svelte';
	import { tourState } from'$lib/tour-state.svelte';
	import { Button } from'$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from'$lib/components/ui/card';

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
			.replace(/[^a-z0-9\s-]/g,'')
			.replace(/\s+/g,'-')
			.replace(/-+/g,'-')
			.slice(0, 50);
	}
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-muted/50 px-4 py-16">
	<div class="w-full max-w-lg">
		<h1 class="mb-1 text-2xl font-bold text-foreground">Your tenants</h1>
		<p class="mb-6 text-sm text-muted-foreground">Select a tenant to manage, or create a new one.</p>

		{#if form?.error}
			<div class="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
				{form.error}
			</div>
		{/if}

		{#if data.tenants.length > 4}
			<div class="relative mb-4">
				<Icon
					icon="mdi:magnify"
					class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
				/>
				<input
					type="search"
					placeholder="Search tenants..."
					bind:value={search}
					class="w-full rounded-lg border bg-background py-2 pr-3 pl-9 text-sm focus:border-gray-400 focus:ring-1 focus:ring-ring focus:outline-none"
				/>
			</div>
		{/if}

		{#if data.tenants.length > 0}
			<div class="mb-6 space-y-2">
				{#each filteredTenants as t (t.id)}
					<form method="post" action="?/select" use:enhance>
						<input type="hidden" name="tenantId" value={t.id} />
						<Card class="shadow-sm transition-all hover:border-gray-400 hover:shadow">
							<CardContent class="flex cursor-pointer items-center justify-between">
								<button type="submit" class="flex min-w-0 flex-1 items-center gap-3 text-left">
									{#if t.logoUrl}
										<img
											src={t.logoUrl}
											alt={t.name}
											class="h-10 w-10 shrink-0 rounded-md border object-contain p-0.5"
										/>
									{:else}
										<div
											class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted"
										>
											<Icon icon="mdi:store-outline" class="h-5 w-5 text-muted-foreground" />
										</div>
									{/if}
									<div class="min-w-0">
										<p class="font-medium text-foreground">{t.name}</p>
										<p class="mt-0.5 text-xs text-muted-foreground">
											/{t.slug} · {t.type?.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} · {t.role.charAt(0).toUpperCase() + t.role.slice(1)}
										</p>
									</div>
								</button>
								<Icon icon="mdi:chevron-right" class="ml-2 h-5 w-5 shrink-0 text-muted-foreground" />
							</CardContent>
						</Card>
					</form>
				{/each}
			</div>
		{/if}

		{#if data.canCreate && !showCreate}
			<Button
				data-tour="create-tenant"
				onclick={() => (showCreate = true)}
				variant="outline"
				class="w-full border-2 border-dashed text-muted-foreground hover:border-gray-400 hover:text-muted-foreground"
			>
				<Icon icon="mdi:plus" class="h-4 w-4" /> Create new tenant
			</Button>
		{:else if data.canCreate}
			<Card class="shadow-sm">
				<CardHeader>
					<CardTitle>New tenant</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						method="post"
						action="?/create"
						use:enhance
						class="space-y-4"
					>
						<div>
							<label class="mb-1 block text-sm font-medium text-muted-foreground" for="name"
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
								class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
							/>
						</div>

						<div>
							<label class="mb-1 block text-sm font-medium text-muted-foreground" for="slug">URL slug</label>
							<div class="flex items-center gap-1.5">
								<span class="text-sm text-muted-foreground">getorderlocal.com/</span>
								<input
									id="slug"
									name="slug"
									type="text"
									required
									bind:value={slugValue}
									placeholder="acme-burger"
									class="flex-1 rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
								/>
							</div>
						</div>

						<div>
							<label class="mb-1 block text-sm font-medium text-muted-foreground" for="type"
								>Business type</label
							>
							<select
								id="type"
								name="type"
								class="w-full rounded-md border px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring focus:outline-none"
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

						<label class="flex cursor-pointer items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5">
							<input type="checkbox" name="seedDemo" value="1" checked class="h-4 w-4 rounded accent-primary" />
							<div>
								<p class="text-sm font-medium text-foreground">Add example menu items</p>
								<p class="text-xs text-muted-foreground">Pre-fill with demo categories and items you can edit or delete.</p>
							</div>
						</label>

						<div class="flex gap-2 pt-1">
							<Button type="submit" variant="default" class="flex-1">
								Create & go to dashboard
							</Button>
							<Button type="button" onclick={() => (showCreate = false)} variant="outline">
								Cancel
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		{/if}

		<div class="mt-6 flex justify-center">
			<Button onclick={startTour} variant="ghost" size="sm" class="gap-1.5 text-muted-foreground hover:text-muted-foreground">
				<Icon icon="mdi:compass-outline" class="h-4 w-4" />
				Take the tour
			</Button>
		</div>
	</div>
</div>
