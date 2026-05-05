<script lang="ts">
	import { enhance } from '$app/forms';
	import { confirmDialog } from '$lib/confirm.svelte';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Alert } from '$lib/components/ui/alert';
	import Sortable from 'sortablejs';

	interface ModifierOption {
		id: number;
		name: string;
		priceAdjustment: number | null;
		isDefault: boolean | null;
		sortOrder?: number | null;
	}

	interface ModifierGroup {
		id: number;
		name: string;
		isRequired: boolean | null;
		maxSelections: number | null;
		sortOrder: number | null;
		options: ModifierOption[];
	}

	let { groups, itemId }: { groups: ModifierGroup[]; itemId: number } = $props();

	let addingOptionTo = $state<number | null>(null);
	let editingModifier = $state<number | null>(null);
	let editingOption = $state<number | null>(null);
	let showAddGroup = $state(false);
	let modifierError = $state<string | null>(null);

	const sortedGroups = $derived(
		[...groups].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
	);

	function sortableGroups(node: HTMLElement) {
		const s = Sortable.create(node, {
			animation: 150,
			handle: '.group-drag-handle',
			ghostClass: 'opacity-40',
			onEnd: async () => {
				const order = [...node.querySelectorAll('[data-group-id]')].map((el, i) => ({
					id: parseInt((el as HTMLElement).dataset.groupId!),
					sortOrder: i
				}));
				try {
					const res = await fetch('/api/reorder-modifiers', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ order })
					});
					if (!res.ok) throw new Error();
				} catch {
					modifierError = 'Failed to save group order. Reload to revert.';
				}
			}
		});
		return { destroy: () => s.destroy() };
	}

	function sortableOptions(node: HTMLElement) {
		const s = Sortable.create(node, {
			animation: 150,
			handle: '.option-drag-handle',
			draggable: '[data-option-id]',
			ghostClass: 'opacity-40',
			onEnd: async () => {
				const order = [...node.querySelectorAll('[data-option-id]')].map((el, i) => ({
					id: parseInt((el as HTMLElement).dataset.optionId!),
					sortOrder: i
				}));
				try {
					const res = await fetch('/api/reorder-modifier-options', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({ order })
					});
					if (!res.ok) throw new Error();
				} catch {
					modifierError = 'Failed to save option order. Reload to revert.';
				}
			}
		});
		return { destroy: () => s.destroy() };
	}
</script>

