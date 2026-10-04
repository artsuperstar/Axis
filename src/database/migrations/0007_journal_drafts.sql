CREATE TABLE `journal_drafts` (
	`entry_date` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`mood` text,
	`updated_at` integer NOT NULL,
	`base_entry_id` text,
	`base_entry_updated_at` integer,
	CONSTRAINT "journal_draft_date_valid" CHECK("journal_drafts"."entry_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND substr("journal_drafts"."entry_date", 1, 4) >= '0001'
    AND coalesce(strftime('%Y-%m-%d', "journal_drafts"."entry_date", '+0 days') = "journal_drafts"."entry_date", 0)),
	CONSTRAINT "journal_draft_mood_valid" CHECK("journal_drafts"."mood" IS NULL OR "journal_drafts"."mood" IN ('great', 'good', 'okay', 'low', 'bad')),
	CONSTRAINT "journal_draft_content_valid" CHECK(typeof("journal_drafts"."content") = 'text' AND (length(trim("journal_drafts"."content", ' ' || char(9) || char(10) || char(13))) > 0 OR "journal_drafts"."mood" IS NOT NULL OR "journal_drafts"."base_entry_id" IS NOT NULL)),
	CONSTRAINT "journal_draft_updated_valid" CHECK(typeof("journal_drafts"."updated_at") = 'integer' AND "journal_drafts"."updated_at" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "journal_draft_base_valid" CHECK(("journal_drafts"."base_entry_id" IS NULL AND "journal_drafts"."base_entry_updated_at" IS NULL)
    OR ("journal_drafts"."base_entry_id" IS NOT NULL AND length(trim("journal_drafts"."base_entry_id")) > 0 AND "journal_drafts"."base_entry_updated_at" IS NOT NULL
      AND typeof("journal_drafts"."base_entry_updated_at") = 'integer' AND "journal_drafts"."base_entry_updated_at" BETWEEN 0 AND 9007199254740991))
);
