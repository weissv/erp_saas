import { parse } from "csv-parse/sync";

/**
 * Converts CSV text (with headers) into an array of objects using csv-parse.
 * Keeps formatting minimal so callers can map headers the way they need.
 */
export function csvTextToRecords<T extends Record<string, unknown>>(csvText: string): T[] {
	if (!csvText.trim()) {
		return [];
	}

	return parse(csvText, {
		columns: true,
		skip_empty_lines: true,
		trim: true,
	}) as T[];
}
