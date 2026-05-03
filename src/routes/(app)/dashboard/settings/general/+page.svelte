<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';
	import Icon from '@iconify/svelte';
	import { resolve } from '$app/paths';
	import type { WeekHours } from '$lib/hours';
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
	import { BUSINESS_TYPES } from '$lib/utils/business-type-labels';
	import { US_TIMEZONES, getAllTimezones, getTimezoneLabel } from '$lib/utils/timezones';

	let { data, form: _form }: { data: PageData; form: ActionData } = $props();
	const form = $derived(_form as (ActionData & { deliverySuccess?: boolean }) | null);

	const address = $derived(
		data.info?.address as {
			street?: string;
			city?: string;
			state?: string;
			zip?: string;
			country?: string;
		} | null
	);

	const savedHours = $derived(
		(data.info as unknown as { settings?: { hours?: WeekHours } } | null)?.settings?.hours ?? {}
	);
	const savedDelivery = $derived(
		(
			data.info as unknown as {
				settings?: { enableDelivery?: boolean; deliveryFee?: number };
			} | null
		)?.settings ?? {}
	);

	const DAYS = [
		{ key: 'monday', label: 'Mon' },
		{ key: 'tuesday', label: 'Tue' },
		{ key: 'wednesday', label: 'Wed' },
		{ key: 'thursday', label: 'Thu' },
		{ key: 'friday', label: 'Fri' },
		{ key: 'saturday', label: 'Sat' },
		{ key: 'sunday', label: 'Sun' }
	];

	const businessTypes = BUSINESS_TYPES;

	const US_TZ_SET = new Set(US_TIMEZONES.map((t) => t.value));
	const otherTimezones = getAllTimezones().filter((tz) => !US_TZ_SET.has(tz));

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

	let closedDays = $state<Record<string, boolean>>({});

	$effect(() => {
		for (const day of DAYS) {
			closedDays[day.key] = savedHours[day.key]?.closed ?? false;
		}
	});
</script>

