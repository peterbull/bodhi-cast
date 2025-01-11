import { ReactQueryDevtools } from "react-query-devtools";
import "./App.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SpotSelector } from "./components/SpotSelector";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools />
      <SpotSelector />
    </QueryClientProvider>
  );
}
