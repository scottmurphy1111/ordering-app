import { pgTable, serial, text, varchar, integer, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { vendor } from './vendor';

/**
 * Platform-level operational events: cron runs, webhook deliveries, and other
 * system-level signals worth retaining for forensics. Distinct from
 * order/business events.
 *
 * Schema:
 * - eventType: '<source>.<event>' string (e.g. 'cron.resume_due',
 *   'webhook.subscription_updated', 'webhook.error'). Filterable by source via
 *   LIKE 'cron.%' / LIKE 'webhook.%'.
 * - status: 'ok' | 'error'. Free-form text, not enum-bound, to allow future
 *   statuses ('skipped', 'partial', etc.) without a migration. Set explicitly
 *   on every write.
 * - vendorId: nullable FK. Set when the event is vendor-scoped (most webhook
 *   rows). Null for cron rows whose work spans multiple vendors.
 * - metadata: arbitrary JSON context. Cron rows store { processed, errors[] }.
 *   Webhook rows store { stripeEventId, eventType, error? }.
 */
export const systemEvents = pgTable(
	'system_events',
	{
		id: serial('id').primaryKey(),
		eventType: text('event_type').notNull(),
		status: varchar('status', { length: 20 }).notNull().default('ok'),
		vendorId: integer('vendor_id').references(() => vendor.id, { onDelete: 'set null' }),
		metadata: jsonb('metadata').$type<Record<string, unknown>>(),
		createdAt: timestamp('created_at').defaultNow().notNull()
	},
	(t) => [index('system_events_created_at_idx').on(t.createdAt)]
);
