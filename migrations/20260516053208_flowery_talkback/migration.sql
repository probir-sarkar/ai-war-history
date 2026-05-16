CREATE TABLE `battles` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` integer NOT NULL UNIQUE,
	`year` integer NOT NULL,
	`latitute` real NOT NULL,
	`war_id` integer NOT NULL,
	CONSTRAINT `fk_battles_war_id_wars_id_fk` FOREIGN KEY (`war_id`) REFERENCES `wars`(`id`)
);
--> statement-breakpoint
CREATE TABLE `wars` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` integer NOT NULL
);
