<script lang="ts">
	let { children } = $props();
</script>

<div class="min-h-screen bg-gray-50 flex items-center justify-center px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 text-center">
			<h1 class="text-2xl font-bold text-gray-900">Ordering App</h1>
			<p class="mt-1 text-sm text-gray-500">Manage your menu and orders</p>
		</div>
		{@render children()}
	</div>
</div>
