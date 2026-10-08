import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import type { Blob, ProfileStore, StoredProfile } from "../src/store.js";

function memoryStore(): ProfileStore {
  const docs = new Map<string, StoredProfile>();
  return {
    async find(id) {
      return docs.get(id) ?? null;
    },
    async create(profile) {
      if (docs.has(profile.id)) return false;
      docs.set(profile.id, { ...profile, rev: 1 });
      return true;
    },
    async update(id, rev, blob) {
      const doc = docs.get(id);
      if (!doc || doc.rev !== rev) return null;
      docs.set(id, { ...doc, blob, rev: rev + 1 });
      return rev + 1;
    },
  };
}

const authKey = "a".repeat(43);
const otherKey = "b".repeat(43);
const blob = (data = "AAAA"): Blob => ({ v: 1, iv: "A".repeat(16), data });

describe("api", () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp(memoryStore(), { corsOrigins: ["http://localhost:5173"] });
  });

  const create = (id = "maria") =>
    request(app).post("/v1/profiles").send({ id, authKey, blob: blob() });

  it("creates a profile and opens it with the same key", async () => {
    expect((await create()).status).toBe(201);

    const res = await request(app).post("/v1/profiles/maria/open").send({ authKey });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ blob: blob(), rev: 1 });
  });

  it("answers 401 for a wrong key and for an id that doesn't exist", async () => {
    await create();

    const wrong = await request(app).post("/v1/profiles/maria/open").send({ authKey: otherKey });
    const missing = await request(app).post("/v1/profiles/joao/open").send({ authKey });
    expect(wrong.status).toBe(401);
    expect(missing.status).toBe(401);
    expect(missing.body).toEqual(wrong.body);
  });

  it("refuses to create an id that is already taken", async () => {
    await create();

    const res = await request(app)
      .post("/v1/profiles")
      .send({ id: "maria", authKey: otherKey, blob: blob() });
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "taken" });
  });

  it("rejects invalid ids, keys and blobs", async () => {
    const send = (body: object) => request(app).post("/v1/profiles").send(body);

    expect((await send({ id: "Ma", authKey, blob: blob() })).status).toBe(400);
    expect((await send({ id: "maria", authKey: "short", blob: blob() })).status).toBe(400);
    expect(
      (await send({ id: "maria", authKey, blob: { v: 1, iv: "x", data: "AAAA" } })).status,
    ).toBe(400);
    expect((await send({ id: "maria", authKey })).status).toBe(400);
  });

  it("saves a new revision and reports a conflict for a stale one", async () => {
    await create();
    const put = (body: object) => request(app).put("/v1/profiles/maria").send(body);

    const saved = await put({ authKey, blob: blob("BBBB"), rev: 1 });
    expect(saved.status).toBe(200);
    expect(saved.body).toEqual({ rev: 2 });

    const stale = await put({ authKey, blob: blob("CCCC"), rev: 1 });
    expect(stale.status).toBe(409);
    expect(stale.body).toEqual({ error: "conflict", rev: 2 });

    const opened = await request(app).post("/v1/profiles/maria/open").send({ authKey });
    expect(opened.body).toEqual({ blob: blob("BBBB"), rev: 2 });
  });

  it("doesn't save with a wrong key", async () => {
    await create();

    const res = await request(app)
      .put("/v1/profiles/maria")
      .send({ authKey: otherKey, blob: blob("BBBB"), rev: 1 });
    expect(res.status).toBe(401);
  });

  it("rejects a body larger than the limit", async () => {
    const res = await request(app)
      .post("/v1/profiles")
      .send({ id: "maria", authKey, blob: blob("A".repeat(600 * 1024)) });
    expect(res.status).toBe(413);
  });

  it("limits the number of requests per client", async () => {
    app = createApp(memoryStore(), { corsOrigins: [], rateLimit: 2 });
    const open = () => request(app).post("/v1/profiles/maria/open").send({ authKey });

    expect((await open()).status).toBe(401);
    expect((await open()).status).toBe(401);
    expect((await open()).status).toBe(429);
  });

  it("only allows the configured origins", async () => {
    const allowed = await request(app).get("/healthz").set("Origin", "http://localhost:5173");
    const other = await request(app).get("/healthz").set("Origin", "https://example.com");

    expect(allowed.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
    expect(other.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
