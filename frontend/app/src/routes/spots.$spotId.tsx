import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/spots/$spotId')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/spots/$spotName"!</div>
}
