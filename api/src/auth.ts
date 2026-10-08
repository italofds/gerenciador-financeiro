import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const derive = (authKey: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) =>
    scrypt(authKey, salt, 32, (err, key) => (err ? reject(err) : resolve(key))),
  );

export async function hashAuthKey(authKey: string) {
  const salt = randomBytes(16);
  const hash = await derive(authKey, salt);
  return { authSalt: salt.toString("base64"), authHash: hash.toString("base64") };
}

export async function verifyAuthKey(authKey: string, authSalt: string, authHash: string) {
  const expected = Buffer.from(authHash, "base64");
  const actual = await derive(authKey, Buffer.from(authSalt, "base64"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}
