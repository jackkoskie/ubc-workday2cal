<script lang="ts">
	import { page } from '$app/state';
	import type { PageProps } from './$types';
	import workdayExport from '$lib/assets/workdayExport.png';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { fly } from 'svelte/transition';
	import { CircleX, CircleCheck, Download } from 'lucide-svelte';
	import { processWorkdayFile, type ProcessResult } from '$lib/processWorkdayFile';

	let currentStep = $state(0);
	let processingFile = $state(false);
	let result = $state<ProcessResult | null>(null);

	let { data }: PageProps = $props();

	const setStep = (step: number) => {
		currentStep = step;
		if (browser) {
			const url = new URL(page.url);
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

		const stepParam = page.url.searchParams.get('step');
		if (stepParam !== null) {
			const parsed = parseInt(stepParam, 10);
			if (!isNaN(parsed)) {
				initialStep = parsed;
			}
		}

		setStep(initialStep);
	});

	const handleFileSubmit = async (event: Event) => {
		event.preventDefault();
		const form = event.target as HTMLFormElement;
		const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
		const file = fileInput?.files?.[0];

		if (!file) {
			result = { success: false, error: 'No file provided' };
			return;
		}

		processingFile = true;
		result = null;

		try {
			const processResult = await processWorkdayFile(file);
			result = processResult;

			if (processResult.success) {
				setStep(3);
			}
		} catch (error) {
			result = {
				success: false,
				error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
			};
		} finally {
			processingFile = false;
		}
	};

	const downloadICS = () => {
		if (result?.icsContent) {
			const blob = new Blob([result.icsContent], { type: 'text/calendar' });
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

<section class="container mx-auto prose max-w-4xl px-2 pt-3 pb-15">
	<h1>Welcome to UBC Workday2Cal!</h1>
	<p>
		This tool allows you to easily take your courses from UBC's workday and add them to Google
		Calendar, Apple Calendar, or any other calendar software.
	</p>
	{#if currentStep === 0}
		<div in:fly={{ y: 20, duration: 500 }}>
			<button class="btn btn-primary" onclick={() => setStep(1)}>Get Started</button>
		</div>
	{/if}

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

			{#if result?.error}
				<div class="mb-4 alert alert-error">
					<CircleX class="h-6 w-6 shrink-0 stroke-current" />
					<span>{result.error}</span>
				</div>
			{/if}

			<form onsubmit={handleFileSubmit} class="flex flex-row gap-3">
				<input
					type="file"
					class="file-input"
					name="file"
					required
					accept=".xlsx"
					disabled={processingFile}
				/>
				<button class="btn btn-success" disabled={processingFile}>
					{processingFile ? 'Processing...' : 'Submit'}
				</button>
			</form>
		</div>
	{/if}
	{#if currentStep >= 3}
		<div in:fly={{ y: 20, duration: 500 }} out:fly={{ y: -20, duration: 300 }}>
			<h2 id="3">Step 3</h2>
			{#if result?.success}
				<div class="mb-4 alert alert-success">
					<CircleCheck class="h-6 w-6 shrink-0 stroke-current" />
					<span
						>Successfully created {result.eventsCreated} events from {result.rowsProcessed} rows!</span
					>
				</div>

				<p>Your calendar file is ready! Click the button below to download it:</p>
				<button class="btn btn-primary" onclick={downloadICS}>
					<Download class="mr-2 h-5 w-5" />
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
	{#if [0, 4].includes(currentStep)}
		<div in:fly={{ y: 20, duration: 500 }}>
			<p>
				This website's open sourced! Found a bug, have an idea for a great new feature? <a
					href="https://github.com/jackkoskie/ubc-workday2cal/issues/new">Submit an issue</a
				>
				on our github. Have some coding knowledge and want to contribute,
				<a href="https://github.com/jackkoskie/ubc-workday2cal/pulls">submit a pull request</a>!
			</p>
		</div>
	{/if}
</section>
