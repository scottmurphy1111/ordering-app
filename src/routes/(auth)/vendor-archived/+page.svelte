<script lang="ts">
	import { resolve } from '$app/paths';
	import { signOut } from '$lib/auth-client';
	import Icon from '@iconify/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent } from '$lib/components/ui/card';

	async function handleSignOut() {
		await signOut({
			fetchOptions: { onSuccess: () => (window.location.href = '/login') }
		});
	}
</script>

<Card class="w-full max-w-sm">
	<CardContent class="p-8 text-center">
		<div
			class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted"
		>
			<Icon icon="mdi:store-off-outline" class="h-7 w-7 text-muted-foreground" />
		</div>
		<h1 class="text-lg font-semibold text-foreground">Store unavailable</h1>
		<p class="mt-2 text-sm text-muted-foreground">
			This store has been archived or removed. Switch to another store or contact support.
		</p>
		<Button href={resolve('/vendors')} variant="default" class="mt-6 w-full">
			<Icon icon="mdi:store-outline" class="h-4 w-4" />
			Switch store
		</Button>
		<Button onclick={handleSignOut} variant="outline" class="mt-2 w-full">
			<Icon icon="mdi:logout" class="h-4 w-4" />
			Sign out
		</Button>
		<a
			href="mailto:support@getorderlocal.com"
			class="mt-3 block text-xs text-muted-foreground hover:text-foreground"
		>
			support@getorderlocal.com
		</a>
	</CardContent>
</Card>
