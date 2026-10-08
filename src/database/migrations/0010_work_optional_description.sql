-- Rebuild parent and its referencing allocations atomically with foreign_keys ON.
-- Copy every column verbatim; do not toggle foreign_keys inside the migrator transaction.
CREATE TABLE `__new_work_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`counterparty_id` text NOT NULL,
	`title` text,
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
	CONSTRAINT "work_compensation_valid" CHECK(("__new_work_entries"."compensation_type" = 'hourly' AND "__new_work_entries"."duration_minutes" IS NOT NULL AND "__new_work_entries"."hourly_rate_minor" IS NOT NULL
    AND typeof("__new_work_entries"."duration_minutes") = 'integer' AND "__new_work_entries"."duration_minutes" BETWEEN 1 AND 9007199254740991
    AND typeof("__new_work_entries"."hourly_rate_minor") = 'integer' AND "__new_work_entries"."hourly_rate_minor" BETWEEN 1 AND 9007199254740991 AND "__new_work_entries"."fixed_amount_minor" IS NULL)
    OR ("__new_work_entries"."compensation_type" = 'fixed' AND "__new_work_entries"."fixed_amount_minor" IS NOT NULL AND typeof("__new_work_entries"."fixed_amount_minor") = 'integer'
    AND "__new_work_entries"."fixed_amount_minor" BETWEEN 1 AND 9007199254740991 AND "__new_work_entries"."duration_minutes" IS NULL AND "__new_work_entries"."hourly_rate_minor" IS NULL)),
	CONSTRAINT "work_dates_valid" CHECK("__new_work_entries"."work_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND substr("__new_work_entries"."work_date", 1, 4) >= '0001'
    AND coalesce(strftime('%Y-%m-%d', "__new_work_entries"."work_date", '+0 days') = "__new_work_entries"."work_date", 0) AND ("__new_work_entries"."expected_payment_date" IS NULL OR "__new_work_entries"."expected_payment_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND substr("__new_work_entries"."expected_payment_date", 1, 4) >= '0001'
    AND coalesce(strftime('%Y-%m-%d', "__new_work_entries"."expected_payment_date", '+0 days') = "__new_work_entries"."expected_payment_date", 0))),
	CONSTRAINT "work_updated_valid" CHECK("__new_work_entries"."updated_at" >= "__new_work_entries"."created_at")
);
--> statement-breakpoint
INSERT INTO `__new_work_entries`("id", "counterparty_id", "title", "description", "compensation_type", "work_date", "duration_minutes", "hourly_rate_minor", "fixed_amount_minor", "expected_payment_date", "created_at", "updated_at", "deleted_at") SELECT "id", "counterparty_id", "title", "description", "compensation_type", "work_date", "duration_minutes", "hourly_rate_minor", "fixed_amount_minor", "expected_payment_date", "created_at", "updated_at", "deleted_at" FROM `work_entries`;--> statement-breakpoint
CREATE TABLE `__new_work_payment_allocations` (
	`id` text PRIMARY KEY NOT NULL,
	`work_entry_id` text NOT NULL,
	`finance_transaction_id` text NOT NULL,
	`transaction_type` text DEFAULT 'income' NOT NULL,
	`amount_minor` integer NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`work_entry_id`) REFERENCES `__new_work_entries`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`finance_transaction_id`,`transaction_type`) REFERENCES `finance_transactions`(`id`,`type`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "work_allocation_income_valid" CHECK("__new_work_payment_allocations"."transaction_type" = 'income'),
	CONSTRAINT "work_allocation_amount_valid" CHECK(typeof("__new_work_payment_allocations"."amount_minor") = 'integer' AND "__new_work_payment_allocations"."amount_minor" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "work_allocation_deleted_valid" CHECK("__new_work_payment_allocations"."deleted_at" IS NULL OR "__new_work_payment_allocations"."deleted_at" >= "__new_work_payment_allocations"."created_at")
);
--> statement-breakpoint
INSERT INTO `__new_work_payment_allocations` ("id", "work_entry_id", "finance_transaction_id", "transaction_type", "amount_minor", "created_at", "deleted_at") SELECT "id", "work_entry_id", "finance_transaction_id", "transaction_type", "amount_minor", "created_at", "deleted_at" FROM `work_payment_allocations`;--> statement-breakpoint
DROP TABLE `work_payment_allocations`;--> statement-breakpoint
DROP TABLE `work_entries`;--> statement-breakpoint
ALTER TABLE `__new_work_entries` RENAME TO `work_entries`;--> statement-breakpoint
ALTER TABLE `__new_work_payment_allocations` RENAME TO `work_payment_allocations`;--> statement-breakpoint
CREATE INDEX `work_entries_counterparty_idx` ON `work_entries` (`counterparty_id`);--> statement-breakpoint
CREATE INDEX `work_entries_date_idx` ON `work_entries` (`work_date`) WHERE "work_entries"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX `work_entries_expected_date_idx` ON `work_entries` (`expected_payment_date`) WHERE "work_entries"."deleted_at" IS NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX `work_allocations_entry_transaction_unique` ON `work_payment_allocations` (`work_entry_id`,`finance_transaction_id`);--> statement-breakpoint
CREATE INDEX `work_allocations_entry_idx` ON `work_payment_allocations` (`work_entry_id`);--> statement-breakpoint
CREATE INDEX `work_allocations_transaction_idx` ON `work_payment_allocations` (`finance_transaction_id`);
