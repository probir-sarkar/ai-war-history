import { defineRelations } from 'drizzle-orm'
import * as schema from './schema'

export const relations = defineRelations(schema, (r) => ({
  battles: {
    war: r.one.wars({
      from: r.battles.warId,
      to: r.wars.id,
    }),
    country: r.one.countries({
      from: r.battles.countryId,
      to: r.countries.id,
    }),
    winner: r.one.countries({
      from: r.battles.winnerId,
      to: r.countries.id,
    }),
    loser: r.one.countries({
      from: r.battles.loserId,
      to: r.countries.id,
    }),
    participants: r.many.participants({
      from: r.battles.id.through(r.battlesToParticipants.battleId),
      to: r.participants.id.through(r.battlesToParticipants.participantId),
    }),
  },
  wars: {
    battles: r.many.battles(),
  },
  countries: {
    battlesAsCountry: r.many.battles({
      from: r.countries.id,
      to: r.battles.countryId,
    }),
    battlesAsWinner: r.many.battles({
      from: r.countries.id,
      to: r.battles.winnerId,
    }),
    battlesAsLoser: r.many.battles({
      from: r.countries.id,
      to: r.battles.loserId,
    }),
  },
  participants: {
    battles: r.many.battles(),
  },
}))
