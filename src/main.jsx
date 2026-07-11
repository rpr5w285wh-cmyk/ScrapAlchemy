// The storage shim must be installed before the app module evaluates.
import "./storage.js";
import "./index.css";

import React from "react";
import { createRoot } from "react-dom/client";
import App from "../scrap-alchemy.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
