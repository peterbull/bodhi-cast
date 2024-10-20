import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { SpotsProvider } from "./hooks/useSpot";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);
root.render(
  <React.StrictMode>
    <div data-testid="main-app-content">
      <SpotsProvider>
        <App />
      </SpotsProvider>
    </div>
  </React.StrictMode>,
);
