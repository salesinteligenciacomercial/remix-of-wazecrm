import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

// Adicione estas linhas para teste
console.log('✅ main.tsx carregado com sucesso!');
alert('Teste de Renderização: Se você vê isso, o JavaScript está carregando. Clique OK para continuar.');

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
