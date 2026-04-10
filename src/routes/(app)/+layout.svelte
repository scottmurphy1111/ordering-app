<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { signOut } from '$lib/auth-client';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const navItems = [
		{ href: '/dashboard', label: 'Overview', icon: '▦' },
		{ href: '/dashboard/orders', label: 'Orders', icon: '📋' },
		{ href: '/dashboard/menu/items', label: 'Menu Items', icon: '🍽' },
		{ href: '/dashboard/menu/categories', label: 'Categories', icon: '📂' },
		{ href: '/dashboard/analytics', label: 'Analytics', icon: '📊' },
		{ href: '/dashboard/settings/team', label: 'Team', icon: '👥' },
		{ href: '/dashboard/settings', label: 'Settings', icon: '⚙' }
	];

	// Exact-match for leaf routes that would otherwise be swallowed by a parent prefix
	const exactMatch = new Set(['/dashboard/settings']);

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
				<p class="text-xs font-medium tracking-wider text-gray-400 uppercase">Ordering App</p>
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
					href={resolve(item.href)}
					class="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors
						{isActive(item.href)
						? 'bg-gray-700 text-white'
						: 'text-gray-400 hover:bg-gray-800 hover:text-white'}"
				>
					<span class="text-base leading-none">{item.icon}</span>
					{item.label}
				</a>
			{/each}
		</nav>

		<!-- User + Switch Tenant -->
		<div class="space-y-2 border-t border-gray-700 px-4 py-3">
			<a
				href={resolve('/tenants')}
				class="block text-xs text-gray-400 transition-colors hover:text-white"
			>
				↩ Switch tenant
			</a>
			<p class="truncate text-xs text-gray-500">{data.user.email}</p>
			<button
				onclick={() => signOut({ fetchOptions: { onSuccess: () => { window.location.href = '/login'; } } })}
				class="block text-xs text-gray-400 transition-colors hover:text-red-400"
			>
				Sign out
			</button>
		</div>
	</aside>

	<!-- Main content -->
	<main class="flex-1 overflow-y-auto">
		<div class="mx-auto max-w-5xl px-6 py-8">
			{@render children()}
		</div>
	</main>
</div>
