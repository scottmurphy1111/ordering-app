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
			href: '/dashboard/settings/pickup',
			icon: 'mdi:calendar-clock',
			label: 'Pickup schedule',
			description: 'Manage pickup locations and recurring time windows for customer ordering.'
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
			href: '/dashboard/settings/promos-and-loyalty',
			icon: 'mdi:ticket-percent-outline',
			label: 'Promos & Loyalty',
			description: 'Create discount codes and set up customer loyalty rewards.'
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
		<h1 class="text-2xl font-bold text-foreground">Settings</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">Manage your shop settings.</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2">
		{#each sections as section (section.href)}
			<a href={resolve(section.href as `/${string}`)} class="group block h-full">
				<Card
					class="h-full shadow-sm transition-all duration-150 group-hover:-translate-y-0.5 group-hover:border-gray-300 group-hover:bg-muted/50 group-hover:shadow-md"
				>
					<CardContent class="flex items-start gap-4">
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10"
						>
							<Icon icon={section.icon} class="h-5 w-5 text-primary" />
						</div>
						<div>
							<p class="font-semibold text-foreground">{section.label}</p>
							<p class="mt-0.5 text-sm text-muted-foreground">{section.description}</p>
						</div>
					</CardContent>
				</Card>
			</a>
		{/each}
	</div>
</div>
