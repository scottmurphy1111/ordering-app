<script lang="ts">
	import { untrack } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import type { PageData, ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import {
		Select,
		SelectTrigger,
		SelectContent,
		SelectItem,
		SelectValue,
		SelectGroup,
		SelectGroupHeading,
		SelectSeparator
	} from '$lib/components/ui/select';
	import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '$lib/components/ui/card';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Switch } from '$lib/components/ui/switch';
	import { BUSINESS_TYPES } from '$lib/utils/business-type-labels';
	import { FULFILLMENT_MODELS, fulfillmentModelLabel } from '$lib/utils/fulfillment-model-labels';
	import { US_TIMEZONES, getAllTimezones, getTimezoneLabel } from '$lib/utils/timezones';
	import { Alert } from '$lib/components/ui/alert';

	let { data, form: _form }: { data: PageData; form: ActionData } = $props();
	const form = $derived(_form as ActionData | null);

	const address = $derived(
		data.info?.address as {
			street?: string;
			city?: string;
			state?: string;
			zip?: string;
			country?: string;
		} | null
	);

	const businessTypes = BUSINESS_TYPES;

	const US_TZ_SET = new Set(US_TIMEZONES.map((t) => t.value));
	const otherTimezones = getAllTimezones().filter((tz) => !US_TZ_SET.has(tz));

	let typeValue = $state('');
	$effect(() => {
		typeValue = data.info?.type ?? '';
	});
	let timezoneValue = $state('America/New_York');
	$effect(() => {
		timezoneValue = data.info?.timezone ?? 'America/New_York';
	});

	const savedCheckout = $derived(
		(
			data.info as unknown as {
				settings?: { enableTips?: boolean; asapPickupEnabled?: boolean };
			} | null
		)?.settings ?? {}
	);

	let acceptsRequests = $state(
		untrack(() => (data.info as unknown as { acceptsRequests?: boolean } | null)?.acceptsRequests ?? true)
	);
</script>

