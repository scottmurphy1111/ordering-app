<script lang="ts">
	import type { LayoutData } from './$types';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { signOut } from '$lib/auth-client';
	import Icon from '@iconify/svelte';
	import ConfirmModal from '$lib/components/ConfirmModal.svelte';
	import { Button } from '$lib/components/ui/button';

	let { data, children }: { data: LayoutData; children: import('svelte').Snippet } = $props();

	const navItems = [
		{ href: '/admin/tenants', label: 'Tenants', icon: 'mdi:store-outline' },
		{ href: '/admin/users', label: 'Users', icon: 'mdi:account-group-outline' }
	];

	function isActive(href: string) {
		return page.url.pathname.startsWith(href);
	}
</script>

<div class="flex h-screen bg-muted/50">
	<aside class="hidden w-56 flex-col bg-gray-900 text-white md:flex">
		<div class="flex items-center border-b border-white/10 px-4 py-4">
			<div>
				<p class="text-xs font-medium tracking-wider text-muted-foreground uppercase">
					Order<span class="text-primary">Local</span>
				</p>
				<p class="mt-0.5 text-sm font-semibold text-white">Admin</p>
			</div>
		</div>

		<nav class="flex-1 space-y-0.5 px-2 py-3">
			{#each navItems as item (item.href)}
				<a
					href={resolve(item.href as `/${string}`)}
					class="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors
						{isActive(item.href)
						? 'bg-primary text-white'
						: 'text-muted-foreground hover:bg-gray-800 hover:text-white'}"
				>
					<Icon icon={item.icon} class="h-4 w-4 shrink-0" />
					{item.label}
				</a>
			{/each}
		</nav>

		<div class="space-y-2 border-t border-white/10 px-4 py-3">
			<a
				href={resolve('/tenants')}
				class="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-white"
			>
				<Icon icon="mdi:swap-horizontal" class="h-3.5 w-3.5" />
				Back to app
			</a>
			<p class="truncate text-xs text-muted-foreground">{data.user.email}</p>
			<Button
				onclick={() =>
					signOut({
						fetchOptions: {
							onSuccess: () => {
								window.location.href = '/login';
							}
						}
					})}
				variant="ghost"
				size="sm"
				class="text-xs text-muted-foreground hover:bg-background/10 hover:text-red-400"
			>
				Sign out
			</Button>
		</div>
	</aside>

	<main class="flex flex-1 flex-col overflow-y-auto">
		<div class="mx-auto w-full max-w-5xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
			{@render children()}
		</div>
		<footer class="border-t bg-background px-6 py-4">
			<div class="mx-auto flex max-w-5xl items-center justify-center gap-4">
				<p class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
					Order<span class="text-primary">Local</span>
				</p>
				<p class="text-xs text-muted-foreground">
					&copy; {new Date().getFullYear()} All rights reserved.
				</p>
			</div>
		</footer>
	</main>
</div>

<ConfirmModal />
