CREATE INDEX "battles_year_index" ON "battles" ("year");--> statement-breakpoint
CREATE INDEX "battles_war_id_index" ON "battles" ("war_id");--> statement-breakpoint
CREATE INDEX "battles_country_id_index" ON "battles" ("country_id");--> statement-breakpoint
CREATE INDEX "battles_winner_id_index" ON "battles" ("winner_id");--> statement-breakpoint
CREATE INDEX "battles_loser_id_index" ON "battles" ("loser_id");--> statement-breakpoint
CREATE INDEX "battles_to_participants_participant_id_index" ON "battles_to_participants" ("participant_id");