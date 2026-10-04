CREATE TABLE `journal_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_date` text NOT NULL,
	`content` text NOT NULL,
	`mood` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT "journal_date_valid" CHECK("journal_entries"."entry_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND substr("journal_entries"."entry_date", 1, 4) >= '0001'
    AND coalesce(strftime('%Y-%m-%d', "journal_entries"."entry_date", '+0 days') = "journal_entries"."entry_date", 0)),
	CONSTRAINT "journal_mood_valid" CHECK("journal_entries"."mood" IS NULL OR "journal_entries"."mood" IN ('great', 'good', 'okay', 'low', 'bad')),
	CONSTRAINT "journal_content_valid" CHECK(typeof("journal_entries"."content") = 'text' AND (length(trim("journal_entries"."content", ' ' || char(9) || char(10) || char(13))) > 0 OR "journal_entries"."mood" IS NOT NULL OR "journal_entries"."deleted_at" IS NOT NULL)),
	CONSTRAINT "journal_timestamps_valid" CHECK(typeof("journal_entries"."created_at") = 'integer' AND "journal_entries"."created_at" BETWEEN 0 AND 9007199254740991
    AND typeof("journal_entries"."updated_at") = 'integer' AND "journal_entries"."updated_at" BETWEEN "journal_entries"."created_at" AND 9007199254740991
    AND ("journal_entries"."deleted_at" IS NULL OR (typeof("journal_entries"."deleted_at") = 'integer' AND "journal_entries"."deleted_at" BETWEEN "journal_entries"."created_at" AND "journal_entries"."updated_at")))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_active_date_unique` ON `journal_entries` (`entry_date`) WHERE "journal_entries"."deleted_at" IS NULL;