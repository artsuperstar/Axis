CREATE TABLE `fitness_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`measurement_type` text NOT NULL,
	`is_built_in` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT "fitness_exercise_name_valid" CHECK(length(trim("fitness_exercises"."name")) BETWEEN 1 AND 120),
	CONSTRAINT "fitness_exercise_type_valid" CHECK("fitness_exercises"."measurement_type" IN ('strength', 'bodyweight', 'duration', 'distance')),
	CONSTRAINT "fitness_exercise_builtin_valid" CHECK("fitness_exercises"."is_built_in" IN (0, 1)),
	CONSTRAINT "fitness_exercise_updated_valid" CHECK("fitness_exercises"."updated_at" >= "fitness_exercises"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fitness_exercise_id_type_unique` ON `fitness_exercises` (`id`,`measurement_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `fitness_exercise_active_name_unique` ON `fitness_exercises` (lower("name")) WHERE "fitness_exercises"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `fitness_routine_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`measurement_type` text NOT NULL,
	`position` integer NOT NULL,
	`target_set_count` integer,
	`target_rep_min` integer,
	`target_rep_max` integer,
	`target_duration_seconds` integer,
	`target_distance_meters` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`routine_id`) REFERENCES `fitness_routines`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`exercise_id`,`measurement_type`) REFERENCES `fitness_exercises`(`id`,`measurement_type`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "fitness_routine_exercise_position_valid" CHECK(typeof("fitness_routine_exercises"."position") = 'integer' AND "fitness_routine_exercises"."position" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "fitness_routine_targets_valid" CHECK(("fitness_routine_exercises"."target_set_count" IS NULL OR (typeof("fitness_routine_exercises"."target_set_count") = 'integer' AND "fitness_routine_exercises"."target_set_count" BETWEEN 1 AND 100))
  AND (("fitness_routine_exercises"."target_rep_min" IS NULL AND "fitness_routine_exercises"."target_rep_max" IS NULL)
    OR ("fitness_routine_exercises"."measurement_type" IN ('strength', 'bodyweight') AND "fitness_routine_exercises"."target_rep_min" IS NOT NULL AND "fitness_routine_exercises"."target_rep_max" IS NOT NULL
      AND typeof("fitness_routine_exercises"."target_rep_min") = 'integer' AND "fitness_routine_exercises"."target_rep_min" BETWEEN 1 AND 9007199254740991 AND typeof("fitness_routine_exercises"."target_rep_max") = 'integer' AND "fitness_routine_exercises"."target_rep_max" BETWEEN 1 AND 9007199254740991 AND "fitness_routine_exercises"."target_rep_max" >= "fitness_routine_exercises"."target_rep_min"))
  AND ("fitness_routine_exercises"."target_duration_seconds" IS NULL OR ("fitness_routine_exercises"."measurement_type" = 'duration' AND typeof("fitness_routine_exercises"."target_duration_seconds") = 'integer' AND "fitness_routine_exercises"."target_duration_seconds" BETWEEN 1 AND 9007199254740991))
  AND ("fitness_routine_exercises"."target_distance_meters" IS NULL OR ("fitness_routine_exercises"."measurement_type" = 'distance' AND typeof("fitness_routine_exercises"."target_distance_meters") = 'integer' AND "fitness_routine_exercises"."target_distance_meters" BETWEEN 1 AND 9007199254740991))),
	CONSTRAINT "fitness_routine_exercise_updated_valid" CHECK("fitness_routine_exercises"."updated_at" >= "fitness_routine_exercises"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fitness_routine_exercise_position_unique` ON `fitness_routine_exercises` (`routine_id`,`position`) WHERE "fitness_routine_exercises"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `fitness_routines` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	CONSTRAINT "fitness_routine_name_valid" CHECK(length(trim("fitness_routines"."name")) BETWEEN 1 AND 120),
	CONSTRAINT "fitness_routine_updated_valid" CHECK("fitness_routines"."updated_at" >= "fitness_routines"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fitness_routine_active_name_unique` ON `fitness_routines` (lower("name")) WHERE "fitness_routines"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `fitness_session_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`exercise_name` text NOT NULL,
	`measurement_type` text NOT NULL,
	`position` integer NOT NULL,
	`note` text,
	`target_set_count` integer,
	`target_rep_min` integer,
	`target_rep_max` integer,
	`target_duration_seconds` integer,
	`target_distance_meters` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`session_id`) REFERENCES `fitness_workout_sessions`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`exercise_id`,`measurement_type`) REFERENCES `fitness_exercises`(`id`,`measurement_type`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "fitness_session_exercise_name_valid" CHECK(length(trim("fitness_session_exercises"."exercise_name")) BETWEEN 1 AND 120),
	CONSTRAINT "fitness_session_exercise_position_valid" CHECK(typeof("fitness_session_exercises"."position") = 'integer' AND "fitness_session_exercises"."position" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "fitness_session_targets_valid" CHECK(("fitness_session_exercises"."target_set_count" IS NULL OR (typeof("fitness_session_exercises"."target_set_count") = 'integer' AND "fitness_session_exercises"."target_set_count" BETWEEN 1 AND 100))
  AND (("fitness_session_exercises"."target_rep_min" IS NULL AND "fitness_session_exercises"."target_rep_max" IS NULL)
    OR ("fitness_session_exercises"."measurement_type" IN ('strength', 'bodyweight') AND "fitness_session_exercises"."target_rep_min" IS NOT NULL AND "fitness_session_exercises"."target_rep_max" IS NOT NULL
      AND typeof("fitness_session_exercises"."target_rep_min") = 'integer' AND "fitness_session_exercises"."target_rep_min" BETWEEN 1 AND 9007199254740991 AND typeof("fitness_session_exercises"."target_rep_max") = 'integer' AND "fitness_session_exercises"."target_rep_max" BETWEEN 1 AND 9007199254740991 AND "fitness_session_exercises"."target_rep_max" >= "fitness_session_exercises"."target_rep_min"))
  AND ("fitness_session_exercises"."target_duration_seconds" IS NULL OR ("fitness_session_exercises"."measurement_type" = 'duration' AND typeof("fitness_session_exercises"."target_duration_seconds") = 'integer' AND "fitness_session_exercises"."target_duration_seconds" BETWEEN 1 AND 9007199254740991))
  AND ("fitness_session_exercises"."target_distance_meters" IS NULL OR ("fitness_session_exercises"."measurement_type" = 'distance' AND typeof("fitness_session_exercises"."target_distance_meters") = 'integer' AND "fitness_session_exercises"."target_distance_meters" BETWEEN 1 AND 9007199254740991))),
	CONSTRAINT "fitness_session_exercise_updated_valid" CHECK("fitness_session_exercises"."updated_at" >= "fitness_session_exercises"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fitness_session_exercise_id_type_unique` ON `fitness_session_exercises` (`id`,`measurement_type`);--> statement-breakpoint
CREATE UNIQUE INDEX `fitness_session_exercise_position_unique` ON `fitness_session_exercises` (`session_id`,`position`) WHERE "fitness_session_exercises"."deleted_at" IS NULL;--> statement-breakpoint
CREATE TABLE `fitness_workout_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`routine_id` text,
	`name` text NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer,
	`note` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`routine_id`) REFERENCES `fitness_routines`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "fitness_session_name_valid" CHECK(length(trim("fitness_workout_sessions"."name")) BETWEEN 1 AND 120),
	CONSTRAINT "fitness_session_completed_valid" CHECK("fitness_workout_sessions"."completed_at" IS NULL OR "fitness_workout_sessions"."completed_at" >= "fitness_workout_sessions"."started_at"),
	CONSTRAINT "fitness_session_updated_valid" CHECK("fitness_workout_sessions"."updated_at" >= "fitness_workout_sessions"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fitness_one_active_session` ON `fitness_workout_sessions` ((1)) WHERE "fitness_workout_sessions"."completed_at" IS NULL AND "fitness_workout_sessions"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX `fitness_session_history_idx` ON `fitness_workout_sessions` (`completed_at`,`id`) WHERE "fitness_workout_sessions"."deleted_at" IS NULL AND "fitness_workout_sessions"."completed_at" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `fitness_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`session_exercise_id` text NOT NULL,
	`measurement_type` text NOT NULL,
	`position` integer NOT NULL,
	`weight_grams` integer,
	`reps` integer,
	`duration_seconds` integer,
	`distance_meters` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`session_exercise_id`,`measurement_type`) REFERENCES `fitness_session_exercises`(`id`,`measurement_type`) ON UPDATE restrict ON DELETE restrict,
	CONSTRAINT "fitness_set_position_valid" CHECK(typeof("fitness_sets"."position") = 'integer' AND "fitness_sets"."position" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "fitness_set_values_valid" CHECK(
    ("fitness_sets"."measurement_type" = 'strength' AND "fitness_sets"."weight_grams" IS NOT NULL AND typeof("fitness_sets"."weight_grams") = 'integer' AND "fitness_sets"."weight_grams" BETWEEN 0 AND 9007199254740991
      AND "fitness_sets"."reps" IS NOT NULL AND typeof("fitness_sets"."reps") = 'integer' AND "fitness_sets"."reps" BETWEEN 1 AND 9007199254740991 AND "fitness_sets"."duration_seconds" IS NULL AND "fitness_sets"."distance_meters" IS NULL)
    OR ("fitness_sets"."measurement_type" = 'bodyweight' AND "fitness_sets"."reps" IS NOT NULL AND typeof("fitness_sets"."reps") = 'integer' AND "fitness_sets"."reps" BETWEEN 1 AND 9007199254740991
      AND ("fitness_sets"."weight_grams" IS NULL OR typeof("fitness_sets"."weight_grams") = 'integer' AND "fitness_sets"."weight_grams" BETWEEN 1 AND 9007199254740991) AND "fitness_sets"."duration_seconds" IS NULL AND "fitness_sets"."distance_meters" IS NULL)
    OR ("fitness_sets"."measurement_type" = 'duration' AND "fitness_sets"."duration_seconds" IS NOT NULL AND typeof("fitness_sets"."duration_seconds") = 'integer' AND "fitness_sets"."duration_seconds" BETWEEN 1 AND 9007199254740991
      AND "fitness_sets"."weight_grams" IS NULL AND "fitness_sets"."reps" IS NULL AND "fitness_sets"."distance_meters" IS NULL)
    OR ("fitness_sets"."measurement_type" = 'distance' AND "fitness_sets"."distance_meters" IS NOT NULL AND typeof("fitness_sets"."distance_meters") = 'integer' AND "fitness_sets"."distance_meters" BETWEEN 1 AND 9007199254740991
      AND ("fitness_sets"."duration_seconds" IS NULL OR typeof("fitness_sets"."duration_seconds") = 'integer' AND "fitness_sets"."duration_seconds" BETWEEN 1 AND 9007199254740991) AND "fitness_sets"."weight_grams" IS NULL AND "fitness_sets"."reps" IS NULL)),
	CONSTRAINT "fitness_set_updated_valid" CHECK("fitness_sets"."updated_at" >= "fitness_sets"."created_at")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fitness_set_position_unique` ON `fitness_sets` (`session_exercise_id`,`position`) WHERE "fitness_sets"."deleted_at" IS NULL;