<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import type { Snippet } from 'svelte';
	import Icon from '@iconify/svelte';
	import {
		Select,
		SelectContent,
		SelectItem,
		SelectTrigger,
		SelectValue
	} from '$lib/components/ui/select';

	type NavItem = { href: `/${string}`; label: string; icon: string; group?: string };

	let { items, title, children }: { items: NavItem[]; title: string; children: Snippet } = $props();

	function isActive(href: `/${string}`) {
		return page.url.pathname.startsWith(href);
	}

	const activeItem = $derived(items.find((item) => isActive(item.href)));

	type RenderGroup = { label: string | null; items: NavItem[] };

	const groups = $derived.by<RenderGroup[]>(() => {
		const out: RenderGroup[] = [];
		for (const item of items) {
			const label = item.group ?? null;
			const last = out[out.length - 1];
			if (last && last.label === label) {
				last.items.push(item);
			} else {
				out.push({ label, items: [item] });
			}
		}
		return out;
	});
</script>

<div class="flex flex-col md:flex-row md:gap-8">
	<div class="mb-6 md:hidden">
		<Select
			type="single"
			value={activeItem?.href ?? ''}
			onValueChange={(v) => goto(resolve(v as `/${string}`))}
		>
			<SelectTrigger class="w-full">
				<SelectValue class="flex items-center gap-2.5">
					{#if activeItem}
						<Icon icon={activeItem.icon} class="h-4 w-4 shrink-0" />
						{activeItem.label}
					{/if}
				</SelectValue>
			</SelectTrigger>
			<SelectContent>
				{#each items as item (item.href)}
					<SelectItem value={item.href} class="flex items-center gap-2.5">
						<Icon icon={item.icon} class="h-4 w-4 shrink-0" />
						{item.label}
					</SelectItem>
				{/each}
			</SelectContent>
		</Select>
	</div>

	<nav
		class="hidden w-44 shrink-0 md:sticky md:top-8 md:block md:max-h-[calc(100vh-4rem)] md:self-start md:overflow-y-auto"
	>
		<p class="mb-3 text-xs font-medium tracking-wider text-gray-500 uppercase">{title}</p>

		{#each groups as group, i (group.label ?? `__ungrouped_${i}`)}
			{#if group.label}
				<p
					class="mt-5 mb-2 px-3 text-[11px] font-medium tracking-wider text-gray-400 uppercase first:mt-0"
				>
					{group.label}
				</p>
			{/if}
			<ul class="space-y-0.5">
				{#each group.items as item (item.href)}
					<li>
						<a
							href={resolve(item.href)}
							class="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors {isActive(
								item.href
							)
								? 'bg-stone-200 font-medium text-stone-900'
								: 'text-stone-500 hover:bg-stone-200/50 hover:text-stone-900'}"
						>
							<Icon icon={item.icon} class="h-4 w-4 shrink-0" />
							{item.label}
						</a>
					</li>
				{/each}
			</ul>
		{/each}
	</nav>

	<div class="min-w-0 flex-1">
		{@render children()}
	</div>
</div>
