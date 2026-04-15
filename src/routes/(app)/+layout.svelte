<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { signOut } from '$lib/auth-client';
	import Icon from '@iconify/svelte';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const navItems = [
		{ href: '/dashboard', label: 'Overview', icon: 'mdi:view-dashboard-outline' },
		{ href: '/dashboard/orders', label: 'Orders', icon: 'mdi:clipboard-list-outline' },
		{ href: '/dashboard/menu', label: 'Menu', icon: 'mdi:silverware-fork-knife' },
		{ href: '/dashboard/analytics', label: 'Analytics', icon: 'mdi:chart-bar' },
		{ href: '/dashboard/settings', label: 'Settings', icon: 'mdi:cog-outline' }
	];

	// Exact-match for leaf routes that would otherwise be swallowed by a parent prefix
	const exactMatch = new Set(['/dashboard']);

	function isActive(href: string) {
		if (href === '/dashboard') return page.url.pathname === '/dashboard';
		if (exactMatch.has(href)) return page.url.pathname === href;
		return page.url.pathname.startsWith(href);
	}
</script>

<div class="flex h-screen bg-gray-50">
	<!-- Sidebar -->
	<aside class="flex w-56 flex-col bg-gray-900 text-white">
		<!-- Logo / Tenant Name -->
		<div class="border-b border-gray-700 px-4 py-4">
			<a href={resolve('/tenants')} class="block">
				<p class="text-xs font-medium tracking-wider text-gray-400 uppercase">Order Local</p>
				{#if data.tenant}
					<p class="mt-1 truncate text-sm font-semibold text-white">{data.tenant.name}</p>
				{:else}
					<p class="mt-1 text-sm text-gray-500">No tenant selected</p>
				{/if}
			</a>
		</div>

		<!-- Nav -->
		<nav class="flex-1 space-y-0.5 px-2 py-3">
			{#each navItems as item (item.href)}
				<a
					href={resolve(item.href as `/${string}`)}
					class="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors
						{isActive(item.href)
						? 'bg-gray-700 text-white'
						: 'text-gray-400 hover:bg-gray-800 hover:text-white'}"
				>
					<Icon icon={item.icon} class="h-4 w-4 shrink-0" />
					{item.label}
				</a>
			{/each}
		</nav>

		<!-- User + Switch Tenant -->
		<div class="space-y-2 border-t border-gray-700 px-4 py-3">
			<a
				href={resolve('/tenants')}
				class="flex items-center gap-1.5 text-xs text-gray-400 transition-colors hover:text-white"
			>
				<Icon icon="mdi:swap-horizontal" class="h-3.5 w-3.5" />
				Switch tenant
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
		<div class="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
			{@render children()}
		</div>
		<footer class="border-t border-gray-200 bg-white px-6 py-4">
			<div class="mx-auto flex max-w-5xl items-center justify-center gap-4">
				<p class="text-xs font-semibold tracking-wide text-gray-400 uppercase">Order Local</p>
				<p class="text-xs text-gray-400">
					&copy; {new Date().getFullYear()} All rights reserved.
				</p>
			</div>
		</footer>
	</main>
</div>
