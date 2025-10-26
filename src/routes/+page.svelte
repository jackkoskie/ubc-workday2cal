<script lang="ts">
	import { page } from '$app/stores';
	import type { PageProps } from './$types';
	import workdayExport from '$lib/assets/workdayExport.png';
	import { onMount } from 'svelte';

	let currentStep = $state(0);

	let { data, form }: PageProps = $props();

	onMount(() => {
		if (form?.gotoStep) {
			setStep(form.gotoStep);
			return;
		}

		const step = $page.url.searchParams.get('step');
		if (step && !isNaN(Number(step)) && Number(step) >= 0) {
			setStep(Number(step));
		}
	});

	const setStep = (step: number) => {
		currentStep = step;
		const url = new URL($page.url);
		url.searchParams.set('step', step.toString());
		url.hash = step > 0 ? step.toString() : '';
		history.replaceState(null, '', url.toString());
	};
</script>

<section class="container mx-auto prose max-w-4xl px-2 py-3">
	<h1>Welcome to UBC Workday2Cal!</h1>
	<p>
		This tool allows you to easily take your courses from UBC's workday and add them to Google
		Calendar, Apple Calendar, or any other calendar software.
	</p>

	{#if currentStep >= 1}
		<h2 id="1">Step 1</h2>
		<p>First, you must export your classes from Workday in a form that this tool can process:</p>
		<ol>
			<li>Navigate to UBC's Workday at <a href="https://myworkday.ubc.ca">myworkday.ubc.ca</a></li>
			<li>Open the Academics tool</li>
			<li>Navigate to Registration & Courses > View My Courses</li>
			<li>
				Export your enrolled courses as an excel file (see image below)
				<img src={workdayExport} alt="Screenshot of Workday's View My Courses page" class="mt-1" />
			</li>
		</ol>
		{#if currentStep === 1}
			<button class="btn mt-3 btn-primary" onclick={() => setStep(2)}>Next Step</button>
		{/if}
	{/if}
	{#if currentStep >= 2}
		<h2 id="2">Step 2</h2>
		<p>Next, we now hand the file over to Workday2Cal to process, please upload your file below:</p>
		<form action="?/processFile" method="post" class="flex flex-row gap-3">
			<input type="file" class="file-input" name="file" required accept=".xlsx" />
			<button class="btn btn-success">Submit</button>
		</form>
	{/if}
	{#if currentStep === 0}
		<button class="btn btn-primary" onclick={() => setStep(1)}>Get Started</button>
	{/if}
</section>
