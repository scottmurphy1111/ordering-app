<script lang="ts" module>
	export type AlertSeverity = 'success' | 'warning' | 'error' | 'info';

	type SeverityConfig = { icon: string; classes: string; duration: number };

	export const SEVERITY_CONFIG: Record<AlertSeverity, SeverityConfig> = {
		success: {
			icon: 'mdi:check-circle-outline',
			classes: 'border-green-200 bg-green-50 text-green-700',
			duration: 5000
		},
		warning: {
			icon: 'mdi:alert-outline',
			classes: 'border-amber-200 bg-amber-50 text-amber-700',
			duration: 8000
		},
		error: {
			icon: 'mdi:alert-circle-outline',
			classes: 'border-destructive/20 bg-destructive/10 text-destructive',
			duration: 0
		},
		info: {
			icon: 'mdi:information-outline',
			classes: 'border-blue-200 bg-blue-50 text-blue-700',
			duration: 5000
		}
	};
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { fade } from 'svelte/transition';
	import Icon from '@iconify/svelte';

	let {
		severity,
		dismissible = true,
		autofade,
		ondismiss,
		class: className,
		children
	}: {
		severity: AlertSeverity;
		dismissible?: boolean;
		autofade?: number;
		ondismiss?: () => void;
		class?: string;
		children?: import('svelte').Snippet;
	} = $props();

	let shown = $state(true);

	const effectiveDuration = $derived(autofade ?? SEVERITY_CONFIG[severity].duration);

	$effect(() => {
		if (effectiveDuration > 0) {
			const timer = setTimeout(() => {
				shown = false;
			}, effectiveDuration);
			return () => clearTimeout(timer);
		}
	});

	function handleDismiss() {
		shown = false;
		ondismiss?.();
	}
</script>

{#if shown}
	<div
		role="alert"
		transition:fade={{ duration: 200 }}
		class={cn(
			'flex items-start gap-2.5 rounded-md border px-4 py-3 text-sm',
			SEVERITY_CONFIG[severity].classes,
			className
		)}
	>
		<Icon icon={SEVERITY_CONFIG[severity].icon} class="mt-0.5 h-4 w-4 shrink-0" />
		<div class="min-w-0 flex-1">
			{@render children?.()}
		</div>
		{#if dismissible}
			<button
				type="button"
				onclick={handleDismiss}
				class="shrink-0 opacity-60 transition-opacity hover:opacity-100"
				aria-label="Dismiss"
			>
				<Icon icon="mdi:close" class="h-4 w-4" />
			</button>
		{/if}
	</div>
{/if}