<div class="max-w-2xl">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-foreground">General</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">
			Your business details and contact information.
		</p>
	</div>

	{#if form?.error}
		<div
			class="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
		>
			{form.error}
		</div>
	{/if}
	{#if form?.success}
		<div
			class="mb-4 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary/90"
		>
			Changes saved.
		</div>
	{/if}

	<form
		method="post"
		action="?/save"
		use:enhance={() =>
			({ update }) =>
				update({ reset: false })}
		class="space-y-6"
	>
		<!-- Business identity -->
		<Card class="shadow-sm">
			<CardHeader>
				<CardTitle>Business identity</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
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
					<Select type="single" name="type" value={data.info?.type ?? ''}>
						<SelectTrigger id="type" class="w-full">
							<SelectValue placeholder="Select type" />
						</SelectTrigger>
						<SelectContent>
							{#each businessTypes as bt (bt.value)}
								<SelectItem value={bt.value}>{bt.label}</SelectItem>
							{/each}
						</SelectContent>
					</Select>
				</div>
			</CardContent>
		</Card>

		<!-- Contact -->
		<Card class="shadow-sm">
			<CardHeader>
				<CardTitle>Contact</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
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
			</CardContent>
		</Card>

		<!-- Address -->
		<Card class="shadow-sm">
			<CardHeader>
				<CardTitle>Address</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
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
			</CardContent>
			<CardFooter>
				<Button type="submit" variant="default">Save business info</Button>
			</CardFooter>
		</Card>
	</form>

	<!-- Delivery — separate form/action -->
	{#if form?.deliverySuccess}
		<div
			class="mt-4 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary/90"
		>
			Delivery settings saved.
		</div>
	{/if}
	<form
		method="post"
		action="?/saveDelivery"
		use:enhance={() =>
			({ update }) =>
				update({ reset: false })}
		class="mt-6"
	>
		<Card class="shadow-sm">
			<CardHeader>
				<CardTitle>Delivery</CardTitle>
			</CardHeader>
			<CardContent class="space-y-4">
				<p class="text-xs text-muted-foreground">
					Enable delivery as an order type at checkout and set a flat delivery fee.
				</p>
				<label class="flex cursor-pointer items-center gap-3">
					<input
						type="checkbox"
						name="enableDelivery"
						class="h-4 w-4 rounded text-primary"
						checked={savedDelivery.enableDelivery ?? false}
					/>
					<span class="text-sm font-medium text-muted-foreground">Enable delivery orders</span>
				</label>
				<div class="sm:w-48">
					<Label class="mb-1 block" for="deliveryFee">Delivery fee</Label>
					<div
						class="flex rounded-md border focus-within:border-ring focus-within:ring-1 focus-within:ring-ring"
					>
						<span
							class="flex items-center rounded-l-md border-r bg-muted/50 px-3 text-sm text-muted-foreground"
							>$</span
						>
						<Input
							id="deliveryFee"
							name="deliveryFee"
							type="number"
							min="0"
							step="0.01"
							placeholder="0.00"
							value={((savedDelivery.deliveryFee ?? 0) / 100).toFixed(2)}
							class="min-w-0 flex-1 rounded-none rounded-r-md border-0 shadow-none focus-visible:ring-0"
						/>
					</div>
				</div>
			</CardContent>
			<CardFooter>
				<Button type="submit" variant="default">Save delivery</Button>
			</CardFooter>
		</Card>
	</form>

	<!-- Checkout settings — tipping + ASAP -->
	{#if form?.checkoutSuccess}
		<div
			class="mt-4 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary/90"
		>
			Checkout settings saved.
		</div>
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
					<input
						type="checkbox"
						name="enableTips"
						class="mt-0.5 h-4 w-4 rounded text-primary"
						checked={savedCheckout.enableTips ?? false}
					/>
					<div>
						<span class="text-sm font-medium text-muted-foreground">Accept tips at checkout</span>
						<p class="mt-0.5 text-xs text-muted-foreground/70">
							Show a tip selector to customers in the cart. Most bakeries, farms, and makers leave
							this off.
						</p>
					</div>
				</label>
				<label class="flex cursor-pointer items-start gap-3">
					<input
						type="checkbox"
						name="asapPickupEnabled"
						class="mt-0.5 h-4 w-4 rounded text-primary"
						checked={savedCheckout.asapPickupEnabled ?? false}
					/>
					<div>
						<span class="text-sm font-medium text-muted-foreground">Allow ASAP pickup</span>
						<p class="mt-0.5 text-xs text-muted-foreground/70">
							Show "order now" as an option at checkout. Off for most makers — items aren't ready
							instantly.
						</p>
					</div>
				</label>
			</CardContent>
			<CardFooter>
				<Button type="submit" variant="default">Save checkout settings</Button>
			</CardFooter>
		</Card>
	</form>

	<!-- Operating hours — separate form/action -->
	{#if form?.hoursSuccess}
		<div
			class="mt-4 rounded-md border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary/90"
		>
			Hours saved.
		</div>
	{/if}
	<form
		method="post"
		action="?/saveHours"
		use:enhance={() =>
			({ update }) =>
				update({ reset: false })}
		class="mt-6"
	>
		<Card class="shadow-sm">
			<CardHeader>
				<CardTitle>Operating hours</CardTitle>
			</CardHeader>
			<CardContent>
				<p class="px-4 pb-3 text-xs text-muted-foreground">
					Customers will see open/closed status on your catalog page. Leave all days unset to hide
					the status.
				</p>
				<div class="divide-y divide-border px-4">
					{#each DAYS as day (day.key)}
						{@const h = savedHours[day.key]}
						<div class="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:gap-3">
							<div class="flex items-center justify-between sm:contents">
								<span class="w-12 shrink-0 text-sm font-medium text-muted-foreground"
									>{day.label}</span
								>
								<label class="flex items-center gap-1.5 text-sm text-muted-foreground">
									<input
										type="checkbox"
										name="{day.key}_closed"
										class="h-4 w-4 rounded"
										checked={closedDays[day.key] ?? false}
										onchange={(e) => {
											closedDays[day.key] = e.currentTarget.checked;
										}}
									/>
									Closed
								</label>
							</div>
							<div
								class="flex min-w-0 flex-1 items-center gap-2 transition-opacity {closedDays[
									day.key
								]
									? 'pointer-events-none opacity-40'
									: ''}"
							>
								<Input
									type="time"
									name="{day.key}_open"
									value={h?.open ?? '09:00'}
									class="min-w-0 flex-1"
								/>
								<span class="shrink-0 text-xs text-muted-foreground">to</span>
								<Input
									type="time"
									name="{day.key}_close"
									value={h?.close ?? '21:00'}
									class="min-w-0 flex-1"
								/>
							</div>
						</div>
					{/each}
				</div>
			</CardContent>
			<CardFooter>
				<Button type="submit" variant="default">Save hours</Button>
			</CardFooter>
		</Card>
	</form>
</div>
