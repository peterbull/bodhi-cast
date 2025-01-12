import { Outlet, createRootRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { ReactQueryDevtools } from "react-query-devtools"

const queryClient = new QueryClient()

export const RootComponent = createRootRoute({
  component: () => {
    return (
      <QueryClientProvider client={queryClient}>
        <div className="min-h-screen text-neon">
          <main className="container mx-auto px-4 py-8">
            <Outlet />
          </main>
        </div>
        <ReactQueryDevtools />
      </QueryClientProvider>
    )
  },
})
