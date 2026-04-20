<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { afterNavigate } from '$app/navigation';
	import { signOut } from '$lib/auth-client';
	import Icon from '@iconify/svelte';
	import AppTour from '$lib/components/AppTour.svelte';
	import { tourState } from '$lib/tour-state.svelte';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	let sidebarOpen = $state(false);

	// Let the tour open the sidebar on mobile when it needs to highlight a nav item
	$effect(() => {
		if (tourState.openSidebar) sidebarOpen = true;
	});

	const navItems = [
		{ href: '/dashboard', label: 'Overview', icon: 'mdi:view-dashboard-outline', tour: 'overview' },
		{ href: '/dashboard/orders', label: 'Orders', icon: 'mdi:clipboard-list-outline', tour: 'orders' },
		{ href: '/dashboard/menu', label: 'Menu', icon: 'mdi:silverware-fork-knife', tour: 'menu' },
		{ href: '/dashboard/analytics', label: 'Analytics', icon: 'mdi:chart-bar', tour: 'analytics' },
		{ href: '/dashboard/settings', label: 'Settings', icon: 'mdi:cog-outline', tour: 'settings' }
	];

	const exactMatch = new Set(['/dashboard']);

	function isActive(href: string) {
		if (href === '/dashboard') return page.url.pathname === '/dashboard';
		if (exactMatch.has(href)) return page.url.pathname === href;
		return page.url.pathname.startsWith(href);
	}

	afterNavigate(() => {
		sidebarOpen = false;
	});
</script>

<div class="flex h-screen bg-gray-50">
	<!-- Mobile backdrop -->
	{#if sidebarOpen}
		<div
			class="fixed inset-0 z-40 bg-black/50 md:hidden"
			role="presentation"
			onclick={() => (sidebarOpen = false)}
		></div>
	{/if}

	<!-- Sidebar -->
	<aside
		class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-gray-900 text-white transition-transform duration-200 ease-in-out md:relative md:z-auto md:w-56 md:translate-x-0 {sidebarOpen
			? 'translate-x-0'
			: '-translate-x-full'}"
	>
		<!-- Logo / Tenant Name -->
		<div class="flex items-center justify-between border-b border-gray-700 px-4 py-4">
			<a href={resolve('/tenants')} class="flex min-w-0 flex-1 items-center gap-3">
				{#if data.tenant?.logoUrl}
					<img src={data.tenant.logoUrl} alt={data.tenant.name} class="h-9 w-9 shrink-0 rounded-md object-contain bg-white/10 p-0.5" />
				{/if}
				<div class="min-w-0">
					<p class="text-xs font-medium tracking-wider text-gray-400 uppercase">Order<span class="text-green-400">Local</span></p>
					{#if data.tenant}
						<p class="mt-0.5 truncate text-sm font-semibold text-white">{data.tenant.name}</p>
					{:else}
						<p class="mt-0.5 text-sm text-gray-500">No tenant selected</p>
					{/if}
				</div>
			</a>
			<button
				onclick={() => (sidebarOpen = false)}
				class="ml-3 shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:text-white md:hidden"
				aria-label="Close menu"
			>
				<Icon icon="mdi:close" class="h-5 w-5" />
			</button>
		</div>

		<!-- Nav -->
		<nav class="flex-1 space-y-0.5 px-2 py-3">
			{#each navItems as item (item.href)}
				<a
					href={resolve(item.href as `/${string}`)}
					data-tour={item.tour}
					class="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors
						{isActive(item.href)
						? 'bg-green-600 text-white'
						: 'text-gray-400 hover:bg-gray-800 hover:text-white'}"
				>
					<Icon icon={item.icon} class="h-4 w-4 shrink-0" />
					{item.label}
				</a>
			{/each}
		</nav>

		<!-- User + Switch Tenant -->
		<div class="space-y-2 border-t border-gray-700 px-4 py-3">
			{#if data.hasMultipleTenants}
				<a
					href={resolve('/tenants')}
					class="flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-white"
				>
					<Icon icon="mdi:swap-horizontal" class="h-3.5 w-3.5" />
					Switch tenant
				</a>
			{/if}
			<a
				href={resolve('/dashboard/settings/profile')}
				class="flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-white"
			>
				<Icon icon="mdi:account-circle-outline" class="h-3.5 w-3.5" />
				Account
			</a>
			<p class="truncate text-xs text-gray-500">{data.user.email}</p>
			<button
				onclick={() =>
					signOut({
						fetchOptions: {
							onSuccess: () => {
								window.location.href = '/login';
							}
						}
					})}
				class="block text-xs text-gray-400 transition-colors hover:text-red-400"
			>
				Sign out
			</button>
		</div>
	</aside>

	<!-- Main content -->
	<main class="flex flex-1 flex-col overflow-y-auto">
		<!-- Mobile top bar -->
		<header class="flex items-center gap-3 border-b border-gray-700 bg-gray-900 px-4 py-3 md:hidden">
			<button
				onclick={() => (sidebarOpen = true)}
				class="shrink-0 rounded-md p-1 text-gray-300 transition-colors hover:text-white"
				aria-label="Open menu"
			>
				<Icon icon="mdi:menu" class="h-6 w-6" />
			</button>
			<div class="flex min-w-0 flex-1 items-center gap-2.5">
				{#if data.tenant?.logoUrl}
					<img src={data.tenant.logoUrl} alt={data.tenant.name} class="h-8 w-8 shrink-0 rounded-md object-contain bg-white/10 p-0.5" />
				{/if}
				<div class="min-w-0">
					<p class="text-xs font-medium uppercase tracking-wide text-gray-400">Order<span class="text-green-400">Local</span></p>
					{#if data.tenant}
						<p class="truncate text-sm font-semibold leading-tight text-white">{data.tenant.name}</p>
					{/if}
				</div>
			</div>
		</header>

		<div class="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
			{@render children()}
		</div>
		<footer class="border-t border-gray-200 bg-white px-6 py-4">
			<div class="mx-auto flex max-w-5xl items-center justify-center gap-4">
				<p class="text-xs font-semibold uppercase tracking-wide text-gray-400">Order<span class="text-green-600">Local</span></p>
				<p class="text-xs text-gray-400">
					&copy; {new Date().getFullYear()} All rights reserved.
				</p>
			</div>
		</footer>
	</main>
</div>

<AppTour />
