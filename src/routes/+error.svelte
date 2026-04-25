<script lang="ts">
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';

	const STATUS_COPY: Record<number, { icon: string; title: string; description: string }> = {
		404: {
			icon: 'mdi:magnify-close',
			title: 'Page not found',
			description: "The page you're looking for doesn't exist or has been moved."
		},
		403: {
			icon: 'mdi:lock-outline',
			title: 'Access denied',
			description: "You don't have permission to view this page."
		},
		401: {
			icon: 'mdi:account-lock-outline',
			title: 'Not signed in',
			description: 'Please sign in to continue.'
		},
		500: {
			icon: 'mdi:alert-circle-outline',
			title: 'Something went wrong',
			description: "We hit an unexpected error. Please try again or contact support if it persists."
		}
	};

	const status = $derived($page.status);
	const copy = $derived(
		STATUS_COPY[status] ?? {
			icon: 'mdi:alert-outline',
			title: 'Unexpected error',
			description: $page.error?.message ?? 'An error occurred.'
		}
	);
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-muted/50 px-4">
	<a href={resolve('/')} class="mb-8 text-3xl font-bold tracking-tight text-foreground">
		Order<span class="text-primary">Local</span>
	</a>

	<div class="w-full max-w-sm rounded-xl border bg-background p-8 text-center shadow-sm">
		<div
			class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full {status >= 500
				? 'bg-destructive/10'
				: 'bg-muted'}"
		>
			<Icon
				icon={copy.icon}
				class="h-7 w-7 {status >= 500 ? 'text-destructive' : 'text-muted-foreground'}"
			/>
		</div>

		<p class="mb-1 text-xs font-medium tracking-widest text-muted-foreground uppercase">
			Error {status}
		</p>
		<h1 class="text-lg font-semibold text-foreground">{copy.title}</h1>
		<p class="mt-2 text-sm text-muted-foreground">{copy.description}</p>

		<div class="mt-6 flex flex-col gap-2">
			{#if status === 401}
				<Button href={resolve('/login')} variant="default" class="w-full">Sign in</Button>
			{:else}
				<Button onclick={() => history.back()} variant="default" class="w-full">Go back</Button>
				<Button href={resolve('/dashboard')} variant="outline" class="w-full">Dashboard</Button>
			{/if}
		</div>

		<a
			href="mailto:support@getorderlocal.com"
			class="mt-4 block text-xs text-muted-foreground hover:text-foreground"
		>
			support@getorderlocal.com
		</a>
	</div>
</div>
