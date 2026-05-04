<script lang="ts">
	import { Alert } from '$lib/components/ui/alert';
</script>

<div class="max-w-xl">
	<div class="mb-6">
		<h1 class="text-2xl font-bold text-foreground">Notifications</h1>
		<p class="mt-0.5 text-sm text-muted-foreground">Control how and when you hear from us.</p>
	</div>

	<Alert severity="info" dismissible={false} autofade={0}>
		Notification preferences coming soon. You'll be able to opt in to weekly summary digests, daily
		prep emails before pickup windows, and product updates from the Order Local team.
	</Alert>
</div>
