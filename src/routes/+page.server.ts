import type { PageServerLoad, Actions } from './$types';
import * as xlsx from 'xlsx';
import ical from 'ical-generator';
import { DateTime } from 'luxon';

export const load = (async () => {
	return {};
}) satisfies PageServerLoad;

// Map weekday abbreviations to Luxon weekday numbers (Mon=1 .. Sun=7)
const weekdayMap: Record<string, number> = {
	Mon: 1,
	Tue: 2,
	Wed: 3,
	Thu: 4,
	Fri: 5,
	Sat: 6,
	Sun: 7
};

const TIMEZONE = 'America/Vancouver';
const SHEET_NAME = 'View My Courses';

export const actions = {
	processFile: async ({ request }) => {
		const formData = await request.formData();
		const file = formData.get('file') as File;

		if (!file) {
			return {
				error: 'No file provided',
				gotoStep: 2
			};
		}

		try {
			// Convert File to ArrayBuffer
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			// Read workbook
			const workbook = xlsx.read(buffer, { type: 'buffer' });
			const sheet = workbook.Sheets[SHEET_NAME];

			if (!sheet) {
				return {
					error: `Sheet not found: ${SHEET_NAME}`,
					gotoStep: 2
				};
			}

			// Fix Excel !ref issue: Some Workday exports have incorrect !ref property
			const cellAddresses = Object.keys(sheet).filter((key) => !key.startsWith('!'));
			if (cellAddresses.length > 0) {
				let maxRow = 0;
				let maxCol = 0;
				cellAddresses.forEach((addr) => {
					const decoded = xlsx.utils.decode_cell(addr);
					if (decoded.r > maxRow) maxRow = decoded.r;
					if (decoded.c > maxCol) maxCol = decoded.c;
				});
				sheet['!ref'] = xlsx.utils.encode_range({
					s: { r: 0, c: 0 },
					e: { r: maxRow, c: maxCol }
				});
			}

			// Read sheet as array of rows
			const rows = xlsx.utils.sheet_to_json<string[]>(sheet, {
				header: 1
			}) as unknown[][];

			// Create calendar
			const resultCal = ical({ name: 'UBC Schedule' });

			// Enhanced regex to handle various pattern formats including alternate weeks
			const mpRegex =
				/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})\s*\|\s*([\w\s()]+?)\s*\|\s*([\d:]+)\s*-\s*([\d:]+)/gi;

			let eventsCreated = 0;
			let rowsProcessed = 0;

			// Start from row 3 (index 3) to skip header rows
			for (let i = 3; i < rows.length; i++) {
				const row = rows[i];
				// Skip short rows
				if (!row || row.length < 14) continue;

				rowsProcessed++;
				const courseName = row[1]; // Column B: "Course Listing"
				const formatType = row[9]; // Column J: "Instructional Format"
				const pattern = row[11]; // Column L: "Meeting Patterns"

				if (!courseName || !pattern) {
					continue;
				}

				// Pattern can have multiple meeting time blocks
				mpRegex.lastIndex = 0;
				let match;

				while ((match = mpRegex.exec(String(pattern))) !== null) {
					const [, mpStartStr, mpEndStr, daysStr, startTimeStr, endTimeStr] = match;

					const mpStart = DateTime.fromISO(mpStartStr, { zone: TIMEZONE });
					const mpEnd = DateTime.fromISO(mpEndStr, { zone: TIMEZONE });
					if (!mpStart.isValid || !mpEnd.isValid) {
						continue;
					}

					// Extract weekday names from the daysStr
					const dayMatches = daysStr.match(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/gi);
					if (!dayMatches) {
						continue;
					}

					const days = dayMatches.map((d) => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase());

					// Detect if this is an alternate weeks pattern
					const isAlternateWeeks = /\(Alternate\s+weeks?\)/i.test(daysStr);

					// For each weekday in the pattern, iterate from mpStart to mpEnd and create events
					for (const day of days) {
						const weekday = weekdayMap[day];
						if (!weekday) continue;

						let cursor = mpStart.startOf('day');
						const endCursor = mpEnd.startOf('day');

						// Find the first occurrence of this weekday
						while (cursor <= endCursor && cursor.weekday !== weekday) {
							cursor = cursor.plus({ days: 1 });
						}

						// Now iterate through all matching weekdays
						while (cursor <= endCursor) {
							if (cursor.weekday === weekday) {
								// Parse time - try 24-hour format first
								let startDT = DateTime.fromFormat(
									`${cursor.toISODate()} ${startTimeStr}`,
									'yyyy-MM-dd H:mm',
									{ zone: TIMEZONE }
								);
								let endDT = DateTime.fromFormat(
									`${cursor.toISODate()} ${endTimeStr}`,
									'yyyy-MM-dd H:mm',
									{ zone: TIMEZONE }
								);

								// If that fails, try 12-hour format with AM/PM
								if (!startDT.isValid || !endDT.isValid) {
									startDT = DateTime.fromFormat(
										`${cursor.toISODate()} ${startTimeStr}`,
										'yyyy-MM-dd h:mm a',
										{ zone: TIMEZONE }
									);
									endDT = DateTime.fromFormat(
										`${cursor.toISODate()} ${endTimeStr}`,
										'yyyy-MM-dd h:mm a',
										{ zone: TIMEZONE }
									);
								}

								if (startDT.isValid && endDT.isValid) {
									resultCal.createEvent({
										start: startDT.toJSDate(),
										end: endDT.toJSDate(),
										summary: String(courseName),
										description: `${courseName} (${formatType ?? ''})${
											isAlternateWeeks ? ' - Alternate Weeks' : ''
										}`,
										location: 'UBC Okanagan'
									});
									eventsCreated++;
								}

								// For alternate weeks, skip a week
								cursor = cursor.plus({ days: isAlternateWeeks ? 14 : 7 });
							} else {
								cursor = cursor.plus({ days: 1 });
							}
						}
					}
				}
			}

			// Generate .ics file content
			const icsContent = resultCal.toString();

			return {
				gotoStep: 3,
				icsContent,
				eventsCreated,
				rowsProcessed,
				success: true
			};
		} catch (error) {
			console.error('Error processing file:', error);
			return {
				error: `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
				gotoStep: 2
			};
		}
	}
} satisfies Actions;
