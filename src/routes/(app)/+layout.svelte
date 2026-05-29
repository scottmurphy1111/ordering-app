<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { afterNavigate, goto } from '$app/navigation';
	import { signOut } from '$lib/auth-client';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuTrigger,
		DropdownMenuItem,
		DropdownMenuSeparator
	} from '$lib/components/ui/dropdown-menu';
	import Icon from '@iconify/svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { Toaster } from '$lib/components/ui/sonner';
	import { toast } from '$lib/toast';

	import { onMount } from 'svelte';
	import { Sheet, SheetContent } from '$lib/components/ui/sheet';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	let sidebarOpen = $state(false);

	// ── New order alert ──────────────────────────────────────────────────────
	let lastKnownOrderId = $state(0);

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
		} catch {
			/* AudioContext not available */
		}
	}

	function showToast(order: { orderNumber: string; customerName: string | null; total: number }) {
		toast.success('New order!', {
			description: `${order.orderNumber}${order.customerName ? ` · ${order.customerName}` : ''} · $${(order.total / 100).toFixed(2)}`,
			duration: 30_000,
			closeButton: true,
			action: {
				label: 'View orders',
				onClick: () => goto(resolve('/dashboard/orders'))
			}
		});
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
		} catch {
			/* ignore network errors */
		}
	}

	onMount(() => {
		pollOrders(); // seed lastKnownOrderId immediately (no alert on first load)
		const interval = setInterval(pollOrders, 30_000);
		if ('Notification' in window && Notification.permission === 'default') {
			Notification.requestPermission();
		}
		return () => clearInterval(interval);
	});

	const showSpecialRequests = $derived(
		(data.vendor?.acceptsRequests ?? true) || data.hasSpecialRequestHistory
	);

	const navItems = $derived([
		{ href: '/dashboard', label: 'Overview', icon: 'mdi:view-dashboard-outline', tour: 'overview' },
		{
			href: '/dashboard/orders',
			label: 'Orders',
			icon: 'mdi:clipboard-list-outline',
			tour: 'orders'
		},
		...(showSpecialRequests
			? [
					{
						href: '/dashboard/special-orders',
						label: 'Special Requests',
						icon: 'mdi:message-question-outline',
						tour: 'special-requests'
					}
				]
			: []),
		{ href: '/dashboard/catalog', label: 'Catalog', icon: 'mdi:corn', tour: 'catalog' },
		{ href: '/dashboard/analytics', label: 'Analytics', icon: 'mdi:chart-bar', tour: 'analytics' },
		{ href: '/dashboard/settings', label: 'Settings', icon: 'mdi:cog-outline', tour: 'settings' }
	]);

	const exactMatch = new Set(['/dashboard']);

	function isActive(href: string) {
		if (href === '/dashboard') return page.url.pathname === '/dashboard';
		if (exactMatch.has(href)) return page.url.pathname === href;
		return page.url.pathname.startsWith(href);
	}

	let mainEl: HTMLElement | undefined = $state();

	afterNavigate(() => {
		sidebarOpen = false;
		mainEl?.scrollTo(0, 0);
	});
</script>

<svelte:head>
	<style>
		html,
		body {
			overflow: hidden;
			height: 100dvh;
		}
	</style>
</svelte:head>

