<script lang="ts">
	import { confirmState } from '$lib/confirm.svelte';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter
	} from '$lib/components/ui/dialog';

	function handleConfirm() {
		confirmState.resolve?.(true);
		confirmState.open = false;
	}

	function handleCancel() {
		confirmState.resolve?.(false);
		confirmState.open = false;
	}
</script>

<Dialog bind:open={confirmState.open}>
	<DialogContent showCloseButton={false}>
		<DialogHeader>
			<DialogTitle class="sr-only">Confirm</DialogTitle>
			<DialogDescription class="sr-only">Confirmation dialog</DialogDescription>
		</DialogHeader>
		<div class="flex items-start gap-3 pt-2">
			<div
				class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full {confirmState.danger
					? 'bg-red-100'
					: 'bg-gray-100'}"
			>
				<Icon
					icon={confirmState.danger ? 'mdi:alert-outline' : 'mdi:help-circle-outline'}
					class="h-5 w-5 {confirmState.danger ? 'text-red-600' : 'text-gray-500'}"
				/>
			</div>
			<p class="pt-1.5 text-sm leading-relaxed font-medium text-gray-900">
				{confirmState.message}
			</p>
		</div>
		<DialogFooter class="flex gap-3 sm:flex-row">
			<Button type="button" onclick={handleCancel} variant="outline" class="flex-1">
				{confirmState.cancelLabel}
			</Button>
			<Button
				type="button"
				onclick={handleConfirm}
				variant={confirmState.danger ? 'destructive' : 'default'}
				class="flex-1"
			>
				{confirmState.confirmLabel}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