<div class="max-w-2xl">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-foreground">General</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">
			Your business details and contact information.
		</p>
	</div>

	{#if data.fulfillmentChanged}
		<Alert severity="success" class="mb-4">Fulfillment model updated.</Alert>
	{/if}
	{#if form?.error}
		<Alert severity="error" class="mb-4">{form.error}</Alert>
	{/if}
	{#if form?.success}
		<Alert severity="success" class="mb-4">Changes saved.</Alert>
	{/if}

	<form
		method="post"
		action="?/saveBusinessProfile"
		use:enhance={() =>
			({ update }) =>
				update({ reset: false })}
		class="space-y-6"
	>
		<Card class="shadow-sm">
			<CardHeader>
				<CardTitle>Business profile</CardTitle>
			</CardHeader>
			<CardContent class="space-y-6">
				<!-- Business identity -->
				<div class="space-y-4">
					<h3 class="text-sm font-medium text-gray-500">Business identity</h3>
					<div class="grid gap-4 sm:grid-cols-2">
						<div>
							<Label class="mb-1 block" for="name">Business name *</Label>
							<Input id="name" name="name" type="text" required value={data.info?.name ?? ''} />
						</div>
						<div>
							<Label class="mb-1 block" for="legalName">Legal name</Label>
							<Input
								id="legalName"
								name="legalName"
								type="text"
								value={data.info?.legalName ?? ''}
								placeholder="If different from business name"
							/>
						</div>
					</div>
					<div class="sm:w-1/2">
						<Label class="mb-1 block" for="type">Business type</Label>
						<Select type="single" name="type" bind:value={typeValue}>
							<SelectTrigger id="type" class="w-full">
								<SelectValue
									>{BUSINESS_TYPES.find((bt) => bt.value === typeValue)?.label ??
										'Select type'}</SelectValue
								>
							</SelectTrigger>
							<SelectContent>
								{#each businessTypes as bt (bt.value)}
									<SelectItem value={bt.value}>{bt.label}</SelectItem>
								{/each}
							</SelectContent>
						</Select>
					</div>
					<div class="sm:w-1/2">
						<Label class="mb-1 block" for="fulfillmentModel">Fulfillment model</Label>
						<div
							id="fulfillmentModel"
							class="flex items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm"
						>
							<span class="text-foreground"
								>{fulfillmentModelLabel(data.info?.fulfillmentModel)}</span
							>
							<a
								href={resolve('/dashboard/settings/fulfillment-model/change')}
								class="text-xs text-primary hover:underline">Change…</a
							>
						</div>
						{#if data.info?.fulfillmentModel}
							{@const current = FULFILLMENT_MODELS.find(
								(m) => m.value === data.info?.fulfillmentModel
							)}
							{#if current}
								<p class="mt-1.5 text-xs text-muted-foreground">{current.description}</p>
							{/if}
						{/if}
					</div>
				</div>

				<!-- Contact -->
				<div class="space-y-4">
					<h3 class="text-sm font-medium text-gray-500">Contact</h3>
					<div class="grid gap-4 sm:grid-cols-2">
						<div>
							<Label class="mb-1 block" for="phone">Phone</Label>
							<Input
								id="phone"
								name="phone"
								type="tel"
								value={data.info?.phone ?? ''}
								placeholder="+1 (555) 000-0000"
							/>
						</div>
						<div>
							<Label class="mb-1 block" for="email">Email</Label>
							<Input
								id="email"
								name="email"
								type="email"
								value={data.info?.email ?? ''}
								placeholder="contact@yourbusiness.com"
							/>
						</div>
					</div>
					<div>
						<Label class="mb-1 block" for="website">Website</Label>
						<div
							class="flex rounded-md border focus-within:border-ring focus-within:ring-1 focus-within:ring-ring"
						>
							<span
								class="flex items-center rounded-l-md border-r bg-muted/50 px-3 text-sm text-muted-foreground"
								>https://</span
							>
							<Input
								id="website"
								name="website"
								type="text"
								value={(data.info?.website ?? '').replace(/^https?:\/\//, '')}
								placeholder="yourbusiness.com"
								class="min-w-0 flex-1 rounded-none rounded-r-md border-0 shadow-none focus-visible:ring-0"
							/>
						</div>
					</div>
				</div>

				<!-- Address -->
				<div class="space-y-4">
					<h3 class="text-sm font-medium text-gray-500">Address</h3>
					<div>
						<Label class="mb-1 block" for="street">Street</Label>
						<Input
							id="street"
							name="street"
							type="text"
							value={address?.street ?? ''}
							placeholder="123 Main St"
						/>
					</div>
					<div class="grid gap-4 sm:grid-cols-3">
						<div>
							<Label class="mb-1 block" for="city">City</Label>
							<Input id="city" name="city" type="text" value={address?.city ?? ''} />
						</div>
						<div>
							<Label class="mb-1 block" for="state">State</Label>
							<Input
								id="state"
								name="state"
								type="text"
								value={address?.state ?? ''}
								placeholder="TX"
							/>
						</div>
						<div>
							<Label class="mb-1 block" for="zip">ZIP</Label>
							<Input id="zip" name="zip" type="text" value={address?.zip ?? ''} />
						</div>
					</div>
					<div class="sm:w-1/3">
						<Label class="mb-1 block" for="country">Country</Label>
						<Input
							id="country"
							name="country"
							type="text"
							value={address?.country ?? ''}
							placeholder="US"
						/>
					</div>
					<div class="sm:w-2/3">
						<Label class="mb-1 block" for="timezone">Timezone</Label>
						<Select type="single" name="timezone" bind:value={timezoneValue}>
							<SelectTrigger id="timezone" class="w-full">
								<SelectValue>{getTimezoneLabel(timezoneValue)}</SelectValue>
							</SelectTrigger>
							<SelectContent class="max-h-100">
								<SelectGroup>
									<SelectGroupHeading>United States</SelectGroupHeading>
									{#each US_TIMEZONES as tz (tz.value)}
										<SelectItem value={tz.value}>{tz.label}</SelectItem>
									{/each}
								</SelectGroup>
								<SelectSeparator />
								<SelectGroup>
									<SelectGroupHeading>All timezones</SelectGroupHeading>
									{#each otherTimezones as tz (tz)}
										<SelectItem value={tz}>{tz}</SelectItem>
									{/each}
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
				</div>
			</CardContent>
			<CardFooter>
				<Button type="submit" variant="default">Save changes</Button>
			</CardFooter>
		</Card>
	</form>

	<!-- Checkout settings — tipping + ASAP -->
	{#if form?.checkoutSuccess}
		<Alert severity="success" class="mt-4">Checkout settings saved.</Alert>
	{/if}
	<form
		method="post"
		action="?/saveCheckout"
		use:enhance={() =>
			({ update }) =>
				update({ reset: false })}
		class="mt-6"
	>
		<Card class="shadow-sm">
			<CardHeader>
				<CardTitle>Checkout</CardTitle>
			</CardHeader>
			<CardContent class="space-y-5">
				<p class="text-xs text-muted-foreground">Control what customers see at checkout.</p>
				<label class="flex cursor-pointer items-start gap-3">
					<Checkbox name="enableTips" checked={savedCheckout.enableTips ?? false} class="mt-0.5" />
					<div>
						<span class="text-sm font-medium text-muted-foreground">Accept tips at checkout</span>
						<p class="mt-0.5 text-xs text-muted-foreground/70">
							Show a tip selector to customers in the cart. Most bakeries, farms, and makers leave
							this off.
						</p>
					</div>
				</label>
				<label class="flex cursor-pointer items-start gap-3">
					<Checkbox
						name="asapPickupEnabled"
						checked={savedCheckout.asapPickupEnabled ?? false}
						class="mt-0.5"
					/>
					<div>
						<span class="text-sm font-medium text-muted-foreground">Allow ASAP pickup</span>
						{#if data.info?.fulfillmentModel === 'pickup_only'}
							<p class="mt-0.5 text-xs text-muted-foreground/70">
								Most pickup-only vendors leave this off — orders are handed off at scheduled pickup
								events.
							</p>
						{:else}
							<p class="mt-0.5 text-xs text-muted-foreground/70">
								Most storefront vendors leave this on — it's how customers order for same-day
								pickup.
							</p>
						{/if}
					</div>
				</label>
			</CardContent>
			<CardFooter>
				<Button type="submit" variant="default">Save checkout settings</Button>
			</CardFooter>
		</Card>
	</form>

	<!-- Special requests -->
	{#if form?.specialRequestsSuccess}
		<Alert severity="success" class="mt-4">Special request settings saved.</Alert>
	{/if}
	<form
		method="post"
		action="?/saveSpecialRequests"
		use:enhance={() =>
			({ update }) =>
				update({ reset: false })}
		class="mt-6"
	>
		<Card class="shadow-sm">
			<CardHeader>
				<CardTitle>Special requests</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<div class="flex items-start justify-between gap-4">
					<div class="min-w-0">
						<label for="acceptsRequests" class="text-sm font-medium">
							Accept special requests
						</label>
						<p class="mt-1 text-sm text-muted-foreground">
							When on, customers see a "Special Requests" section on your storefront where they can
							request something not on the catalog. You'll receive an email and can respond with a
							quote.
						</p>
					</div>
					<input type="hidden" name="acceptsRequests" value={acceptsRequests ? 'on' : ''} />
					<Switch id="acceptsRequests" bind:checked={acceptsRequests} />
				</div>
			</CardContent>
			<CardFooter>
				<Button type="submit" variant="default">Save changes</Button>
			</CardFooter>
		</Card>
	</form>
</div>
