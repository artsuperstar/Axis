-- Leaf-table rebuild runs atomically with foreign_keys ON in the existing migrator.
CREATE TABLE `__new_fitness_sets` (
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
	CONSTRAINT "fitness_set_position_valid" CHECK(typeof("__new_fitness_sets"."position") = 'integer' AND "__new_fitness_sets"."position" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "fitness_set_values_valid" CHECK(
    ("__new_fitness_sets"."measurement_type" = 'strength' AND ("__new_fitness_sets"."weight_grams" IS NULL OR typeof("__new_fitness_sets"."weight_grams") = 'integer' AND "__new_fitness_sets"."weight_grams" BETWEEN 0 AND 9007199254740991)
      AND ("__new_fitness_sets"."reps" IS NULL OR typeof("__new_fitness_sets"."reps") = 'integer' AND "__new_fitness_sets"."reps" BETWEEN 1 AND 9007199254740991) AND "__new_fitness_sets"."duration_seconds" IS NULL AND "__new_fitness_sets"."distance_meters" IS NULL)
    OR ("__new_fitness_sets"."measurement_type" = 'bodyweight' AND ("__new_fitness_sets"."reps" IS NULL OR typeof("__new_fitness_sets"."reps") = 'integer' AND "__new_fitness_sets"."reps" BETWEEN 1 AND 9007199254740991)
      AND ("__new_fitness_sets"."weight_grams" IS NULL OR typeof("__new_fitness_sets"."weight_grams") = 'integer' AND "__new_fitness_sets"."weight_grams" BETWEEN 1 AND 9007199254740991) AND "__new_fitness_sets"."duration_seconds" IS NULL AND "__new_fitness_sets"."distance_meters" IS NULL)
    OR ("__new_fitness_sets"."measurement_type" = 'duration' AND ("__new_fitness_sets"."duration_seconds" IS NULL OR typeof("__new_fitness_sets"."duration_seconds") = 'integer' AND "__new_fitness_sets"."duration_seconds" BETWEEN 1 AND 9007199254740991)
      AND "__new_fitness_sets"."weight_grams" IS NULL AND "__new_fitness_sets"."reps" IS NULL AND "__new_fitness_sets"."distance_meters" IS NULL)
    OR ("__new_fitness_sets"."measurement_type" = 'distance' AND ("__new_fitness_sets"."distance_meters" IS NULL OR typeof("__new_fitness_sets"."distance_meters") = 'integer' AND "__new_fitness_sets"."distance_meters" BETWEEN 1 AND 9007199254740991)
      AND ("__new_fitness_sets"."duration_seconds" IS NULL OR typeof("__new_fitness_sets"."duration_seconds") = 'integer' AND "__new_fitness_sets"."duration_seconds" BETWEEN 1 AND 9007199254740991) AND "__new_fitness_sets"."weight_grams" IS NULL AND "__new_fitness_sets"."reps" IS NULL)),
	CONSTRAINT "fitness_set_updated_valid" CHECK("__new_fitness_sets"."updated_at" >= "__new_fitness_sets"."created_at")
);
--> statement-breakpoint
INSERT INTO `__new_fitness_sets`("id", "session_exercise_id", "measurement_type", "position", "weight_grams", "reps", "duration_seconds", "distance_meters", "created_at", "updated_at", "deleted_at") SELECT "id", "session_exercise_id", "measurement_type", "position", "weight_grams", "reps", "duration_seconds", "distance_meters", "created_at", "updated_at", "deleted_at" FROM `fitness_sets`;--> statement-breakpoint
DROP TABLE `fitness_sets`;--> statement-breakpoint
ALTER TABLE `__new_fitness_sets` RENAME TO `fitness_sets`;--> statement-breakpoint
CREATE UNIQUE INDEX `fitness_set_position_unique` ON `fitness_sets` (`session_exercise_id`,`position`) WHERE "fitness_sets"."deleted_at" IS NULL;
