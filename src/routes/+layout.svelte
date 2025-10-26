<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<main class="min-h-screen bg-base-300">
	<div class="navbar bg-base-100 shadow-sm">
		<a href="/" class="btn text-xl btn-ghost">UBC Workday2Cal</a>
	</div>

	{@render children?.()}
</main>
