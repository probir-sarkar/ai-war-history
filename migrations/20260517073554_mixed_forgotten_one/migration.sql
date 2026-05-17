CREATE TYPE "theatres" AS ENUM('Air', 'Land', 'Sea');--> statement-breakpoint
CREATE TABLE "battles" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"year" integer NOT NULL,
	"latitude" real NOT NULL,
	"longitude" real NOT NULL,
	"scale" integer,
	"massacre" boolean,
	"theatres" "theatres"[],
	"country_id" integer,
	"winner_id" integer,
	"loser_id" integer,
	"war_id" integer NOT NULL,
	CONSTRAINT "battles_name_year_unique" UNIQUE("name","year")
);
--> statement-breakpoint
CREATE TABLE "battles_to_participants" (
	"battle_id" integer,
	"participant_id" integer,
	CONSTRAINT "battles_to_participants_pkey" PRIMARY KEY("battle_id","participant_id")
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL UNIQUE
);
--> statement-breakpoint
CREATE TABLE "wars" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL UNIQUE
);
--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_winner_id_countries_id_fkey" FOREIGN KEY ("winner_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_loser_id_countries_id_fkey" FOREIGN KEY ("loser_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "battles" ADD CONSTRAINT "battles_war_id_wars_id_fkey" FOREIGN KEY ("war_id") REFERENCES "wars"("id");--> statement-breakpoint
ALTER TABLE "battles_to_participants" ADD CONSTRAINT "battles_to_participants_battle_id_battles_id_fkey" FOREIGN KEY ("battle_id") REFERENCES "battles"("id");--> statement-breakpoint
ALTER TABLE "battles_to_participants" ADD CONSTRAINT "battles_to_participants_participant_id_participants_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id");