<div>
	<div class="mb-3 flex items-center justify-between">
		<div>
			<h2 class="text-base font-semibold text-foreground">Modifier groups</h2>
			<p class="mt-0.5 text-xs text-muted-foreground">e.g. Size, Add-ons, Frosting, Pack size</p>
		</div>
		{#if !showAddGroup}
			<Button onclick={() => (showAddGroup = true)} variant="outline">+ Add group</Button>
		{/if}
	</div>

	{#if modifierError}
		<Alert severity="error" class="mb-3" ondismiss={() => (modifierError = null)}>
			{modifierError}
		</Alert>
	{/if}

	<!-- Add group form -->
	{#if showAddGroup}
		<form
			method="post"
			action="?/addModifier"
			use:enhance={() => {
				return ({ result, update }) => {
					if (result.type === 'success') {
						showAddGroup = false;
						modifierError = null;
					} else if (result.type === 'failure') {
						modifierError =
							(result.data?.modifierError as string | undefined) ?? 'Failed to add group';
					}
					return update({ reset: false });
				};
			}}
			class="mb-4 space-y-3 rounded-xl border bg-muted/50 p-4"
		>
			<input type="hidden" name="itemId" value={itemId} />
			<p class="text-sm font-medium text-foreground">New modifier group</p>
			<div>
				<label class="mb-1 block text-xs font-medium text-muted-foreground" for="modifierName"
					>Group name *</label
				>
				<Input
					id="modifierName"
					name="modifierName"
					type="text"
					required
					placeholder="e.g. Size, Add-ons"
				/>
			</div>
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label class="mb-1 block text-xs font-medium text-muted-foreground" for="maxSelections"
						>Max selections</label
					>
					<Input id="maxSelections" name="maxSelections" type="number" min={1} value="1" />
				</div>
				<div class="flex items-end pb-2">
					<label class="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
						<Checkbox name="isRequired" />
						Required
					</label>
				</div>
			</div>
			<div class="flex gap-2">
				<Button type="submit" variant="default">Add group</Button>
				<Button type="button" onclick={() => (showAddGroup = false)} variant="outline"
					>Cancel</Button
				>
			</div>
		</form>
	{/if}

	<!-- Empty state -->
	{#if sortedGroups.length === 0 && !showAddGroup}
		<div class="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
			No modifier groups yet. Add one to let customers customize this item.
		</div>
	{/if}

	<!-- Existing modifier groups -->
	<div use:sortableGroups class="space-y-3">
		{#each sortedGroups as mod (mod.id)}
			<div
				data-group-id={mod.id}
				class="overflow-hidden rounded-xl border bg-background shadow-sm transition-colors hover:bg-muted/30"
			>
				<!-- Group header -->
				{#if editingModifier === mod.id}
					<form
						method="post"
						action="?/updateModifier"
						use:enhance={() => {
							return ({ result, update }) => {
								if (result.type === 'success') {
									editingModifier = null;
									modifierError = null;
								} else if (result.type === 'failure') {
									modifierError =
										(result.data?.modifierError as string | undefined) ?? 'Failed to update group';
								}
								return update({ reset: false });
							};
						}}
						class="flex items-end gap-3 border-b bg-muted/50 px-4 py-3"
					>
						<input type="hidden" name="modifierId" value={mod.id} />
						<div class="flex-1">
							<label
								class="mb-1 block text-xs font-medium text-muted-foreground"
								for="edit-modifier-name-{mod.id}">Group name</label
							>
							<Input
								id="edit-modifier-name-{mod.id}"
								name="modifierName"
								type="text"
								required
								value={mod.name}
							/>
						</div>
						<div class="w-20">
							<label
								class="mb-1 block text-xs font-medium text-muted-foreground"
								for="edit-max-selections-{mod.id}">Max</label
							>
							<Input
								id="edit-max-selections-{mod.id}"
								name="maxSelections"
								type="number"
								min={1}
								value={mod.maxSelections}
							/>
						</div>
						<label
							class="flex cursor-pointer items-center gap-1.5 pb-1.5 text-sm text-muted-foreground"
						>
							<Checkbox name="isRequired" checked={mod.isRequired ?? false} />
							Required
						</label>
						<Button type="submit" variant="default">Save</Button>
						<Button type="button" onclick={() => (editingModifier = null)} variant="outline"
							>Cancel</Button
						>
					</form>
				{:else}
					<div class="flex items-center justify-between gap-3 border-b px-4 py-3">
						<div class="flex items-center gap-2">
							<button
								type="button"
								class="group-drag-handle cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
								aria-label="Drag to reorder group"
							>
								<Icon icon="mdi:drag" class="h-4 w-4" />
							</button>
							<p class="text-sm font-medium text-foreground">{mod.name}</p>
							{#if mod.isRequired}
								<span
									class="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-destructive"
									>Required</span
								>
							{:else}
								<span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
									>Optional</span
								>
							{/if}
							<span class="text-xs text-muted-foreground">max {mod.maxSelections}</span>
						</div>
						<div class="flex items-center gap-2">
							<Button
								type="button"
								onclick={() => (editingModifier = mod.id)}
								variant="ghost"
								class="h-auto p-0 text-xs text-muted-foreground hover:text-muted-foreground"
							>
								Edit
							</Button>
							<form method="post" action="?/deleteModifier" use:enhance>
								<input type="hidden" name="modifierId" value={mod.id} />
								<Button
									type="submit"
									onclick={async (e) => {
										e.preventDefault();
										const form = (e.currentTarget as HTMLButtonElement).form;
										if (await confirmDialog(`Delete "${mod.name}"? This cannot be undone.`))
											form?.requestSubmit();
									}}
									variant="ghost"
									class="h-auto p-0 text-xs text-red-400 hover:text-red-600"
								>
									Delete
								</Button>
							</form>
						</div>
					</div>
				{/if}

				<!-- Options list -->
				<div use:sortableOptions class="divide-y divide-border">
					{#each mod.options as opt (opt.id)}
						{#if editingOption === opt.id}
							<form
								method="post"
								action="?/updateOption"
								use:enhance={() => {
									return ({ result, update }) => {
										if (result.type === 'success') {
											editingOption = null;
											modifierError = null;
										} else if (result.type === 'failure') {
											modifierError =
												(result.data?.modifierError as string | undefined) ??
												'Failed to update option';
										}
										return update({ reset: false });
									};
								}}
								class="space-y-2 bg-muted/50 px-4 py-3"
							>
								<input type="hidden" name="optionId" value={opt.id} />
								<div class="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2">
									<div>
										<label
											class="mb-1 block text-xs font-medium text-muted-foreground"
											for="edit-option-name-{opt.id}">Option name *</label
										>
										<Input
											id="edit-option-name-{opt.id}"
											name="optionName"
											type="text"
											required
											value={opt.name}
										/>
									</div>
									<div class="w-24">
										<label
											class="mb-1 block text-xs font-medium text-muted-foreground"
											for="edit-price-adj-{opt.id}">Price adj. ($)</label
										>
										<Input
											id="edit-price-adj-{opt.id}"
											name="priceAdjustment"
											type="number"
											step={0.01}
											value={((opt.priceAdjustment ?? 0) / 100).toFixed(2)}
										/>
									</div>
									<label
										class="flex cursor-pointer items-center gap-1 pb-1.5 text-xs text-muted-foreground"
									>
										<Checkbox name="isDefault" checked={opt.isDefault ?? false} />
										Default
									</label>
									<div class="flex gap-1 pb-0.5">
										<Button type="submit" variant="default">Save</Button>
										<Button type="button" onclick={() => (editingOption = null)} variant="outline">
											<Icon icon="mdi:close" class="h-3.5 w-3.5" />
										</Button>
									</div>
								</div>
							</form>
						{:else}
							<div
								data-option-id={opt.id}
								class="flex items-center justify-between gap-3 px-4 py-2.5"
							>
								<div class="flex min-w-0 items-center gap-2">
									<button
										type="button"
										class="option-drag-handle cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
										aria-label="Drag to reorder option"
									>
										<Icon icon="mdi:drag-vertical" class="h-4 w-4" />
									</button>
									<span class="truncate text-sm text-foreground">{opt.name}</span>
									{#if opt.isDefault}
										<span class="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600"
											>Default</span
										>
									{/if}
								</div>
								<div class="flex shrink-0 items-center gap-3">
									<span class="text-sm text-muted-foreground">
										{(opt.priceAdjustment ?? 0) === 0
											? 'No charge'
											: (opt.priceAdjustment ?? 0) > 0
												? `+$${((opt.priceAdjustment ?? 0) / 100).toFixed(2)}`
												: `-$${(Math.abs(opt.priceAdjustment ?? 0) / 100).toFixed(2)}`}
									</span>
									<Button
										type="button"
										onclick={() => (editingOption = opt.id)}
										variant="ghost"
										size="icon"
										class="text-muted-foreground hover:text-foreground"
									>
										<Icon icon="mdi:pencil-outline" class="h-3.5 w-3.5" />
									</Button>
									<form method="post" action="?/deleteOption" use:enhance>
										<input type="hidden" name="optionId" value={opt.id} />
										<Button
											type="submit"
											onclick={async (e) => {
												e.preventDefault();
												const form = (e.currentTarget as HTMLButtonElement).form;
												if (await confirmDialog(`Delete option "${opt.name}"?`))
													form?.requestSubmit();
											}}
											variant="ghost"
											size="icon"
											class="text-red-400 hover:text-red-600"
										>
											<Icon icon="mdi:trash-can-outline" class="h-3.5 w-3.5" />
										</Button>
									</form>
								</div>
							</div>
						{/if}
					{/each}
				</div>

				<!-- Add option -->
				{#if addingOptionTo === mod.id}
					<form
						method="post"
						action="?/addOption"
						use:enhance={() => {
							return ({ result, update }) => {
								if (result.type === 'success') {
									modifierError = null;
								} else if (result.type === 'failure') {
									modifierError =
										(result.data?.modifierError as string | undefined) ?? 'Failed to add option';
								}
								return update({ reset: true });
							};
						}}
						class="space-y-2 border-t bg-muted/50 px-4 py-3"
					>
						<input type="hidden" name="modifierId" value={mod.id} />
						<div class="grid grid-cols-[1fr_auto_auto_auto] items-end gap-2">
							<div>
								<label
									class="mb-1 block text-xs font-medium text-muted-foreground"
									for="option-name-{mod.id}">Option name *</label
								>
								<Input
									id="option-name-{mod.id}"
									name="optionName"
									type="text"
									required
									placeholder="e.g. Large"
								/>
							</div>
							<div class="w-24">
								<label
									class="mb-1 block text-xs font-medium text-muted-foreground"
									for="price-adj-{mod.id}">Price adj. ($)</label
								>
								<Input
									id="price-adj-{mod.id}"
									name="priceAdjustment"
									type="number"
									step={0.01}
									value="0"
									placeholder="0.00"
								/>
							</div>
							<label
								class="flex cursor-pointer items-center gap-1 pb-1.5 text-xs text-muted-foreground"
							>
								<Checkbox name="isDefault" />
								Default
							</label>
							<div class="flex gap-1 pb-0.5">
								<Button type="submit" variant="default">Add</Button>
								<Button type="button" onclick={() => (addingOptionTo = null)} variant="outline">
									<Icon icon="mdi:close" class="h-3.5 w-3.5" />
								</Button>
							</div>
						</div>
					</form>
				{:else}
					<Button
						type="button"
						onclick={() => (addingOptionTo = mod.id)}
						variant="ghost"
						class="w-full justify-start rounded-none border-t px-4 py-2 text-xs text-muted-foreground hover:bg-muted/50 hover:text-muted-foreground"
					>
						+ Add option
					</Button>
				{/if}
			</div>
		{/each}
	</div>
</div>
