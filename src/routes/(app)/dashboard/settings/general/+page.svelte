<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Icon from '@iconify/svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const address = $derived(data.info?.address as {
		street?: string;
		city?: string;
		state?: string;
		zip?: string;
		country?: string;
	} | null);

	const businessTypes = [
		{ value: 'quick_service', label: 'Quick service' },
		{ value: 'full_service', label: 'Full service' },
		{ value: 'cafe', label: 'Café' },
		{ value: 'food_truck', label: 'Food truck' },
		{ value: 'bar', label: 'Bar' },
		{ value: 'bakery', label: 'Bakery' },
		{ value: 'other', label: 'Other' }
	];
</script>

<div class="max-w-2xl">
	<div class="mb-6">
		<a href="/dashboard/settings" class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-1">
			<Icon icon="mdi:chevron-left" class="h-4 w-4" /> Settings
		</a>
		<h1 class="text-2xl font-bold text-gray-900">General</h1>
		<p class="mt-0.5 text-sm text-gray-500">Your business details and contact information.</p>
	</div>

	{#if form?.error}
		<div class="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{form.error}</div>
	{/if}
	{#if form?.success}
		<div class="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">Changes saved.</div>
	{/if}

	<form method="post" action="?/save" use:enhance class="space-y-6">

		<!-- Business identity -->
		<div class="rounded-xl border border-gray-200 bg-white shadow-sm">
			<div class="border-b border-gray-100 px-5 py-4">
				<h2 class="font-semibold text-gray-900">Business identity</h2>
			</div>
			<div class="space-y-4 px-5 py-5">
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700" for="name">Business name *</label>
						<input
							id="name"
							name="name"
							type="text"
							required
							value={data.info?.name ?? ''}
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
						/>
					</div>
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700" for="legalName">Legal name</label>
						<input
							id="legalName"
							name="legalName"
							type="text"
							value={data.info?.legalName ?? ''}
							placeholder="If different from business name"
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
						/>
					</div>
				</div>
				<div class="sm:w-1/2">
					<label class="mb-1 block text-sm font-medium text-gray-700" for="type">Business type</label>
					<select
						id="type"
						name="type"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
					>
						{#each businessTypes as bt (bt.value)}
							<option value={bt.value} selected={data.info?.type === bt.value}>{bt.label}</option>
						{/each}
					</select>
				</div>
			</div>
		</div>

		<!-- Contact -->
		<div class="rounded-xl border border-gray-200 bg-white shadow-sm">
			<div class="border-b border-gray-100 px-5 py-4">
				<h2 class="font-semibold text-gray-900">Contact</h2>
			</div>
			<div class="space-y-4 px-5 py-5">
				<div class="grid gap-4 sm:grid-cols-2">
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700" for="phone">Phone</label>
						<input
							id="phone"
							name="phone"
							type="tel"
							value={data.info?.phone ?? ''}
							placeholder="+1 (555) 000-0000"
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
						/>
					</div>
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700" for="email">Email</label>
						<input
							id="email"
							name="email"
							type="email"
							value={data.info?.email ?? ''}
							placeholder="contact@yourbusiness.com"
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
						/>
					</div>
				</div>
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700" for="website">Website</label>
					<div class="flex rounded-md border border-gray-300 focus-within:border-green-500 focus-within:ring-1 focus-within:ring-green-500">
						<span class="flex items-center rounded-l-md border-r border-gray-300 bg-gray-50 px-3 text-sm text-gray-500">https://</span>
						<input
							id="website"
							name="website"
							type="text"
							value={(data.info?.website ?? '').replace(/^https?:\/\//, '')}
							placeholder="yourbusiness.com"
							class="min-w-0 flex-1 rounded-r-md px-3 py-2 text-sm focus:outline-none"
						/>
					</div>
				</div>
			</div>
		</div>

		<!-- Address -->
		<div class="rounded-xl border border-gray-200 bg-white shadow-sm">
			<div class="border-b border-gray-100 px-5 py-4">
				<h2 class="font-semibold text-gray-900">Address</h2>
			</div>
			<div class="space-y-4 px-5 py-5">
				<div>
					<label class="mb-1 block text-sm font-medium text-gray-700" for="street">Street</label>
					<input
						id="street"
						name="street"
						type="text"
						value={address?.street ?? ''}
						placeholder="123 Main St"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
					/>
				</div>
				<div class="grid gap-4 sm:grid-cols-3">
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700" for="city">City</label>
						<input
							id="city"
							name="city"
							type="text"
							value={address?.city ?? ''}
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
						/>
					</div>
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700" for="state">State</label>
						<input
							id="state"
							name="state"
							type="text"
							value={address?.state ?? ''}
							placeholder="TX"
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
						/>
					</div>
					<div>
						<label class="mb-1 block text-sm font-medium text-gray-700" for="zip">ZIP</label>
						<input
							id="zip"
							name="zip"
							type="text"
							value={address?.zip ?? ''}
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
						/>
					</div>
				</div>
				<div class="sm:w-1/3">
					<label class="mb-1 block text-sm font-medium text-gray-700" for="country">Country</label>
					<input
						id="country"
						name="country"
						type="text"
						value={address?.country ?? ''}
						placeholder="US"
						class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
					/>
				</div>
			</div>
		</div>

		<div>
			<button
				type="submit"
				class="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
			>
				Save changes
			</button>
		</div>
	</form>
</div>
