import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

export const Route = createFileRoute('/$year/')({
  loader: ({ params }) => ({ year: params.year }),
  component: RouteComponent,
})

function RouteComponent() {
  const { year } = Route.useParams()
  return <div>Hello from {year}</div>
}
