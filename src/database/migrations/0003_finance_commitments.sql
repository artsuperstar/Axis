CREATE TABLE `finance_commitment_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`commitment_id` text NOT NULL,
	`schedule_id` text NOT NULL,
	`due_date` text NOT NULL,
	`expected_amount_minor` integer NOT NULL,
	`installment_index` integer,
	`status` text DEFAULT 'pending' NOT NULL,
	`paid_transaction_id` text,
	`payment_type` text DEFAULT 'expense' NOT NULL,
	`resolved_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`commitment_id`) REFERENCES `finance_commitments`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`schedule_id`,`commitment_id`) REFERENCES `finance_commitment_schedules`(`id`,`commitment_id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`paid_transaction_id`,`payment_type`) REFERENCES `finance_transactions`(`id`,`type`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "commitment_occurrence_status_valid" CHECK("finance_commitment_occurrences"."status" IN ('pending', 'paid', 'skipped')),
	CONSTRAINT "commitment_occurrence_payment_valid" CHECK("finance_commitment_occurrences"."payment_type" = 'expense' AND
    (("finance_commitment_occurrences"."status" = 'paid' AND "finance_commitment_occurrences"."paid_transaction_id" IS NOT NULL AND "finance_commitment_occurrences"."resolved_at" IS NOT NULL)
    OR ("finance_commitment_occurrences"."status" = 'skipped' AND "finance_commitment_occurrences"."paid_transaction_id" IS NULL AND "finance_commitment_occurrences"."resolved_at" IS NOT NULL)
    OR ("finance_commitment_occurrences"."status" = 'pending' AND "finance_commitment_occurrences"."paid_transaction_id" IS NULL AND "finance_commitment_occurrences"."resolved_at" IS NULL))),
	CONSTRAINT "commitment_occurrence_amount_valid" CHECK(typeof("finance_commitment_occurrences"."expected_amount_minor") = 'integer' AND "finance_commitment_occurrences"."expected_amount_minor" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "commitment_occurrence_index_valid" CHECK("finance_commitment_occurrences"."installment_index" IS NULL OR (typeof("finance_commitment_occurrences"."installment_index") = 'integer' AND "finance_commitment_occurrences"."installment_index" BETWEEN 1 AND 1200)),
	CONSTRAINT "commitment_occurrence_date_valid" CHECK("finance_commitment_occurrences"."due_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND substr("finance_commitment_occurrences"."due_date", 1, 4) >= '0001'
    AND coalesce(strftime('%Y-%m-%d', "finance_commitment_occurrences"."due_date", '+0 days') = "finance_commitment_occurrences"."due_date", 0)),
	CONSTRAINT "commitment_occurrence_updated_valid" CHECK("finance_commitment_occurrences"."updated_at" >= "finance_commitment_occurrences"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commitment_occurrences_parent_date_unique` ON `finance_commitment_occurrences` (`commitment_id`,`due_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `commitment_occurrences_installment_unique` ON `finance_commitment_occurrences` (`commitment_id`,`installment_index`);--> statement-breakpoint
CREATE UNIQUE INDEX `commitment_occurrences_payment_unique` ON `finance_commitment_occurrences` (`paid_transaction_id`);--> statement-breakpoint
CREATE INDEX `commitment_occurrences_due_idx` ON `finance_commitment_occurrences` (`due_date`,`status`) WHERE "finance_commitment_occurrences"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `finance_commitment_schedules` (
	`id` text PRIMARY KEY NOT NULL,
	`commitment_id` text NOT NULL,
	`start_date` text NOT NULL,
	`billing_day` integer NOT NULL,
	`first_installment_index` integer DEFAULT 1 NOT NULL,
	`expected_amount_minor` integer NOT NULL,
	`effective_from` text NOT NULL,
	`effective_until` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`commitment_id`) REFERENCES `finance_commitments`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "commitment_schedule_day_valid" CHECK("finance_commitment_schedules"."billing_day" BETWEEN 1 AND 31 AND typeof("finance_commitment_schedules"."billing_day") = 'integer'),
	CONSTRAINT "commitment_schedule_index_valid" CHECK("finance_commitment_schedules"."first_installment_index" BETWEEN 1 AND 1200 AND typeof("finance_commitment_schedules"."first_installment_index") = 'integer'),
	CONSTRAINT "commitment_schedule_amount_valid" CHECK(typeof("finance_commitment_schedules"."expected_amount_minor") = 'integer' AND "finance_commitment_schedules"."expected_amount_minor" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "commitment_schedule_dates_valid" CHECK("finance_commitment_schedules"."start_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND substr("finance_commitment_schedules"."start_date", 1, 4) >= '0001'
    AND coalesce(strftime('%Y-%m-%d', "finance_commitment_schedules"."start_date", '+0 days') = "finance_commitment_schedules"."start_date", 0) AND "finance_commitment_schedules"."effective_from" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND substr("finance_commitment_schedules"."effective_from", 1, 4) >= '0001'
    AND coalesce(strftime('%Y-%m-%d', "finance_commitment_schedules"."effective_from", '+0 days') = "finance_commitment_schedules"."effective_from", 0)
    AND ("finance_commitment_schedules"."effective_until" IS NULL OR ("finance_commitment_schedules"."effective_until" >= "finance_commitment_schedules"."effective_from" AND "finance_commitment_schedules"."effective_until" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND substr("finance_commitment_schedules"."effective_until", 1, 4) >= '0001'
    AND coalesce(strftime('%Y-%m-%d', "finance_commitment_schedules"."effective_until", '+0 days') = "finance_commitment_schedules"."effective_until", 0)))),
	CONSTRAINT "commitment_schedule_updated_valid" CHECK("finance_commitment_schedules"."updated_at" >= "finance_commitment_schedules"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `commitment_schedules_id_parent_unique` ON `finance_commitment_schedules` (`id`,`commitment_id`);--> statement-breakpoint
CREATE INDEX `commitment_schedules_parent_idx` ON `finance_commitment_schedules` (`commitment_id`,`effective_from`);--> statement-breakpoint
CREATE TABLE `finance_commitments` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`category_id` text,
	`category_type` text DEFAULT 'expense' NOT NULL,
	`expected_amount_minor` integer NOT NULL,
	`installment_count` integer,
	`status` text DEFAULT 'active' NOT NULL,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`category_id`,`category_type`) REFERENCES `finance_categories`(`id`,`type`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "commitment_kind_valid" CHECK("finance_commitments"."kind" IN ('bill', 'subscription', 'installment')),
	CONSTRAINT "commitment_title_valid" CHECK(length(trim("finance_commitments"."title")) > 0),
	CONSTRAINT "commitment_category_expense" CHECK("finance_commitments"."category_type" = 'expense'),
	CONSTRAINT "commitment_amount_valid" CHECK(typeof("finance_commitments"."expected_amount_minor") = 'integer' AND "finance_commitments"."expected_amount_minor" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "commitment_installments_valid" CHECK(("finance_commitments"."kind" = 'installment' AND "finance_commitments"."installment_count" IS NOT NULL AND typeof("finance_commitments"."installment_count") = 'integer' AND "finance_commitments"."installment_count" BETWEEN 1 AND 1200)
    OR ("finance_commitments"."kind" != 'installment' AND "finance_commitments"."installment_count" IS NULL)),
	CONSTRAINT "commitment_status_valid" CHECK("finance_commitments"."status" IN ('active', 'paused', 'ended', 'completed') AND ("finance_commitments"."status" != 'completed' OR "finance_commitments"."kind" = 'installment')),
	CONSTRAINT "commitment_completion_valid" CHECK(("finance_commitments"."status" = 'completed' AND "finance_commitments"."completed_at" IS NOT NULL) OR ("finance_commitments"."status" != 'completed' AND "finance_commitments"."completed_at" IS NULL)),
	CONSTRAINT "commitment_updated_valid" CHECK("finance_commitments"."updated_at" >= "finance_commitments"."created_at")
);
--> statement-breakpoint
CREATE INDEX `finance_commitments_status_idx` ON `finance_commitments` (`status`) WHERE "finance_commitments"."deleted_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `finance_transactions_id_type_unique` ON `finance_transactions` (`id`,`type`);