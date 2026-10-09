import { parseProfile, type Profile } from "@/lib/finance";

// The profile is encrypted here, in the browser. The password never leaves the device: the API
// only receives `authKey` (to prove who is asking) and a blob it can't read.

export type CloudSession = { id: string; authKey: string; encKey: CryptoKey; rev: number };
export type CloudErrorCode = "auth" | "taken" | "conflict" | "limit" | "invalid" | "network";
type CipherBlob = { v: 1; iv: string; data: string };

export class CloudError extends Error {
  readonly code: CloudErrorCode;
  /** Revision currently stored, when `code` is "conflict". */
  readonly rev: number | undefined;
  constructor(code: CloudErrorCode, rev?: number) {
    super(code);
    this.name = "CloudError";
    this.code = code;
    this.rev = rev;
  }
}

export const MIN_PASSWORD = 8;
export const normalizeId = (id: string) => id.trim().toLowerCase();
export const isValidId = (id: string) => /^[a-z0-9_.-]{3,32}$/.test(id);

const apiUrl = () => (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
export const cloudEnabled = () => apiUrl() !== "";

const messages: Record<CloudErrorCode, string> = {
  auth: "Id ou senha incorretos.",
  taken: "Este id já está em uso. Escolha outro.",
  conflict: "A nuvem tem uma versão mais recente deste perfil.",
  limit: "Muitas tentativas. Aguarde alguns minutos.",
  invalid: "Não foi possível ler os dados salvos na nuvem.",
  network: "Não foi possível conectar à nuvem. Tente novamente.",
};
export const cloudMessage = (e: unknown) => messages[e instanceof CloudError ? e.code : "network"];

const toB64 = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64 = (s: string) => {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};
const utf8 = (s: string) => new TextEncoder().encode(s);

async function deriveKeys(id: string, password: string) {
  const subtle = crypto.subtle;
  const salt = utf8(`gerenciador-financeiro:v1:${id}`);
  const pass = await subtle.importKey("raw", utf8(password), "PBKDF2", false, ["deriveBits"]);
  const master = await subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 600_000 },
    pass,
    256,
  );
  // two independent keys from the same password: knowing authKey doesn't reveal encKey
  const hkdf = await subtle.importKey("raw", master, "HKDF", false, ["deriveBits", "deriveKey"]);
  const params = (info: string) => ({ name: "HKDF", hash: "SHA-256", salt, info: utf8(info) });
  const authKey = toB64(new Uint8Array(await subtle.deriveBits(params("auth"), hkdf, 256)));
  const encKey = await subtle.deriveKey(
    params("enc"),
    hkdf,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  return { authKey, encKey };
}

async function encrypt(key: CryptoKey, profile: Profile): Promise<CipherBlob> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    utf8(JSON.stringify(profile)),
  );
  return { v: 1, iv: toB64(iv), data: toB64(new Uint8Array(data)) };
}

async function decrypt(key: CryptoKey, blob: CipherBlob): Promise<Profile> {
  try {
    const data = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(blob.iv) },
      key,
      fromB64(blob.data),
    );
    return parseProfile(JSON.parse(new TextDecoder().decode(data)));
  } catch {
    throw new CloudError("invalid");
  }
}

async function request<T>(method: "POST" | "PUT", path: string, body: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiUrl()}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new CloudError("network");
  }
  const data = await res.json().catch(() => ({}));
  if (res.ok) return data as T;
  if (res.status === 401) throw new CloudError("auth");
  if (res.status === 429) throw new CloudError("limit");
  if (res.status === 409)
    throw data.error === "taken" ? new CloudError("taken") : new CloudError("conflict", data.rev);
  throw new CloudError("network");
}

export async function openCloud(
  rawId: string,
  password: string,
): Promise<{ profile: Profile; session: CloudSession }> {
  const id = normalizeId(rawId);
  const keys = await deriveKeys(id, password);
  const { blob, rev } = await request<{ blob: CipherBlob; rev: number }>(
    "POST",
    `/v1/profiles/${encodeURIComponent(id)}/open`,
    { authKey: keys.authKey },
  );
  return { profile: await decrypt(keys.encKey, blob), session: { id, ...keys, rev } };
}

export async function createCloud(
  rawId: string,
  password: string,
  profile: Profile,
): Promise<CloudSession> {
  const id = normalizeId(rawId);
  const keys = await deriveKeys(id, password);
  const blob = await encrypt(keys.encKey, profile);
  const { rev } = await request<{ rev: number }>("POST", "/v1/profiles", {
    id,
    authKey: keys.authKey,
    blob,
  });
  return { id, ...keys, rev };
}

// Fails with a "conflict" CloudError when the profile was saved from somewhere else after
// `session.rev`; saving again with the revision the error carries overwrites that version.
export async function saveCloud(session: CloudSession, profile: Profile): Promise<CloudSession> {
  const blob = await encrypt(session.encKey, profile);
  const { rev } = await request<{ rev: number }>(
    "PUT",
    `/v1/profiles/${encodeURIComponent(session.id)}`,
    { authKey: session.authKey, blob, rev: session.rev },
  );
  return { ...session, rev };
}
