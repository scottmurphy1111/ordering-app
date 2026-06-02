-- Rename the availability_mode enum value in place (no data loss; existing rows
-- update automatically). drizzle-kit emitted a drop/recreate for this rename,
-- which would fail on existing 'special_order' rows — replaced with RENAME VALUE.
ALTER TYPE "public"."availability_mode" RENAME VALUE 'special_order' TO 'unlisted';
