<script lang="ts">
	import type { Snippet } from 'svelte';
	import InnerNavLayout from '$lib/components/InnerNavLayout.svelte';

	let { children }: { children: Snippet } = $props();

	const navItems: Array<{ href: `/${string}`; label: string; icon: string }> = [
		{ href: '/dashboard/settings/general', label: 'General', icon: 'mdi:store-outline' },
		{
			href: '/dashboard/settings/pickup',
			label: 'Pickup schedule',
			icon: 'mdi:calendar-clock'
		},
		{ href: '/dashboard/settings/branding', label: 'Branding', icon: 'mdi:palette-outline' },
		{ href: '/dashboard/settings/team', label: 'Team', icon: 'mdi:account-group-outline' },
		{
			href: '/dashboard/settings/integrations',
			label: 'Integrations',
			icon: 'mdi:puzzle-outline'
		},
		{
			href: '/dashboard/settings/promos-and-loyalty',
			label: 'Promos & Loyalty',
			icon: 'mdi:ticket-percent-outline'
		},
		{ href: '/dashboard/settings/resources', label: 'Resources', icon: 'mdi:qrcode' }
	];
</script>

<InnerNavLayout items={navItems} title="Settings">
	{@render children()}
</InnerNavLayout>
