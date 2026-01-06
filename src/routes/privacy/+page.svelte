<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<article class="mx-auto prose max-w-4xl p-8 prose-slate">
	<h1>Privacy Policy</h1>

	<p class="text-gray-600 italic">Last updated: January 6, 2026</p>

	<h2>Overview</h2>
	<p>
		This application is designed with your privacy in mind. All file processing happens entirely in
		your browser — no calendar data is ever transmitted to any server.
	</p>

	<h2>Data Collection</h2>
	<p>
		We do not collect or retain any personal information from your uploaded files. All file
		processing occurs locally in your browser and your calendar data never leaves your device.
	</p>

	<h2>Analytics</h2>
	<p>
		We use <a href="https://www.cloudflare.com/web-analytics/">Cloudflare Web Analytics</a> to understand
		how visitors use our site. Cloudflare Web Analytics is a privacy-first analytics tool that:
	</p>
	<ul>
		<li>Does not use cookies or local storage</li>
		<li>Does not collect personal data or personally identifiable information (PII)</li>
		<li>Does not "fingerprint" users</li>
		<li>Collects only aggregated metrics such as page views and referrers</li>
	</ul>
	<p>
		For more information, see
		<a href="https://www.cloudflare.com/privacypolicy/">Cloudflare's Privacy Policy</a>.
	</p>

	<h2>Data Storage</h2>
	<p>
		No calendar data is stored on our servers because no calendar data ever reaches our servers. All
		file processing happens entirely within your browser, keeping your information completely on
		your device.
	</p>

	<h2>Data Sharing</h2>
	<p>
		Your uploaded files and calendar data are never transmitted anywhere—processing happens locally
		in your browser. We do not share any personal information with third parties. Aggregated,
		anonymized analytics data is processed by Cloudflare as described above.
	</p>

	<h2>Cookies and Tracking</h2>
	<p>
		This application does not use cookies. The only analytics in use is Cloudflare Web Analytics,
		which does not track individual users or use cookies.
	</p>

	<h2>Changes to This Policy</h2>
	<p>
		If we make any changes to this privacy policy, we will update the date at the top of this page.
		However, our commitment to not collecting or storing your data will remain unchanged.
	</p>

	<h2>Contact</h2>
	<p>
		If you have any questions about this privacy policy, please feel free to contact us through our
		<a href="https://github.com/jackkoskie/ubc-workday2cal" class="">GitHub repository</a>.
	</p>
</article>
