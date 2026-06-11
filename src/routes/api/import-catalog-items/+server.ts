import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { eq } from 'drizzle-orm';
import { catalogItems, catalogCategories } from '$lib/server/db/schema';
import { vendor } from '$lib/server/db/vendor';

// CSV columns (case-insensitive header matching):
//   name*, price*, description, category, discounted_price, tags, available
// * required
//
// On update (existing item matched by name), only columns PRESENT in the CSV header
// are changed — omitting a column leaves that field untouched (safe-merge).

type RowResult = {
	row: number;
	name: string;
	status: 'created' | 'updated' | 'skipped';
	error?: string;
};

// Proper CSV tokenizer: handles quoted fields, escaped quotes (""), and newlines
// inside quoted fields. Returns the normalized header list plus row objects keyed by header.
function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
	const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
	const records: string[][] = [];
	let field = '';
	let record: string[] = [];
	let inQuotes = false;

	for (let i = 0; i < normalized.length; i++) {
		const ch = normalized[i];
		if (inQuotes) {
			if (ch === '"') {
				if (normalized[i + 1] === '"') {
					field += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				field += ch;
			}
		} else if (ch === '"') {
			inQuotes = true;
		} else if (ch === ',') {
			record.push(field);
			field = '';
		} else if (ch === '\n') {
			record.push(field);
			records.push(record);
			record = [];
			field = '';
		} else {
			field += ch;
		}
	}
	// Flush the final field/record when the file doesn't end in a newline.
	if (field.length > 0 || record.length > 0) {
		record.push(field);
		records.push(record);
	}

	if (records.length === 0) return { headers: [], rows: [] };

	const headers = records[0].map((h) => h.trim().toLowerCase().replace(/\s+/g, '_'));
	const rows: Record<string, string>[] = [];
	for (let r = 1; r < records.length; r++) {
		const values = records[r];
		// Skip blank lines.
		if (values.length === 1 && values[0].trim() === '') continue;
		const row: Record<string, string> = {};
		headers.forEach((h, idx) => {
			row[h] = (values[idx] ?? '').trim();
		});
		rows.push(row);
	}
	return { headers, rows };
}

// Normalize a money string to integer cents, or null if not a clean amount.
// Strips currency symbols, spaces, and thousands separators; requires up to 2 decimals.
function parsePriceToCents(raw: string): number | null {
	const cleaned = raw.replace(/[$\s]/g, '').replace(/,/g, '');
	if (cleaned === '' || !/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
	return Math.round(parseFloat(cleaned) * 100);
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
	const { headers, rows } = parseCSV(text);

	if (!headers.includes('name') || !headers.includes('price')) {
		throw error(400, 'CSV must include "name" and "price" columns');
	}
	if (rows.length === 0) throw error(400, 'CSV is empty or has no data rows');
	if (rows.length > 500) throw error(400, 'Too many rows (max 500 per import)');

	const headerSet = new Set(headers);

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
		const price = priceStr ? parsePriceToCents(priceStr) : null;
		if (price === null) {
			results.push({ row: rowNum, name, status: 'skipped', error: 'Missing or invalid price' });
			skipped++;
			continue;
		}

		const description = row['description']?.trim() || null;
		const discountedPriceStr = row['discounted_price']?.trim();
		const discountedPrice = discountedPriceStr ? parsePriceToCents(discountedPriceStr) : null;
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
				// Safe-merge: only overwrite columns actually present in the CSV header.
				const updates: Partial<{
					description: string | null;
					price: number;
					discountedPrice: number | null;
					categoryId: number | null;
					tags: string[];
					status: 'available' | 'hidden';
					updatedAt: Date;
				}> = { price, updatedAt: new Date() };
				if (headerSet.has('description')) updates.description = description;
				if (headerSet.has('discounted_price')) updates.discountedPrice = discountedPrice;
				if (headerSet.has('category')) updates.categoryId = categoryId;
				if (headerSet.has('tags')) updates.tags = tags;
				if (headerSet.has('available')) updates.status = status;

				await db.update(catalogItems).set(updates).where(eq(catalogItems.id, existingId));
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
