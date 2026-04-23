-- Rename branding color columns: primary→background, accent→foreground, secondary→accent
-- Order matters: rename accent_color first to free the name, then secondary→accent

ALTER TABLE "tenants" RENAME COLUMN "accent_color" TO "foreground_color";
--> statement-breakpoint
ALTER TABLE "tenants" RENAME COLUMN "secondary_color" TO "accent_color";
--> statement-breakpoint
ALTER TABLE "tenants" RENAME COLUMN "primary_color" TO "background_color";
