import { MongoClient } from "mongodb";
import { createApp } from "./app.js";
import { mongoStore, type ProfileDoc } from "./store.js";

const uri = process.env["MONGODB_URI"]?.trim();
if (!uri) throw new Error("MONGODB_URI is required");

const corsOrigins = (process.env["CORS_ORIGIN"] ?? "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);
const port = Number(process.env["PORT"] ?? 8080);

const client = new MongoClient(uri);
await client.connect();
const profiles = client.db(process.env["MONGODB_DB"] ?? "gerenciador-financeiro").collection<ProfileDoc>("profiles");

const server = createApp(mongoStore(profiles), { corsOrigins }).listen(port, () => {
  console.log(`gerenciador-financeiro-api listening on port ${port}`);
});

// Cloud Run sends SIGTERM before stopping the container
process.on("SIGTERM", () => {
  server.close(() => void client.close().then(() => process.exit(0)));
});
