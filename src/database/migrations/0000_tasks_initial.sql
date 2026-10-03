CREATE TABLE `task_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT "category_name_not_empty" CHECK(length(trim("task_categories"."name")) > 0),
	CONSTRAINT "category_updated_after_created" CHECK("task_categories"."updated_at" >= "task_categories"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `task_categories_active_name_unique` ON `task_categories` (lower("name")) WHERE "task_categories"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`date` text,
	`time` text,
	`priority` text DEFAULT 'none' NOT NULL,
	`category_id` text,
	`completed_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`category_id`) REFERENCES `task_categories`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "task_title_not_empty" CHECK(length(trim("tasks"."title")) > 0),
	CONSTRAINT "task_priority_valid" CHECK("tasks"."priority" IN ('none', 'low', 'medium', 'high')),
	CONSTRAINT "task_date_valid" CHECK("tasks"."date" IS NULL OR (
    "tasks"."date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
    AND substr("tasks"."date", 1, 4) >= '0001'
    AND coalesce(strftime('%Y-%m-%d', "tasks"."date", '+0 days') = "tasks"."date", 0)
  )),
	CONSTRAINT "task_time_valid" CHECK("tasks"."time" IS NULL OR (
    "tasks"."date" IS NOT NULL
    AND "tasks"."time" GLOB '[0-2][0-9]:[0-5][0-9]'
    AND substr("tasks"."time", 1, 2) < '24'
  )),
	CONSTRAINT "task_updated_after_created" CHECK("tasks"."updated_at" >= "tasks"."created_at")
);
--> statement-breakpoint
CREATE INDEX `tasks_active_date_idx` ON `tasks` (`date`) WHERE "tasks"."deleted_at" IS NULL;