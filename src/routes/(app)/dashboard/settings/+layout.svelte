<script lang="ts">
	import type { Snippet } from 'svelte';
	import InnerNavLayout from '$lib/components/InnerNavLayout.svelte';

	let { children }: { children: Snippet } = $props();

	const navItems: Array<{
		href: `/${string}`;
		label: string;
		icon: string;
		group?: string;
	}> = [
		// Your Storefront
		{
			group: 'Your Storefront',
			href: '/dashboard/settings/general',
			label: 'General',
			icon: 'mdi:store-outline'
		},
		{
			group: 'Your Storefront',
			href: '/dashboard/settings/branding',
			label: 'Branding',
			icon: 'mdi:palette-outline'
		},
		{
			group: 'Your Storefront',
			href: '/dashboard/settings/hours',
			label: 'Hours',
			icon: 'mdi:clock-outline'
		},
		{
			group: 'Your Storefront',
			href: '/dashboard/settings/pickup',
			label: 'Pickup schedule',
			icon: 'mdi:calendar-clock'
		},
		{
			group: 'Your Storefront',
			href: '/dashboard/settings/resources',
			label: 'Resources',
			icon: 'mdi:qrcode'
		},

		// Your Business
		{
			group: 'Your Business',
			href: '/dashboard/settings/team',
			label: 'Team',
			icon: 'mdi:account-group-outline'
		},
		{
			group: 'Your Business',
			href: '/dashboard/settings/integrations',
			label: 'Integrations',
			icon: 'mdi:puzzle-outline'
		},
		{
			group: 'Your Business',
			href: '/dashboard/settings/promos-and-loyalty',
			label: 'Promos & Loyalty',
			icon: 'mdi:ticket-percent-outline'
		}
	];
</script>

<InnerNavLayout items={navItems} title="Settings">
	{@render children()}
</InnerNavLayout>
