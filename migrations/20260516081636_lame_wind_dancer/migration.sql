CREATE TABLE `battles` (
	`id` integer PRIMARY KEY,
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
CREATE TABLE `battles_to_participants` (
	`id` integer,
	`battle_id` integer NOT NULL,
	`participant_id` integer NOT NULL,
	CONSTRAINT `battles_to_participants_pk` PRIMARY KEY(`battle_id`, `participant_id`),
	CONSTRAINT `fk_battles_to_participants_battle_id_battles_id_fk` FOREIGN KEY (`battle_id`) REFERENCES `battles`(`id`),
	CONSTRAINT `fk_battles_to_participants_participant_id_participants_id_fk` FOREIGN KEY (`participant_id`) REFERENCES `participants`(`id`)
);
--> statement-breakpoint
CREATE TABLE `battles_to_theatres` (
	`id` integer,
	`battle_id` integer NOT NULL,
	`theatre_id` integer NOT NULL,
	CONSTRAINT `battles_to_theatres_pk` PRIMARY KEY(`battle_id`, `theatre_id`),
	CONSTRAINT `fk_battles_to_theatres_battle_id_battles_id_fk` FOREIGN KEY (`battle_id`) REFERENCES `battles`(`id`),
	CONSTRAINT `fk_battles_to_theatres_theatre_id_theatres_id_fk` FOREIGN KEY (`theatre_id`) REFERENCES `theatres`(`id`)
);
--> statement-breakpoint
CREATE TABLE `countries` (
	`id` integer PRIMARY KEY,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` integer PRIMARY KEY,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `theatres` (
	`id` integer PRIMARY KEY,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `wars` (
	`id` integer PRIMARY KEY,
	`name` text NOT NULL
);
