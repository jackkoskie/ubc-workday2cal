<script lang="ts">
	import { page } from '$app/stores';
	import type { PageProps } from './$types';
	import workdayExport from '$lib/assets/workdayExport.png';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { enhance } from '$app/forms';
	import { fade, fly } from 'svelte/transition';

	let currentStep = $state(0);

	let { data, form }: PageProps = $props();

	const setStep = (step: number) => {
		currentStep = step;
		if (browser) {
			const url = new URL($page.url);
			url.searchParams.set('step', step.toString());
			url.hash = step > 0 ? step.toString() : '';
			history.replaceState(null, '', url.toString());

			// Scroll to the step heading after a brief delay to allow DOM to update
			if (step > 0) {
				setTimeout(() => {
					const element = document.getElementById(step.toString());
					if (element) {
						element.scrollIntoView({ behavior: 'smooth', block: 'start' });
					}
				}, 100);
			}
		}
	};

	// Initialize step from URL on mount (browser only)
	onMount(() => {
		let initialStep = 0;

		if (form?.gotoStep !== undefined) {
			initialStep = form.gotoStep;
		} else {
			const stepParam = $page.url.searchParams.get('step');
			if (stepParam !== null) {
				const parsed = parseInt(stepParam, 10);
				if (!isNaN(parsed)) {
					initialStep = parsed;
				}
			}
		}

		setStep(initialStep);
	});

	// Watch for form changes (e.g., after form submission) and update step
	$effect(() => {
		if (form?.gotoStep !== undefined) {
			setStep(form.gotoStep);
		}
	});

	const downloadICS = () => {
		if (form?.icsContent) {
			const blob = new Blob([form.icsContent], { type: 'text/calendar' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'ubc_schedule.ics';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			// Move to step 4 after download
			setTimeout(() => setStep(4), 300);
		}
	};
</script>

<section class="container mx-auto prose max-w-4xl px-2 py-3">
	<h1>Welcome to UBC Workday2Cal!</h1>
	<p>
		This tool allows you to easily take your courses from UBC's workday and add them to Google
		Calendar, Apple Calendar, or any other calendar software.
	</p>

	{#if currentStep >= 1}
		<div in:fly={{ y: 20, duration: 500 }} out:fly={{ y: -20, duration: 300 }}>
			<h2 id="1">Step 1</h2>
			<p>First, you must export your classes from Workday in a form that this tool can process:</p>
			<ol>
				<li>
					Navigate to UBC's Workday at <a href="https://myworkday.ubc.ca">myworkday.ubc.ca</a>
				</li>
				<li>Open the Academics tool</li>
				<li>Navigate to Registration & Courses > View My Courses</li>
				<li>
					Export your enrolled courses as an excel file (see image below)
					<img
						src={workdayExport}
						alt="Screenshot of Workday's View My Courses page"
						class="mt-1"
					/>
				</li>
			</ol>
			{#if currentStep === 1}
				<button class="btn mt-3 btn-primary" onclick={() => setStep(2)}>Next Step</button>
			{/if}
		</div>
	{/if}
	{#if currentStep >= 2}
		<div in:fly={{ y: 20, duration: 500 }} out:fly={{ y: -20, duration: 300 }}>
			<h2 id="2">Step 2</h2>
			<p>
				Next, we now hand the file over to Workday2Cal to process, please upload your file below:
			</p>

			{#if form?.error}
				<div class="mb-4 alert alert-error">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 shrink-0 stroke-current"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span>{form.error}</span>
				</div>
			{/if}

			<form
				action="?/processFile"
				method="post"
				enctype="multipart/form-data"
				class="flex flex-row gap-3"
				use:enhance
			>
				<input type="file" class="file-input" name="file" required accept=".xlsx" />
				<button class="btn btn-success">Submit</button>
			</form>
		</div>
	{/if}
	{#if currentStep >= 3}
		<div in:fly={{ y: 20, duration: 500 }} out:fly={{ y: -20, duration: 300 }}>
			<h2 id="3">Step 3</h2>
			{#if form?.success}
				<div class="mb-4 alert alert-success">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="h-6 w-6 shrink-0 stroke-current"
						fill="none"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<span
						>Successfully created {form.eventsCreated} events from {form.rowsProcessed} rows!</span
					>
				</div>

				<p>Your calendar file is ready! Click the button below to download it:</p>
				<button class="btn btn-primary" onclick={downloadICS}>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="mr-2 h-5 w-5"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
						/>
					</svg>
					Download Calendar (ubc_schedule.ics)
				</button>
			{/if}
		</div>
	{/if}
	{#if currentStep >= 4}
		<div in:fly={{ y: 20, duration: 500 }} out:fly={{ y: -20, duration: 300 }}>
			<h2 id="4">Step 4</h2>
			<p>Now that you've downloaded your calendar file, import it into your calendar app:</p>
			<ul>
				<li>
					<strong>Google Calendar:</strong> Go to Settings → Import & Export → Import → Select the downloaded
					file
				</li>
				<li>
					<strong>Apple Calendar:</strong> Double-click the downloaded file or go to File → Import
				</li>
				<li>
					<strong>Outlook:</strong> Go to File → Open & Export → Import/Export → Import an iCalendar
					file
				</li>
			</ul>

			<div class="mt-6">
				<button
					class="btn btn-outline"
					onclick={() => {
						setStep(0);
					}}
				>
					Start Over
				</button>
			</div>
		</div>
	{/if}
	{#if currentStep === 0}
		<div in:fly={{ y: 20, duration: 500 }}>
			<button class="btn btn-primary" onclick={() => setStep(1)}>Get Started</button>
		</div>
	{/if}
</section>
