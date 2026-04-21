<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { afterNavigate } from '$app/navigation';
	import { signOut } from '$lib/auth-client';
	import Icon from '@iconify/svelte';
	import AppTour from '$lib/components/AppTour.svelte';
	import { tourState } from '$lib/tour-state.svelte';

	import { onMount } from 'svelte';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	let sidebarOpen = $state(false);

	// Let the tour open the sidebar on mobile when it needs to highlight a nav item
	$effect(() => {
		if (tourState.openSidebar) sidebarOpen = true;
	});

	// ── New order alert ──────────────────────────────────────────────────────
	let lastKnownOrderId = $state(0);
	let newOrderToast = $state<{ orderNumber: string; customerName: string | null; total: number } | null>(null);
	let toastTimer: ReturnType<typeof setTimeout> | null = null;

	function playChime() {
		try {
			const ctx = new AudioContext();
			const frequencies = [523, 659, 784]; // C5, E5, G5
			frequencies.forEach((freq, i) => {
				const osc = ctx.createOscillator();
				const gain = ctx.createGain();
				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.frequency.value = freq;
				osc.type = 'sine';
				const t = ctx.currentTime + i * 0.15;
				gain.gain.setValueAtTime(0, t);
				gain.gain.linearRampToValueAtTime(0.3, t + 0.02);
				gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
				osc.start(t);
				osc.stop(t + 0.5);
			});
		} catch { /* AudioContext not available */ }
	}

	function showToast(order: { orderNumber: string; customerName: string | null; total: number }) {
		newOrderToast = order;
		if (toastTimer) clearTimeout(toastTimer);
		toastTimer = setTimeout(() => { newOrderToast = null; }, 8000);
	}

	async function pollOrders() {
		try {
			const res = await fetch('/api/orders-latest');
			if (!res.ok) return;
			const { latestId, order } = await res.json();
			if (lastKnownOrderId > 0 && latestId > lastKnownOrderId && order) {
				playChime();
				showToast(order);
				if ('Notification' in window && Notification.permission === 'granted') {
					new Notification('New order', {
						body: `${order.orderNumber}${order.customerName ? ` · ${order.customerName}` : ''} · $${(order.total / 100).toFixed(2)}`,
						icon: '/favicon.png'
					});
				}
			}
			lastKnownOrderId = latestId;
		} catch { /* ignore network errors */ }
	}

	onMount(() => {
		pollOrders(); // seed lastKnownOrderId immediately (no alert on first load)
		const interval = setInterval(pollOrders, 30_000);
		if ('Notification' in window && Notification.permission === 'default') {
			Notification.requestPermission();
		}
		return () => clearInterval(interval);
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

<!-- New order toast -->
{#if newOrderToast}
	<div class="fixed bottom-5 right-5 z-300 flex items-start gap-3 rounded-xl border border-green-200 bg-white px-4 py-3.5 shadow-xl">
		<div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100">
			<Icon icon="mdi:bell-ring-outline" class="h-5 w-5 text-green-600" />
		</div>
		<div class="min-w-0">
			<p class="text-sm font-semibold text-gray-900">New order!</p>
			<p class="text-xs text-gray-500">
				{newOrderToast.orderNumber}{newOrderToast.customerName ? ` · ${newOrderToast.customerName}` : ''} · ${(newOrderToast.total / 100).toFixed(2)}
			</p>
			<a
				href={resolve('/dashboard/orders')}
				onclick={() => { newOrderToast = null; }}
				class="mt-1 inline-block text-xs font-medium text-green-600 hover:text-green-700"
			>
				View orders
			</a>
		</div>
		<button onclick={() => { newOrderToast = null; }} class="shrink-0 text-gray-300 hover:text-gray-500">
			<Icon icon="mdi:close" class="h-4 w-4" />
		</button>
	</div>
{/if}

<AppTour />
