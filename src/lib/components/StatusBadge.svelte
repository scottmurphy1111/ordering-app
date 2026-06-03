<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import type { Snippet } from 'svelte';

	type Variant = 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'subtle';

	interface Props {
		variant?: Variant;
		tone?: string;
		class?: string;
		children: Snippet;
	}

	let { variant = 'neutral', tone, class: extraClass = '', children }: Props = $props();

	const variantClasses: Record<Variant, string> = {
		success: 'bg-success/10 text-success',
		warning: 'bg-amber-100 text-amber-700',
		danger: 'bg-red-100 text-red-600',
		neutral: 'bg-muted text-muted-foreground',
		info: 'bg-blue-100 text-blue-700',
		subtle: 'bg-stone-200 text-stone-700'
	};

	const colorClass = $derived(tone ?? variantClasses[variant]);
</script>

<Badge class="{colorClass} {extraClass}">
	{@render children()}
</Badge>
