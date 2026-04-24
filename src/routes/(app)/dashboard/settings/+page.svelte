<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Card, CardContent } from '$lib/components/ui/card';

	const sections = [
		{
			href: '/dashboard/settings/general',
			icon: 'mdi:store-outline',
			label: 'General',
			description: 'Business name, type, address, phone, and website.'
		},
		{
			href: '/dashboard/settings/branding',
			icon: 'mdi:palette-outline',
			label: 'Branding',
			description: 'Customize your storefront with logos, colors, and background images.'
		},
		{
			href: '/dashboard/settings/team',
			icon: 'mdi:account-group-outline',
			label: 'Team',
			description: 'Invite team members and manage roles.'
		},
		{
			href: '/dashboard/settings/integrations',
			icon: 'mdi:puzzle-outline',
			label: 'Integrations',
			description: 'Connect Stripe and other third-party services.'
		},
		{
			href: '/dashboard/settings/billing',
			icon: 'mdi:credit-card-outline',
			label: 'Billing',
			description: 'Manage your subscription and billing details.'
		},
		{
			href: '/dashboard/settings/promotions',
			icon: 'mdi:ticket-percent-outline',
			label: 'Promotions',
			description: 'Create discount codes for customers to apply at checkout.'
		},
		{
			href: '/dashboard/settings/resources',
			icon: 'mdi:qrcode',
			label: 'Resources',
			description: 'QR codes, shareable links, and marketing assets.'
		}
	];
</script>

<div>
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-gray-900">Settings</h1>
		<p class="mt-0.5 text-sm text-gray-500">Manage your account and tenant configuration.</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		{#each sections as section (section.href)}
			<a href={resolve(section.href as `/${string}`)} class="group block h-full">
				<Card class="h-full shadow-sm transition-colors group-hover:border-gray-300 group-hover:bg-gray-50">
					<CardContent class="flex items-start gap-4">
						<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-100">
							<Icon icon={section.icon} class="h-5 w-5 text-green-700" />
						</div>
						<div>
							<p class="font-semibold text-gray-900">{section.label}</p>
							<p class="mt-0.5 text-sm text-gray-500">{section.description}</p>
						</div>
					</CardContent>
				</Card>
			</a>
		{/each}
	</div>
</div>
