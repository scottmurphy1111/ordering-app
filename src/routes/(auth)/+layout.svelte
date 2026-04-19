<script lang="ts">
	import { resolve } from '$app/paths';

	let { children } = $props();
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
	<a href={resolve('/')} class="mb-2 text-4xl font-bold tracking-tight text-gray-900">
		Order<span class="text-green-600">Local</span>
	</a>
	<p class="mb-6 text-sm text-gray-600">Order locally without the hassle.</p>
	<div class="w-full max-w-sm text-center">
		{@render children()}
	</div>
</div>
