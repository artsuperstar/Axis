CREATE TABLE `finance_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`is_built_in` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT "finance_category_name_not_empty" CHECK(length(trim("finance_categories"."name")) > 0),
	CONSTRAINT "finance_category_type_valid" CHECK("finance_categories"."type" IN ('income', 'expense')),
	CONSTRAINT "finance_category_builtin_valid" CHECK("finance_categories"."is_built_in" IN (0, 1)),
	CONSTRAINT "finance_category_updated_after_created" CHECK("finance_categories"."updated_at" >= "finance_categories"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `finance_categories_id_type_unique` ON `finance_categories` (`id`,`type`);--> statement-breakpoint
CREATE UNIQUE INDEX `finance_categories_active_type_name_unique` ON `finance_categories` (`type`,lower("name")) WHERE "finance_categories"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `finance_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`amount_minor` integer NOT NULL,
	`description` text NOT NULL,
	`note` text,
	`transaction_date` text NOT NULL,
	`category_id` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`category_id`,`type`) REFERENCES `finance_categories`(`id`,`type`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "finance_transaction_type_valid" CHECK("finance_transactions"."type" IN ('income', 'expense')),
	CONSTRAINT "finance_transaction_amount_valid" CHECK(typeof("finance_transactions"."amount_minor") = 'integer' AND "finance_transactions"."amount_minor" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "finance_transaction_description_not_empty" CHECK(length(trim("finance_transactions"."description")) > 0),
	CONSTRAINT "finance_transaction_date_valid" CHECK("finance_transactions"."transaction_date" GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
    AND substr("finance_transactions"."transaction_date", 1, 4) >= '0001'
    AND coalesce(strftime('%Y-%m-%d', "finance_transactions"."transaction_date", '+0 days') = "finance_transactions"."transaction_date", 0)),
	CONSTRAINT "finance_transaction_updated_after_created" CHECK("finance_transactions"."updated_at" >= "finance_transactions"."created_at")
);
--> statement-breakpoint
CREATE INDEX `finance_transactions_active_date_idx` ON `finance_transactions` (`transaction_date`,`created_at`,`id`) WHERE "finance_transactions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX `finance_transactions_category_idx` ON `finance_transactions` (`category_id`);