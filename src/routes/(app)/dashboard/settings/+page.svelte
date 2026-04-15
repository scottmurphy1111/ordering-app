<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';

	const sections = [
		{
			href: '/dashboard/settings/team',
			icon: 'mdi:account-group-outline',
			label: 'Team',
			description: 'Invite team members and manage roles.'
		},
		{
			href: '/dashboard/settings/branding',
			icon: 'mdi:palette-outline',
			label: 'Branding',
			description: 'Customize your storefront with logos, colors, and background images.'
		},
		{
			href: '/dashboard/settings/integrations',
			icon: 'mdi:puzzle-outline',
			label: 'Integrations',
			description: 'Connect Stripe and other third-party services.'
		},
		{
			href: '/dashboard/settings/profile',
			icon: 'mdi:account-circle-outline',
			label: 'Profile',
			description: 'Update your name, email, and password.'
		},
		{
			href: '/dashboard/settings/billing',
			icon: 'mdi:credit-card-outline',
			label: 'Billing',
			description: 'Manage your subscription and billing details.'
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
			<a
				href={resolve(section.href as `/${string}`)}
				class="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-colors hover:border-gray-300 hover:bg-gray-50"
			>
				<Icon icon={section.icon} class="mt-0.5 h-6 w-6 shrink-0 text-gray-500" />
				<div>
					<p class="font-semibold text-gray-900">{section.label}</p>
					<p class="mt-0.5 text-sm text-gray-500">{section.description}</p>
				</div>
			</a>
		{/each}
	</div>
</div>
