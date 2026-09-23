<script lang="ts">
	import { browser } from '$app/environment';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
	let currentPath = $derived(page.url.pathname);

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
	<a href="/" class:active={currentPath === '/'} aria-current={currentPath === '/' ? 'page' : undefined}>Previsioni</a>
	<a href="/mappe" class:active={currentPath.startsWith('/mappe')} aria-current={currentPath.startsWith('/mappe') ? 'page' : undefined}>Mappe meteo</a>
	<a href="/modelli" class:active={currentPath.startsWith('/modelli')} aria-current={currentPath.startsWith('/modelli') ? 'page' : undefined}>Modello previsionale</a>
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
	.site-nav a:focus-visible,
	.site-nav a.active {
		background: #0878b5;
	}

	@media (display-mode: standalone) and (max-width: 700px) {
		.site-nav {
			gap: 0.15rem;
			padding: 0.45rem 0.5rem;
		}

		.site-nav a {
			flex: 1 1 0;
			padding: 0.45rem 0.2rem;
			font-size: 0.72rem;
			text-align: center;
		}
	}
</style>
