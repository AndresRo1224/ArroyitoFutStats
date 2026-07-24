import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { aplicarTema, temaGuardado } from "./tema";
import "./index.css";

// Aplica el modo claro/oscuro guardado antes de pintar, para que no parpadee.
aplicarTema(temaGuardado());

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
