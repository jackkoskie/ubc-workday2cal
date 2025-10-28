import * as xlsx from 'xlsx';
import ical, { ICalEventRepeatingFreq, ICalWeekday } from 'ical-generator';
import { DateTime } from 'luxon';

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

export interface ProcessResult {
	success: boolean;
	icsContent?: string;
	eventsCreated?: number;
	rowsProcessed?: number;
	error?: string;
}

export async function processWorkdayFile(file: File): Promise<ProcessResult> {
	try {
		// Convert File to ArrayBuffer
		const arrayBuffer = await file.arrayBuffer();

		// Read workbook - xlsx can read ArrayBuffer directly
		const workbook = xlsx.read(arrayBuffer, { type: 'array' });
		const sheet = workbook.Sheets[SHEET_NAME];

		if (!sheet) {
			return {
				success: false,
				error: `Sheet not found: ${SHEET_NAME}`
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

		// Enhanced regex to handle various pattern formats including alternate weeks and location
		// Captures: dates, days, times, and optionally building and room info
		const mpRegex =
			/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})\s*\|\s*([\w\s()]+?)\s*\|\s*([\d:]+)\s*-\s*([\d:]+)(?:\s*\|\s*[^|]*\|\s*([^|]+?)\s*\|\s*Floor:\s*\d+\s*\|\s*Room:\s*(\d+))?/gi;

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
				const [, mpStartStr, mpEndStr, daysStr, startTimeStr, endTimeStr, building, room] = match;

				const mpStart = DateTime.fromISO(mpStartStr, { zone: TIMEZONE });
				const mpEnd = DateTime.fromISO(mpEndStr, { zone: TIMEZONE });
				if (!mpStart.isValid || !mpEnd.isValid) {
					continue;
				}

				// Build location string from building and room if available
				let locationStr = 'UBC Okanagan';
				if (building && room) {
					// Clean up building name - remove parenthetical abbreviations like "(ART)"
					const cleanBuilding = building.replace(/\s*\([^)]*\)\s*$/, '').trim();
					locationStr = `${cleanBuilding} Room ${room}`;
				}

				// Extract weekday names from the daysStr
				const dayMatches = daysStr.match(/\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b/gi);
				if (!dayMatches) {
					continue;
				}

				const days = dayMatches.map((d) => d.charAt(0).toUpperCase() + d.slice(1).toLowerCase());

				// Detect if this is an alternate weeks pattern
				const isAlternateWeeks = /\(Alternate\s+weeks?\)/i.test(daysStr);

				// Create one recurring event for each unique day of the week
				for (const day of days) {
					const weekday = weekdayMap[day];
					if (!weekday) continue;

					// Find the first occurrence of this weekday in the pattern
					let cursor = mpStart.startOf('day');
					while (cursor <= mpEnd && cursor.weekday !== weekday) {
						cursor = cursor.plus({ days: 1 });
					}

					if (cursor > mpEnd) continue; // No occurrence found

					// Parse time for the first occurrence - try 24-hour format first
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
						// Map luxon weekday (1=Mon) to iCal weekday
						const dayMap: Record<number, ICalWeekday> = {
							1: ICalWeekday.MO,
							2: ICalWeekday.TU,
							3: ICalWeekday.WE,
							4: ICalWeekday.TH,
							5: ICalWeekday.FR,
							6: ICalWeekday.SA,
							7: ICalWeekday.SU
						};

						// Create recurring event
						resultCal.createEvent({
							start: startDT.toJSDate(),
							end: endDT.toJSDate(),
							summary: String(courseName),
							description: `${courseName} (${formatType ?? ''})${
								isAlternateWeeks ? ' - Alternate Weeks' : ''
							}`,
							location: locationStr,
							repeating: {
								freq: ICalEventRepeatingFreq.WEEKLY,
								interval: isAlternateWeeks ? 2 : 1,
								byDay: [dayMap[weekday]],
								until: mpEnd.endOf('day').toJSDate()
							}
						});
						eventsCreated++;
					}
				}
			}
		}

		// Generate .ics file content
		const icsContent = resultCal.toString();

		return {
			success: true,
			icsContent,
			eventsCreated,
			rowsProcessed
		};
	} catch (error) {
		console.error('Error processing file:', error);
		return {
			success: false,
			error: `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`
		};
	}
}
