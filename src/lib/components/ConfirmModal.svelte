<script lang="ts">
	import { confirmState } from '$lib/confirm.svelte';
	import Icon from '@iconify/svelte';

	function handleConfirm() {
		confirmState.resolve?.(true);
		confirmState.open = false;
	}

	function handleCancel() {
		confirmState.resolve?.(false);
		confirmState.open = false;
	}
</script>

<svelte:window onkeydown={(e) => { if (confirmState.open && e.key === 'Escape') handleCancel(); }} />

{#if confirmState.open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="confirm-msg"
		tabindex="-1"
	>
		<div class="w-full max-w-sm rounded-2xl bg-white shadow-xl">
			<div class="flex items-start gap-3 px-6 pt-6 pb-4">
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
				<p id="confirm-msg" class="pt-1.5 text-sm font-medium leading-relaxed text-gray-900">
					{confirmState.message}
				</p>
			</div>
			<div class="flex gap-3 border-t border-gray-100 px-6 py-4">
				<button
					type="button"
					onclick={handleCancel}
					class="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
				>
					{confirmState.cancelLabel}
				</button>
				<button
					type="button"
					onclick={handleConfirm}
					class="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors {confirmState.danger
						? 'bg-red-600 hover:bg-red-700'
						: 'bg-gray-900 hover:bg-gray-700'}"
				>
					{confirmState.confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
