<script lang="ts">
	import logo from '$lib/assets/logo.png';
	let { children } = $props();
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 px-4">
	<div class="w-full max-w-sm">
		<div class="mb-8 flex w-full flex-col items-center justify-center">
			<img src={logo} alt="Logo" class="w-full" />
		</div>
		{@render children()}
	</div>
</div>
