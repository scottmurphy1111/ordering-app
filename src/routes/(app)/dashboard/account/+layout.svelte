<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	let { children }: { children: import('svelte').Snippet } = $props();

	const navItems = [
		{ href: '/dashboard/account/profile', label: 'Profile', icon: 'mdi:account-outline' },
		{ href: '/dashboard/account/security', label: 'Security', icon: 'mdi:shield-lock-outline' },
		{ href: '/dashboard/account/billing', label: 'Billing', icon: 'mdi:credit-card-outline' },
		{
			href: '/dashboard/account/notifications',
			label: 'Notifications',
			icon: 'mdi:bell-outline'
		}
	];

	function isActive(href: string) {
		return page.url.pathname.startsWith(href);
	}
</script>

<div class="flex gap-8">
	<nav class="w-44 shrink-0">
		<p class="mb-3 text-xs font-medium tracking-wider text-gray-500 uppercase">Account</p>
		<ul class="space-y-0.5">
			{#each navItems as item (item.href)}
				<li>
					<a
						href={resolve(item.href as `/${string}`)}
						class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors {isActive(
							item.href
						)
							? 'bg-gray-100 font-medium text-gray-900'
							: 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}"
					>
						<Icon icon={item.icon} class="h-4 w-4 shrink-0" />
						{item.label}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<div class="min-w-0 flex-1">
		{@render children()}
	</div>
</div>
