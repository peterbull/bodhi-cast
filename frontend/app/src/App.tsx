import { ReactQueryDevtools } from "react-query-devtools";
import "./App.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SpotSelector } from "./components/SpotSelector";
import React from "react";

const queryClient = new QueryClient();

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-neon">
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools />
      <Layout>
        <SpotSelector />
      </Layout>
    </QueryClientProvider>
  );
}
