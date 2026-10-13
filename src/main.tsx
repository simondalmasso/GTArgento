import React from "react";
import { createRoot } from "react-dom/client";
import { GameApp } from "./game/GameApp";
import "./styles.css";

const root = document.getElementById("app");
if (!root) throw new Error("Missing #app root");
createRoot(root).render(
  <React.StrictMode>
    <GameApp />
  </React.StrictMode>,
);
