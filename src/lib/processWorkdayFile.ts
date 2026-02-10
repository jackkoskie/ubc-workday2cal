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

const HEADER_ALIASES = {
	course: ['Course Listing', 'Course'],
	format: ['Instructional Format', 'Format'],
	meetingPatterns: ['Meeting Patterns', 'Meeting Pattern', 'Schedule']
};

const normalizeHeader = (value: unknown) =>
	String(value ?? '')
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

const normalizeTimeString = (value: string) =>
	value.trim().replace(/\./g, '').replace(/\s+/g, ' ').toUpperCase();

const findHeaderRow = (rows: unknown[][]) => {
	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		if (!row || row.length === 0) continue;
		const normalizedRow = row.map((cell) => normalizeHeader(cell));
		const headerMap: Record<string, number | undefined> = {};

		Object.entries(HEADER_ALIASES).forEach(([key, aliases]) => {
			for (let col = 0; col < normalizedRow.length; col++) {
				if (aliases.map(normalizeHeader).includes(normalizedRow[col])) {
					headerMap[key] = col;
					break;
				}
			}
		});

		if (headerMap.course !== undefined && headerMap.meetingPatterns !== undefined) {
			return { headerRowIndex: i, headerMap };
		}
	}

	return null;
};

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

		const sheetsToCheck = workbook.SheetNames.map((name) => ({
			name,
			sheet: workbook.Sheets[name]
		}));

		let selectedRows: unknown[][] | null = null;
		let headerInfo: {
			headerRowIndex: number;
			headerMap: Record<string, number | undefined>;
		} | null = null;

		for (const { sheet } of sheetsToCheck) {
			if (!sheet) continue;

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

			const rows = xlsx.utils.sheet_to_json<string[]>(sheet, {
				header: 1
			}) as unknown[][];

			const candidateHeader = findHeaderRow(rows);
			if (candidateHeader) {
				selectedRows = rows;
				headerInfo = candidateHeader;
				break;
			}
		}

		if (!selectedRows || !headerInfo) {
			return {
				success: false,
				error: `Sheet not found or missing expected headers: ${SHEET_NAME}`
			};
		}

		const rows = selectedRows;

		// Create calendar with timezone to properly handle DST
		const resultCal = ical({
			name: 'UBC Schedule',
			timezone: TIMEZONE
		});

		// Enhanced regex to handle various pattern formats including alternate weeks and location
		// Captures: dates, days, times, and optionally building and room info
		const mpRegex =
			/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})\s*\|\s*([^|]+?)\s*\|\s*([0-9: ]+(?:[ap]\.??m\.?)?)\s*-\s*([0-9: ]+(?:[ap]\.??m\.?)?)(?:\s*\|\s*[^|]*\|\s*([^|]+?)\s*\|\s*Floor:\s*[^|]+\s*\|\s*Room:\s*([A-Za-z0-9-]+))?/gi;

		let eventsCreated = 0;
		let rowsProcessed = 0;

		const { headerRowIndex, headerMap } = headerInfo;
		const courseCol = headerMap.course ?? -1;
		const formatCol = headerMap.format ?? -1;
		const meetingCol = headerMap.meetingPatterns ?? -1;

		// Start after detected header row to skip title/header rows
		for (let i = headerRowIndex + 1; i < rows.length; i++) {
			const row = rows[i];
			// Skip short rows
			if (!row || row.length <= Math.max(courseCol, meetingCol)) continue;

			rowsProcessed++;
			const courseName = courseCol >= 0 ? row[courseCol] : undefined;
			const formatType = formatCol >= 0 ? row[formatCol] : undefined;
			const pattern = meetingCol >= 0 ? row[meetingCol] : undefined;

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
					const normalizedStartTime = normalizeTimeString(String(startTimeStr));
					const normalizedEndTime = normalizeTimeString(String(endTimeStr));
					const hasAmPm = /\b(AM|PM)\b/.test(normalizedStartTime + ' ' + normalizedEndTime);

					let startDT = DateTime.fromFormat(
						`${cursor.toISODate()} ${normalizedStartTime}`,
						hasAmPm ? 'yyyy-MM-dd h:mm a' : 'yyyy-MM-dd H:mm',
						{ zone: TIMEZONE }
					);
					let endDT = DateTime.fromFormat(
						`${cursor.toISODate()} ${normalizedEndTime}`,
						hasAmPm ? 'yyyy-MM-dd h:mm a' : 'yyyy-MM-dd H:mm',
						{ zone: TIMEZONE }
					);

					// If that fails, try the opposite time format as a fallback
					if (!startDT.isValid || !endDT.isValid) {
						startDT = DateTime.fromFormat(
							`${cursor.toISODate()} ${normalizedStartTime}`,
							hasAmPm ? 'yyyy-MM-dd H:mm' : 'yyyy-MM-dd h:mm a',
							{ zone: TIMEZONE }
						);
						endDT = DateTime.fromFormat(
							`${cursor.toISODate()} ${normalizedEndTime}`,
							hasAmPm ? 'yyyy-MM-dd H:mm' : 'yyyy-MM-dd h:mm a',
							{ zone: TIMEZONE }
						);
					}

					if (startDT.isValid && endDT.isValid) {
						// Subtract 10 minutes from end time to align with UBC practice where
						// instructors typically end classes 10 minutes early
						const adjustedEndDT = endDT.minus({ minutes: 10 });

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

						// Create recurring event with Luxon DateTime objects to preserve timezone info
						resultCal.createEvent({
							start: startDT,
							end: adjustedEndDT,
							summary: `${courseName}${formatType ? ` (${formatType})` : ''}`,
							description: `${courseName} (${formatType ?? ''})${
								isAlternateWeeks ? ' - Alternate Weeks' : ''
							}`,
							location: locationStr,
							repeating: {
								freq: ICalEventRepeatingFreq.WEEKLY,
								interval: isAlternateWeeks ? 2 : 1,
								byDay: [dayMap[weekday]],
								until: mpEnd.endOf('day')
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
