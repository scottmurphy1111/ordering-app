import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { catalogItems, catalogCategories } from '$lib/server/db/schema';
import { vendor } from '$lib/server/db/vendor';

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

	function parseLine(line: string): string[] {
		const fields: string[] = [];
		let current = '';
		let inQuotes = false;
		for (let i = 0; i < line.length; i++) {
			const ch = line[i];
			if (ch === '"') {
				if (inQuotes && line[i + 1] === '"') {
					current += '"';
					i++;
				} else inQuotes = !inQuotes;
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
		headers.forEach((h, idx) => {
			row[h] = values[idx] ?? '';
		});
		rows.push(row);
	}
	return rows;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');
	const vendorId = locals.vendorId;
	if (!vendorId) throw error(400, 'No vendor selected');

	if (!locals.user.isInternal) {
		const vendorRecord = await db.query.vendor.findFirst({
			where: eq(vendor.id, vendorId),
			columns: { subscriptionTier: true }
		});
		const IMPORT_TIERS = new Set(['market', 'pro']);
		if (!IMPORT_TIERS.has(vendorRecord?.subscriptionTier ?? ''))
			throw error(403, 'Market or Pro plan required');
	}

	const formData = await request.formData();
	const file = formData.get('file');

	if (!(file instanceof File)) throw error(400, 'No file uploaded');
	if (!file.name.endsWith('.csv')) throw error(400, 'File must be a .csv');
	if (file.size > 1_000_000) throw error(400, 'File too large (max 1 MB)');

	const text = await file.text();
	const rows = parseCSV(text);

	if (rows.length === 0) throw error(400, 'CSV is empty or has no data rows');
	if (rows.length > 500) throw error(400, 'Too many rows (max 500 per import)');

	const existingCategories = await db.query.catalogCategories.findMany({
		where: eq(catalogCategories.vendorId, vendorId),
		columns: { id: true, name: true }
	});
	const categoryByName = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c.id]));

	const existingItems = await db.query.catalogItems.findMany({
		where: eq(catalogItems.vendorId, vendorId),
		columns: { id: true, name: true }
	});
	const itemByName = new Map(existingItems.map((i) => [i.name.toLowerCase(), i.id]));

	const results: RowResult[] = [];
	let created = 0;
	let updated = 0;
	let skipped = 0;

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const rowNum = i + 2;

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
		const discountedPrice =
			discountedPriceStr && !isNaN(parseFloat(discountedPriceStr))
				? Math.round(parseFloat(discountedPriceStr) * 100)
				: null;
		const tagsRaw = row['tags']?.trim();
		const tags = tagsRaw
			? tagsRaw
					.split(',')
					.map((t) => t.trim())
					.filter(Boolean)
			: [];
		const availableStr = row['available']?.trim().toLowerCase();
		const status: 'available' | 'hidden' =
			availableStr === 'false' || availableStr === '0' || availableStr === 'no'
				? 'hidden'
				: 'available';

		let categoryId: number | null = null;
		const categoryName = row['category']?.trim();
		if (categoryName) {
			const key = categoryName.toLowerCase();
			if (categoryByName.has(key)) {
				categoryId = categoryByName.get(key)!;
			} else {
				const [newCat] = await db
					.insert(catalogCategories)
					.values({ vendorId, name: categoryName })
					.returning({ id: catalogCategories.id });
				categoryId = newCat.id;
				categoryByName.set(key, categoryId);
			}
		}

		const existingId = itemByName.get(name.toLowerCase());

		try {
			if (existingId) {
				await db
					.update(catalogItems)
					.set({
						description,
						price,
						discountedPrice,
						categoryId,
						tags,
						status,
						updatedAt: new Date()
					})
					.where(eq(catalogItems.id, existingId));
				results.push({ row: rowNum, name, status: 'updated' });
				updated++;
			} else {
				const [newItem] = await db
					.insert(catalogItems)
					.values({
						vendorId,
						name,
						description,
						price,
						discountedPrice,
						categoryId,
						tags,
						status
					})
					.returning({ id: catalogItems.id });
				itemByName.set(name.toLowerCase(), newItem.id);
				results.push({ row: rowNum, name, status: 'created' });
				created++;
			}
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : String(err);
			results.push({
				row: rowNum,
				name,
				status: 'skipped',
				error: `Database error: ${errorMessage}`
			});
			skipped++;
		}
	}

	return json({ created, updated, skipped, results });
};