{#snippet sidebarContent()}
	<!-- Logo / Vendor Name -->
	<div class="flex items-center justify-between border-b border-white/10 px-4 py-4">
		<a href={resolve('/vendors')} class="flex min-w-0 flex-1 items-center gap-3">
			{#if data.vendor?.logoUrl}
				<img
					src={data.vendor.logoUrl}
					alt={data.vendor.name}
					class="h-9 w-9 shrink-0 rounded-md bg-background/10 object-contain p-0.5"
				/>
			{/if}
			<div class="min-w-0">
				<p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">
					Order<span class="text-primary">Local</span>
				</p>
				{#if data.vendor}
					<p class="mt-0.5 truncate text-sm font-semibold text-white">{data.vendor.name}</p>
				{:else}
					<p class="mt-0.5 text-sm text-muted-foreground">No shop selected</p>
				{/if}
			</div>
		</a>
	</div>

	<!-- Nav -->
	<nav class="flex-1 space-y-0.5 px-2 py-3">
		{#each navItems as item (item.href)}
			<a
				href={resolve(item.href as `/${string}`)}
				data-tour={item.tour}
				class="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors
					{isActive(item.href)
					? 'bg-primary font-medium text-white'
					: 'font-normal text-muted-foreground hover:bg-gray-800 hover:text-white'}"
			>
				<Icon icon={item.icon} class="h-4 w-4 shrink-0" />
				{item.label}
			</a>
		{/each}
	</nav>

	<!-- Account section -->
	<div class="space-y-1 border-t border-white/10 px-2 pt-3 pb-3">
		{#if data.hasMultipleVendors}
			<a
				href={resolve('/vendors')}
				class="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-normal text-muted-foreground transition-colors hover:bg-gray-800 hover:text-white"
			>
				<Icon icon="mdi:swap-horizontal" class="h-4 w-4 shrink-0" />
				Switch shop
			</a>
		{/if}
		<!-- Identity card -->
		<DropdownMenu>
			<DropdownMenuTrigger
				class="w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/9 focus:outline-none"
			>
				<div class="flex items-center gap-2.5">
					<div
						class="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-sm font-medium text-white"
					>
						{#if data.user.image}
							<img src={data.user.image} alt="" class="h-full w-full object-cover" />
						{:else}
							{data.user.email.split('@')[0]?.[0]?.toUpperCase() ?? '?'}
						{/if}
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate text-xs font-medium text-white">{data.user.email}</p>
						{#if data.vendorRole}
							<p class="text-[11px] text-white/45 capitalize">{data.vendorRole}</p>
						{/if}
					</div>
					<Icon icon="lucide:more-horizontal" class="h-4 w-4 shrink-0 text-white/40" />
				</div>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" side="top">
				<DropdownMenuItem onclick={() => goto(resolve('/dashboard/account/profile'))}>
					<Icon icon="mdi:account-circle-outline" class="h-4 w-4" />
					My Account
				</DropdownMenuItem>
				{#if data.user.isInternal}
					<DropdownMenuItem onclick={() => goto(resolve('/admin'))}>
						<Icon icon="mdi:shield-crown-outline" class="h-4 w-4" />
						Admin Panel
					</DropdownMenuItem>
				{/if}
				<DropdownMenuSeparator />
				<DropdownMenuItem
					variant="destructive"
					onclick={() =>
						signOut({
							fetchOptions: {
								onSuccess: () => {
									window.location.href = '/login';
								}
							}
						})}
				>
					<Icon icon="mdi:logout" class="h-4 w-4" />
					Sign out
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	</div>
{/snippet}

<div class="bg-paper flex h-dvh">
	<!-- Mobile sidebar: Sheet -->
	<Sheet bind:open={sidebarOpen}>
		<SheetContent
			side="left"
			class="flex w-64 flex-col border-none bg-gray-900 p-0 text-white"
			showCloseButton={false}
		>
			{@render sidebarContent()}
		</SheetContent>
	</Sheet>

	<!-- Desktop sidebar: always-visible -->
	<aside class="hidden w-56 flex-col bg-gray-900 text-white md:flex print:hidden">
		{@render sidebarContent()}
	</aside>

	<!-- Main content -->
	<main bind:this={mainEl} class=" flex flex-1 flex-col overflow-y-auto">
		<!-- Mobile top bar -->
		<header
			class="sticky top-0 z-30 flex items-center gap-3 border-b bg-gray-900 px-4 py-3 md:static md:z-auto md:hidden print:hidden"
		>
			<!-- Plain <button> instead of shadcn <Button variant="ghost">: ghost's
			     hover:bg-accent conflicts unpredictably with class-level hover overrides
			     on dark surfaces. Tier 2 shadcn audit should standardize a "dark surface"
			     Button variant; until then, plain element with explicit hover classes. -->
			<button
				type="button"
				onclick={() => (sidebarOpen = true)}
				class="shrink-0 rounded-md p-2 text-white/70 transition-colors hover:bg-gray-800 hover:text-white active:bg-gray-700"
				aria-label="Open menu"
			>
				<Icon icon="mdi:menu" class="h-6 w-6" />
			</button>
			<a href={resolve('/vendors')} class="flex min-w-0 flex-1 items-center gap-2.5">
				{#if data.vendor?.logoUrl}
					<img
						src={data.vendor.logoUrl}
						alt={data.vendor.name}
						class="h-8 w-8 shrink-0 rounded-md bg-background/10 object-contain p-0.5"
					/>
				{/if}
				<div class="min-w-0">
					<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">
						Order<span class="text-primary">Local</span>
					</p>
					{#if data.vendor}
						<p class="truncate text-sm leading-tight font-semibold text-white">
							{data.vendor.name}
						</p>
					{/if}
				</div>
			</a>
		</header>

		{#if data.isImpersonating && data.vendor}
			<div
				class="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 print:hidden"
			>
				<div class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
					<span class="flex items-center gap-2">
						<Icon icon="mdi:shield-account-outline" class="h-4 w-4 shrink-0" />
						Acting as <strong class="font-semibold">{data.vendor.name}</strong> as admin.
					</span>
					<a
						href={resolve('/vendors')}
						class="font-medium text-amber-900 underline transition-colors hover:text-amber-700"
					>
						Switch back
					</a>
				</div>
			</div>
		{/if}

		<div class="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
			{@render children()}
		</div>
		<footer class="border-t px-6 py-4 print:hidden">
			<div class="mx-auto flex max-w-5xl items-center justify-between gap-4">
				<p class="text-xs text-muted-foreground">
					© {new Date().getFullYear()} Order<span class="text-primary">Local</span>
				</p>
				<nav class="flex gap-4 text-xs text-muted-foreground">
					<a href={resolve('/privacy')} class="transition-colors hover:text-foreground">Privacy</a>
					<a href={resolve('/terms')} class="transition-colors hover:text-foreground">Terms</a>
					<a
						href="mailto:hello@getorderlocal.com"
						rel="external"
						class="transition-colors hover:text-foreground">Contact</a
					>
				</nav>
			</div>
		</footer>
	</main>
</div>

<Toaster position="top-right" richColors />

<ConfirmModal />
