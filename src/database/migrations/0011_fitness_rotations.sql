CREATE TABLE `fitness_rotation_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`rotation_id` text NOT NULL,
	`routine_id` text NOT NULL,
	`position` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`routine_id`) REFERENCES `fitness_routines`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`rotation_id`) REFERENCES `fitness_rotations`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "fitness_rotation_step_position_valid" CHECK("fitness_rotation_steps"."position" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fitness_rotation_step_parent_unique` ON `fitness_rotation_steps` (`id`,`rotation_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `fitness_rotation_step_position_unique` ON `fitness_rotation_steps` (`rotation_id`,`position`) WHERE "fitness_rotation_steps"."deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX `fitness_rotation_step_routine_idx` ON `fitness_rotation_steps` (`routine_id`);--> statement-breakpoint
CREATE TABLE `fitness_rotations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`next_step_id` text,
	`is_active` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`next_step_id`,`id`) REFERENCES `fitness_rotation_steps`(`id`,`rotation_id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "fitness_rotation_active_valid" CHECK("fitness_rotations"."is_active" IN (0, 1) AND ("fitness_rotations"."is_active" = 0 OR ("fitness_rotations"."deleted_at" IS NULL AND "fitness_rotations"."next_step_id" IS NOT NULL)))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `fitness_one_active_rotation` ON `fitness_rotations` ((1)) WHERE "fitness_rotations"."is_active" = 1 AND "fitness_rotations"."deleted_at" IS NULL;--> statement-breakpoint
ALTER TABLE `fitness_workout_sessions` ADD `rotation_id` text REFERENCES fitness_rotations(id);--> statement-breakpoint
ALTER TABLE `fitness_workout_sessions` ADD `rotation_step_id` text REFERENCES fitness_rotation_steps(id);
--> statement-breakpoint
-- Nullable provenance is paired and refers to the same rotation/routine as its stable step.
CREATE TRIGGER fitness_session_rotation_insert BEFORE INSERT ON fitness_workout_sessions
WHEN (NEW.rotation_id IS NULL) != (NEW.rotation_step_id IS NULL)
 OR (NEW.rotation_step_id IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM fitness_rotation_steps s WHERE s.id = NEW.rotation_step_id
   AND s.rotation_id = NEW.rotation_id AND s.routine_id = NEW.routine_id
 ))
BEGIN SELECT RAISE(ABORT, 'Invalid workout rotation provenance'); END;
--> statement-breakpoint
CREATE TRIGGER fitness_session_rotation_update BEFORE UPDATE OF rotation_id, rotation_step_id, routine_id ON fitness_workout_sessions
WHEN NEW.rotation_id IS NOT OLD.rotation_id OR NEW.rotation_step_id IS NOT OLD.rotation_step_id
 OR (OLD.rotation_id IS NOT NULL AND NEW.routine_id IS NOT OLD.routine_id)
BEGIN SELECT RAISE(ABORT, 'Workout rotation provenance is immutable'); END;
--> statement-breakpoint
CREATE TRIGGER fitness_routine_rotation_archive BEFORE UPDATE OF deleted_at ON fitness_routines
WHEN NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL AND EXISTS (
 SELECT 1 FROM fitness_rotation_steps s JOIN fitness_rotations r ON r.id = s.rotation_id
 WHERE s.routine_id = OLD.id AND s.deleted_at IS NULL AND r.deleted_at IS NULL
)
BEGIN SELECT RAISE(ABORT, 'Remove routine from saved rotations before archiving'); END;
