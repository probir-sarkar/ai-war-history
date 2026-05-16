CREATE TABLE `battles_to_participants` (
	`id` integer AUTOINCREMENT,
	`battle_id` integer NOT NULL,
	`participant_id` integer NOT NULL,
	CONSTRAINT `battles_to_participants_pk` PRIMARY KEY(`battle_id`, `participant_id`),
	CONSTRAINT `fk_battles_to_participants_battle_id_battles_id_fk` FOREIGN KEY (`battle_id`) REFERENCES `battles`(`id`),
	CONSTRAINT `fk_battles_to_participants_participant_id_participants_id_fk` FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`)
);
--> statement-breakpoint
CREATE TABLE `battles_to_theatres` (
	`id` integer AUTOINCREMENT,
	`battle_id` integer NOT NULL,
	`theatre_id` integer NOT NULL,
	CONSTRAINT `battles_to_theatres_pk` PRIMARY KEY(`battle_id`, `theatre_id`),
	CONSTRAINT `fk_battles_to_theatres_battle_id_battles_id_fk` FOREIGN KEY (`battle_id`) REFERENCES `battles`(`id`),
	CONSTRAINT `fk_battles_to_theatres_theatre_id_theatres_id_fk` FOREIGN KEY (`theatre_id`) REFERENCES `theatres`(`id`)
);
--> statement-breakpoint
CREATE TABLE `countries` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `theatres` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `battles` RENAME COLUMN `latitute` TO `latitude`;--> statement-breakpoint
ALTER TABLE `battles` ADD `longitude` real NOT NULL;--> statement-breakpoint
ALTER TABLE `battles` ADD `scale` integer;--> statement-breakpoint
ALTER TABLE `battles` ADD `massacre` integer;--> statement-breakpoint
ALTER TABLE `battles` ADD `country_id` integer REFERENCES countries(id);--> statement-breakpoint
ALTER TABLE `battles` ADD `winner_id` integer REFERENCES countries(id);--> statement-breakpoint
ALTER TABLE `battles` ADD `loser_id` integer REFERENCES countries(id);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_battles` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL UNIQUE,
	`year` integer NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`scale` integer,
	`massacre` integer,
	`country_id` integer,
	`winner_id` integer,
	`loser_id` integer,
	`war_id` integer NOT NULL,
	CONSTRAINT `fk_battles_country_id_countries_id_fk` FOREIGN KEY (`country_id`) REFERENCES `countries`(`id`),
	CONSTRAINT `fk_battles_winner_id_countries_id_fk` FOREIGN KEY (`winner_id`) REFERENCES `countries`(`id`),
	CONSTRAINT `fk_battles_loser_id_countries_id_fk` FOREIGN KEY (`loser_id`) REFERENCES `countries`(`id`),
	CONSTRAINT `fk_battles_war_id_wars_id_fk` FOREIGN KEY (`war_id`) REFERENCES `wars`(`id`)
);
--> statement-breakpoint
INSERT INTO `__new_battles`(`id`, `name`, `year`, `latitude`, `war_id`) SELECT `id`, `name`, `year`, `latitude`, `war_id` FROM `battles`;--> statement-breakpoint
DROP TABLE `battles`;--> statement-breakpoint
ALTER TABLE `__new_battles` RENAME TO `battles`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_wars` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_wars`(`id`, `name`) SELECT `id`, `name` FROM `wars`;--> statement-breakpoint
DROP TABLE `wars`;--> statement-breakpoint
ALTER TABLE `__new_wars` RENAME TO `wars`;--> statement-breakpoint
PRAGMA foreign_keys=ON;