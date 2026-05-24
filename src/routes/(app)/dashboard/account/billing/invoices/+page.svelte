<script lang="ts">
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';
	import {
		Table,
		TableHeader,
		TableHead,
		TableBody,
		TableRow,
		TableCell
	} from '$lib/components/ui/table';

	let { data }: { data: PageData } = $props();

	const invoiceStatusStyles: Record<string, string> = {
		paid: 'bg-success/10 text-success',
		open: 'bg-amber-100 text-amber-700',
		uncollectible: 'bg-red-100 text-red-700',
		void: 'bg-gray-100 text-gray-400',
		draft: 'bg-gray-100 text-gray-500'
	};

	function formatMoney(cents: number, currency: string) {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: currency.toUpperCase()
		}).format(cents / 100);
	}

	function formatDate(unix: number) {
		return new Date(unix * 1000).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Invoices — Order Local</title>
</svelte:head>

<div class="max-w-3xl">
	<div class="mb-6">
		<a
			href={resolve('/dashboard/account/billing')}
			class="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
		>
			<Icon icon="mdi:arrow-left" class="h-3.5 w-3.5" />
			Back to billing
		</a>
		<h1 class="text-2xl font-bold text-gray-900">Invoices</h1>
		<p class="mt-1 text-sm text-gray-500">Past invoices for your subscription and add-ons.</p>
	</div>

	{#if !data.hasStripeCustomer}
		<div class="rounded-xl border border-gray-200 bg-white p-12 text-center">
			<h3 class="mb-1 text-base font-semibold text-gray-900">No billing account yet</h3>
			<p class="mb-4 text-sm text-gray-500">Upgrade to a paid plan to start receiving invoices.</p>
			<Button href={resolve('/dashboard/account/billing')} class="gap-1.5">
				<Icon icon="mdi:arrow-up-circle-outline" class="h-3.5 w-3.5" />
				View plans
			</Button>
		</div>
	{:else if data.invoices.length === 0}
		<div class="rounded-xl border border-gray-200 bg-white p-12 text-center">
			<h3 class="mb-1 text-base font-semibold text-gray-900">No invoices yet</h3>
			<p class="text-sm text-gray-500">
				Your first invoice will appear here once your billing cycle begins.
			</p>
		</div>
	{:else}
		<Card class="p-0 shadow-sm">
			<CardContent class="p-0">
				<Table>
					<TableHeader>
						<TableRow class="hover:bg-transparent">
							<TableHead class="px-4 py-2.5">Date</TableHead>
							<TableHead class="hidden px-4 py-2.5 md:table-cell">Invoice</TableHead>
							<TableHead class="px-4 py-2.5">Amount</TableHead>
							<TableHead class="px-4 py-2.5">Status</TableHead>
							<TableHead class="px-4 py-2.5"></TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{#each data.invoices as invoice (invoice.id)}
							<TableRow>
								<TableCell class="px-4 py-3 text-sm text-gray-900">
									{formatDate(invoice.created)}
								</TableCell>
								<TableCell class="hidden px-4 py-3 md:table-cell">
									<span class="font-mono text-xs text-muted-foreground">
										{invoice.number ?? '—'}
									</span>
								</TableCell>
								<TableCell class="px-4 py-3 text-sm text-gray-900">
									{formatMoney(invoice.total, invoice.currency)}
								</TableCell>
								<TableCell class="px-4 py-3">
									<span
										class="rounded-full px-2.5 py-0.5 text-xs font-medium capitalize {invoiceStatusStyles[
											invoice.status
										] ?? invoiceStatusStyles.draft}"
									>
										{invoice.status}
									</span>
								</TableCell>
								<TableCell class="px-4 py-3 text-right">
									<div
										class="flex flex-col items-stretch gap-1 md:flex-row md:items-center md:justify-end"
									>
										{#if invoice.hostedInvoiceUrl}
											<!-- eslint-disable svelte/no-navigation-without-resolve -->
											<Button
												href={invoice.hostedInvoiceUrl}
												target="_blank"
												rel="noopener noreferrer"
												variant="ghost"
												size="xs"
												class="w-full gap-1 md:w-auto"
											>
												<Icon icon="mdi:eye-outline" class="h-3.5 w-3.5" />
												View
											</Button>
											<!-- eslint-enable svelte/no-navigation-without-resolve -->
										{/if}
										{#if invoice.invoicePdf}
											<!-- eslint-disable svelte/no-navigation-without-resolve -->
											<Button
												href={invoice.invoicePdf}
												target="_blank"
												rel="noopener noreferrer"
												variant="ghost"
												size="xs"
												class="w-full gap-1 md:w-auto"
											>
												<Icon icon="mdi:download" class="h-3.5 w-3.5" />
												PDF
											</Button>
											<!-- eslint-enable svelte/no-navigation-without-resolve -->
										{/if}
									</div>
								</TableCell>
							</TableRow>
						{/each}
					</TableBody>
				</Table>
				{#if data.hasMore}
					<p class="border-t border-gray-100 px-4 py-3 text-xs text-muted-foreground">
						Showing the {data.invoices.length} most recent invoices.
					</p>
				{/if}
			</CardContent>
		</Card>
	{/if}
</div>
