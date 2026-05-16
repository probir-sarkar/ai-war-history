import { orpc } from '#/orpc/client.ts'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/$year/')({
  loader: async ({ params }) =>
    await orpc.listBattles.call({ year: params.year }),
  component: RouteComponent,
})

function RouteComponent() {
  const battles = Route.useLoaderData()
  const { year } = Route.useParams()
  return (
    <div>
      <h1>Battles in {year}</h1>
      <ul>
        {battles.map((battle) => (
          <li key={battle.id}>
            {battle.name} ({battle.latitude}, {battle.longitude})
          </li>
        ))}
      </ul>
    </div>
  )
}
