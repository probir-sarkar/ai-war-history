ALTER TABLE "battles" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "battles" ADD COLUMN "casualties" jsonb;--> statement-breakpoint
ALTER TABLE "wars" ADD COLUMN "summary" text;