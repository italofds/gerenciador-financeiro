import cors from "cors";
import express, { type ErrorRequestHandler, type Express } from "express";
import { rateLimit } from "express-rate-limit";
import { hashAuthKey, verifyAuthKey } from "./auth.js";
import type { Blob, ProfileStore, StoredProfile } from "./store.js";

export type AppOptions = {
  corsOrigins: string[];
  /** Requests allowed per IP every 15 minutes. */
  rateLimit?: number;
};

const ID_RE = /^[a-z0-9_.-]{3,32}$/;
// 32 bytes in base64url, without padding
const AUTH_KEY_RE = /^[A-Za-z0-9_-]{43}$/;
const B64URL_RE = /^[A-Za-z0-9_-]+$/;

const isId = (v: unknown): v is string => typeof v === "string" && ID_RE.test(v);
const isAuthKey = (v: unknown): v is string => typeof v === "string" && AUTH_KEY_RE.test(v);
const isBlob = (v: unknown): v is Blob => {
  if (typeof v !== "object" || v === null) return false;
  const { v: version, iv, data } = v as Record<string, unknown>;
  return (
    version === 1 &&
    typeof iv === "string" &&
    iv.length === 16 &&
    B64URL_RE.test(iv) &&
    typeof data === "string" &&
    B64URL_RE.test(data)
  );
};

export function createApp(store: ProfileStore, options: AppOptions): Express {
  const app = express();
  app.disable("x-powered-by");
  // Cloud Run puts a single proxy in front of the container
  app.set("trust proxy", 1);
  app.use(cors({ origin: options.corsOrigins, methods: ["GET", "POST", "PUT"] }));

  app.get("/healthz", (_req, res) => {
    res.json({ ok: true });
  });

  app.use(
    "/v1",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: options.rateLimit ?? 100,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { error: "rate_limited" },
    }),
  );
  app.use(express.json({ limit: "512kb" }));

  // salt for the hash computed when the id doesn't exist, so that a missing id
  // and a wrong password take the same time to answer
  const dummy = hashAuthKey("");

  const authenticate = async (id: unknown, authKey: unknown): Promise<StoredProfile | null> => {
    if (!isId(id) || !isAuthKey(authKey)) return null;
    const found = await store.find(id);
    const { authSalt, authHash } = found ?? (await dummy);
    const ok = await verifyAuthKey(authKey, authSalt, authHash);
    return found && ok ? found : null;
  };

  app.post("/v1/profiles", async (req, res) => {
    const { id, authKey, blob } = (req.body ?? {}) as Record<string, unknown>;
    if (!isId(id) || !isAuthKey(authKey) || !isBlob(blob)) {
      res.status(400).json({ error: "invalid" });
      return;
    }
    const created = await store.create({ id, blob, ...(await hashAuthKey(authKey)) });
    if (created) res.status(201).json({ rev: 1 });
    else res.status(409).json({ error: "taken" });
  });

  app.post("/v1/profiles/:id/open", async (req, res) => {
    const { authKey } = (req.body ?? {}) as Record<string, unknown>;
    const found = await authenticate(req.params.id, authKey);
    if (found) res.json({ blob: found.blob, rev: found.rev });
    else res.status(401).json({ error: "unauthorized" });
  });

  app.put("/v1/profiles/:id", async (req, res) => {
    const { authKey, blob, rev } = (req.body ?? {}) as Record<string, unknown>;
    const found = await authenticate(req.params.id, authKey);
    if (!found) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
    if (!isBlob(blob) || typeof rev !== "number" || !Number.isInteger(rev)) {
      res.status(400).json({ error: "invalid" });
      return;
    }
    const next = await store.update(found.id, rev, blob);
    if (next !== null) {
      res.json({ rev: next });
      return;
    }
    // saved from somewhere else since this client last read it
    const current = await store.find(found.id);
    res.status(409).json({ error: "conflict", rev: current?.rev ?? found.rev });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: "not_found" });
  });

  const onError: ErrorRequestHandler = (err, _req, res, _next) => {
    const status = (err as { status?: number }).status;
    if (status === 413) res.status(413).json({ error: "too_large" });
    else if (status && status < 500) res.status(400).json({ error: "invalid" });
    else {
      console.error(err);
      res.status(500).json({ error: "internal" });
    }
  };
  app.use(onError);

  return app;
}
