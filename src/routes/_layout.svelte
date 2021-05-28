<script>
	import Nav from "../components/Nav.svelte";
</script>

<svelte:head>
	<title>Storytime</title>
	<link rel="stylesheet" href="https://unpkg.com/mvp.css" /><script
		src="https://getinsights.io/js/insights.js"></script>
	<script>
		insights.init("JynHv1V87_aSNmof");
		insights.trackPages();
	</script>
</svelte:head>

<Nav />

<main>
	<slot />
</main>
