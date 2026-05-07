import { pgTable, serial, text, integer, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { vendor } from './vendor';

export const systemEvents = pgTable('system_events', {
	id: serial('id').primaryKey(),
	eventType: text('event_type').notNull(),
	vendorId: integer('vendor_id').references(() => vendor.id, { onDelete: 'set null' }),
	metadata: jsonb('metadata').$type<Record<string, unknown>>(),
	createdAt: timestamp('created_at').defaultNow().notNull()
});
