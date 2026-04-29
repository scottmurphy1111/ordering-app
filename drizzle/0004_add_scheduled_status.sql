-- Add 'scheduled' to order_status enum.
-- Isolated in its own file because ALTER TYPE ADD VALUE cannot run inside
-- a transaction block on PgBouncer-fronted Postgres (including Neon).
-- The value is dormant until Phase 7 ships badge-exclusion + auto-transition logic.
ALTER TYPE "public"."order_status" ADD VALUE 'scheduled';
