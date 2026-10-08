import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { CloudError, createCloud, openCloud, saveCloud } from "@/lib/cloud";
import type { Profile } from "@/lib/finance";

const profile: Profile = {
  name: "Casa",
  cards: [{ id: "c1", name: "Nubank", dueDay: 10 }],
  records: [
    {
      id: "r1",
      amount: -1234.56,
      description: "Aluguel secreto",
      date: "2026-10-05",
      source: "account",
      recurrence: { type: "unlimited" },
      overrides: {},
    },
  ],
  done: { "r1@2026-10": true },
};

type Doc = { authKey: string; blob: unknown; rev: number };

// stands in for the API, following the contract of api/src/app.ts
function fakeApi() {
  const docs = new Map<string, Doc>();
  const sent: string[] = [];
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    sent.push(String(init?.body));
    const body = JSON.parse(String(init?.body));
    const path = new URL(String(url)).pathname;
    if (path === "/v1/profiles") {
      if (docs.has(body.id)) return json(409, { error: "taken" });
      docs.set(body.id, { authKey: body.authKey, blob: body.blob, rev: 1 });
      return json(201, { rev: 1 });
    }
    const id = path.split("/")[3]!;
    const doc = docs.get(id);
    if (!doc || doc.authKey !== body.authKey) return json(401, { error: "unauthorized" });
    if (path.endsWith("/open")) return json(200, { blob: doc.blob, rev: doc.rev });
    if (doc.rev !== body.rev) return json(409, { error: "conflict", rev: doc.rev });
    docs.set(id, { ...doc, blob: body.blob, rev: doc.rev + 1 });
    return json(200, { rev: doc.rev + 1 });
  });
  return { docs, sent, fetchMock };
}

const code = (p: Promise<unknown>) =>
  p.then(
    () => "ok",
    (e: unknown) => (e instanceof CloudError ? e.code : "other"),
  );

describe("cloud", () => {
  let api: ReturnType<typeof fakeApi>;

  beforeEach(() => {
    api = fakeApi();
    vi.stubEnv("VITE_API_URL", "https://api.test/");
    vi.stubGlobal("fetch", api.fetchMock);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("saves a profile and opens it again with the same id and password", async () => {
    const session = await createCloud(" Maria ", "senha-secreta", profile);
    expect(session).toMatchObject({ id: "maria", rev: 1 });

    const opened = await openCloud("maria", "senha-secreta");
    expect(opened.profile).toEqual(profile);
    expect(opened.session.rev).toBe(1);
  });

  it("never sends the password or readable profile data", async () => {
    await createCloud("maria", "senha-secreta", profile);

    const sent = api.sent.join("\n");
    expect(sent).not.toContain("senha-secreta");
    expect(sent).not.toContain("Aluguel");
    expect(sent).not.toContain("Nubank");
  });

  it("fails to open with a wrong password", async () => {
    await createCloud("maria", "senha-secreta", profile);

    expect(await code(openCloud("maria", "outra-senha"))).toBe("auth");
  });

  it("reports an id that is already taken", async () => {
    await createCloud("maria", "senha-secreta", profile);

    expect(await code(createCloud("maria", "outra-senha", profile))).toBe("taken");
  });

  it("reports a conflict with the stored revision and can overwrite it", async () => {
    const first = await createCloud("maria", "senha-secreta", profile);
    const second = await saveCloud(first, { ...profile, name: "Casa 2" });
    expect(second.rev).toBe(2);

    const stale = await saveCloud(first, { ...profile, name: "Casa 3" }).catch((e: unknown) => e);
    expect(stale).toBeInstanceOf(CloudError);
    expect(stale).toMatchObject({ code: "conflict", rev: 2 });

    const forced = await saveCloud({ ...first, rev: 2 }, { ...profile, name: "Casa 3" });
    expect(forced.rev).toBe(3);
    expect((await openCloud("maria", "senha-secreta")).profile.name).toBe("Casa 3");
  });

  it("reports data that can't be decrypted", async () => {
    await createCloud("maria", "senha-secreta", profile);
    const doc = api.docs.get("maria")!;
    api.docs.set("maria", { ...doc, blob: { v: 1, iv: "A".repeat(16), data: "AAAA" } });

    expect(await code(openCloud("maria", "senha-secreta"))).toBe("invalid");
  });

  it("reports a network failure", async () => {
    api.fetchMock.mockRejectedValueOnce(new TypeError("failed to fetch"));

    expect(await code(openCloud("maria", "senha-secreta"))).toBe("network");
  });
});
