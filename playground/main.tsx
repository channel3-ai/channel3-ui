import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "@/src/styles/globals.css";
import App from "./App";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

const queryClient = new QueryClient();

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
