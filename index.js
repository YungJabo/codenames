import express from "express";
import { setupWebSocket } from "./ws.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const buildPath = path.join(__dirname, "dist");
app.use(express.static(buildPath));
// Запуск сервера
const server = app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});

// Настройка WebSocket-сервера
setupWebSocket(server);

// Маршрут Express для тестирования
app.get("/test", (req, res) => {
  res.send("WebSocket server is running");
});

app.get("*", (req, res) => {
  res.sendFile(path.join(buildPath, "index.html"));
});
