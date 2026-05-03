<script lang="ts">
	import type { Snippet } from 'svelte';
	import InnerNavLayout from '$lib/components/InnerNavLayout.svelte';

	let { children }: { children: Snippet } = $props();

	const navItems: Array<{ href: `/${string}`; label: string; icon: string }> = [
		{ href: '/dashboard/account/profile', label: 'Profile', icon: 'mdi:account-outline' },
		{ href: '/dashboard/account/security', label: 'Security', icon: 'mdi:shield-lock-outline' },
		{ href: '/dashboard/account/billing', label: 'Billing', icon: 'mdi:credit-card-outline' },
		{ href: '/dashboard/account/notifications', label: 'Notifications', icon: 'mdi:bell-outline' }
	];
</script>

<InnerNavLayout items={navItems} title="Account">
	{@render children()}
</InnerNavLayout>
