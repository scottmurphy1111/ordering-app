import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { menuItems, menuCategories } from '$lib/server/db/schema';

// CSV columns (case-insensitive header matching):
//   name*, price*, description, category, discounted_price, tags, available
// * required

type RowResult = {
	row: number;
	name: string;
	status: 'created' | 'updated' | 'skipped';
	error?: string;
};

function parseCSV(text: string): Record<string, string>[] {
	const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
	if (lines.length < 2) return [];

	// Parse a single CSV line respecting quoted fields
	function parseLine(line: string): string[] {
		const fields: string[] = [];
		let current = '';
		let inQuotes = false;
		for (let i = 0; i < line.length; i++) {
			const ch = line[i];
			if (ch === '"') {
				if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
				else inQuotes = !inQuotes;
			} else if (ch === ',' && !inQuotes) {
				fields.push(current.trim());
				current = '';
			} else {
				current += ch;
			}
		}
		fields.push(current.trim());
		return fields;
	}

	const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
	const rows: Record<string, string>[] = [];

	for (let i = 1; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;
		const values = parseLine(line);
		const row: Record<string, string> = {};
		headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
		rows.push(row);
	}
	return rows;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const tenantId = locals.tenantId;
	if (!tenantId) throw error(400, 'No tenant selected');

	const formData = await request.formData();
	const file = formData.get('file');

	if (!(file instanceof File)) throw error(400, 'No file uploaded');
	if (!file.name.endsWith('.csv')) throw error(400, 'File must be a .csv');
	if (file.size > 1_000_000) throw error(400, 'File too large (max 1 MB)');

	const text = await file.text();
	const rows = parseCSV(text);

	if (rows.length === 0) throw error(400, 'CSV is empty or has no data rows');
	if (rows.length > 500) throw error(400, 'Too many rows (max 500 per import)');

	// Pre-load categories for this tenant so we can resolve names → IDs
	const existingCategories = await db.query.menuCategories.findMany({
		where: eq(menuCategories.tenantId, tenantId),
		columns: { id: true, name: true }
	});
	const categoryByName = new Map(
		existingCategories.map((c) => [c.name.toLowerCase(), c.id])
	);

	// Pre-load existing items by name for upsert
	const existingItems = await db.query.menuItems.findMany({
		where: eq(menuItems.tenantId, tenantId),
		columns: { id: true, name: true }
	});
	const itemByName = new Map(
		existingItems.map((i) => [i.name.toLowerCase(), i.id])
	);

	const results: RowResult[] = [];
	let created = 0;
	let updated = 0;
	let skipped = 0;

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const rowNum = i + 2; // 1-indexed, +1 for header

		const name = row['name']?.trim();
		const priceStr = row['price']?.trim();

		if (!name) {
			results.push({ row: rowNum, name: '(empty)', status: 'skipped', error: 'Missing name' });
			skipped++;
			continue;
		}
		if (!priceStr || isNaN(parseFloat(priceStr))) {
			results.push({ row: rowNum, name, status: 'skipped', error: 'Missing or invalid price' });
			skipped++;
			continue;
		}

		const price = Math.round(parseFloat(priceStr) * 100);
		if (price < 0) {
			results.push({ row: rowNum, name, status: 'skipped', error: 'Price cannot be negative' });
			skipped++;
			continue;
		}

		const description = row['description']?.trim() || null;
		const discountedPriceStr = row['discounted_price']?.trim();
		const discountedPrice = discountedPriceStr && !isNaN(parseFloat(discountedPriceStr))
			? Math.round(parseFloat(discountedPriceStr) * 100)
			: null;
		const tagsRaw = row['tags']?.trim();
		const tags = tagsRaw ? tagsRaw.split('|').map((t) => t.trim()).filter(Boolean) : [];
		const availableStr = row['available']?.trim().toLowerCase();
		const available = availableStr === '' || availableStr === undefined
			? true
			: availableStr !== 'false' && availableStr !== '0' && availableStr !== 'no';

		// Resolve category — create it if it doesn't exist yet
		let categoryId: number | null = null;
		const categoryName = row['category']?.trim();
		if (categoryName) {
			const key = categoryName.toLowerCase();
			if (categoryByName.has(key)) {
				categoryId = categoryByName.get(key)!;
			} else {
				// Create the category on the fly
				const [newCat] = await db
					.insert(menuCategories)
					.values({ tenantId, name: categoryName })
					.returning({ id: menuCategories.id });
				categoryId = newCat.id;
				categoryByName.set(key, categoryId);
			}
		}

		const existingId = itemByName.get(name.toLowerCase());

		try {
			if (existingId) {
				await db
					.update(menuItems)
					.set({ description, price, discountedPrice, categoryId, tags, available, updatedAt: new Date() })
					.where(eq(menuItems.id, existingId));
				results.push({ row: rowNum, name, status: 'updated' });
				updated++;
			} else {
				const [newItem] = await db
					.insert(menuItems)
					.values({ tenantId, name, description, price, discountedPrice, categoryId, tags, available })
					.returning({ id: menuItems.id });
				itemByName.set(name.toLowerCase(), newItem.id);
				results.push({ row: rowNum, name, status: 'created' });
				created++;
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			results.push({ row: rowNum, name, status: 'skipped', error: `Database error: ${errorMessage}` });
			skipped++;
		}
	}

	return json({ created, updated, skipped, results });
};
