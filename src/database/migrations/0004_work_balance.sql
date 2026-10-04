CREATE TABLE `work_counterparties` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT "work_counterparty_name_valid" CHECK(length(trim("work_counterparties"."name")) > 0),
	CONSTRAINT "work_counterparty_updated_valid" CHECK("work_counterparties"."updated_at" >= "work_counterparties"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `work_counterparties_active_name_unique` ON `work_counterparties` (lower("name")) WHERE "work_counterparties"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `work_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`counterparty_id` text NOT NULL,
	`description` text NOT NULL,
	`compensation_type` text NOT NULL,
	`work_date` text NOT NULL,
	`duration_minutes` integer,
	`hourly_rate_minor` integer,
	`fixed_amount_minor` integer,
	`expected_payment_date` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`counterparty_id`) REFERENCES `work_counterparties`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "work_description_valid" CHECK(length(trim("work_entries"."description")) > 0),
	CONSTRAINT "work_compensation_valid" CHECK(("work_entries"."compensation_type" = 'hourly' AND "work_entries"."duration_minutes" IS NOT NULL AND "work_entries"."hourly_rate_minor" IS NOT NULL
    AND typeof("work_entries"."duration_minutes") = 'integer' AND "work_entries"."duration_minutes" BETWEEN 1 AND 9007199254740991
    AND typeof("work_entries"."hourly_rate_minor") = 'integer' AND "work_entries"."hourly_rate_minor" BETWEEN 1 AND 9007199254740991 AND "work_entries"."fixed_amount_minor" IS NULL)
    OR ("work_entries"."compensation_type" = 'fixed' AND "work_entries"."fixed_amount_minor" IS NOT NULL AND typeof("work_entries"."fixed_amount_minor") = 'integer'
    AND "work_entries"."fixed_amount_minor" BETWEEN 1 AND 9007199254740991 AND "work_entries"."duration_minutes" IS NULL AND "work_entries"."hourly_rate_minor" IS NULL)),
	CONSTRAINT "work_dates_valid" CHECK("work_entries"."work_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND substr("work_entries"."work_date", 1, 4) >= '0001'
    AND coalesce(strftime('%Y-%m-%d', "work_entries"."work_date", '+0 days') = "work_entries"."work_date", 0) AND ("work_entries"."expected_payment_date" IS NULL OR "work_entries"."expected_payment_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND substr("work_entries"."expected_payment_date", 1, 4) >= '0001'
    AND coalesce(strftime('%Y-%m-%d', "work_entries"."expected_payment_date", '+0 days') = "work_entries"."expected_payment_date", 0))),
	CONSTRAINT "work_updated_valid" CHECK("work_entries"."updated_at" >= "work_entries"."created_at")
);
--> statement-breakpoint
CREATE INDEX `work_entries_counterparty_idx` ON `work_entries` (`counterparty_id`);--> statement-breakpoint
CREATE INDEX `work_entries_date_idx` ON `work_entries` (`work_date`) WHERE "work_entries"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX `work_entries_expected_date_idx` ON `work_entries` (`expected_payment_date`) WHERE "work_entries"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `work_payment_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`work_entry_id` text NOT NULL,
	`finance_transaction_id` text NOT NULL,
	`transaction_type` text DEFAULT 'income' NOT NULL,
	`amount_minor` integer NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`work_entry_id`) REFERENCES `work_entries`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`finance_transaction_id`,`transaction_type`) REFERENCES `finance_transactions`(`id`,`type`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "work_allocation_income_valid" CHECK("work_payment_allocations"."transaction_type" = 'income'),
	CONSTRAINT "work_allocation_amount_valid" CHECK(typeof("work_payment_allocations"."amount_minor") = 'integer' AND "work_payment_allocations"."amount_minor" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "work_allocation_deleted_valid" CHECK("work_payment_allocations"."deleted_at" IS NULL OR "work_payment_allocations"."deleted_at" >= "work_payment_allocations"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `work_allocations_entry_transaction_unique` ON `work_payment_allocations` (`work_entry_id`,`finance_transaction_id`);--> statement-breakpoint
CREATE INDEX `work_allocations_entry_idx` ON `work_payment_allocations` (`work_entry_id`);--> statement-breakpoint
CREATE INDEX `work_allocations_transaction_idx` ON `work_payment_allocations` (`finance_transaction_id`);