CREATE TABLE `task_occurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`recurrence_id` text NOT NULL,
	`scheduled_date` text NOT NULL,
	`scheduled_time` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`recurrence_id`) REFERENCES `task_recurrences`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "occurrence_status_valid" CHECK("task_occurrences"."status" IN ('pending', 'completed', 'skipped')),
	CONSTRAINT "occurrence_completion_valid" CHECK(("task_occurrences"."status" = 'completed' AND "task_occurrences"."completed_at" IS NOT NULL) OR ("task_occurrences"."status" != 'completed' AND "task_occurrences"."completed_at" IS NULL)),
	CONSTRAINT "occurrence_date_valid" CHECK("task_occurrences"."scheduled_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND substr("task_occurrences"."scheduled_date", 1, 4) >= '0001' AND coalesce(strftime('%Y-%m-%d', "task_occurrences"."scheduled_date", '+0 days') = "task_occurrences"."scheduled_date", 0)),
	CONSTRAINT "occurrence_time_valid" CHECK("task_occurrences"."scheduled_time" IS NULL OR ("task_occurrences"."scheduled_time" GLOB '[0-2][0-9]:[0-5][0-9]' AND substr("task_occurrences"."scheduled_time", 1, 2) < '24')),
	CONSTRAINT "occurrence_updated_after_created" CHECK("task_occurrences"."updated_at" >= "task_occurrences"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_occurrences_rule_date_unique` ON `task_occurrences` (`recurrence_id`,`scheduled_date`);--> statement-breakpoint
CREATE UNIQUE INDEX `task_occurrences_active_task_date_unique` ON `task_occurrences` (`task_id`,`scheduled_date`) WHERE "task_occurrences"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX `task_occurrences_history_idx` ON `task_occurrences` (`task_id`,`scheduled_date`);--> statement-breakpoint
CREATE TABLE `task_recurrences` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`frequency` text NOT NULL,
	`interval` integer DEFAULT 1 NOT NULL,
	`weekday_mask` integer,
	`month_day` integer,
	`month` integer,
	`start_date` text NOT NULL,
	`scheduled_time` text,
	`end_date` text,
	`effective_from` text NOT NULL,
	`effective_until` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "recurrence_frequency_valid" CHECK("task_recurrences"."frequency" IN ('daily', 'weekly', 'monthly', 'yearly')),
	CONSTRAINT "recurrence_interval_valid" CHECK("task_recurrences"."interval" >= 1 AND ("task_recurrences"."frequency" != 'yearly' OR "task_recurrences"."interval" = 1)),
	CONSTRAINT "recurrence_pattern_valid" CHECK(CASE "task_recurrences"."frequency"
    WHEN 'weekly' THEN "task_recurrences"."weekday_mask" BETWEEN 1 AND 127 AND "task_recurrences"."month_day" IS NULL AND "task_recurrences"."month" IS NULL
    WHEN 'monthly' THEN "task_recurrences"."weekday_mask" IS NULL AND "task_recurrences"."month_day" BETWEEN 1 AND 31 AND "task_recurrences"."month" IS NULL
    WHEN 'yearly' THEN "task_recurrences"."weekday_mask" IS NULL AND "task_recurrences"."month" BETWEEN 1 AND 12 AND "task_recurrences"."month_day" BETWEEN 1 AND
      CASE "task_recurrences"."month" WHEN 2 THEN 29 WHEN 4 THEN 30 WHEN 6 THEN 30 WHEN 9 THEN 30 WHEN 11 THEN 30 ELSE 31 END
    ELSE "task_recurrences"."weekday_mask" IS NULL AND "task_recurrences"."month_day" IS NULL AND "task_recurrences"."month" IS NULL
  END AND CASE "task_recurrences"."frequency" WHEN 'weekly' THEN "task_recurrences"."weekday_mask" IS NOT NULL
    WHEN 'monthly' THEN "task_recurrences"."month_day" IS NOT NULL
    WHEN 'yearly' THEN "task_recurrences"."month" IS NOT NULL AND "task_recurrences"."month_day" IS NOT NULL ELSE 1 END),
	CONSTRAINT "recurrence_dates_valid" CHECK(
    "task_recurrences"."start_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND substr("task_recurrences"."start_date", 1, 4) >= '0001'
    AND coalesce(strftime('%Y-%m-%d', "task_recurrences"."start_date", '+0 days') = "task_recurrences"."start_date", 0)
    AND "task_recurrences"."effective_from" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]' AND substr("task_recurrences"."effective_from", 1, 4) >= '0001'
    AND coalesce(strftime('%Y-%m-%d', "task_recurrences"."effective_from", '+0 days') = "task_recurrences"."effective_from", 0)
    AND ("task_recurrences"."end_date" IS NULL OR ("task_recurrences"."end_date" >= "task_recurrences"."start_date"
      AND "task_recurrences"."end_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
      AND coalesce(strftime('%Y-%m-%d', "task_recurrences"."end_date", '+0 days') = "task_recurrences"."end_date", 0)))
    AND ("task_recurrences"."effective_until" IS NULL OR ("task_recurrences"."effective_until" > "task_recurrences"."effective_from"
      AND "task_recurrences"."effective_until" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
      AND coalesce(strftime('%Y-%m-%d', "task_recurrences"."effective_until", '+0 days') = "task_recurrences"."effective_until", 0)))),
	CONSTRAINT "recurrence_time_valid" CHECK("task_recurrences"."scheduled_time" IS NULL OR ("task_recurrences"."scheduled_time" GLOB '[0-2][0-9]:[0-5][0-9]' AND substr("task_recurrences"."scheduled_time", 1, 2) < '24')),
	CONSTRAINT "recurrence_updated_after_created" CHECK("task_recurrences"."updated_at" >= "task_recurrences"."created_at")
);
--> statement-breakpoint
CREATE INDEX `task_recurrences_task_idx` ON `task_recurrences` (`task_id`,`effective_from`);