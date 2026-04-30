# drizzle/ — Migration History

## Historical migrations (0000–0005)

The SQL files below were applied to the database in order. They are kept here as a historical record and should not be re-run or deleted.

| File | Applied | Notes |
|------|---------|-------|
| `0000_striped_martin_li.sql` | yes | Initial schema |
| `0001_catalog_status_and_tagline.sql` | yes | Added item_status enum, catalog_items.status, vendors.tagline |
| `0002_repair_schema.sql` | yes | Idempotent repair of 0001 |
| `0003_vendor_type_enum.sql` | yes | Replaced vendor_type enum with maker/baker/grower values |
| `0004_add_scheduled_status.sql` | yes | Added 'scheduled' to order_status enum |
| `0005_pickup_windows.sql` | yes | Pickup Windows feature schema |

## Snapshot rebuild — April 2026

The `drizzle/meta/` snapshots were rebaselined in April 2026.

**Why:** Migrations 0001–0005 were hand-written SQL applied directly to the database without running `drizzle-kit generate`. No snapshot files were created for those migrations. As a result, `drizzle-kit generate` was broken — it diffed the schema source against the stale 0000 snapshot (which predated all five migrations) and prompted interactively about every changed table and column.

**What was done:**
- Applied migration 0003 directly to the dev DB (it had been tracked in `__drizzle_migrations` but never actually executed — the vendor_type enum still had the old restaurant values).
- Ran `drizzle-kit introspect` against the live DB to capture a snapshot of the true current state.
- Replaced `drizzle/meta/` with a single `0000_snapshot.json` and `_journal.json` representing the post-rebuild baseline. The old meta/ is preserved in `drizzle/meta-backup-pre-rebuild/`.

**Going forward:** New migrations start from this baseline. Run `bun run db:generate` normally — it will produce a clean diff with no interactive prompts.
