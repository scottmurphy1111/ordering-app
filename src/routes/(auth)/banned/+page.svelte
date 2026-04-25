<script lang="ts">
	import { signOut } from '$lib/auth-client';
	import { resolve } from '$app/paths';
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
		<div class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
			<Icon icon="mdi:account-cancel-outline" class="h-7 w-7 text-red-600" />
		</div>
		<h1 class="text-lg font-semibold text-foreground">Account suspended</h1>
		<p class="mt-2 text-sm text-muted-foreground">
			Your account has been suspended. Please contact support if you believe this is a mistake.
		</p>
		<Button onclick={handleSignOut} variant="outline" class="mt-6 w-full">
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
