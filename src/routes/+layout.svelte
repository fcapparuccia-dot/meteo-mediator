<script lang="ts">
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();

	onMount(() => {
		if (!browser || !('serviceWorker' in navigator)) return;

		void navigator.serviceWorker.register('/service-worker.js').catch((error) => {
			console.warn('Service worker registration failed:', error);
		});
	});
</script>

<svelte:head>
	<title>Meteo Mediator</title>
	<link rel="icon" href={favicon} />
	<link rel="manifest" href="/manifest.webmanifest" />
	<link rel="apple-touch-icon" href="/icon-192.png" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta name="apple-mobile-web-app-title" content="Meteo" />
	<meta name="theme-color" content="#1683c4" />
</svelte:head>

<nav class="site-nav" aria-label="Navigazione principale">
	<a href="/">Previsioni</a>
	<a href="/mappe">Mappe meteo</a>
	<a href="/modelli">Modello previsionale</a>
</nav>

{@render children()}

<style>
	.site-nav {
		display: flex;
		gap: 0.5rem;
		padding: 0.65rem 1rem;
		background: #12354a;
	}

	.site-nav a {
		padding: 0.45rem 0.7rem;
		border-radius: 5px;
		color: white;
		font: 600 0.9rem/1.2 system-ui, sans-serif;
		text-decoration: none;
	}

	.site-nav a:hover,
	.site-nav a:focus-visible {
		background: #0878b5;
	}
</style>
